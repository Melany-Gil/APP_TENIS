const db = require('../../config/db')
const matchesService = require('./matches.service')
const {
  applyEvent,
  createInitialState,
  projectSets,
  serializeState,
} = require('./score.engine')

exports.getManagedMatches = async (user) => {
  if (user.rol === 'admin') return matchesService.getAll({ orden: 'asc' })
  return matchesService.getAll({ juez_id: user.id, orden: 'asc' })
}

exports.getControl = async (id, user) => {
  const matchRow = await getManageableMatch(id, user)
  const match = await matchesService.getById(id)
  const [lastEvents] = await db.query(
    `SELECT id, secuencia, tipo, ganador, motivo, servidor, numero_servicio,
            marcador_despues, created_at
     FROM eventos_partido
     WHERE partido_id = ? AND anulado_at IS NULL
     ORDER BY secuencia DESC
     LIMIT 20`,
    [id]
  )
  const state = lastEvents.length
    ? parseJson(lastEvents[0].marcador_despues)
    : createInitialState(matchRow)

  const [pointEvents] = await db.query(
    `SELECT tipo, ganador, motivo, servidor, numero_servicio, marcador_antes
     FROM eventos_partido
     WHERE partido_id = ? AND anulado_at IS NULL
     ORDER BY secuencia`,
    [id]
  )
  const [liveRows] = await db.query(
    `SELECT iniciado_at, pausado_at, segundos_pausa, finalizado_at
     FROM estado_en_vivo_partido
     WHERE partido_id = ?
     LIMIT 1`,
    [id]
  )

  return {
    partido: match,
    marcador: serializeState(state),
    estadisticas: buildStats(pointEvents),
    eventos_recientes: lastEvents.map(formatEvent),
    en_vivo: formatLiveState(liveRows[0]),
  }
}

exports.getStats = async (id, setNumber = null) => {
  await matchesService.getById(id)
  const selectedSet = setNumber === null || setNumber === undefined || setNumber === ''
    ? null
    : Number(setNumber)
  if (selectedSet !== null && (!Number.isInteger(selectedSet) || selectedSet < 1 || selectedSet > 127)) {
    throw { status: 400, message: 'El set seleccionado no es válido' }
  }

  const [events] = await db.query(
    `SELECT tipo, ganador, motivo, servidor, numero_servicio, marcador_antes
     FROM eventos_partido
     WHERE partido_id = ? AND anulado_at IS NULL
     ORDER BY secuencia`,
    [id]
  )
  const setNumbers = events
    .map((event) => Number(parseJson(event.marcador_antes)?.currentSet || 1))
    .filter((value) => Number.isInteger(value))

  return {
    estadisticas: buildStats(events, selectedSet),
    total_sets: setNumbers.length ? Math.max(...setNumbers) : 0,
    set: selectedSet,
  }
}

exports.startMatch = async (id, user) => {
  const connection = await db.getConnection()
  try {
    await connection.beginTransaction()
    const [matches] = await connection.query('SELECT * FROM partidos WHERE id = ? FOR UPDATE', [id])
    if (!matches.length) throw { status: 404, message: 'Partido no encontrado' }
    assertCanManage(matches[0], user)
    if (matches[0].estado === 'finalizado' || matches[0].estado === 'cancelado') {
      throw { status: 409, message: 'Este partido no se puede iniciar' }
    }
    await ensureLiveState(connection, id)
    await connection.query(
      `UPDATE estado_en_vivo_partido
       SET pausado_at = NULL, finalizado_at = NULL
       WHERE partido_id = ?`,
      [id]
    )
    await connection.query("UPDATE partidos SET estado = 'en_vivo' WHERE id = ?", [id])
    await connection.commit()
  } catch (error) {
    await connection.rollback()
    throw error
  } finally {
    connection.release()
  }
  return exports.getControl(id, user)
}

