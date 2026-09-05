const test = require('node:test')
const assert = require('node:assert/strict')

const {
  applyEvent,
  computeBreakpoint,
  createInitialState,
  pointDisplay,
  projectSets,
} = require('../src/modules/matches/score.engine')

const point = (state, winner, motivo = 'tiro_ganador', config = {}) =>
  applyEvent(state, { tipo: 'punto', ganador: winner, motivo }, config)

test('calcula 0, 15, 30, 40, deuce y ventaja', () => {
  let state = createInitialState()
  state = point(state, 'jugador1')
  assert.deepEqual(pointDisplay(state), ['15', '0'])
  state = point(state, 'jugador1')
  state = point(state, 'jugador1')
  state = point(state, 'jugador2')
  state = point(state, 'jugador2')
  state = point(state, 'jugador2')
  assert.deepEqual(pointDisplay(state), ['40', '40'])
  state = point(state, 'jugador1')
  assert.deepEqual(pointDisplay(state), ['AD', '40'])
  state = point(state, 'jugador2')
  assert.deepEqual(pointDisplay(state), ['40', '40'])
})

test('cierra game, set y partido automáticamente', () => {
  const config = { mejor_de_sets: 1 }
  let state = createInitialState(config)
  for (let game = 0; game < 6; game += 1) {
    for (let p = 0; p < 4; p += 1) {
      state = point(state, 'jugador1', 'tiro_ganador', config)
    }
  }
  assert.equal(state.winner, 'jugador1')
  assert.deepEqual(projectSets(state)[0], {
    numero_set: 1,
    games_j1: 6,
    games_j2: 0,
    tiebreak_j1: null,
    tiebreak_j2: null,
    completado: true,
  })
})

test('permite configurar un match tiebreak como set decisivo', () => {
  const config = {
    mejor_de_sets: 3,
    set_decisivo: 'match_tiebreak',
    match_tiebreak_puntos: 10,
  }
  let state = createInitialState(config)

  // Set 1: J1 wins 6-4
  for (let g = 0; g < 4; g += 1) {
    for (let p = 0; p < 4; p += 1) state = point(state, 'jugador2', 'tiro_ganador', config)
  }
  for (let g = 0; g < 6; g += 1) {
    for (let p = 0; p < 4; p += 1) state = point(state, 'jugador1', 'tiro_ganador', config)
  }
  // Set 2: J2 wins 6-4
  for (let g = 0; g < 4; g += 1) {
    for (let p = 0; p < 4; p += 1) state = point(state, 'jugador1', 'tiro_ganador', config)
  }
  for (let g = 0; g < 6; g += 1) {
    for (let p = 0; p < 4; p += 1) state = point(state, 'jugador2', 'tiro_ganador', config)
  }

  assert.equal(state.mode, 'match_tiebreak')
  for (let p = 0; p < 10; p += 1) state = point(state, 'jugador1', 'tiro_ganador', config)
  assert.equal(state.winner, 'jugador1')
  assert.equal(projectSets(state)[2].games_j1, 10)
})

test('primera falta no suma y habilita la doble falta', () => {
  let state = createInitialState({ servidor_inicial: 'jugador1' })
  state = applyEvent(state, { tipo: 'primera_falta' })
  assert.equal(state.serviceAttempt, 2)
  assert.deepEqual(state.points, [0, 0])
  state = applyEvent(state, {
    tipo: 'punto',
    ganador: 'jugador2',
    motivo: 'doble_falta',
  })
  assert.deepEqual(state.points, [0, 1])
  assert.equal(state.serviceAttempt, 1)
})

test('rechaza ace del receptor y doble falta sin primera falta', () => {
  const state = createInitialState({ servidor_inicial: 'jugador1' })
  assert.throws(
    () => applyEvent(state, { tipo: 'punto', ganador: 'jugador2', motivo: 'ace' }),
    (error) => error.status === 400 && /servidor/.test(error.message)
  )
  assert.throws(
    () => applyEvent(state, { tipo: 'punto', ganador: 'jugador2', motivo: 'doble_falta' }),
    (error) => error.status === 400 && /primera falta/.test(error.message)
  )
})

test('respeta juegos por set y diferencia configurables', () => {
  const config = { mejor_de_sets: 1, juegos_por_set: 4, diferencia_juegos: 1, tiebreak_en: 0 }
  let state = createInitialState(config)
  for (let game = 0; game < 4; game += 1) {
    for (let p = 0; p < 4; p += 1) state = point(state, 'jugador1', 'tiro_ganador', config)
  }
  assert.equal(state.winner, 'jugador1')
  assert.deepEqual(projectSets(state)[0].games_j1, 4)
})

