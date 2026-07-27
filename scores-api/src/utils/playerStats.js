const PLAYER_STATS_QUERY = `
  SELECT
    p.id AS partido_id,
    p.categoria_id,
    cat.nombre AS categoria_nombre,
    cat.orden AS categoria_orden,
    p.jugador1_id,
    p.jugador2_id,
    p.ganador,
    s.numero_set,
    s.games_j1,
    s.games_j2
  FROM partidos p
  INNER JOIN categorias cat ON cat.id = p.categoria_id
  LEFT JOIN sets_partido s ON s.partido_id = p.id
  WHERE p.estado = 'finalizado'
    AND p.deporte = 'tenis'
    AND p.jugador1_id IS NOT NULL
    AND p.jugador2_id IS NOT NULL
    AND p.ganador IN ('jugador1', 'jugador2')
`

async function getPlayerStats(db, { categoriaId } = {}) {
  let query = PLAYER_STATS_QUERY
  const params = []

  if (categoriaId) {
    query += ' AND p.categoria_id = ?'
    params.push(categoriaId)
  }

  query += ' ORDER BY p.id, s.numero_set'
  const [rows] = await db.query(query, params)
  return calculatePlayerStats(rows)
}

function calculatePlayerStats(rows) {
  const matches = new Map()

  for (const row of rows) {
    if (!matches.has(row.partido_id)) {
      matches.set(row.partido_id, {
        categoria_id: Number(row.categoria_id),
        categoria_nombre: row.categoria_nombre,
        categoria_orden: Number(row.categoria_orden) || 0,
        jugador1_id: Number(row.jugador1_id),
        jugador2_id: Number(row.jugador2_id),
        ganador: row.ganador,
        sets: [],
      })
    }

    if (row.numero_set !== null && row.numero_set !== undefined) {
      matches.get(row.partido_id).sets.push({
        games_j1: Number(row.games_j1) || 0,
        games_j2: Number(row.games_j2) || 0,
      })
    }
  }

  const statsByCategory = new Map()

  for (const match of matches.values()) {
    const categoryStats = getOrCreateCategory(statsByCategory, match)
    const player1 = getOrCreatePlayer(categoryStats.players, match.jugador1_id, match)
    const player2 = getOrCreatePlayer(categoryStats.players, match.jugador2_id, match)

    player1.partidos_jugados += 1
    player2.partidos_jugados += 1

    let setsWonByPlayer1 = 0
    let setsWonByPlayer2 = 0
    for (const set of match.sets) {
      player1.games_ganados += set.games_j1
      player1.games_perdidos += set.games_j2
      player2.games_ganados += set.games_j2
      player2.games_perdidos += set.games_j1

      if (set.games_j1 > set.games_j2) {
        setsWonByPlayer1 += 1
        player1.sets_ganados += 1
        player2.sets_perdidos += 1
      } else if (set.games_j2 > set.games_j1) {
        setsWonByPlayer2 += 1
        player2.sets_ganados += 1
        player1.sets_perdidos += 1
      }
    }

    const winner = match.ganador === 'jugador1' ? player1 : player2
    const loser = match.ganador === 'jugador1' ? player2 : player1
    const loserWonASet = match.ganador === 'jugador1' ? setsWonByPlayer2 > 0 : setsWonByPlayer1 > 0

    winner.victorias += 1
    loser.derrotas += 1
    winner.puntos += loserWonASet ? 2 : 3
    loser.puntos += loserWonASet ? 1 : 0
  }

  const result = []

  for (const category of statsByCategory.values()) {
    const standings = [...category.players.values()]
      .map(finalizePercentages)
      .sort(compareStats)
      .map((stats, index) => ({
        ...stats,
        ranking: index + 1,
      }))

    result.push(...standings)
  }

  return result.sort(
    (a, b) =>
      a.categoria.orden - b.categoria.orden || a.ranking - b.ranking || a.jugador_id - b.jugador_id
  )
}

function getOrCreateCategory(statsByCategory, match) {
  if (!statsByCategory.has(match.categoria_id)) {
    statsByCategory.set(match.categoria_id, {
      players: new Map(),
    })
  }
  return statsByCategory.get(match.categoria_id)
}

function getOrCreatePlayer(players, playerId, match) {
  if (!players.has(playerId)) {
    players.set(playerId, {
      jugador_id: playerId,
      categoria: {
        id: match.categoria_id,
        nombre: match.categoria_nombre,
        orden: match.categoria_orden,
      },
      partidos_jugados: 0,
      victorias: 0,
      derrotas: 0,
      puntos: 0,
      sets_ganados: 0,
      sets_perdidos: 0,
      games_ganados: 0,
      games_perdidos: 0,
    })
  }
  return players.get(playerId)
}

function finalizePercentages(stats) {
  const totalSets = stats.sets_ganados + stats.sets_perdidos
  const totalGames = stats.games_ganados + stats.games_perdidos

  return {
    ...stats,
    porcentaje_sets: totalSets ? stats.sets_ganados / totalSets : 0,
    porcentaje_games: totalGames ? stats.games_ganados / totalGames : 0,
  }
}

function compareStats(a, b) {
  return (
    b.puntos - a.puntos ||
    b.victorias - a.victorias ||
    b.porcentaje_sets - a.porcentaje_sets ||
    b.porcentaje_games - a.porcentaje_games ||
    a.jugador_id - b.jugador_id
  )
}

module.exports = { getPlayerStats, calculatePlayerStats, compareStats }
