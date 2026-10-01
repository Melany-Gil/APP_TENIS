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
    `SELECT DISTINCT e.id, e.nombre, e.categoria_id, cat.nombre AS categoria_nombre, cat.orden AS categoria_orden,
            e.jugador1_id, j1.nombre AS j1_nombre, j1.apellido AS j1_apellido, j1.foto AS j1_foto,
            e.jugador2_id, j2.nombre AS j2_nombre, j2.apellido AS j2_apellido, j2.foto AS j2_foto,
            gp.grupo
     FROM equipos_padel e
     LEFT JOIN categorias cat ON cat.id = e.categoria_id
     LEFT JOIN jugadores j1 ON j1.id = e.jugador1_id
     LEFT JOIN jugadores j2 ON j2.id = e.jugador2_id
     LEFT JOIN torneo_grupo_parejas gp ON gp.torneo_id = ? AND gp.equipo_id = e.id
     WHERE e.id IN (
       SELECT equipo_id FROM inscripciones WHERE torneo_id=?
       UNION SELECT equipo1_id FROM partidos WHERE torneo_id=?
       UNION SELECT equipo2_id FROM partidos WHERE torneo_id=?
       UNION SELECT participante_id FROM torneo_retiros WHERE torneo_id=? AND tipo='pareja')
     ORDER BY COALESCE(cat.orden, 99) ASC, e.nombre ASC`,
    [torneoId, torneoId, torneoId, torneoId, torneoId]
  )

  const [partidos] = await connection.query(
    `SELECT equipo1_id, equipo2_id, ganador FROM partidos WHERE torneo_id=? AND estado='finalizado'`,
    [torneoId]
  )
  const statsMap = new Map()
  for (const m of partidos) {
    if (m.equipo1_id) {
      if (!statsMap.has(m.equipo1_id)) statsMap.set(m.equipo1_id, { pj: 0, pg: 0, pp: 0 })
      const s = statsMap.get(m.equipo1_id)
      s.pj += 1
      if (m.ganador === 'jugador1') s.pg += 1
      else if (m.ganador === 'jugador2') s.pp += 1
    }
    if (m.equipo2_id) {
      if (!statsMap.has(m.equipo2_id)) statsMap.set(m.equipo2_id, { pj: 0, pg: 0, pp: 0 })
      const s = statsMap.get(m.equipo2_id)
      s.pj += 1
      if (m.ganador === 'jugador2') s.pg += 1
      else if (m.ganador === 'jugador1') s.pp += 1
    }
  }

  const [audits] = await connection.query(
    `SELECT a.tipo, a.participante_id, a.motivo, a.created_at, u.nombre AS actor_nombre
     FROM auditoria_retiros a
     LEFT JOIN users u ON u.id = a.actor_id
     WHERE a.torneo_id = ?
     ORDER BY a.id DESC`,
    [torneoId]
  )
  const auditMap = new Map()
  for (const a of audits) {
    const k = `${a.tipo}:${a.participante_id}`
    if (!auditMap.has(k)) auditMap.set(k, a)
  }

  const memberIds = [
    ...new Set(teams.flatMap((t) => [t.jugador1_id, t.jugador2_id]).filter(Boolean)),
  ]
  const [players] = await connection.query(
    `SELECT j.id, CONCAT_WS(' ',j.nombre,j.apellido) AS nombre, j.foto
     FROM jugadores j WHERE j.id IN (SELECT jugador_id FROM inscripciones WHERE torneo_id=?
       UNION SELECT jugador1_id FROM partidos WHERE torneo_id=?
       UNION SELECT jugador2_id FROM partidos WHERE torneo_id=?
       UNION SELECT participante_id FROM torneo_retiros WHERE torneo_id=? AND tipo='jugador')
       ${memberIds.length ? 'OR j.id IN (?)' : ''}
     ORDER BY j.nombre ASC`,
    [torneoId, torneoId, torneoId, torneoId, ...(memberIds.length ? [memberIds] : [])]
  )

  const teamsResult = teams.map((t) => {
    const st = statsMap.get(t.id) || { pj: 0, pg: 0, pp: 0 }
    const lastAudit = auditMap.get(`pareja:${t.id}`)
    return {
      tipo: 'pareja',
      participante_id: Number(t.id),
      equipo_id: Number(t.id),
      nombre: t.nombre,
      categoria_id: t.categoria_id ? Number(t.categoria_id) : null,
      categoria_nombre: t.categoria_nombre || 'Sin categoría',
      grupo: t.grupo || null,
      jugador1: t.jugador1_id
        ? { id: t.jugador1_id, nombre: t.j1_nombre, apellido: t.j1_apellido, foto: t.j1_foto }
        : null,
      jugador2: t.jugador2_id
        ? { id: t.jugador2_id, nombre: t.j2_nombre, apellido: t.j2_apellido, foto: t.j2_foto }
        : null,
      pj: st.pj,
      pg: st.pg,
      pp: st.pp,
      ultimo_motivo: lastAudit?.motivo || null,
      ultimo_actor: lastAudit?.actor_nombre || null,
      ultima_fecha: lastAudit?.created_at || null,
    }
  })

  const playersResult = players.map((p) => {
    const lastAudit = auditMap.get(`jugador:${p.id}`)
    return {
      tipo: 'jugador',
      participante_id: Number(p.id),
      jugador_id: Number(p.id),
      nombre: p.nombre,
      foto: p.foto || null,
      ultimo_motivo: lastAudit?.motivo || null,
      ultimo_actor: lastAudit?.actor_nombre || null,
      ultima_fecha: lastAudit?.created_at || null,
    }
  })

  return [...teamsResult, ...playersResult]
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
    if (body.tipo === 'pareja' && !body.retirado) {
      const [blocked] = await conn.query(`SELECT r.participante_id FROM torneo_retiros r
        JOIN equipos_padel e ON e.id=? AND r.participante_id IN (e.jugador1_id,e.jugador2_id)
        WHERE r.torneo_id=? AND r.tipo='jugador' AND r.retirado=1`, [participant, torneoId])
      if (blocked.length) fail(409, 'Reactiva primero a los jugadores retirados de esta pareja. Su retiro sigue vigente en este torneo.')
    }
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
    if (body.retirado) {
      await conn.query(`INSERT IGNORE INTO torneo_grupo_historial (torneo_id,equipo_id,categoria_id,grupo)
        SELECT torneo_id,equipo_id,categoria_id,grupo FROM torneo_grupo_parejas
        WHERE torneo_id=? AND ${body.tipo === 'pareja' ? 'equipo_id=?' :
          'equipo_id IN (SELECT id FROM equipos_padel WHERE jugador1_id=? OR jugador2_id=?)'}`,
        [torneoId, participant, ...(body.tipo === 'jugador' ? [participant] : [])])
      if (body.tipo === 'pareja') {
        await conn.query('DELETE FROM torneo_grupo_parejas WHERE torneo_id=? AND equipo_id=?', [
          torneoId,
          participant,
        ])
      } else if (body.tipo === 'jugador') {
        await conn.query(
          `DELETE FROM torneo_grupo_parejas WHERE torneo_id=? AND equipo_id IN (
            SELECT id FROM equipos_padel WHERE jugador1_id=? OR jugador2_id=?
          )`,
          [torneoId, participant, participant]
        )
      }
    }
    await conn.commit()
    return {
      message: body.retirado
        ? 'Retiro registrado y cupo del grupo liberado. Se conserva el grupo histórico de los resultados. Revisa los partidos pendientes: no se cancelaron automáticamente.'
        : 'Participación reactivada en este torneo. Revisa su asignación de grupo antes de programar partidos; no se ocupa automáticamente un cupo.',
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
    `SELECT a.id, a.tipo, a.participante_id, a.actor_id, a.retirado, a.motivo, a.created_at,
            u.nombre AS actor_nombre, u.email AS actor_email, u.rol AS actor_rol,
            CASE
              WHEN a.tipo = 'pareja' THEN e.nombre
              WHEN a.tipo = 'jugador' THEN CONCAT_WS(' ', j.nombre, j.apellido)
              ELSE NULL
            END AS participante_nombre
     FROM auditoria_retiros a
     LEFT JOIN users u ON u.id = a.actor_id
     LEFT JOIN equipos_padel e ON a.tipo = 'pareja' AND e.id = a.participante_id
     LEFT JOIN jugadores j ON a.tipo = 'jugador' AND j.id = a.participante_id
     WHERE a.torneo_id=?
     ORDER BY a.id DESC
     LIMIT 100`,
    [id(torneoId)]
  )
  return rows
}