test('permite corregir manualmente el servidor sin sumar puntos', () => {
  const state = createInitialState({ servidor_inicial: 'jugador1' })
  const corrected = applyEvent(state, { tipo: 'cambio_servidor', ganador: 'jugador2' })
  assert.equal(corrected.server, 'jugador2')
  assert.deepEqual(corrected.points, [0, 0])
})

// ── Tiebreak (empate a 6-6, primer en 7 con 2 de diferencia) ──────────

function reachSixSix(config = {}) {
  let state = createInitialState(config)
  for (let g = 0; g < 6; g += 1) {
    for (let p = 0; p < 4; p += 1) state = point(state, 'jugador1', 'tiro_ganador', config)
    for (let p = 0; p < 4; p += 1) state = point(state, 'jugador2', 'tiro_ganador', config)
  }
  return state
}

test('entra en modo tiebreak cuando el set llega a 6-6', () => {
  const state = reachSixSix()
  assert.equal(state.mode, 'tiebreak')
  assert.deepEqual(state.points, [0, 0])
})

test('tiebreak no termina en 7-6 (falta diferencia de 2)', () => {
  let state = reachSixSix()
  for (let i = 0; i < 6; i += 1) state = point(state, 'jugador1', 'tiro_ganador')
  for (let i = 0; i < 6; i += 1) state = point(state, 'jugador2', 'tiro_ganador')
  assert.equal(state.mode, 'tiebreak')
  assert.deepEqual(state.points, [6, 6])
  state = point(state, 'jugador1', 'tiro_ganador')
  assert.equal(state.mode, 'tiebreak')
  assert.deepEqual(state.points, [7, 6])
  assert.equal(state.winner, null)
})

test('tiebreak termina en 7-5 (7 puntos con 2 de diferencia)', () => {
  let state = reachSixSix()
  for (let i = 0; i < 5; i += 1) state = point(state, 'jugador1', 'tiro_ganador')
  for (let i = 0; i < 5; i += 1) state = point(state, 'jugador2', 'tiro_ganador')
  assert.deepEqual(state.points, [5, 5])
  state = point(state, 'jugador1', 'tiro_ganador')
  state = point(state, 'jugador1', 'tiro_ganador')
  assert.equal(state.mode, 'game')
  const sets = projectSets(state)
  assert.equal(sets[0].completado, true)
  assert.equal(sets[0].games_j1, 7)
  assert.equal(sets[0].games_j2, 6)
})

test('tiebreak termina en 8-6', () => {
  let state = reachSixSix()
  for (let i = 0; i < 6; i += 1) state = point(state, 'jugador1', 'tiro_ganador')
  for (let i = 0; i < 6; i += 1) state = point(state, 'jugador2', 'tiro_ganador')
  state = point(state, 'jugador1', 'tiro_ganador')
  state = point(state, 'jugador1', 'tiro_ganador')
  assert.equal(state.mode, 'game')
  const sets = projectSets(state)
  assert.equal(sets[0].games_j1, 7)
  assert.equal(sets[0].games_j2, 6)
})

test('tiebreak muestra puntos en display', () => {
  let state = reachSixSix()
  state = point(state, 'jugador1', 'tiro_ganador')
  state = point(state, 'jugador2', 'tiro_ganador')
  state = point(state, 'jugador1', 'tiro_ganador')
  assert.deepEqual(pointDisplay(state), ['2', '1'])
})

// ── Match tiebreak / supertiebreak (set decisivo, primer en 10 con 2 de diferencia) ──

test('match tiebreak no termina en 10-9 (falta diferencia de 2)', () => {
  const config = { mejor_de_sets: 3, set_decisivo: 'match_tiebreak', match_tiebreak_puntos: 10 }
  let state = createInitialState(config)
  // Set 1: J1 wins 6-4
  for (let g = 0; g < 4; g += 1) {
    for (let p = 0; p < 4; p += 1) state = point(state, 'jugador2', 'tiro_ganador', config)
  }
  for (let g = 0; g < 6; g += 1) {
    for (let p = 0; p < 4; p += 1) state = point(state, 'jugador1', 'tiro_ganador', config)
  }
  // Set 2: J2 wins 6-4
  for (let g = 0; g < 4; g += 1) {
    for (let p = 0; p < 4; p += 1) state = point(state, 'jugador1', 'tiro_ganador', config)
  }
  for (let g = 0; g < 6; g += 1) {
    for (let p = 0; p < 4; p += 1) state = point(state, 'jugador2', 'tiro_ganador', config)
  }
  assert.equal(state.mode, 'match_tiebreak')
  for (let i = 0; i < 9; i += 1) state = point(state, 'jugador1', 'tiro_ganador', config)
  for (let i = 0; i < 9; i += 1) state = point(state, 'jugador2', 'tiro_ganador', config)
  assert.deepEqual(state.points, [9, 9])
  state = point(state, 'jugador1', 'tiro_ganador', config)
  assert.deepEqual(state.points, [10, 9])
  assert.equal(state.winner, null)
  assert.equal(state.mode, 'match_tiebreak')
})

