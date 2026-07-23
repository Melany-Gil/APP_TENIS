const db = require('../../config/db')

// ── Get standings for a tournament ──────
exports.getByTorneo = async (torneoId) => {
  // Determine the sport for this tournament
  const [torneoRows] = await db.query('SELECT deporte FROM torneos WHERE id = ? LIMIT 1', [
    torneoId,
  ])
  if (!torneoRows.length) {
    throw { status: 404, message: 'Torneo no encontrado' }
  }

  const deporte = torneoRows[0].deporte
  const isTenis = deporte === 'tenis'

  const col1 = isTenis ? 'jugador1_id' : 'equipo1_id'
  const col2 = isTenis ? 'jugador2_id' : 'equipo2_id'

  // Fetch all finished matches for this tournament
  const [partidos] = await db.query(
    'SELECT id, ' +
      col1 +
      ', ' +
      col2 +
      ', ganador FROM partidos WHERE torneo_id = ? AND estado = ?',
    [torneoId, 'finalizado']
  )

  if (!partidos.length) {
    return []
  }

  // Collect all participant IDs
  const participantIds = new Set()
  partidos.forEach((p) => {
    participantIds.add(p[col1])
    participantIds.add(p[col2])
  })

  // Fetch sets for all matches in one query
  const partidoIds = partidos.map((p) => p.id)
  const [setsRows] = await db.query(
    'SELECT partido_id, games_j1, games_j2 FROM sets_partido WHERE partido_id IN (?) AND completado = 1',
    [partidoIds]
  )

  // Build sets lookup by partido_id
  const setsByPartido = {}
  setsRows.forEach((s) => {
    if (!setsByPartido[s.partido_id]) setsByPartido[s.partido_id] = []
    setsByPartido[s.partido_id].push(s)
  })

  // Initialize stats map
  const stats = {}
  participantIds.forEach((pid) => {
    stats[pid] = { pj: 0, pg: 0, pp: 0, sets_ganados: 0, sets_perdidos: 0, puntos: 0 }
  })

  // Aggregate match and set stats
  partidos.forEach((p) => {
    const p1 = p[col1]
    const p2 = p[col2]

    stats[p1].pj++
    stats[p2].pj++

    // Determine winner/loser
    if (p.ganador === 'jugador1') {
      stats[p1].pg++
      stats[p1].puntos += 3
      stats[p2].pp++
    } else if (p.ganador === 'jugador2') {
      stats[p2].pg++
      stats[p2].puntos += 3
      stats[p1].pp++
    }

    // Aggregate sets
    const sets = setsByPartido[p.id] || []
    sets.forEach((s) => {
      if (s.games_j1 > s.games_j2) {
        stats[p1].sets_ganados++
        stats[p2].sets_perdidos++
      } else if (s.games_j2 > s.games_j1) {
        stats[p2].sets_ganados++
        stats[p1].sets_perdidos++
      }
    })
  })

  // Fetch participant names
  const idsArr = Array.from(participantIds)
  let nameMap = {}

  if (isTenis) {
    const [jugadores] = await db.query(
      'SELECT id, nombre, apellido FROM jugadores WHERE id IN (?)',
      [idsArr]
    )
    jugadores.forEach((j) => {
      nameMap[j.id] = { id: j.id, nombre: j.nombre, apellido: j.apellido }
    })
  } else {
    const [equipos] = await db.query('SELECT id, nombre FROM equipos_padel WHERE id IN (?)', [
      idsArr,
    ])
    equipos.forEach((e) => {
      nameMap[e.id] = { id: e.id, nombre: e.nombre }
    })
  }

  // Build standings array sorted by puntos DESC, sets_ganados DESC
  const standings = idsArr
    .map((pid) => ({
      jugador: nameMap[pid] || { id: pid, nombre: 'Desconocido', apellido: '' },
      ...stats[pid],
    }))
    .sort((a, b) => b.puntos - a.puntos || b.sets_ganados - a.sets_ganados)
    .map((entry, idx) => ({
      posicion: idx + 1,
      ...entry,
    }))

  return standings
}