exports.setPaused = async (id, paused, user) => {
  const connection = await db.getConnection()
  try {
    await connection.beginTransaction()
    const [matches] = await connection.query('SELECT * FROM partidos WHERE id = ? FOR UPDATE', [id])
    if (!matches.length) throw { status: 404, message: 'Partido no encontrado' }
    assertCanManage(matches[0], user)
    if (matches[0].estado !== 'en_vivo') {
      throw { status: 409, message: 'Solo puedes pausar un partido en vivo' }
    }
    await ensureLiveState(connection, id)
    const [liveRows] = await connection.query(
      'SELECT pausado_at FROM estado_en_vivo_partido WHERE partido_id = ? FOR UPDATE',
      [id]
    )
    if (paused && !liveRows[0].pausado_at) {
      await connection.query(
        'UPDATE estado_en_vivo_partido SET pausado_at = NOW() WHERE partido_id = ?',
        [id]
      )
    } else if (!paused && liveRows[0].pausado_at) {
      await connection.query(
        `UPDATE estado_en_vivo_partido
         SET segundos_pausa = segundos_pausa + TIMESTAMPDIFF(SECOND, pausado_at, NOW()),
             pausado_at = NULL
         WHERE partido_id = ?`,
        [id]
      )
    }
    await connection.commit()
  } catch (error) {
    await connection.rollback()
    throw error
  } finally {
    connection.release()
  }
  return exports.getControl(id, user)
}

exports.changeServer = async (id, server, user) =>
  exports.addEvent(id, { tipo: 'cambio_servidor', ganador: server }, user)

