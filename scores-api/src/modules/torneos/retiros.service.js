const db = require('../../config/db')
const fail = (status, message) => {
  throw Object.assign(new Error(message), { status })
}
const id = (value) => {
  const n = Number(value)
  if (!Number.isSafeInteger(n) || n < 1) fail(400, 'Identificador inválido')
  return n
}

// Include registered participants and historical matches, never the global player directory.
exports.participants = async (torneoId, connection = db) => {
  torneoId = id(torneoId)
  const [teams] = await connection.query(
    `SELECT DISTINCT e.id, e.nombre, e.jugador1_id, e.jugador2_id
    FROM equipos_padel e WHERE e.id IN (
      SELECT equipo_id FROM inscripciones WHERE torneo_id=?
      UNION SELECT equipo1_id FROM partidos WHERE torneo_id=?
      UNION SELECT equipo2_id FROM partidos WHERE torneo_id=?
      UNION SELECT participante_id FROM torneo_retiros WHERE torneo_id=? AND tipo='pareja')`,
    [torneoId, torneoId, torneoId, torneoId]
  )
  const memberIds = [
    ...new Set(teams.flatMap((t) => [t.jugador1_id, t.jugador2_id]).filter(Boolean)),
  ]
  const [players] = await connection.query(
    `SELECT j.id, CONCAT_WS(' ',j.nombre,j.apellido) AS nombre
    FROM jugadores j WHERE j.id IN (SELECT jugador_id FROM inscripciones WHERE torneo_id=?
      UNION SELECT jugador1_id FROM partidos WHERE torneo_id=?
      UNION SELECT jugador2_id FROM partidos WHERE torneo_id=?
      UNION SELECT participante_id FROM torneo_retiros WHERE torneo_id=? AND tipo='jugador')
      ${memberIds.length ? 'OR j.id IN (?)' : ''}`,
    [torneoId, torneoId, torneoId, torneoId, ...(memberIds.length ? [memberIds] : [])]
  )
  return [
    ...teams.map((t) => ({ tipo: 'pareja', participante_id: Number(t.id), nombre: t.nombre })),
    ...players.map((p) => ({ tipo: 'jugador', participante_id: Number(p.id), nombre: p.nombre })),
  ]
}

exports.get = async (torneoId, connection = db) => {
  const [rows] = await connection.query(
    'SELECT tipo, participante_id, retirado, version FROM torneo_retiros WHERE torneo_id=?',
    [id(torneoId)]
  )
  const jugadores = rows
    .filter((r) => r.tipo === 'jugador' && r.retirado)
    .map((r) => Number(r.participante_id))
  const parejas = rows
    .filter((r) => r.tipo === 'pareja' && r.retirado)
    .map((r) => Number(r.participante_id))
  if (jugadores.length) {
    const [teams] = await connection.query(
      'SELECT id FROM equipos_padel WHERE jugador1_id IN (?) OR jugador2_id IN (?)',
      [jugadores, jugadores]
    )
    parejas.push(...teams.map((t) => Number(t.id)))
  }
  return {
    jugadores,
    parejas: [...new Set(parejas)],
    estados: rows.map((r) => ({
      tipo: r.tipo,
      participante_id: Number(r.participante_id),
      retirado: Boolean(r.retirado),
      version: Number(r.version),
    })),
  }
}

exports.assertAvailable = async (match, connection = db, previous = null) => {
  if (!match.torneo_id) return
  const states = await exports.get(match.torneo_id, connection)
  for (const field of ['jugador1_id', 'jugador2_id', 'equipo1_id', 'equipo2_id']) {
    const participant = Number(match[field])
    if (!participant) continue
    // Existing history remains editable, but a withdrawn participant cannot be newly assigned.
    if (
      previous &&
      Number(previous.torneo_id) === Number(match.torneo_id) &&
      Number(previous[field]) === participant
    )
      continue
    if (states[field.startsWith('equipo') ? 'parejas' : 'jugadores'].includes(participant))
      fail(
        409,
        'El participante está retirado de este torneo. No puede asignarse a nuevos partidos.'
      )
  }
}

// A withdrawn winner keeps the result, but must not be assigned to a later round.
exports.eligibleWinner = async (match, type, participant, connection = db) => {
  if (!participant || !match.torneo_id) return participant
  const states = await exports.get(match.torneo_id, connection)
  return states[type === 'equipo' ? 'parejas' : 'jugadores'].includes(Number(participant))
    ? null
    : participant
}

exports.set = async (torneoId, body, actor) => {
  torneoId = id(torneoId)
  if (actor?.rol !== 'admin') fail(403, 'Solo administración puede gestionar retiros')
  if (!body || typeof body !== 'object' || Array.isArray(body)) fail(400, 'Datos de retiro inválidos')
  const participant = id(body.participante_id)
  if (!['jugador', 'pareja'].includes(body.tipo) || typeof body.retirado !== 'boolean')
    fail(400, 'Estado o tipo inválido')
  if (!Number.isSafeInteger(body.version) || body.version < 0)
    fail(400, 'Actualiza el estado antes de guardar')
  const motivo = typeof body.motivo === 'string' ? body.motivo.trim() : ''
  if (motivo.length < 3 || motivo.length > 500)
    fail(400, 'Indica un motivo privado de entre 3 y 500 caracteres')
  const conn = await db.getConnection()
  try {
    await conn.beginTransaction()
    const [[t]] = await conn.query('SELECT id FROM torneos WHERE id=? FOR UPDATE', [torneoId])
    if (!t) fail(404, 'Torneo no encontrado')
    const participants = await exports.participants(torneoId, conn)
    if (!participants.some((p) => p.tipo === body.tipo && p.participante_id === participant))
      fail(400, 'El participante no pertenece a este torneo')
    const [[prev]] = await conn.query(
      'SELECT retirado,version FROM torneo_retiros WHERE torneo_id=? AND tipo=? AND participante_id=? FOR UPDATE',
      [torneoId, body.tipo, participant]
    )
    if (Number(prev?.version || 0) !== body.version)
      fail(409, 'Otro administrador cambió el estado. Actualiza e intenta nuevamente.')
    if (Boolean(prev?.retirado) === body.retirado) {
      await conn.commit()
      return { message: 'El estado ya estaba actualizado' }
    }
    await conn.query(
      `INSERT INTO torneo_retiros (torneo_id,tipo,participante_id,retirado,version) VALUES (?,?,?,?,1)
      ON DUPLICATE KEY UPDATE retirado=VALUES(retirado),version=version+1`,
      [torneoId, body.tipo, participant, body.retirado]
    )
    await conn.query(
      'INSERT INTO auditoria_retiros (torneo_id,tipo,participante_id,actor_id,retirado,motivo) VALUES (?,?,?,?,?,?)',
      [torneoId, body.tipo, participant, actor.id, body.retirado, motivo]
    )
    await conn.commit()
    return {
      message: body.retirado
        ? 'Retiro registrado. Revisa los partidos pendientes; no se cancelaron ni se asignaron resultados.'
        : 'Participación reactivada en este torneo.',
    }
  } catch (e) {
    await conn.rollback()
    throw e
  } finally {
    conn.release()
  }
}

exports.audit = async (torneoId) => {
  const [rows] = await db.query(
    'SELECT id,tipo,participante_id,actor_id,retirado,motivo,created_at FROM auditoria_retiros WHERE torneo_id=? ORDER BY id DESC LIMIT 100',
    [id(torneoId)]
  )
  return rows
}
