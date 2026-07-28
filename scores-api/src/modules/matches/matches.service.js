const db = require('../../config/db')

const MAX_SETS = 127

const MATCH_SELECT = `
  SELECT
    p.id,
    p.deporte,
    p.estado,
    p.ganador,
    p.fecha_inicio,
    p.hora_inicio,
    p.notas,
    p.origen_partido1_id,
    p.origen_partido2_id,
    cat.id     AS categoria_id,
    cat.nombre AS categoria_nombre,
    j1.id       AS j1_id,
    j1.nombre   AS j1_nombre,
    j1.apellido AS j1_apellido,
    j2.id       AS j2_id,
    j2.nombre   AS j2_nombre,
    j2.apellido AS j2_apellido,
    e1.id     AS e1_id,
    e1.nombre AS e1_nombre,
    e2.id     AS e2_id,
    e2.nombre AS e2_nombre,
    op1j1.nombre   AS op1_j1_nombre,
    op1j1.apellido AS op1_j1_apellido,
    op1j2.nombre   AS op1_j2_nombre,
    op1j2.apellido AS op1_j2_apellido,
    op1e1.nombre   AS op1_e1_nombre,
    op1e2.nombre   AS op1_e2_nombre,
    op2j1.nombre   AS op2_j1_nombre,
    op2j1.apellido AS op2_j1_apellido,
    op2j2.nombre   AS op2_j2_nombre,
    op2j2.apellido AS op2_j2_apellido,
    op2e1.nombre   AS op2_e1_nombre,
    op2e2.nombre   AS op2_e2_nombre
  FROM partidos p
  LEFT JOIN categorias cat ON cat.id = p.categoria_id
  LEFT JOIN jugadores j1 ON j1.id = p.jugador1_id
  LEFT JOIN jugadores j2 ON j2.id = p.jugador2_id
  LEFT JOIN equipos_padel e1 ON e1.id = p.equipo1_id
  LEFT JOIN equipos_padel e2 ON e2.id = p.equipo2_id
  LEFT JOIN partidos op1 ON op1.id = p.origen_partido1_id
  LEFT JOIN jugadores op1j1 ON op1j1.id = op1.jugador1_id
  LEFT JOIN jugadores op1j2 ON op1j2.id = op1.jugador2_id
  LEFT JOIN equipos_padel op1e1 ON op1e1.id = op1.equipo1_id
  LEFT JOIN equipos_padel op1e2 ON op1e2.id = op1.equipo2_id
  LEFT JOIN partidos op2 ON op2.id = p.origen_partido2_id
  LEFT JOIN jugadores op2j1 ON op2j1.id = op2.jugador1_id
  LEFT JOIN jugadores op2j2 ON op2j2.id = op2.jugador2_id
  LEFT JOIN equipos_padel op2e1 ON op2e1.id = op2.equipo1_id
  LEFT JOIN equipos_padel op2e2 ON op2e2.id = op2.equipo2_id
`

exports.getAll = async ({ estado, deporte, categoria_id, fecha, jugador, desde, hasta, orden }) => {
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

  const direction = orden === 'asc' ? 'ASC' : 'DESC'
  query += ` ORDER BY p.fecha_inicio IS NULL, p.fecha_inicio ${direction},
             p.hora_inicio IS NULL, p.hora_inicio ${direction}, p.id ${direction}`

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
        estado, fecha_inicio, hora_inicio, notas, origen_partido1_id, origen_partido2_id,
        created_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
      match.origen_partido1_id,
      match.origen_partido2_id,
      created_by,
    ]
  )

  return exports.getById(result.insertId)
}