exports.addEvent = async (id, event, user) => {
  const connection = await db.getConnection()
  try {
    await connection.beginTransaction()
    const [matches] = await connection.query('SELECT * FROM partidos WHERE id = ? FOR UPDATE', [id])
    if (!matches.length) throw { status: 404, message: 'Partido no encontrado' }
    assertCanManage(matches[0], user)
    if (matches[0].estado === 'finalizado' || matches[0].estado === 'cancelado') {
      throw { status: 409, message: 'Este partido ya no admite cambios' }
    }
    await ensureLiveState(connection, id)
    const [liveRows] = await connection.query(
      'SELECT pausado_at FROM estado_en_vivo_partido WHERE partido_id = ? FOR UPDATE',
      [id]
    )
    if (liveRows[0]?.pausado_at) {
      throw { status: 409, message: 'Reanuda el partido antes de registrar acciones' }
    }

    const [lastEvents] = await connection.query(
      `SELECT marcador_despues
       FROM eventos_partido
       WHERE partido_id = ? AND anulado_at IS NULL
       ORDER BY secuencia DESC
       LIMIT 1`,
      [id]
    )
    const before = lastEvents.length
      ? parseJson(lastEvents[0].marcador_despues)
      : createInitialState(matches[0])
    const after = applyEvent(before, event, matches[0])

    const [sequenceRows] = await connection.query(
      'SELECT COALESCE(MAX(secuencia), 0) + 1 AS siguiente FROM eventos_partido WHERE partido_id = ?',
      [id]
    )
    const sequence = Number(sequenceRows[0].siguiente)
    await connection.query(
      `INSERT INTO eventos_partido
         (partido_id, secuencia, tipo, ganador, motivo, servidor, numero_servicio,
          marcador_antes, marcador_despues, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        sequence,
        event.tipo,
        event.ganador || null,
        event.motivo || null,
        before.server,
        before.serviceAttempt,
        JSON.stringify(serializeState(before)),
        JSON.stringify(serializeState(after)),
        user.id,
      ]
    )

    await syncProjection(connection, matches[0], after, 'en_vivo')
    await connection.commit()
  } catch (error) {
    await connection.rollback()
    throw error
  } finally {
    connection.release()
  }

  return exports.getControl(id, user)
}

exports.undoLastEvent = async (id, user) => {
  const connection = await db.getConnection()
  try {
    await connection.beginTransaction()
    const [matches] = await connection.query('SELECT * FROM partidos WHERE id = ? FOR UPDATE', [id])
    if (!matches.length) throw { status: 404, message: 'Partido no encontrado' }
    assertCanManage(matches[0], user)

    const [lastEvents] = await connection.query(
      `SELECT id
       FROM eventos_partido
       WHERE partido_id = ? AND anulado_at IS NULL
       ORDER BY secuencia DESC
       LIMIT 1`,
      [id]
    )
    if (!lastEvents.length) throw { status: 409, message: 'No hay eventos para deshacer' }

    await connection.query(
      'UPDATE eventos_partido SET anulado_at = NOW(), anulado_por = ? WHERE id = ?',
      [user.id, lastEvents[0].id]
    )
    const [previousEvents] = await connection.query(
      `SELECT marcador_despues
       FROM eventos_partido
       WHERE partido_id = ? AND anulado_at IS NULL
       ORDER BY secuencia DESC
       LIMIT 1`,
      [id]
    )
    const restored = previousEvents.length
      ? parseJson(previousEvents[0].marcador_despues)
      : createInitialState(matches[0])
    const [liveRows] = await connection.query(
      'SELECT iniciado_at FROM estado_en_vivo_partido WHERE partido_id = ? LIMIT 1',
      [id]
    )
    await syncProjection(
      connection,
      matches[0],
      restored,
      previousEvents.length || liveRows[0]?.iniciado_at ? 'en_vivo' : 'programado'
    )
    await connection.commit()
  } catch (error) {
    await connection.rollback()
    throw error
  } finally {
    connection.release()
  }

  return exports.getControl(id, user)
}

async function getManageableMatch(id, user) {
  const [rows] = await db.query('SELECT * FROM partidos WHERE id = ? LIMIT 1', [id])
  if (!rows.length) throw { status: 404, message: 'Partido no encontrado' }
  assertCanManage(rows[0], user)
  return rows[0]
}

function assertCanManage(match, user) {
  if (user.rol === 'admin') return
  if (user.rol === 'juez' && Number(match.juez_id) === Number(user.id)) return
  throw { status: 403, message: 'Este partido no está asignado a tu cuenta de juez' }
}

async function syncProjection(connection, match, state, fallbackStatus) {
  const sets = projectSets(state)
  await connection.query('DELETE FROM sets_partido WHERE partido_id = ?', [match.id])
  const visibleSets = fallbackStatus === 'programado' ? [] : sets
  for (const set of visibleSets) {
    await connection.query(
      `INSERT INTO sets_partido
         (partido_id, numero_set, games_j1, games_j2, tiebreak_j1, tiebreak_j2, completado)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        match.id,
        set.numero_set,
        set.games_j1,
        set.games_j2,
        set.tiebreak_j1,
        set.tiebreak_j2,
        set.completado ? 1 : 0,
      ]
    )
  }

  const status = state.winner ? 'finalizado' : fallbackStatus
  await connection.query('UPDATE partidos SET estado = ?, ganador = ? WHERE id = ?', [
    status,
    state.winner || null,
    match.id,
  ])
  if (state.winner) {
    await connection.query(
      `UPDATE estado_en_vivo_partido
       SET finalizado_at = COALESCE(finalizado_at, NOW()), pausado_at = NULL
       WHERE partido_id = ?`,
      [match.id]
    )
  }
  await propagateWinner(connection, match, status, state.winner)
}

async function propagateWinner(connection, match, status, winner) {
  const position = winner === 'jugador1' ? 1 : winner === 'jugador2' ? 2 : null
  const participantColumn = match.equipo1_id || match.equipo2_id ? 'equipo' : 'jugador'
  const participantId =
    status === 'finalizado' && position ? match[`${participantColumn}${position}_id`] : null

  await connection.query(
    `UPDATE partidos SET ${participantColumn}1_id = ? WHERE origen_partido1_id = ?`,
    [participantId, match.id]
  )
  await connection.query(
    `UPDATE partidos SET ${participantColumn}2_id = ? WHERE origen_partido2_id = ?`,
    [participantId, match.id]
  )
}

