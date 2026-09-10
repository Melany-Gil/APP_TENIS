const { createInitialState, normalizeConfig, serializeState } = require('./score.engine')

const invalid = (message) => { throw { status: 400, message } }
const score = (value) => Number.isInteger(value) && value >= 0 && value <= 99
const won = (values, target, difference = 2) => Math.max(...values) >= target && Math.abs(values[0] - values[1]) >= difference
const terminal = (values, target, difference = 2) => {
  const previous = [...values]
  previous[values[0] > values[1] ? 0 : 1]--
  return won(values, target, difference) && !won(previous, target, difference)
}

// A correction is a new checkpoint, not invented point events. Existing point
// statistics remain intact; the current game starts at 0-0 after confirmation.
exports.buildCorrection = (match, body) => {
  const config = normalizeConfig(match)
  if (!['en_vivo', 'finalizado'].includes(body.estado)) invalid('La corrección admite partidos en vivo o finalizados. Usa Cancelar/Reactivar para cambiar la programación.')
  if (!['jugador1', 'jugador2'].includes(body.servidor)) invalid('Selecciona quién saca después de la corrección')
  if (typeof body.motivo !== 'string' || body.motivo.trim().length < 5 || body.motivo.trim().length > 200) invalid('Describe el motivo de la corrección (5 a 200 caracteres)')
  if (body.confirmar_reinicio_game !== true) invalid('Confirma que el game actual quedará en 0-0')
  if (!Array.isArray(body.sets) || !body.sets.length || body.sets.length > config.bestOfSets) invalid(`Este formato admite de 1 a ${config.bestOfSets} sets`)
  const state = createInitialState(match)
  state.sets = []
  state.server = body.servidor
  const needed = Math.floor(config.bestOfSets / 2) + 1
  for (const [index, input] of body.sets.entries()) {
    if (input.numero_set !== index + 1 || ![input.games_j1, input.games_j2].every(score) || typeof input.completado !== 'boolean') invalid('Revisa la numeración, los games y el estado de cada set')
    if (state.setsWon.some((n) => n >= needed)) invalid('No puede haber sets después de ganar el partido')
    const games = [input.games_j1, input.games_j2]
    const tb = [input.tiebreak_j1 ?? 0, input.tiebreak_j2 ?? 0]
    if (!tb.every(score)) invalid('Los puntos de tiebreak deben ser enteros entre 0 y 99')
    const matchTB = index + 1 === config.bestOfSets && config.decidingSet === 'match_tiebreak'
    const completedTB = !matchTB && config.tieBreakAt > 0 && Math.max(...games) === config.tieBreakAt + 1 && Math.min(...games) === config.tieBreakAt
    const isWon = matchTB ? won(games, config.matchTieBreakPoints) : completedTB || won(games, config.gamesPerSet, config.gamesDifference)
    if (input.completado !== isWon) invalid(`El resultado y la casilla «Set completado» del set ${index + 1} no coinciden`)
    if (input.completado && !completedTB && !terminal(games, matchTB ? config.matchTieBreakPoints : config.gamesPerSet, matchTB ? 2 : config.gamesDifference)) invalid('El set continuó después del resultado que debía cerrarlo')
    if (!input.completado && index !== body.sets.length - 1) invalid('Solo el último set puede estar en juego')
    if (!matchTB && config.tieBreakAt > 0 && (Math.max(...games) > config.tieBreakAt + 1 || (Math.max(...games) === config.tieBreakAt + 1 && !input.completado))) invalid('Los games superan el límite del formato con tiebreak')
    if (completedTB && tb.some(Boolean) && (!terminal(tb, config.tieBreakPoints) || (tb[0] > tb[1]) !== (games[0] > games[1]))) invalid('El tiebreak no coincide con el ganador del set')
    if (!completedTB && !matchTB && tb.some(Boolean)) invalid('La corrección reinicia el game o tiebreak actual en 0-0; no agregues puntos parciales de tiebreak')
    if (matchTB && !input.completado && games.some(Boolean)) invalid('Para un match tiebreak en curso, registra los puntos desde la mesa de juez; la corrección lo reinicia en 0-0')
    state.sets.push({ number: index + 1, type: matchTB ? 'match_tiebreak' : 'set', games, tiebreak: matchTB ? [...games] : tb, completed: input.completado })
    if (input.completado) state.setsWon[games[0] > games[1] ? 0 : 1]++
  }
  const winnerIndex = state.setsWon.findIndex((n) => n >= needed)
  if (body.estado === 'finalizado') {
    if (winnerIndex < 0 || body.ganador !== `jugador${winnerIndex + 1}` || !state.sets.at(-1).completed) invalid('El ganador debe coincidir con los sets ganados según el formato del partido')
    state.winner = body.ganador
    state.mode = 'completed'
  } else {
    if (winnerIndex >= 0 || body.ganador) invalid('El resultado ya tiene ganador; revisa los sets o selecciona Finalizado')
    if (state.sets.at(-1).completed) {
      const number = state.sets.length + 1
      state.sets.push({ number, type: number === config.bestOfSets && config.decidingSet === 'match_tiebreak' ? 'match_tiebreak' : 'set', games: [0, 0], tiebreak: [0, 0], completed: false })
    }
    const last = state.sets.at(-1)
    state.mode = last.type === 'match_tiebreak' ? 'match_tiebreak' : config.tieBreakAt > 0 && last.games.every((g) => g === config.tieBreakAt) ? 'tiebreak' : 'game'
  }
  state.currentSet = state.sets.length
  state.tieBreakFirstServer = ['tiebreak', 'match_tiebreak'].includes(state.mode) ? state.server : null
  return serializeState(state)
}
