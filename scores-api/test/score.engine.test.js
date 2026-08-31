const test = require('node:test')
const assert = require('node:assert/strict')

const {
  applyEvent,
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

  for (let game = 0; game < 6; game += 1) {
    for (let p = 0; p < 4; p += 1) state = point(state, 'jugador1', 'tiro_ganador', config)
  }
  for (let game = 0; game < 6; game += 1) {
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