function buildStats(events, selectedSet = null) {
  const stats = {
    jugador1: emptyStats(),
    jugador2: emptyStats(),
  }

  for (const event of events) {
    const eventSet = Number(parseJson(event.marcador_antes)?.currentSet || 1)
    if (selectedSet !== null && eventSet !== selectedSet) continue
    if (event.tipo === 'primera_falta') {
      stats[event.servidor].primeras_faltas += 1
      continue
    }
    if (event.tipo !== 'punto') continue

    const winner = event.ganador
    const loser = winner === 'jugador1' ? 'jugador2' : 'jugador1'
    const server = event.servidor
    stats[winner].puntos_ganados += 1
    stats[server].puntos_servicio += 1
    if (winner === server) stats[server].puntos_servicio_ganados += 1

    if (Number(event.numero_servicio) === 1) {
      stats[server].primeros_servicios_dentro += 1
      if (winner === server) stats[server].puntos_primer_servicio_ganados += 1
    } else if (winner === server) {
      stats[server].puntos_segundo_servicio_ganados += 1
    }

    if (event.motivo === 'ace') stats[winner].aces += 1
    if (event.motivo === 'tiro_ganador') stats[winner].tiros_ganadores += 1
    if (event.motivo === 'error_forzado') stats[winner].errores_forzados_provocados += 1
    if (event.motivo === 'error_no_forzado') stats[loser].errores_no_forzados += 1
    if (event.motivo === 'doble_falta') stats[server].dobles_faltas += 1
    if (event.motivo === 'penalizacion') stats[winner].puntos_penalizacion += 1
  }

  for (const side of Object.values(stats)) {
    side.porcentaje_primer_servicio = side.puntos_servicio
      ? Math.round((side.primeros_servicios_dentro / side.puntos_servicio) * 100)
      : 0
  }
  return stats
}

function emptyStats() {
  return {
    puntos_ganados: 0,
    aces: 0,
    dobles_faltas: 0,
    primeras_faltas: 0,
    primeros_servicios_dentro: 0,
    porcentaje_primer_servicio: 0,
    puntos_servicio: 0,
    puntos_servicio_ganados: 0,
    puntos_primer_servicio_ganados: 0,
    puntos_segundo_servicio_ganados: 0,
    tiros_ganadores: 0,
    errores_forzados_provocados: 0,
    errores_no_forzados: 0,
    puntos_penalizacion: 0,
  }
}

function parseJson(value) {
  return typeof value === 'string' ? JSON.parse(value) : value
}

function formatEvent(event) {
  return {
    id: event.id,
    secuencia: event.secuencia,
    tipo: event.tipo,
    ganador: event.ganador,
    motivo: event.motivo,
    servidor: event.servidor,
    numero_servicio: Number(event.numero_servicio),
    marcador: serializeState(parseJson(event.marcador_despues)),
    created_at: event.created_at,
  }
}

async function ensureLiveState(connection, id) {
  await connection.query(
    `INSERT INTO estado_en_vivo_partido
       (partido_id, iniciado_at, pausado_at, segundos_pausa, finalizado_at)
     VALUES (?, NOW(), NULL, 0, NULL)
     ON DUPLICATE KEY UPDATE
       iniciado_at = COALESCE(iniciado_at, VALUES(iniciado_at))`,
    [id]
  )
}

function formatLiveState(row) {
  if (!row?.iniciado_at) return null
  return {
    iniciado_at: row.iniciado_at,
    pausado_at: row.pausado_at || null,
    segundos_pausa: Number(row.segundos_pausa || 0),
    finalizado_at: row.finalizado_at || null,
  }
}
