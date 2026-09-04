const db = require('../../config/db')

const MAX_SETS = 127

const MATCH_SELECT = `
  SELECT
    p.id,
    p.torneo_id,
    p.deporte,
    p.estado,
    p.ganador,
    p.fecha_inicio,
    p.hora_inicio,
    p.fase,
    p.grupo,
    p.ronda,
    p.notas,
    p.origen_partido1_id,
    p.origen_partido2_id,
    p.juez_id,
    p.cancha_id,
    p.mejor_de_sets,
    p.juegos_por_set,
    p.diferencia_juegos,
    p.modo_game,
    p.set_decisivo,
    p.tiebreak_en,
    p.tiebreak_puntos,
    p.match_tiebreak_puntos,
    p.servidor_inicial,
    (
      SELECT ep.marcador_despues
      FROM eventos_partido ep
      WHERE ep.partido_id = p.id AND ep.anulado_at IS NULL
      ORDER BY ep.secuencia DESC
      LIMIT 1
    ) AS marcador_actual,
    uj.nombre AS juez_nombre,
    uj.apellido AS juez_apellido,
    ch.nombre AS cancha_nombre,
    ch.superficie AS cancha_superficie,
    s.id AS sede_id,
    s.nombre AS sede_nombre,
    ev.iniciado_at,
    ev.pausado_at,
    ev.segundos_pausa,
    ev.finalizado_at,
    cat.id     AS categoria_id,
    cat.nombre AS categoria_nombre,
    t.nombre AS torneo_nombre,
    t.modalidad AS torneo_modalidad,
    t.sistema AS torneo_sistema,
    j1.id       AS j1_id,
    j1.nombre   AS j1_nombre,
    j1.apellido AS j1_apellido,
    j1.foto     AS j1_foto,
    j2.id       AS j2_id,
    j2.nombre   AS j2_nombre,
    j2.apellido AS j2_apellido,
    j2.foto     AS j2_foto,
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
  LEFT JOIN torneos t ON t.id = p.torneo_id
  LEFT JOIN categorias cat ON cat.id = p.categoria_id
  LEFT JOIN jugadores j1 ON j1.id = p.jugador1_id
  LEFT JOIN jugadores j2 ON j2.id = p.jugador2_id
  LEFT JOIN equipos_padel e1 ON e1.id = p.equipo1_id
  LEFT JOIN equipos_padel e2 ON e2.id = p.equipo2_id
  LEFT JOIN users uj ON uj.id = p.juez_id
  LEFT JOIN canchas ch ON ch.id = p.cancha_id
  LEFT JOIN sedes s ON s.id = ch.sede_id
  LEFT JOIN estado_en_vivo_partido ev ON ev.partido_id = p.id
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

exports.getAll = async ({
  estado,
  deporte,
  categoria_id,
  fecha,
  jugador,
  desde,
  hasta,
  orden,
  juez_id,
  cancha_id,
  torneo_id,
}) => {
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
  if (juez_id) {
    query += ' AND p.juez_id = ?'
    params.push(juez_id)
  }
  if (cancha_id) {
    query += ' AND p.cancha_id = ?'
    params.push(cancha_id)
  }
  if (torneo_id) {
    query += ' AND p.torneo_id = ?'
    params.push(torneo_id)
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

exports.getMyMatches = async (userId) => {
  const [playerRows] = await db.query(
    `SELECT id, nombre, apellido, foto
     FROM jugadores
     WHERE user_id = ?
     LIMIT 1`,
    [userId]
  )
  if (!playerRows.length) {
    throw { status: 404, message: 'Tu cuenta todavía no está vinculada a un jugador' }
  }

  const player = playerRows[0]
  const [rows] = await db.query(
    `${MATCH_SELECT}
     WHERE p.jugador1_id = ? OR p.jugador2_id = ?
     ORDER BY p.fecha_inicio IS NULL, p.fecha_inicio DESC,
              p.hora_inicio IS NULL, p.hora_inicio DESC, p.id DESC`,
    [player.id, player.id]
  )

  if (!rows.length) {
    return {
      jugador: {
        id: player.id,
        nombre: player.nombre,
        apellido: player.apellido,
        foto: player.foto || null,
      },
      en_vivo: [],
      proximos: [],
      historial: [],
    }
  }

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

  const matches = rows.map((row) => {
    const match = { ...formatSummary(row), sets: setsByMatch.get(row.id) || [] }
    const mySide = Number(row.j1_id) === Number(player.id) ? 'jugador1' : 'jugador2'
    return {
      ...match,
      mi_lado: mySide,
      resultado:
        match.estado === 'finalizado'
          ? match.ganador === mySide
            ? 'victoria'
            : match.ganador
              ? 'derrota'
              : 'sin_resultado'
          : null,
    }
  })

  const upcoming = matches
    .filter((match) => match.estado === 'programado')
    .sort(compareScheduleAscending)

  return {
    jugador: {
      id: player.id,
      nombre: player.nombre,
      apellido: player.apellido,
      foto: player.foto || null,
    },
    en_vivo: matches.filter((match) => match.estado === 'en_vivo'),
    proximos: upcoming,
    historial: matches.filter((match) => match.estado === 'finalizado'),
  }
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

exports.create = async (body, actor) => {
  const requester = normalizeActor(actor)
  const match = await validateBasicMatch(body)
  const scoring = normalizeScoringConfig(body)
  const judgeId = requester.rol === 'juez' ? requester.id : positiveId(body.juez_id)
  await validateJudge(judgeId)
  const [result] = await db.query(
    `INSERT INTO partidos
       (torneo_id, deporte, categoria_id, jugador1_id, jugador2_id, equipo1_id, equipo2_id,
        estado, fecha_inicio, hora_inicio, fase, grupo, ronda, notas,
        origen_partido1_id, origen_partido2_id,
        created_by, juez_id, cancha_id, mejor_de_sets, juegos_por_set, diferencia_juegos,
        modo_game, set_decisivo, tiebreak_en, tiebreak_puntos, match_tiebreak_puntos,
        servidor_inicial)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      match.torneo_id,
      match.deporte,
      match.categoria_id,
      match.jugador1_id,
      match.jugador2_id,
      match.equipo1_id,
      match.equipo2_id,
      match.estado,
      match.fecha_inicio,
      match.hora_inicio,
      match.fase,
      match.grupo,
      match.ronda,
      match.notas,
      match.origen_partido1_id,
      match.origen_partido2_id,
      requester.id,
      judgeId,
      match.cancha_id,
      scoring.mejor_de_sets,
      scoring.juegos_por_set,
      scoring.diferencia_juegos,
      scoring.modo_game,
      scoring.set_decisivo,
      scoring.tiebreak_en,
      scoring.tiebreak_puntos,
      scoring.match_tiebreak_puntos,
      scoring.servidor_inicial,
    ]
  )

  return exports.getById(result.insertId)
}

