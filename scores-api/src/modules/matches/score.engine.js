const POINT_REASONS = [
  'ace',
  'tiro_ganador',
  'error_forzado',
  'error_no_forzado',
  'doble_falta',
  'penalizacion',
  'infraccion',
]

const otherSide = (side) => (side === 'jugador1' ? 'jugador2' : 'jugador1')
const sideIndex = (side) => (side === 'jugador1' ? 0 : 1)

function normalizeConfig(match = {}) {
  return {
    bestOfSets: [1, 3, 5].includes(Number(match.mejor_de_sets))
      ? Number(match.mejor_de_sets)
      : 3,
    gameMode: match.modo_game === 'sin_ventaja' ? 'sin_ventaja' : 'ventaja',
    decidingSet: match.set_decisivo === 'match_tiebreak' ? 'match_tiebreak' : 'set_completo',
    tieBreakAt: Number.isInteger(Number(match.tiebreak_en))
      ? Math.max(0, Math.min(12, Number(match.tiebreak_en)))
      : 6,
    tieBreakPoints: Math.max(5, Math.min(99, Number(match.tiebreak_puntos) || 7)),
    matchTieBreakPoints: Math.max(
      5,
      Math.min(99, Number(match.match_tiebreak_puntos) || 10)
    ),
    initialServer: match.servidor_inicial === 'jugador2' ? 'jugador2' : 'jugador1',
  }
}

function createSet(number, type = 'set') {
  return {
    number,
    type,
    games: [0, 0],
    tiebreak: [0, 0],
    completed: false,
  }
}

function createInitialState(match = {}) {
  const config = normalizeConfig(match)
  const firstSetType =
    config.bestOfSets === 1 && config.decidingSet === 'match_tiebreak'
      ? 'match_tiebreak'
      : 'set'

  return {
    currentSet: 1,
    setsWon: [0, 0],
    sets: [createSet(1, firstSetType)],
    points: [0, 0],
    mode: firstSetType === 'match_tiebreak' ? 'match_tiebreak' : 'game',
    server: config.initialServer,
    tieBreakFirstServer: firstSetType === 'match_tiebreak' ? config.initialServer : null,
    serviceAttempt: 1,
    winner: null,
  }
}

function cloneState(state) {
  return JSON.parse(JSON.stringify(state))
}

function pointDisplay(state) {
  if (state.mode === 'tiebreak' || state.mode === 'match_tiebreak') {
    return state.points.map(String)
  }
  if (state.mode === 'completed') return ['—', '—']

  const [first, second] = state.points
  if (first >= 3 && second >= 3) {
    if (first === second) return ['40', '40']
    return first > second ? ['AD', '40'] : ['40', 'AD']
  }
  const labels = ['0', '15', '30', '40']
  return [labels[Math.min(first, 3)], labels[Math.min(second, 3)]]
}

function serverForTieBreak(firstServer, pointsPlayed) {
  if (pointsPlayed === 0) return firstServer
  const block = Math.floor((pointsPlayed - 1) / 2)
  return block % 2 === 0 ? otherSide(firstServer) : firstServer
}

function hasWonRace(scores, winnerIndex, target) {
  const loserIndex = winnerIndex === 0 ? 1 : 0
  return scores[winnerIndex] >= target && scores[winnerIndex] - scores[loserIndex] >= 2
}

function completeSet(state, winnerIndex, config) {
  const currentSet = state.sets[state.currentSet - 1]
  currentSet.completed = true
  state.setsWon[winnerIndex] += 1
  state.points = [0, 0]
  state.serviceAttempt = 1

  const setsNeeded = Math.floor(config.bestOfSets / 2) + 1
  if (state.setsWon[winnerIndex] >= setsNeeded) {
    state.winner = winnerIndex === 0 ? 'jugador1' : 'jugador2'
    state.mode = 'completed'
    return
  }

  state.currentSet += 1
  const isDecidingSet = state.currentSet === config.bestOfSets
  const nextType = isDecidingSet && config.decidingSet === 'match_tiebreak'
    ? 'match_tiebreak'
    : 'set'
  state.sets.push(createSet(state.currentSet, nextType))
  state.mode = nextType === 'match_tiebreak' ? 'match_tiebreak' : 'game'
  state.tieBreakFirstServer = nextType === 'match_tiebreak' ? state.server : null
}

