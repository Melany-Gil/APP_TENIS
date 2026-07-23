const db = require('../../config/db')

const MATCH_SELECT = `
  SELECT
    p.id,
    p.deporte,
    p.estado,
    p.ganador,
    p.fecha_inicio,
    p.hora_inicio,
    p.notas,
    cat.id     AS categoria_id,
    cat.nombre AS categoria_nombre,
    j1.id       AS j1_id,
    j1.nombre   AS j1_nombre,
    j1.apellido AS j1_apellido,
    ct1.flag    AS j1_flag,
    st1.ranking AS j1_ranking,
    j2.id       AS j2_id,
    j2.nombre   AS j2_nombre,
    j2.apellido AS j2_apellido,
    ct2.flag    AS j2_flag,
    st2.ranking AS j2_ranking,
    e1.id     AS e1_id,
    e1.nombre AS e1_nombre,
    e2.id     AS e2_id,
    e2.nombre AS e2_nombre
  FROM partidos p
  LEFT JOIN categorias cat ON cat.id = p.categoria_id
  LEFT JOIN jugadores j1 ON j1.id = p.jugador1_id
  LEFT JOIN countries ct1 ON ct1.id = j1.country_id
  LEFT JOIN jugador_stats st1
    ON st1.jugador_id = j1.id AND st1.temporada = YEAR(CURDATE())
  LEFT JOIN jugadores j2 ON j2.id = p.jugador2_id
  LEFT JOIN countries ct2 ON ct2.id = j2.country_id
  LEFT JOIN jugador_stats st2
    ON st2.jugador_id = j2.id AND st2.temporada = YEAR(CURDATE())
  LEFT JOIN equipos_padel e1 ON e1.id = p.equipo1_id
  LEFT JOIN equipos_padel e2 ON e2.id = p.equipo2_id
`

exports.getAll = async ({ estado, deporte, categoria_id, fecha, jugador, desde, hasta }) => {
  let query = `${MATCH_SELECT} WHERE 1 = 1`
  const params = []

  if (estado) {
    query += ' AND p.estado = ?'
    params.push(estado)
  }
  if (deporte) {
    query += ' AND p.deporte = ?'
    params.push(deporte)
  }
  if (categoria_id) {
    query += ' AND p.categoria_id = ?'
    params.push(categoria_id)
  }
  if (fecha) {
    query += ' AND p.fecha_inicio = ?'
    params.push(fecha)
  }
  if (desde) {
    query += ' AND p.fecha_inicio >= ?'
    params.push(desde)
  }
  if (hasta) {
    query += ' AND p.fecha_inicio <= ?'
    params.push(hasta)
  }
  if (jugador) {
    query += ` AND (
      CONCAT_WS(' ', j1.nombre, j1.apellido) LIKE ?
      OR CONCAT_WS(' ', j2.nombre, j2.apellido) LIKE ?
      OR e1.nombre LIKE ?
      OR e2.nombre LIKE ?
    )`
    const term = `%${jugador.trim()}%`
    params.push(term, term, term, term)
  }

  query += ' ORDER BY p.fecha_inicio IS NULL, p.fecha_inicio DESC, p.hora_inicio DESC, p.id DESC'

  const [rows] = await db.query(query, params)
  if (!rows.length) return []

  const ids = rows.map((row) => row.id)
  const placeholders = ids.map(() => '?').join(',')
  const [sets] = await db.query(
    `SELECT partido_id, numero_set, games_j1, games_j2, tiebreak_j1, tiebreak_j2, completado
     FROM sets_partido
     WHERE partido_id IN (${placeholders})
     ORDER BY partido_id, numero_set`,
    ids
  )
  const setsByMatch = new Map()
  for (const set of sets) {
    if (!setsByMatch.has(set.partido_id)) setsByMatch.set(set.partido_id, [])
    setsByMatch.get(set.partido_id).push(formatSet(set))
  }

  return rows.map((row) => ({
    ...formatSummary(row),
    sets: setsByMatch.get(row.id) || [],
  }))
}

exports.getById = async (id) => {
  const [rows] = await db.query(`${MATCH_SELECT} WHERE p.id = ? LIMIT 1`, [id])

  if (!rows.length) throw { status: 404, message: 'Partido no encontrado' }

  const [sets] = await db.query(
    `SELECT numero_set, games_j1, games_j2, tiebreak_j1, tiebreak_j2, completado
     FROM sets_partido
     WHERE partido_id = ?
     ORDER BY numero_set ASC`,
    [id]
  )

  return {
    ...formatSummary(rows[0]),
    sets: sets.map(formatSet),
  }
}