exports.update = async (id, body, actor) => {
  const requester = normalizeActor(actor)
  const [existing] = await db.query('SELECT id, juez_id, created_by FROM partidos WHERE id = ?', [
    id,
  ])
  if (!existing.length) throw { status: 404, message: 'Partido no encontrado' }
  assertCanManage(existing[0], requester)

  const match = await validateBasicMatch(body, Number(id))
  const scoring = normalizeScoringConfig(body)
  const judgeId = requester.rol === 'juez' ? requester.id : positiveId(body.juez_id)
  await validateJudge(judgeId)
  await db.query(
    `UPDATE partidos
     SET torneo_id = ?, deporte = ?, categoria_id = ?, jugador1_id = ?, jugador2_id = ?,
         equipo1_id = ?, equipo2_id = ?, estado = ?, fecha_inicio = ?, hora_inicio = ?,
         fase = ?, grupo = ?, ronda = ?, notas = ?,
         origen_partido1_id = ?, origen_partido2_id = ?, juez_id = ?, cancha_id = ?,
         mejor_de_sets = ?, juegos_por_set = ?, diferencia_juegos = ?,
         modo_game = ?, set_decisivo = ?, tiebreak_en = ?, tiebreak_puntos = ?,
         match_tiebreak_puntos = ?, servidor_inicial = ?
     WHERE id = ?`,
    [
      match.torneo_id,
      match.deporte,
      match.categoria_id,
      match.jugador1_id,
      match.jugador2_id,
      match.equipo1_id,
      match.equipo2_id,
      match.estado,
      match.fecha_inicio,
      match.hora_inicio,
      match.fase,
      match.grupo,
      match.ronda,
      match.notas,
      match.origen_partido1_id,
      match.origen_partido2_id,
      judgeId,
      match.cancha_id,
      scoring.mejor_de_sets,
      scoring.juegos_por_set,
      scoring.diferencia_juegos,
      scoring.modo_game,
      scoring.set_decisivo,
      scoring.tiebreak_en,
      scoring.tiebreak_puntos,
      scoring.match_tiebreak_puntos,
      scoring.servidor_inicial,
      id,
    ]
  )

  return exports.getById(id)
}