test('match tiebreak termina en 10-8 (10 puntos con 2 de diferencia)', () => {
  const config = { mejor_de_sets: 3, set_decisivo: 'match_tiebreak', match_tiebreak_puntos: 10 }
  let state = createInitialState(config)
  // Set 1: J1 wins 6-4
  for (let g = 0; g < 4; g += 1) {
    for (let p = 0; p < 4; p += 1) state = point(state, 'jugador2', 'tiro_ganador', config)
  }
  for (let g = 0; g < 6; g += 1) {
    for (let p = 0; p < 4; p += 1) state = point(state, 'jugador1', 'tiro_ganador', config)
  }
  // Set 2: J2 wins 6-4
  for (let g = 0; g < 4; g += 1) {
    for (let p = 0; p < 4; p += 1) state = point(state, 'jugador1', 'tiro_ganador', config)
  }
  for (let g = 0; g < 6; g += 1) {
    for (let p = 0; p < 4; p += 1) state = point(state, 'jugador2', 'tiro_ganador', config)
  }
  for (let i = 0; i < 8; i += 1) state = point(state, 'jugador1', 'tiro_ganador', config)
  for (let i = 0; i < 8; i += 1) state = point(state, 'jugador2', 'tiro_ganador', config)
  state = point(state, 'jugador1', 'tiro_ganador', config)
  state = point(state, 'jugador1', 'tiro_ganador', config)
  assert.equal(state.winner, 'jugador1')
  assert.equal(projectSets(state)[2].games_j1, 10)
  assert.equal(projectSets(state)[2].games_j2, 8)
})

test('match tiebreak se extiende hasta 12-10 después de empatar 10-10', () => {
  const config = { mejor_de_sets: 3, set_decisivo: 'match_tiebreak', match_tiebreak_puntos: 10 }
  let state = createInitialState(config)
  // Set 1: J1 wins 6-4
  for (let g = 0; g < 4; g += 1) {
    for (let p = 0; p < 4; p += 1) state = point(state, 'jugador2', 'tiro_ganador', config)
  }
  for (let g = 0; g < 6; g += 1) {
    for (let p = 0; p < 4; p += 1) state = point(state, 'jugador1', 'tiro_ganador', config)
  }
  // Set 2: J2 wins 6-4
  for (let g = 0; g < 4; g += 1) {
    for (let p = 0; p < 4; p += 1) state = point(state, 'jugador1', 'tiro_ganador', config)
  }
  for (let g = 0; g < 6; g += 1) {
    for (let p = 0; p < 4; p += 1) state = point(state, 'jugador2', 'tiro_ganador', config)
  }
  for (let i = 0; i < 9; i += 1) state = point(state, 'jugador1', 'tiro_ganador', config)
  for (let i = 0; i < 9; i += 1) state = point(state, 'jugador2', 'tiro_ganador', config)
  assert.deepEqual(state.points, [9, 9])
  state = point(state, 'jugador1', 'tiro_ganador', config)
  state = point(state, 'jugador2', 'tiro_ganador', config)
  assert.deepEqual(state.points, [10, 10])
  state = point(state, 'jugador1', 'tiro_ganador', config)
  state = point(state, 'jugador1', 'tiro_ganador', config)
  assert.equal(state.winner, 'jugador1')
  assert.equal(projectSets(state)[2].games_j1, 12)
  assert.equal(projectSets(state)[2].games_j2, 10)
})

test('match tiebreak muestra puntos en display', () => {
  const config = { mejor_de_sets: 3, set_decisivo: 'match_tiebreak', match_tiebreak_puntos: 10 }
  let state = createInitialState(config)
  // Set 1: J1 wins 6-4
  for (let g = 0; g < 4; g += 1) {
    for (let p = 0; p < 4; p += 1) state = point(state, 'jugador2', 'tiro_ganador', config)
  }
  for (let g = 0; g < 6; g += 1) {
    for (let p = 0; p < 4; p += 1) state = point(state, 'jugador1', 'tiro_ganador', config)
  }
  // Set 2: J2 wins 6-4
  for (let g = 0; g < 4; g += 1) {
    for (let p = 0; p < 4; p += 1) state = point(state, 'jugador1', 'tiro_ganador', config)
  }
  for (let g = 0; g < 6; g += 1) {
    for (let p = 0; p < 4; p += 1) state = point(state, 'jugador2', 'tiro_ganador', config)
  }
  state = point(state, 'jugador1', 'tiro_ganador', config)
  state = point(state, 'jugador2', 'tiro_ganador', config)
  state = point(state, 'jugador1', 'tiro_ganador', config)
  assert.deepEqual(pointDisplay(state), ['2', '1'])
})

