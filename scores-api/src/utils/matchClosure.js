// Read-only presentation helpers; historical sets are never manufactured.
function closureInfo(match, sets = match.sets || []) {
  if (match.estado !== 'finalizado') return null
  const notes = String(match.notas || '')
  const retired = notes.includes('[Retiro con juego registrado]')
  if (!retired && !/\[(?:Victoria por W\.?O?\.?|Doble W\.?O?\.?)/i.test(notes)) return null
  const winner = ['jugador1', 'jugador2'].includes(match.ganador) ? match.ganador : null
  return { es_walkover: !retired, es_retiro: retired, ganador: winner, doble: !winner,
    marcador_oficial: sets.length ? sets.map(s => `${s.games_j1}/${s.games_j2}`).join(' ') : null,
    sets, puntos_clasificacion: winner ? 1 : 0 }
}

function snapshotFromSets(match, sets) {
  if (match.estado !== 'finalizado' || !sets?.length) return null
  const config = match.formato || match
  const officialWO = String(match.notas || '').includes('[Victoria por W.O. (6/0 6/0)]')
  const engineSets = [...sets].sort((a, b) => a.numero_set - b.numero_set).map((s, i) => ({
    number: Number(s.numero_set || i + 1),
    type: !officialWO && config.set_decisivo === 'match_tiebreak' && Number(s.numero_set) === Number(config.mejor_de_sets || 3) ? 'match_tiebreak' : 'set',
    games: [Number(s.games_j1 || 0), Number(s.games_j2 || 0)],
    tiebreak: [Number(s.tiebreak_j1 || 0), Number(s.tiebreak_j2 || 0)], completed: Boolean(s.completado),
  }))
  const setsWon = [0, 0]
  for (const s of engineSets) if (s.completed && s.games[0] !== s.games[1]) setsWon[s.games[0] > s.games[1] ? 0 : 1]++
  return { currentSet: engineSets.length, sets: engineSets, setsWon, points: [0, 0], mode: 'completed',
    server: config.servidor_inicial || 'jugador1', tieBreakFirstServer: null, serviceAttempt: 1,
    winner: match.ganador || null, displayPoints: ['—', '—'] }
}
module.exports = { closureInfo, snapshotFromSets }