exports.updateMarcador = async (id, { sets, estado, ganador }, actor) => {
  const requester = normalizeActor(actor)
  const [existing] = await db.query(
    `SELECT p.id, p.deporte, p.jugador1_id, p.jugador2_id, p.equipo1_id, p.equipo2_id,
            p.juez_id, p.created_by, t.modalidad
     FROM partidos p
     LEFT JOIN torneos t ON t.id = p.torneo_id
     WHERE p.id = ?`,
    [id]
  )
  if (!existing.length) throw { status: 404, message: 'Partido no encontrado' }
  assertCanManage(existing[0], requester)

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

    if (estado === 'en_vivo') {
      await connection.query(
        `INSERT INTO estado_en_vivo_partido (partido_id, iniciado_at)
         VALUES (?, CURRENT_TIMESTAMP)
         ON DUPLICATE KEY UPDATE finalizado_at = NULL`,
        [id]
      )
    } else if (estado === 'finalizado' || estado === 'cancelado') {
      await connection.query(
        `UPDATE estado_en_vivo_partido
         SET finalizado_at = COALESCE(finalizado_at, CURRENT_TIMESTAMP), pausado_at = NULL
         WHERE partido_id = ?`,
        [id]
      )
    }

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
  const torneoId = positiveId(body.torneo_id)
  const fechaInicio = normalizeOptionalDate(body.fecha_inicio)
  const horaInicio = normalizeOptionalTime(body.hora_inicio)
  const estado = body.estado || 'programado'

  if (!torneoId) throw { status: 400, message: 'Selecciona el torneo del partido' }
  if (!['programado', 'en_vivo', 'finalizado', 'cancelado'].includes(estado)) {
    throw { status: 400, message: 'Selecciona un estado válido' }
  }

  const [tournaments] = await db.query(
    `SELECT id, deporte, categoria_id, modalidad, sistema, estado
     FROM torneos
     WHERE id = ?
     LIMIT 1`,
    [torneoId]
  )
  if (!tournaments.length) throw { status: 400, message: 'El torneo seleccionado no existe' }

  const tournament = tournaments[0]
  const deporte = tournament.deporte
  const categoriaId = tournament.categoria_id
    ? Number(tournament.categoria_id)
    : positiveId(body.categoria_id)
  const modalidad = tournament.modalidad || (deporte === 'padel' ? 'dobles' : 'individual')
  const fase = normalizePhase(tournament.sistema, body.fase)
  const grupo = fase === 'grupos' ? normalizeOptionalLabel(body.grupo, 20) : null
  const ronda = normalizeOptionalLabel(body.ronda, 50)
  if (!Number.isInteger(categoriaId) || categoriaId < 1) {
    throw { status: 400, message: 'Selecciona la categoría del partido' }
  }
  if (!tournament.categoria_id) {
    const [categories] = await db.query(
      "SELECT id FROM categorias WHERE id = ? AND deporte IN (?, 'ambos') LIMIT 1",
      [categoriaId, deporte]
    )
    if (!categories.length) {
      throw { status: 400, message: 'La categoría no corresponde al deporte del torneo' }
    }
  }

  const jugador1Id = positiveId(body.jugador1_id)
  const jugador2Id = positiveId(body.jugador2_id)
  const equipo1Id = positiveId(body.equipo1_id)
  const equipo2Id = positiveId(body.equipo2_id)
  const source1Id = positiveId(body.origen_partido1_id)
  const source2Id = positiveId(body.origen_partido2_id)
  const canchaId = positiveId(body.cancha_id)

  if (canchaId) {
    const [courts] = await db.query(
      `SELECT id
       FROM canchas
       WHERE id = ? AND activa = TRUE AND deporte IN (?, 'ambos')
       LIMIT 1`,
      [canchaId, deporte]
    )
    if (!courts.length) {
      throw { status: 400, message: 'La cancha seleccionada no está disponible para este deporte' }
    }
  }

  if (source1Id && source2Id && source1Id === source2Id) {
    throw { status: 400, message: 'Cada participante debe provenir de un partido diferente' }
  }

  const source1 = source1Id
    ? await resolveMatchSource(source1Id, torneoId, modalidad, categoriaId, currentMatchId)
    : null
  const source2 = source2Id
    ? await resolveMatchSource(source2Id, torneoId, modalidad, categoriaId, currentMatchId)
    : null

  const resolvedPlayer1 =
    modalidad === 'individual' ? (source1Id ? source1.participantId : jugador1Id) : null
  const resolvedPlayer2 =
    modalidad === 'individual' ? (source2Id ? source2.participantId : jugador2Id) : null
  const resolvedTeam1 =
    modalidad === 'dobles' ? (source1Id ? source1.participantId : equipo1Id) : null
  const resolvedTeam2 =
    modalidad === 'dobles' ? (source2Id ? source2.participantId : equipo2Id) : null

  if (
    modalidad === 'individual' &&
    ((!resolvedPlayer1 && !source1Id) || (!resolvedPlayer2 && !source2Id))
  ) {
    throw { status: 400, message: 'Selecciona un jugador o un partido de origen para cada lado' }
  }
  if (
    modalidad === 'dobles' &&
    ((!resolvedTeam1 && !source1Id) || (!resolvedTeam2 && !source2Id))
  ) {
    throw { status: 400, message: 'Selecciona una pareja o un partido de origen para cada lado' }
  }
  if (resolvedPlayer1 && resolvedPlayer2 && resolvedPlayer1 === resolvedPlayer2) {
    throw { status: 400, message: 'Los jugadores del partido deben ser diferentes' }
  }
  if (resolvedTeam1 && resolvedTeam2 && resolvedTeam1 === resolvedTeam2) {
    throw { status: 400, message: 'Las parejas del partido deben ser diferentes' }
  }

  if (modalidad === 'individual') {
    await validatePlayers([resolvedPlayer1, resolvedPlayer2].filter(Boolean), deporte)
  } else {
    await validateTeams([resolvedTeam1, resolvedTeam2].filter(Boolean), deporte, categoriaId)
  }

  return {
    torneo_id: torneoId,
    deporte,
    categoria_id: categoriaId,
    jugador1_id: resolvedPlayer1,
    jugador2_id: resolvedPlayer2,
    equipo1_id: resolvedTeam1,
    equipo2_id: resolvedTeam2,
    origen_partido1_id: source1Id,
    origen_partido2_id: source2Id,
    cancha_id: canchaId,
    estado,
    fecha_inicio: fechaInicio,
    hora_inicio: horaInicio,
    fase,
    grupo,
    ronda,
    notas: String(body.notas || '').trim() || null,
  }
}

