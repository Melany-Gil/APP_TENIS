const test = require('node:test')
const assert = require('node:assert/strict')
const { createInitialState, applyEvent } = require('../src/modules/matches/score.engine')

test('sacador individual rota en juegos y tie-break sin cambiar por falta o let', async () => {
  const { doublesServer } = await import('../../scores-app/src/utils/doublesServer.js')
  const order = { set: 1, firstSide: 'jugador1', first1: 2, first2: 1 }
  let state = createInitialState()
  assert.deepEqual(doublesServer(state, order), { team: 1, member: 2 })
  state = applyEvent(state, { tipo: 'primera_falta' })
  state = applyEvent(state, { tipo: 'let' })
  assert.equal(state.serviceAttempt, 2)
  assert.deepEqual(doublesServer(state, order), { team: 1, member: 2 })
  for (const expected of [{ team: 2, member: 1 }, { team: 1, member: 1 }, { team: 2, member: 2 }, { team: 1, member: 2 }]) {
    for (let p = 0; p < 4; p++) state = applyEvent(state, { tipo: 'punto', ganador: 'jugador1', motivo: 'tiro_ganador' })
    assert.deepEqual(doublesServer(state, order), expected)
  }
  state = createInitialState()
  state.mode = 'tiebreak'; state.sets[0].games = [6, 6]
  state.tieBreakFirstServer = 'jugador1'
  const expected = [[1,2], [2,1], [2,1], [1,1], [1,1], [2,2], [2,2], [1,2]]
  for (let p = 0; p < expected.length; p++) {
    assert.deepEqual(doublesServer(state, order), { team: expected[p][0], member: expected[p][1] })
    state = applyEvent(state, { tipo: 'punto', ganador: p % 2 ? 'jugador2' : 'jugador1', motivo: 'tiro_ganador' })
  }
  assert.equal(doublesServer(state, { ...order, set: 2 }), null)
  assert.equal(doublesServer(state, null), null)
  assert.equal(doublesServer({ ...state, winner: 'jugador1' }, order), null)
})