exports.update = async (id, body) => {
  const [existing] = await db.query('SELECT id FROM partidos WHERE id = ?', [id])
  if (!existing.length) throw { status: 404, message: 'Partido no encontrado' }

  const match = await validateBasicMatch(body, Number(id))
  await db.query(
    `UPDATE partidos
     SET deporte = ?, categoria_id = ?, jugador1_id = ?, jugador2_id = ?,
         equipo1_id = ?, equipo2_id = ?, estado = ?, fecha_inicio = ?, hora_inicio = ?, notas = ?,
         origen_partido1_id = ?, origen_partido2_id = ?
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
      match.origen_partido1_id,
      match.origen_partido2_id,
      id,
    ]
  )

  return exports.getById(id)
}

exports.updateMarcador = async (id, { sets, estado, ganador }) => {
  const [existing] = await db.query(
    `SELECT id, deporte, jugador1_id, jugador2_id, equipo1_id, equipo2_id
     FROM partidos
     WHERE id = ?`,
    [id]
  )
  if (!existing.length) throw { status: 404, message: 'Partido no encontrado' }

  if (!Array.isArray(sets) || sets.length < 1 || sets.length > MAX_SETS) {
    throw { status: 400, message: `El marcador debe contener entre uno y ${MAX_SETS} sets` }
  }
  if (!['programado', 'en_vivo', 'finalizado', 'cancelado'].includes(estado)) {
    throw { status: 400, message: 'Estado de partido inválido' }
  }
  if (ganador && !['jugador1', 'jugador2'].includes(ganador)) {
    throw { status: 400, message: 'Ganador inválido' }
  }
  if (estado === 'finalizado' && (!ganador || !getWinnerParticipantId(existing[0], ganador))) {
    throw {
      status: 400,
      message: 'No se puede finalizar el partido hasta conocer ambos participantes y el ganador',
    }
  }

  const seen = new Set()
  for (const set of sets) {
    const validSet =
      Number.isInteger(set.numero_set) && set.numero_set >= 1 && set.numero_set <= MAX_SETS
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

    const setPlaceholders = sets.map(() => '?').join(',')
    await connection.query(
      `DELETE FROM sets_partido
       WHERE partido_id = ? AND numero_set NOT IN (${setPlaceholders})`,
      [id, ...sets.map((set) => set.numero_set)]
    )

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

    await propagateWinner(connection, existing[0], estado, ganador)
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

  const [dependents] = await db.query(
    `SELECT id
     FROM partidos
     WHERE origen_partido1_id = ? OR origen_partido2_id = ?
     LIMIT 1`,
    [id, id]
  )
  if (dependents.length) {
    throw {
      status: 409,
      message: 'No puedes eliminar este partido porque su ganador participa en otro encuentro',
    }
  }

  await db.query('DELETE FROM sets_partido WHERE partido_id = ?', [id])
  await db.query('DELETE FROM partidos WHERE id = ?', [id])

  return { message: 'Partido eliminado correctamente' }
}

async function validateBasicMatch(body, currentMatchId = null) {
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
  const source1Id = positiveId(body.origen_partido1_id)
  const source2Id = positiveId(body.origen_partido2_id)

  if (source1Id && source2Id && source1Id === source2Id) {
    throw { status: 400, message: 'Cada participante debe provenir de un partido diferente' }
  }

  const source1 = source1Id
    ? await resolveMatchSource(source1Id, deporte, categoriaId, currentMatchId)
    : null
  const source2 = source2Id
    ? await resolveMatchSource(source2Id, deporte, categoriaId, currentMatchId)
    : null

  const resolvedPlayer1 =
    deporte === 'tenis' ? (source1Id ? source1.participantId : jugador1Id) : null
  const resolvedPlayer2 =
    deporte === 'tenis' ? (source2Id ? source2.participantId : jugador2Id) : null
  const resolvedTeam1 = deporte === 'padel' ? (source1Id ? source1.participantId : equipo1Id) : null
  const resolvedTeam2 = deporte === 'padel' ? (source2Id ? source2.participantId : equipo2Id) : null

  if (
    deporte === 'tenis' &&
    ((!resolvedPlayer1 && !source1Id) || (!resolvedPlayer2 && !source2Id))
  ) {
    throw { status: 400, message: 'Selecciona un jugador o un partido de origen para cada lado' }
  }
  if (deporte === 'padel' && ((!resolvedTeam1 && !source1Id) || (!resolvedTeam2 && !source2Id))) {
    throw { status: 400, message: 'Selecciona un equipo o un partido de origen para cada lado' }
  }
  if (resolvedPlayer1 && resolvedPlayer2 && resolvedPlayer1 === resolvedPlayer2) {
    throw { status: 400, message: 'Los jugadores del partido deben ser diferentes' }
  }
  if (resolvedTeam1 && resolvedTeam2 && resolvedTeam1 === resolvedTeam2) {
    throw { status: 400, message: 'Los equipos del partido deben ser diferentes' }
  }

  return {
    deporte,
    categoria_id: categoriaId,
    jugador1_id: resolvedPlayer1,
    jugador2_id: resolvedPlayer2,
    equipo1_id: resolvedTeam1,
    equipo2_id: resolvedTeam2,
    origen_partido1_id: source1Id,
    origen_partido2_id: source2Id,
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

async function resolveMatchSource(sourceId, deporte, categoriaId, currentMatchId) {
  if (currentMatchId && sourceId >= currentMatchId) {
    throw { status: 400, message: 'El partido de origen debe ser anterior al partido actual' }
  }

  const [rows] = await db.query(
    `SELECT id, deporte, categoria_id, estado, ganador,
            jugador1_id, jugador2_id, equipo1_id, equipo2_id
     FROM partidos
     WHERE id = ?
     LIMIT 1`,
    [sourceId]
  )
  if (!rows.length) {
    throw { status: 400, message: `El partido de origen #${sourceId} no existe` }
  }

  const source = rows[0]
  if (source.deporte !== deporte || Number(source.categoria_id) !== categoriaId) {
    throw {
      status: 400,
      message: 'El partido de origen debe pertenecer al mismo deporte y categoría',
    }
  }

  return {
    participantId:
      source.estado === 'finalizado' && source.ganador
        ? getWinnerParticipantId(source, source.ganador)
        : null,
  }
}