function normalizePhase(system, value) {
  if (system === 'todos_contra_todos') return 'liga'
  if (system === 'eliminacion_directa') return 'eliminacion'
  if (system === 'grupos_eliminacion') {
    return value === 'eliminacion' ? 'eliminacion' : 'grupos'
  }
  return null
}

function normalizeOptionalLabel(value, maxLength) {
  const normalized = String(value || '').trim()
  if (!normalized) return null
  if (normalized.length > maxLength) {
    throw { status: 400, message: `El texto no puede superar ${maxLength} caracteres` }
  }
  return normalized
}

async function validatePlayers(ids, deporte) {
  if (!ids.length) return
  const placeholders = ids.map(() => '?').join(',')
  const [rows] = await db.query(
    `SELECT id
     FROM jugadores
     WHERE id IN (${placeholders})
       AND activo = TRUE
       AND deporte IN (?, 'ambos')`,
    [...ids, deporte]
  )
  if (rows.length !== new Set(ids).size) {
    throw { status: 400, message: 'Los jugadores deben estar activos en el deporte del torneo' }
  }
}

async function validateTeams(ids, deporte, categoriaId) {
  if (!ids.length) return
  const placeholders = ids.map(() => '?').join(',')
  const [rows] = await db.query(
    `SELECT id
     FROM equipos_padel
     WHERE id IN (${placeholders})
       AND activo = TRUE
       AND deporte = ?
       AND categoria_id = ?`,
    [...ids, deporte, categoriaId]
  )
  if (rows.length !== new Set(ids).size) {
    throw { status: 400, message: 'Las parejas deben estar activas en la categoría del torneo' }
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

function normalizeScoringConfig(body) {
  const bestOfSets = Number(body.mejor_de_sets || 3)
  const gamesPerSet = Number(body.juegos_por_set || 6)
  const gamesDifference = Number(body.diferencia_juegos || 2)
  const tieBreakAt = Number(body.tiebreak_en ?? 6)
  const tieBreakPoints = Number(body.tiebreak_puntos || 7)
  const matchTieBreakPoints = Number(body.match_tiebreak_puntos || 10)

  if (![1, 3, 5].includes(bestOfSets)) {
    throw { status: 400, message: 'El formato debe ser al mejor de 1, 3 o 5 sets' }
  }
  if (!Number.isInteger(gamesPerSet) || gamesPerSet < 1 || gamesPerSet > 12) {
    throw { status: 400, message: 'Los juegos por set deben estar entre 1 y 12' }
  }
  if (!Number.isInteger(gamesDifference) || gamesDifference < 1 || gamesDifference > 6) {
    throw { status: 400, message: 'La diferencia de juegos debe estar entre 1 y 6' }
  }
  if (!['ventaja', 'sin_ventaja'].includes(body.modo_game || 'ventaja')) {
    throw { status: 400, message: 'Selecciona un modo de game válido' }
  }
  if (!['set_completo', 'match_tiebreak'].includes(body.set_decisivo || 'set_completo')) {
    throw { status: 400, message: 'Selecciona un formato válido para el set decisivo' }
  }
  if (!Number.isInteger(tieBreakAt) || tieBreakAt < 0 || tieBreakAt > 12) {
    throw { status: 400, message: 'El inicio del tiebreak no es válido' }
  }
  if (!Number.isInteger(tieBreakPoints) || tieBreakPoints < 5 || tieBreakPoints > 99) {
    throw { status: 400, message: 'Los puntos del tiebreak no son válidos' }
  }
  if (
    !Number.isInteger(matchTieBreakPoints) ||
    matchTieBreakPoints < 5 ||
    matchTieBreakPoints > 99
  ) {
    throw { status: 400, message: 'Los puntos del match tiebreak no son válidos' }
  }

  return {
    mejor_de_sets: bestOfSets,
    juegos_por_set: gamesPerSet,
    diferencia_juegos: gamesDifference,
    modo_game: body.modo_game || 'ventaja',
    set_decisivo: body.set_decisivo || 'set_completo',
    tiebreak_en: tieBreakAt,
    tiebreak_puntos: tieBreakPoints,
    match_tiebreak_puntos: matchTieBreakPoints,
    servidor_inicial: body.servidor_inicial === 'jugador2' ? 'jugador2' : 'jugador1',
  }
}

function positiveId(value) {
  const parsed = Number(value)
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null
}

function normalizeActor(actor) {
  if (actor && typeof actor === 'object') {
    return { id: Number(actor.id), rol: actor.rol || 'miembro' }
  }
  return { id: Number(actor) || null, rol: 'admin' }
}

function assertCanManage(match, actor) {
  if (actor.rol === 'admin') return
  if (
    actor.rol === 'juez' &&
    (Number(match.juez_id) === actor.id ||
      (!match.juez_id && Number(match.created_by) === actor.id))
  ) {
    return
  }
  throw { status: 403, message: 'Este partido no está asignado a tu cuenta de juez' }
}

async function validateJudge(judgeId) {
  if (!judgeId) return
  const [rows] = await db.query(
    "SELECT id FROM users WHERE id = ? AND rol IN ('juez','admin') AND activo = TRUE LIMIT 1",
    [judgeId]
  )
  if (!rows.length) throw { status: 400, message: 'El juez seleccionado no está disponible' }
}

async function resolveMatchSource(sourceId, torneoId, modalidad, categoriaId, currentMatchId) {
  if (currentMatchId && sourceId >= currentMatchId) {
    throw { status: 400, message: 'El partido de origen debe ser anterior al partido actual' }
  }

  const [rows] = await db.query(
    `SELECT id, torneo_id, categoria_id, estado, ganador,
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
  if (Number(source.torneo_id) !== torneoId) {
    throw {
      status: 400,
      message: 'El partido de origen debe pertenecer al mismo torneo',
    }
  }
  if (Number(source.categoria_id) !== categoriaId) {
    throw {
      status: 400,
      message: 'El partido de origen debe pertenecer a la misma categoría',
    }
  }

  return {
    participantId:
      source.estado === 'finalizado' && source.ganador
        ? getWinnerParticipantId({ ...source, modalidad }, source.ganador)
        : null,
  }
}

function getWinnerParticipantId(match, winner) {
  const position = winner === 'jugador1' ? 1 : winner === 'jugador2' ? 2 : null
  if (!position) return null
  return match.modalidad === 'dobles' || match.equipo1_id || match.equipo2_id
    ? match[`equipo${position}_id`] || null
    : match[`jugador${position}_id`] || null
}

async function propagateWinner(connection, match, estado, ganador) {
  const participantId =
    estado === 'finalizado' && ganador ? getWinnerParticipantId(match, ganador) : null
  const participantColumn =
    match.modalidad === 'dobles' || match.equipo1_id || match.equipo2_id ? 'equipo' : 'jugador'

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
    modalidad: row.torneo_modalidad || (row.e1_id || row.e2_id ? 'dobles' : 'individual'),
    torneo: row.torneo_id
      ? {
          id: row.torneo_id,
          nombre: row.torneo_nombre,
          modalidad: row.torneo_modalidad,
          sistema: row.torneo_sistema,
        }
      : null,
    estado: row.estado,
    ganador: row.ganador,
    fecha_inicio: row.fecha_inicio || null,
    hora_inicio: row.hora_inicio || null,
    fase: row.fase || null,
    grupo: row.grupo || null,
    ronda: row.ronda || null,
    notas: row.notas || null,
    marcador_actual: parseScoreSnapshot(row.marcador_actual),
    cancha: row.cancha_id
      ? {
          id: row.cancha_id,
          nombre: row.cancha_nombre,
          superficie: row.cancha_superficie || null,
          sede: row.sede_id ? { id: row.sede_id, nombre: row.sede_nombre } : null,
        }
      : null,
    en_vivo: row.iniciado_at
      ? {
          iniciado_at: row.iniciado_at,
          pausado_at: row.pausado_at || null,
          segundos_pausa: Number(row.segundos_pausa || 0),
          finalizado_at: row.finalizado_at || null,
        }
      : null,
    juez: row.juez_id
      ? { id: row.juez_id, nombre: row.juez_nombre, apellido: row.juez_apellido }
      : null,
    formato: {
      mejor_de_sets: Number(row.mejor_de_sets || 3),
      juegos_por_set: Number(row.juegos_por_set || 6),
      diferencia_juegos: Number(row.diferencia_juegos || 2),
      modo_game: row.modo_game || 'ventaja',
      set_decisivo: row.set_decisivo || 'set_completo',
      tiebreak_en: Number(row.tiebreak_en ?? 6),
      tiebreak_puntos: Number(row.tiebreak_puntos || 7),
      match_tiebreak_puntos: Number(row.match_tiebreak_puntos || 10),
      servidor_inicial: row.servidor_inicial || 'jugador1',
    },
    origen_partido1: formatMatchSource(row, 1),
    origen_partido2: formatMatchSource(row, 2),
    categoria: row.categoria_id
      ? {
          id: row.categoria_id,
          nombre: row.categoria_nombre,
        }
      : null,
  }

  if (match.modalidad === 'dobles') {
    match.equipo1 = { id: row.e1_id, nombre: row.e1_nombre }
    match.equipo2 = { id: row.e2_id, nombre: row.e2_nombre }
  } else {
    match.jugador1 = {
      id: row.j1_id,
      nombre: row.j1_nombre,
      apellido: row.j1_apellido,
      foto: row.j1_foto || null,
    }
    match.jugador2 = {
      id: row.j2_id,
      nombre: row.j2_nombre,
      apellido: row.j2_apellido,
      foto: row.j2_foto || null,
    }
  }

  return match
}

function compareScheduleAscending(left, right) {
  const leftValue = `${left.fecha_inicio || '9999-12-31'}T${left.hora_inicio || '23:59:59'}`
  const rightValue = `${right.fecha_inicio || '9999-12-31'}T${right.hora_inicio || '23:59:59'}`
  return leftValue.localeCompare(rightValue) || Number(left.id) - Number(right.id)
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

function parseScoreSnapshot(value) {
  if (!value) return null
  if (typeof value === 'object') return value
  try {
    return JSON.parse(value)
  } catch {
    return null
  }
}

function formatMatchSource(row, position) {
  const sourceId = row[`origen_partido${position}_id`]
  if (!sourceId) return null

  const prefix = `op${position}`
  const participant1 =
    row.torneo_modalidad === 'dobles' || row.e1_id || row.e2_id
      ? row[`${prefix}_e1_nombre`]
      : [row[`${prefix}_j1_nombre`], row[`${prefix}_j1_apellido`]].filter(Boolean).join(' ')
  const participant2 =
    row.torneo_modalidad === 'dobles' || row.e1_id || row.e2_id
      ? row[`${prefix}_e2_nombre`]
      : [row[`${prefix}_j2_nombre`], row[`${prefix}_j2_apellido`]].filter(Boolean).join(' ')

  return {
    id: sourceId,
    participante1: participant1 || null,
    participante2: participant2 || null,
  }
}
