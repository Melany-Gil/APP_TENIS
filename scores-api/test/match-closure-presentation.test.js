const test = require('node:test')
const assert = require('node:assert/strict')
const { closureInfo, snapshotFromSets } = require('../src/utils/matchClosure')
const { calculatePlayerStats } = require('../src/utils/playerStats')

test('historical winners without sets do not receive invented games', () => {
  for (const notas of ['', '[Victoria por W.O. - Motivo: privado]']) {
    const stats = calculatePlayerStats([{ partido_id: 1, categoria_id: 1, jugador1_id: 1, jugador2_id: 2,
      ganador: 'jugador1', notas, numero_set: null }])
    assert.equal(stats[0].games_ganados, 0)
    assert.equal(stats[0].sets_ganados, 0)
    assert.equal(snapshotFromSets({ estado: 'finalizado', ganador: 'jugador1', notas }, []), null)
  }
})
test('public closure hides private reasons and double WO grants no points', () => {
  const info = closureInfo({ estado: 'finalizado', ganador: null, notas: '[Doble W.O. - Motivo: privado]', sets: [] })
  assert.equal(info.puntos_clasificacion, 0)
  assert.equal(info.marcador_oficial, null)
  assert.equal(info.doble, true)
  assert.ok(!JSON.stringify(info).includes('privado'))
})
test('reconstruction preserves set type and tiebreak detail', () => {
  const result = snapshotFromSets({ estado: 'finalizado', ganador: 'jugador2', mejor_de_sets: 3, set_decisivo: 'match_tiebreak' }, [
    { numero_set: 1, games_j1: 6, games_j2: 2, completado: true },
    { numero_set: 2, games_j1: 6, games_j2: 7, tiebreak_j1: 5, tiebreak_j2: 7, completado: true },
    { numero_set: 3, games_j1: 8, games_j2: 10, completado: true },
  ])
  assert.equal(result.sets[2].type, 'match_tiebreak')
  assert.deepEqual(result.sets[1].tiebreak, [5, 7])
  assert.deepEqual(result.setsWon, [1, 2])
})
test('retirement summary preserves recorded partial score', () => {
  const result = closureInfo({ estado: 'finalizado', ganador: 'jugador2', notas: '[Retiro con juego registrado]',
    sets: [{ numero_set: 1, games_j1: 3, games_j2: 1, completado: false }] })
  assert.equal(result.es_retiro, true)
  assert.equal(result.marcador_oficial, '3/1')
})

test('assigned WO counts two sets and twelve games even with a one-set format', () => {
  const stats = calculatePlayerStats([1, 2].map(numero_set => ({ partido_id: 1, categoria_id: 1,
    jugador1_id: 1, jugador2_id: 2, ganador: 'jugador1', notas: '[Victoria por W.O. (6/0 6/0)]',
    numero_set, completado: 1, games_j1: 6, games_j2: 0, mejor_de_sets: 1, set_decisivo: 'match_tiebreak' })))
  assert.equal(stats.find(p => p.jugador_id === 1).games_ganados, 12)
  assert.equal(stats.find(p => p.jugador_id === 1).sets_ganados, 2)
  assert.equal(stats.find(p => p.jugador_id === 1).puntos, 1)
})

test('an unfinished set at retirement does not count as a won set', () => {
  const stats = calculatePlayerStats([{ partido_id: 1, categoria_id: 1, jugador1_id: 1, jugador2_id: 2,
    ganador: 'jugador2', numero_set: 1, completado: 0, games_j1: 3, games_j2: 1 }])
  assert.equal(stats.find(p => p.jugador_id === 1).sets_ganados, 0)
  assert.equal(stats.find(p => p.jugador_id === 2).puntos, 1)
})