function getWinnerParticipantId(match, winner) {
  const position = winner === 'jugador1' ? 1 : winner === 'jugador2' ? 2 : null
  if (!position) return null
  return match.deporte === 'padel'
    ? match[`equipo${position}_id`] || null
    : match[`jugador${position}_id`] || null
}

async function propagateWinner(connection, match, estado, ganador) {
  const participantId =
    estado === 'finalizado' && ganador ? getWinnerParticipantId(match, ganador) : null
  const participantColumn = match.deporte === 'padel' ? 'equipo' : 'jugador'

  await connection.query(
    `UPDATE partidos
     SET ${participantColumn}1_id = ?
     WHERE origen_partido1_id = ?`,
    [participantId, match.id]
  )
  await connection.query(
    `UPDATE partidos
     SET ${participantColumn}2_id = ?
     WHERE origen_partido2_id = ?`,
    [participantId, match.id]
  )
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
    origen_partido1: formatMatchSource(row, 1),
    origen_partido2: formatMatchSource(row, 2),
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
    }
    match.jugador2 = {
      id: row.j2_id,
      nombre: row.j2_nombre,
      apellido: row.j2_apellido,
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

function formatMatchSource(row, position) {
  const sourceId = row[`origen_partido${position}_id`]
  if (!sourceId) return null

  const prefix = `op${position}`
  const participant1 =
    row.deporte === 'padel'
      ? row[`${prefix}_e1_nombre`]
      : [row[`${prefix}_j1_nombre`], row[`${prefix}_j1_apellido`]].filter(Boolean).join(' ')
  const participant2 =
    row.deporte === 'padel'
      ? row[`${prefix}_e2_nombre`]
      : [row[`${prefix}_j2_nombre`], row[`${prefix}_j2_apellido`]].filter(Boolean).join(' ')

  return {
    id: sourceId,
    participante1: participant1 || null,
    participante2: participant2 || null,
  }
}