test('set decisivo sin match_tiebreak usa tiebreak normal a 7', () => {
  const config = { mejor_de_sets: 3, set_decisivo: 'set_completo' }
  let state = createInitialState(config)
  // Set 1: J1 wins 6-4
  for (let g = 0; g < 4; g += 1) {
    for (let p = 0; p < 4; p += 1) state = point(state, 'jugador2', 'tiro_ganador', config)
  }
  for (let g = 0; g < 6; g += 1) {
    for (let p = 0; p < 4; p += 1) state = point(state, 'jugador1', 'tiro_ganador', config)
  }
  // Set 2: J2 wins 6-4
  for (let g = 0; g < 4; g += 1) {
    for (let p = 0; p < 4; p += 1) state = point(state, 'jugador1', 'tiro_ganador', config)
  }
  for (let g = 0; g < 6; g += 1) {
    for (let p = 0; p < 4; p += 1) state = point(state, 'jugador2', 'tiro_ganador', config)
  }
  assert.equal(state.mode, 'game')
  assert.equal(state.currentSet, 3)
  // Reach 6-6 in set 3
  for (let g = 0; g < 6; g += 1) {
    for (let p = 0; p < 4; p += 1) state = point(state, 'jugador1', 'tiro_ganador', config)
    for (let p = 0; p < 4; p += 1) state = point(state, 'jugador2', 'tiro_ganador', config)
  }
  assert.equal(state.mode, 'tiebreak')
  // Score tiebreak to 7-5
  for (let i = 0; i < 5; i += 1) state = point(state, 'jugador1', 'tiro_ganador', config)
  for (let i = 0; i < 5; i += 1) state = point(state, 'jugador2', 'tiro_ganador', config)
  state = point(state, 'jugador1', 'tiro_ganador', config)
  state = point(state, 'jugador1', 'tiro_ganador', config)
  assert.equal(state.winner, 'jugador1')
  assert.equal(projectSets(state)[2].games_j1, 7)
  assert.equal(projectSets(state)[2].games_j2, 6)
})

// ── Break point ──────────────────────────────────────────────────────

test('computeBreakpoint retorna null cuando no hay breakpoint', () => {
  const state = createInitialState()
  state.points = [0, 0]
  assert.equal(computeBreakpoint(state), null)
})

test('computeBreakpoint detecta breakpoint simple (30-40)', () => {
  const state = createInitialState()
  state.server = 'jugador1'
  state.points = [2, 3]
  const bp = computeBreakpoint(state)
  assert.equal(bp.type, 'break_point')
  assert.equal(bp.count, 1)
  assert.equal(bp.server, 'jugador1')
})

test('computeBreakpoint detecta doble breakpoint (15-40)', () => {
  const state = createInitialState()
  state.server = 'jugador1'
  state.points = [1, 3]
  const bp = computeBreakpoint(state)
  assert.equal(bp.type, 'double_break_point')
  assert.equal(bp.count, 2)
})

test('computeBreakpoint no detecta breakpoint en 30-30', () => {
  const state = createInitialState()
  state.server = 'jugador1'
  state.points = [2, 2]
  assert.equal(computeBreakpoint(state), null)
})

test('computeBreakpoint no detecta breakpoint en 40-30', () => {
  const state = createInitialState()
  state.server = 'jugador1'
  state.points = [3, 2]
  assert.equal(computeBreakpoint(state), null)
})

test('computeBreakpoint no aplica en tiebreak', () => {
  const state = createInitialState()
  state.mode = 'tiebreak'
  state.server = 'jugador1'
  state.points = [5, 8]
  assert.equal(computeBreakpoint(state), null)
})

test('computeBreakpoint funciona con sin_ventaja', () => {
  const state = createInitialState()
  state.server = 'jugador1'
  state.points = [2, 3]
  const bp = computeBreakpoint(state, { modo_game: 'sin_ventaja' })
  assert.equal(bp.type, 'break_point')
  assert.equal(bp.count, 1)
})