exports.create = async (body, created_by) => {
  const match = await validateBasicMatch(body)
  const [result] = await db.query(
    `INSERT INTO partidos
       (deporte, categoria_id, jugador1_id, jugador2_id, equipo1_id, equipo2_id,
        estado, fecha_inicio, hora_inicio, notas, created_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      match.deporte,
      match.categoria_id,
      match.jugador1_id,
      match.jugador2_id,
      match.equipo1_id,
      match.equipo2_id,
      match.estado,
      match.fecha_inicio,
      match.hora_inicio,
      match.notas,
      created_by,
    ]
  )

  return exports.getById(result.insertId)
}

exports.update = async (id, body) => {
  const [existing] = await db.query('SELECT id FROM partidos WHERE id = ?', [id])
  if (!existing.length) throw { status: 404, message: 'Partido no encontrado' }

  const match = await validateBasicMatch(body)
  await db.query(
    `UPDATE partidos
     SET deporte = ?, categoria_id = ?, jugador1_id = ?, jugador2_id = ?,
         equipo1_id = ?, equipo2_id = ?, estado = ?, fecha_inicio = ?, hora_inicio = ?, notas = ?
     WHERE id = ?`,
    [
      match.deporte,
      match.categoria_id,
      match.jugador1_id,
      match.jugador2_id,
      match.equipo1_id,
      match.equipo2_id,
      match.estado,
      match.fecha_inicio,
      match.hora_inicio,
      match.notas,
      id,
    ]
  )

  return exports.getById(id)
}

exports.updateMarcador = async (id, { sets, estado, ganador }) => {
  const [existing] = await db.query('SELECT id FROM partidos WHERE id = ?', [id])
  if (!existing.length) throw { status: 404, message: 'Partido no encontrado' }

  if (!Array.isArray(sets) || sets.length < 1 || sets.length > 3) {
    throw { status: 400, message: 'El marcador debe contener entre uno y tres sets' }
  }
  if (!['programado', 'en_vivo', 'finalizado', 'cancelado'].includes(estado)) {
    throw { status: 400, message: 'Estado de partido inválido' }
  }
  if (ganador && !['jugador1', 'jugador2'].includes(ganador)) {
    throw { status: 400, message: 'Ganador inválido' }
  }

  const seen = new Set()
  for (const set of sets) {
    const validSet = Number.isInteger(set.numero_set) && set.numero_set >= 1 && set.numero_set <= 3
    const validScores = [set.games_j1, set.games_j2].every(
      (score) => Number.isInteger(score) && score >= 0 && score <= 99
    )
    if (!validSet || !validScores || seen.has(set.numero_set)) {
      throw { status: 400, message: 'Los datos de los sets no son válidos' }
    }
    seen.add(set.numero_set)
  }

  const connection = await db.getConnection()
  try {
    await connection.beginTransaction()
    await connection.query('UPDATE partidos SET estado = ?, ganador = ? WHERE id = ?', [
      estado,
      ganador || null,
      id,
    ])

    for (const set of sets) {
      await connection.query(
        `INSERT INTO sets_partido
           (partido_id, numero_set, games_j1, games_j2, tiebreak_j1, tiebreak_j2, completado)
         VALUES (?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
           games_j1    = VALUES(games_j1),
           games_j2    = VALUES(games_j2),
           tiebreak_j1 = VALUES(tiebreak_j1),
           tiebreak_j2 = VALUES(tiebreak_j2),
           completado  = VALUES(completado)`,
        [
          id,
          set.numero_set,
          set.games_j1,
          set.games_j2,
          set.tiebreak_j1 ?? null,
          set.tiebreak_j2 ?? null,
          set.completado ? 1 : 0,
        ]
      )
    }

    await connection.commit()
  } catch (error) {
    await connection.rollback()
    throw error
  } finally {
    connection.release()
  }

  return exports.getById(id)
}

exports.remove = async (id) => {
  const [existing] = await db.query('SELECT id FROM partidos WHERE id = ?', [id])
  if (!existing.length) throw { status: 404, message: 'Partido no encontrado' }

  await db.query('DELETE FROM sets_partido WHERE partido_id = ?', [id])
  await db.query('DELETE FROM partidos WHERE id = ?', [id])

  return { message: 'Partido eliminado correctamente' }
}

async function validateBasicMatch(body) {
  const deporte = body.deporte
  const categoriaId = Number(body.categoria_id)
  const fechaInicio = normalizeOptionalDate(body.fecha_inicio)
  const horaInicio = normalizeOptionalTime(body.hora_inicio)
  const estado = body.estado || 'programado'

  if (!['tenis', 'padel'].includes(deporte)) {
    throw { status: 400, message: 'Selecciona un deporte válido' }
  }
  if (!Number.isInteger(categoriaId) || categoriaId < 1) {
    throw { status: 400, message: 'Selecciona la categoría del partido' }
  }
  if (!['programado', 'en_vivo', 'finalizado', 'cancelado'].includes(estado)) {
    throw { status: 400, message: 'Selecciona un estado válido' }
  }

  const [categories] = await db.query('SELECT deporte FROM categorias WHERE id = ? LIMIT 1', [
    categoriaId,
  ])
  if (!categories.length) {
    throw { status: 400, message: 'La categoría seleccionada no existe' }
  }
  if (![deporte, 'ambos'].includes(categories[0].deporte)) {
    throw { status: 400, message: 'La categoría no corresponde al deporte del partido' }
  }

  const jugador1Id = positiveId(body.jugador1_id)
  const jugador2Id = positiveId(body.jugador2_id)
  const equipo1Id = positiveId(body.equipo1_id)
  const equipo2Id = positiveId(body.equipo2_id)

  if (deporte === 'tenis' && (!jugador1Id || !jugador2Id || jugador1Id === jugador2Id)) {
    throw { status: 400, message: 'Selecciona dos jugadores diferentes' }
  }
  if (deporte === 'padel' && (!equipo1Id || !equipo2Id || equipo1Id === equipo2Id)) {
    throw { status: 400, message: 'Selecciona dos equipos diferentes' }
  }

  return {
    deporte,
    categoria_id: categoriaId,
    jugador1_id: deporte === 'tenis' ? jugador1Id : null,
    jugador2_id: deporte === 'tenis' ? jugador2Id : null,
    equipo1_id: deporte === 'padel' ? equipo1Id : null,
    equipo2_id: deporte === 'padel' ? equipo2Id : null,
    estado,
    fecha_inicio: fechaInicio,
    hora_inicio: horaInicio,
    notas: String(body.notas || '').trim() || null,
  }
}

function normalizeOptionalDate(value) {
  const date = String(value || '').trim()
  if (!date) return null
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(new Date(`${date}T00:00:00`).getTime())) {
    throw { status: 400, message: 'La fecha del partido no es válida' }
  }
  return date
}

function normalizeOptionalTime(value) {
  const time = String(value || '').trim()
  if (!time) return null
  if (!/^([01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/.test(time)) {
    throw { status: 400, message: 'La hora del partido no es válida' }
  }
  return time
}

function positiveId(value) {
  const parsed = Number(value)
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null
}

function formatSummary(row) {
  const match = {
    id: row.id,
    deporte: row.deporte,
    estado: row.estado,
    ganador: row.ganador,
    fecha_inicio: row.fecha_inicio || null,
    hora_inicio: row.hora_inicio || null,
    notas: row.notas || null,
    categoria: row.categoria_id
      ? {
          id: row.categoria_id,
          nombre: row.categoria_nombre,
        }
      : null,
  }

  if (row.deporte === 'padel') {
    match.equipo1 = { id: row.e1_id, nombre: row.e1_nombre }
    match.equipo2 = { id: row.e2_id, nombre: row.e2_nombre }
  } else {
    match.jugador1 = {
      id: row.j1_id,
      nombre: row.j1_nombre,
      apellido: row.j1_apellido,
      flag: row.j1_flag,
      ranking: row.j1_ranking || null,
    }
    match.jugador2 = {
      id: row.j2_id,
      nombre: row.j2_nombre,
      apellido: row.j2_apellido,
      flag: row.j2_flag,
      ranking: row.j2_ranking || null,
    }
  }

  return match
}

function formatSet(set) {
  return {
    numero_set: set.numero_set,
    games_j1: set.games_j1,
    games_j2: set.games_j2,
    tiebreak_j1: set.tiebreak_j1 ?? null,
    tiebreak_j2: set.tiebreak_j2 ?? null,
    completado: Boolean(set.completado),
  }
}