function applyPoint(currentState, winner, match = {}) {
  const config = normalizeConfig(match)
  const state = cloneState(currentState)
  if (state.winner || state.mode === 'completed') {
    throw { status: 409, message: 'El partido ya finalizó' }
  }
  if (!['jugador1', 'jugador2'].includes(winner)) {
    throw { status: 400, message: 'Selecciona quién ganó el punto' }
  }

  const winnerIndex = sideIndex(winner)
  const currentSet = state.sets[state.currentSet - 1]

  if (state.mode === 'tiebreak' || state.mode === 'match_tiebreak') {
    state.points[winnerIndex] += 1
    currentSet.tiebreak = [...state.points]
    const target =
      state.mode === 'match_tiebreak' ? config.matchTieBreakPoints : config.tieBreakPoints

    if (hasWonRace(state.points, winnerIndex, target)) {
      if (state.mode === 'tiebreak') {
        currentSet.games[winnerIndex] = config.tieBreakAt + 1
        state.server = otherSide(state.tieBreakFirstServer)
      } else {
        // Para compatibilidad con el marcador público, el match tiebreak se muestra 10-8, etc.
        currentSet.games = [...state.points]
      }
      completeSet(state, winnerIndex, config)
    } else {
      const pointsPlayed = state.points[0] + state.points[1]
      state.server = serverForTieBreak(state.tieBreakFirstServer, pointsPlayed)
    }
    return state
  }

  state.points[winnerIndex] += 1
  const loserIndex = winnerIndex === 0 ? 1 : 0
  const gameWon =
    config.gameMode === 'sin_ventaja'
      ? state.points[winnerIndex] >= 4
      : state.points[winnerIndex] >= 4 && state.points[winnerIndex] - state.points[loserIndex] >= 2

  if (!gameWon) return state

  currentSet.games[winnerIndex] += 1
  state.points = [0, 0]
  state.serviceAttempt = 1
  state.server = otherSide(state.server)

  if (
    config.tieBreakAt > 0 &&
    currentSet.games[0] === config.tieBreakAt &&
    currentSet.games[1] === config.tieBreakAt
  ) {
    state.mode = 'tiebreak'
    state.tieBreakFirstServer = state.server
    return state
  }

  if (hasWonRace(currentSet.games, winnerIndex, 6)) {
    completeSet(state, winnerIndex, config)
  }

  return state
}

function applyEvent(currentState, event, match = {}) {
  const state = cloneState(currentState)
  if (!['punto', 'primera_falta', 'let'].includes(event.tipo)) {
    throw { status: 400, message: 'Tipo de evento inválido' }
  }
  if (state.winner || state.mode === 'completed') {
    throw { status: 409, message: 'El partido ya finalizó' }
  }

  if (event.tipo === 'primera_falta') {
    if (state.serviceAttempt !== 1) {
      throw { status: 409, message: 'El segundo servicio ya está activo' }
    }
    state.serviceAttempt = 2
    return state
  }

  if (event.tipo === 'let') return state

  if (!POINT_REASONS.includes(event.motivo)) {
    throw { status: 400, message: 'Selecciona cómo terminó el punto' }
  }
  if (event.motivo === 'ace' && event.ganador !== state.server) {
    throw { status: 400, message: 'Un ace solo puede acreditarse al servidor' }
  }
  if (event.motivo === 'doble_falta') {
    if (state.serviceAttempt !== 2 || event.ganador === state.server) {
      throw { status: 400, message: 'Registra la primera falta antes de la doble falta' }
    }
  }

  const next = applyPoint(state, event.ganador, match)
  next.serviceAttempt = 1
  return next
}

function projectSets(state) {
  return state.sets.map((set) => ({
    numero_set: set.number,
    games_j1: set.games[0],
    games_j2: set.games[1],
    tiebreak_j1: set.tiebreak[0] || null,
    tiebreak_j2: set.tiebreak[1] || null,
    completado: Boolean(set.completed),
  }))
}

function serializeState(state) {
  return {
    ...state,
    displayPoints: pointDisplay(state),
  }
}

module.exports = {
  POINT_REASONS,
  applyEvent,
  createInitialState,
  normalizeConfig,
  otherSide,
  pointDisplay,
  projectSets,
  serializeState,
}
