const db = require('../../config/db')
const fail = (status, message) => {
  throw Object.assign(new Error(message), { status })
}
const validId = (v) => {
  const n = Number(v)
  if (!Number.isSafeInteger(n) || n < 1) fail(400, 'Identificador inválido')
  return n
}

exports.getByTorneo = async (torneoId) => {
  torneoId = validId(torneoId)
  const [torneo] = await db.query('SELECT id, nombre, modalidad FROM torneos WHERE id = ?', [
    torneoId,
  ])
  if (!torneo.length) {
    throw { status: 404, message: 'Torneo no encontrado' }
  }

  const [inscripciones] = await db.query(
    `SELECT
       i.id AS inscripcion_id,
       i.torneo_id,
       i.equipo_id,
       i.estado,
       i.created_at,
       e.nombre AS equipo_nombre,
       e.categoria_id,
       COALESCE(cat.nombre, 'Sin Categoría') AS categoria_nombre,
       COALESCE(cat.orden, 99) AS categoria_orden,
       j1.id AS j1_id, j1.nombre AS j1_nombre, j1.apellido AS j1_apellido, j1.foto AS j1_foto,
       j2.id AS j2_id, j2.nombre AS j2_nombre, j2.apellido AS j2_apellido, j2.foto AS j2_foto
     FROM inscripciones i
     INNER JOIN equipos_padel e ON e.id = i.equipo_id
     LEFT JOIN categorias cat ON cat.id = e.categoria_id
     LEFT JOIN jugadores j1 ON j1.id = e.jugador1_id
     LEFT JOIN jugadores j2 ON j2.id = e.jugador2_id
     WHERE i.torneo_id = ? AND i.estado != 'eliminado'
     ORDER BY cat.orden ASC, e.nombre ASC`,
    [torneoId]
  )

  // Obtener estadísticas sencillas (PJ, PG, PP) de los partidos de este torneo
  const [partidos] = await db.query(
    `SELECT equipo1_id, equipo2_id, ganador
     FROM partidos
     WHERE torneo_id = ? AND estado = 'finalizado' AND ganador IN ('jugador1','jugador2')`,
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

  // Agrupar por categoría
  const categoriasMap = new Map()
  for (const row of inscripciones) {
    const catName = row.categoria_nombre
    if (!categoriasMap.has(catName)) {
      categoriasMap.set(catName, {
        categoria_id: row.categoria_id,
        categoria_nombre: catName,
        categoria_orden: row.categoria_orden,
        parejas: [],
      })
    }

    const teamStats = statsMap.get(row.equipo_id) || { pj: 0, pg: 0, pp: 0 }

    categoriasMap.get(catName).parejas.push({
      inscripcion_id: row.inscripcion_id,
      equipo_id: row.equipo_id,
      nombre: row.equipo_nombre,
      categoria_id: row.categoria_id,
      categoria_nombre: row.categoria_nombre,
      jugador1: row.j1_id
        ? { id: row.j1_id, nombre: row.j1_nombre, apellido: row.j1_apellido, foto: row.j1_foto }
        : null,
      jugador2: row.j2_id
        ? { id: row.j2_id, nombre: row.j2_nombre, apellido: row.j2_apellido, foto: row.j2_foto }
        : null,
      pj: teamStats.pj,
      pg: teamStats.pg,
      pp: teamStats.pp,
      estado: row.estado,
    })
  }

  const categorias = Array.from(categoriasMap.values()).sort(
    (a, b) =>
      a.categoria_orden - b.categoria_orden || a.categoria_nombre.localeCompare(b.categoria_nombre)
  )

  return {
    torneo: torneo[0],
    total_parejas: inscripciones.length,
    categorias,
    inscripciones_raw: inscripciones.map((row) => ({
      ...row,
      ...(statsMap.get(row.equipo_id) || { pj: 0, pg: 0, pp: 0 }),
    })),
  }
}

exports.inscribirBulk = async (torneoId, equipoIds) => {
  torneoId = validId(torneoId)
  if (!Array.isArray(equipoIds) || equipoIds.length < 1 || equipoIds.length > 200)
    fail(400, 'Selecciona entre 1 y 200 parejas')
  const ids = [...new Set(equipoIds.map(validId))].sort((a, b) => a - b)
  const conn = await db.getConnection()
  try {
    await conn.beginTransaction()
    const [tournaments] = await conn.query(
      'SELECT id,deporte,modalidad,categoria_id,estado FROM torneos WHERE id=? FOR UPDATE',
      [torneoId]
    )
    if (!tournaments.length) fail(404, 'Torneo no encontrado')
    const t = tournaments[0]
    if (t.modalidad !== 'dobles')
      fail(400, 'La inscripción de parejas requiere un torneo de dobles')
    if (['finalizado', 'cancelado'].includes(t.estado))
      fail(409, 'No se pueden añadir parejas a un torneo cerrado')
    const [teams] = await conn.query(
      'SELECT id,deporte,categoria_id,jugador1_id,jugador2_id,activo FROM equipos_padel WHERE id IN (?) FOR UPDATE',
      [ids]
    )
    if (
      teams.length !== ids.length ||
      teams.some(
        (e) =>
          !e.activo ||
          e.deporte !== t.deporte ||
          (t.categoria_id && Number(e.categoria_id) !== Number(t.categoria_id))
      )
    )
      fail(
        400,
        'Todas las parejas deben estar activas y corresponder al deporte y categoría del torneo'
      )
    const players = [...new Set(teams.flatMap((e) => [e.jugador1_id, e.jugador2_id]))]
    const [active] = await conn.query(
      'SELECT id FROM jugadores WHERE id IN (?) AND activo=TRUE FOR UPDATE',
      [players]
    )
    if (active.length !== players.length)
      fail(400, 'Las parejas deben tener ambos jugadores activos')
    for (const id of ids) {
      const [existing] = await conn.query(
        'SELECT id FROM inscripciones WHERE torneo_id=? AND equipo_id=? FOR UPDATE',
        [torneoId, id]
      )
      if (existing.length)
        await conn.query(
          "UPDATE inscripciones SET estado='confirmado' WHERE torneo_id=? AND equipo_id=?",
          [torneoId, id]
        )
      else
        await conn.query(
          "INSERT INTO inscripciones (torneo_id,equipo_id,estado) VALUES (?,?,'confirmado')",
          [torneoId, id]
        )
    }
    await conn.commit()
    return { total_procesadas: ids.length, message: ids.length + ' parejas confirmadas' }
  } catch (e) {
    await conn.rollback()
    throw e
  } finally {
    conn.release()
  }
}
exports.removeInscripcion = async (torneoId, equipoId) => {
  torneoId = validId(torneoId)
  equipoId = validId(equipoId)
  const conn = await db.getConnection()
  try {
    await conn.beginTransaction()
    const [t] = await conn.query('SELECT id FROM torneos WHERE id=? FOR UPDATE', [torneoId])
    if (!t.length) fail(404, 'Torneo no encontrado')
    const [matches] = await conn.query(
      "SELECT id FROM partidos WHERE torneo_id=? AND (equipo1_id=? OR equipo2_id=?) AND estado<>'cancelado' LIMIT 1 FOR UPDATE",
      [torneoId, equipoId, equipoId]
    )
    if (matches.length)
      fail(
        409,
        'No puedes retirar esta pareja: tiene partidos programados, en juego o finalizados en este torneo. Revisa sus partidos para conservar el historial.'
      )
    const [result] = await conn.query(
      'DELETE FROM inscripciones WHERE torneo_id=? AND equipo_id=?',
      [torneoId, equipoId]
    )
    if (!result.affectedRows) fail(404, 'La pareja no está inscrita')
    await conn.commit()
    return { message: 'Inscripción retirada; la pareja y sus jugadores se conservan' }
  } catch (e) {
    await conn.rollback()
    throw e
  } finally {
    conn.release()
  }
}
