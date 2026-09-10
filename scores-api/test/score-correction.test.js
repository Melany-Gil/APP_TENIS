const test = require('node:test')
const assert = require('node:assert/strict')
const { buildCorrection } = require('../src/modules/matches/score-correction')
const { applyEvent, serializeState } = require('../src/modules/matches/score.engine')
const set = (a, b, numero_set = 1, completado = false) => ({ games_j1: a, games_j2: b, numero_set, completado })
const payload = (sets, extra = {}) => ({ sets, estado: 'en_vivo', servidor: 'jugador2', motivo: 'Corrección de transcripción', confirmar_reinicio_game: true, ...extra })

test('la siguiente acción usa el checkpoint corregido, no el marcador anterior', () => {
  const state = buildCorrection({}, payload([set(3, 2)]))
  const next = applyEvent(state, { tipo: 'punto', ganador: 'jugador1', motivo: 'tiro_ganador' })
  assert.deepEqual(next.sets[0].games, [3, 2])
  assert.deepEqual(serializeState(next).displayPoints, ['15', '0'])
  assert.deepEqual(next.points, [1, 0])
  assert.equal(next.server, 'jugador2')
})

test('genera el siguiente set y reconoce el ganador por formato', () => {
  const next = buildCorrection({}, payload([set(6, 2, 1, true)]))
  assert.equal(next.currentSet, 2)
  const end = buildCorrection({}, payload([set(6, 2, 1, true), set(6, 4, 2, true)], { estado: 'finalizado', ganador: 'jugador1' }))
  assert.equal(end.winner, 'jugador1')
  assert.equal(end.mode, 'completed')
})

test('reconoce tiebreak y match tiebreak sin perder el modo del motor', () => {
  assert.equal(buildCorrection({}, payload([set(6, 6)])).mode, 'tiebreak')
  const config = { set_decisivo: 'match_tiebreak' }
  const state = buildCorrection(config, payload([set(6, 2, 1, true), set(2, 6, 2, true)]))
  assert.equal(state.mode, 'match_tiebreak')
  const end = buildCorrection(config, payload([set(6, 2, 1, true), set(2, 6, 2, true), set(10, 8, 3, true)], { estado: 'finalizado', ganador: 'jugador1' }))
  assert.equal(end.winner, 'jugador1')
  assert.deepEqual(end.sets[2].tiebreak, [10, 8])
})

for (const [label, body] of [
  ['sin motivo', payload([set(0, 0)], { motivo: '' })],
  ['sin confirmación', payload([set(0, 0)], { confirmar_reinicio_game: false })],
  ['ganador incorrecto', payload([set(6, 0, 1, true), set(6, 0, 2, true)], { estado: 'finalizado', ganador: 'jugador2' })],
  ['set incompleto marcado final', payload([set(3, 2, 1, true)])],
  ['set terminado sin casilla', payload([set(6, 0)])],
  ['games fraccionarios', payload([set(1.5, 2)])],
  ['tiebreak negativo', payload([{ ...set(7, 6, 1, true), tiebreak_j1: -1 }])],
  ['sets después del ganador', payload([set(6, 0, 1, true), set(6, 0, 2, true), set(0, 0, 3)])],
  ['cancelación encubierta', payload([set(0, 0)], { estado: 'cancelado' })],
]) test(`rechaza corrección ${label}`, () => assert.throws(() => buildCorrection({}, body), (e) => e.status === 400))
