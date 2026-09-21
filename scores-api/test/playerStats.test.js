const test = require('node:test')
const assert = require('node:assert/strict')
const { calculatePlayerStats } = require('../src/utils/playerStats')

test('dobles atribuye el resultado a los cuatro integrantes sin duplicar jugadores', () => {
  const stats = calculatePlayerStats([{ partido_id: 50, categoria_id: 2, categoria_nombre: '3ra', categoria_orden: 2,
    jugador1_id: 10, e1_j1_id: 10, e1_j2_id: 11, e2_j1_id: 12, e2_j2_id: 13,
    ganador: 'jugador1', numero_set: 1, games_j1: 6, games_j2: 2 }])
  assert.equal(stats.length, 4)
  for (const id of [10, 11]) {
    const player = stats.find(p => p.jugador_id === id)
    assert.equal(player.victorias, 1)
    assert.equal(player.partidos_jugados, 1)
    assert.equal(player.games_ganados, 6)
  }
  for (const id of [12, 13]) assert.equal(stats.find(p => p.jugador_id === id).derrotas, 1)
})

const row = ({
  partido,
  categoria = 2,
  categoriaNombre = '3ra',
  categoriaOrden = 2,
  jugador1,
  jugador2,
  ganador,
  set,
  games1,
  games2,
}) => ({
  partido_id: partido,
  categoria_id: categoria,
  categoria_nombre: categoriaNombre,
  categoria_orden: categoriaOrden,
  jugador1_id: jugador1,
  jugador2_id: jugador2,
  ganador,
  numero_set: set,
  games_j1: games1,
  games_j2: games2,
})

test('asigna 3-0 cuando el ganador no cede sets', () => {
  const stats = calculatePlayerStats([
    row({
      partido: 1,
      jugador1: 10,
      jugador2: 11,
      ganador: 'jugador1',
      set: 1,
      games1: 6,
      games2: 2,
    }),
    row({
      partido: 1,
      jugador1: 10,
      jugador2: 11,
      ganador: 'jugador1',
      set: 2,
      games1: 6,
      games2: 4,
    }),
  ])

  const winner = stats.find((entry) => entry.jugador_id === 10)
  const loser = stats.find((entry) => entry.jugador_id === 11)

  assert.equal(winner.puntos, 3)
  assert.equal(winner.victorias, 1)
  assert.equal(loser.puntos, 0)
  assert.equal(loser.derrotas, 1)
})

test('asigna 2-1 cuando el perdedor gana un set', () => {
  const stats = calculatePlayerStats([
    row({
      partido: 2,
      jugador1: 20,
      jugador2: 21,
      ganador: 'jugador2',
      set: 1,
      games1: 6,
      games2: 4,
    }),
    row({
      partido: 2,
      jugador1: 20,
      jugador2: 21,
      ganador: 'jugador2',
      set: 2,
      games1: 3,
      games2: 6,
    }),
    row({
      partido: 2,
      jugador1: 20,
      jugador2: 21,
      ganador: 'jugador2',
      set: 3,
      games1: 8,
      games2: 10,
    }),
  ])

  const winner = stats.find((entry) => entry.jugador_id === 21)
  const loser = stats.find((entry) => entry.jugador_id === 20)

  assert.equal(winner.puntos, 2)
  assert.equal(loser.puntos, 1)
  assert.equal(winner.sets_ganados, 2)
  assert.equal(loser.sets_ganados, 1)
})

test('calcula rankings independientes para cada categoría', () => {
  const stats = calculatePlayerStats([
    row({
      partido: 3,
      jugador1: 30,
      jugador2: 31,
      ganador: 'jugador1',
      set: 1,
      games1: 6,
      games2: 1,
    }),
    row({
      partido: 3,
      jugador1: 30,
      jugador2: 31,
      ganador: 'jugador1',
      set: 2,
      games1: 6,
      games2: 1,
    }),
    row({
      partido: 4,
      categoria: 4,
      categoriaNombre: '5ta',
      categoriaOrden: 4,
      jugador1: 40,
      jugador2: 41,
      ganador: 'jugador2',
      set: 1,
      games1: 2,
      games2: 6,
    }),
    row({
      partido: 4,
      categoria: 4,
      categoriaNombre: '5ta',
      categoriaOrden: 4,
      jugador1: 40,
      jugador2: 41,
      ganador: 'jugador2',
      set: 2,
      games1: 3,
      games2: 6,
    }),
  ])

  assert.equal(stats.find((entry) => entry.jugador_id === 30).ranking, 1)
  assert.equal(stats.find((entry) => entry.jugador_id === 41).ranking, 1)
  assert.equal(stats.find((entry) => entry.jugador_id === 31).ranking, 2)
  assert.equal(stats.find((entry) => entry.jugador_id === 40).ranking, 2)
})
