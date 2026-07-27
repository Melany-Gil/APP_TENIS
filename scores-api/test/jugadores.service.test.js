const test = require('node:test')
const assert = require('node:assert/strict')

const dbPath = require.resolve('../src/config/db')
const servicePath = require.resolve('../src/modules/jugadores/jugadores.service')

const playerRow = {
  id: 8,
  nombre: 'Laura',
  apellido: 'Díaz',
  deporte: 'tenis',
  activo: 1,
}

const matchStatsRows = [
  {
    partido_id: 1,
    categoria_id: 3,
    categoria_nombre: '4ta',
    categoria_orden: 3,
    jugador1_id: 8,
    jugador2_id: 9,
    ganador: 'jugador1',
    numero_set: 1,
    games_j1: 6,
    games_j2: 2,
  },
  {
    partido_id: 1,
    categoria_id: 3,
    categoria_nombre: '4ta',
    categoria_orden: 3,
    jugador1_id: 8,
    jugador2_id: 9,
    ganador: 'jugador1',
    numero_set: 2,
    games_j1: 6,
    games_j2: 3,
  },
]

const loadService = (fakeDb) => {
  delete require.cache[servicePath]
  require.cache[dbPath] = {
    id: dbPath,
    filename: dbPath,
    loaded: true,
    exports: fakeDb,
  }
  return require(servicePath)
}

test('el detalle público contiene solo datos básicos y estadísticas por categoría', async () => {
  let call = 0
  const fakeDb = {
    async query() {
      call += 1
      return call === 1 ? [[playerRow]] : [matchStatsRows]
    },
  }

  const player = await loadService(fakeDb).getById(8)

  assert.equal(player.nombre, 'Laura')
  assert.equal(Object.hasOwn(player, 'telefono'), false)
  assert.equal(Object.hasOwn(player, 'fecha_nac'), false)
  assert.equal(Object.hasOwn(player, 'country'), false)
  assert.equal(player.estadisticas.length, 1)
  assert.equal(player.estadisticas[0].categoria.nombre, '4ta')
  assert.equal(player.estadisticas[0].puntos, 3)
})

test('getAll filtra estadísticas por la categoría de los partidos', async () => {
  const calls = []
  const fakeDb = {
    async query(sql, params) {
      calls.push({ sql, params })
      return calls.length === 1 ? [[playerRow]] : [matchStatsRows]
    },
  }

  const players = await loadService(fakeDb).getAll({
    deporte: 'tenis',
    categoria_id: '3',
    activo: 'true',
  })

  assert.equal(players.length, 1)
  assert.equal(players[0].stats.ranking, 1)
  assert.equal(players[0].stats.categoria.id, 3)
  assert.deepEqual(calls[1].params, [3])
  assert.match(calls[1].sql, /p\.categoria_id = \?/)
})

test('crear jugador guarda únicamente nombre, apellido y deporte', async () => {
  const calls = []
  const fakeDb = {
    async query(sql, params) {
      calls.push({ sql, params })
      if (calls.length === 1) return [{ insertId: 9 }]
      if (calls.length === 2) return [[{ ...playerRow, id: 9 }]]
      return [[]]
    },
  }

  await loadService(fakeDb).create({
    nombre: ' Laura ',
    apellido: ' Díaz ',
    deporte: 'tenis',
    telefono: 'No debe guardarse',
    categoria_id: 3,
  })

  assert.match(calls[0].sql, /\(nombre, apellido, country_id, deporte\)/)
  assert.doesNotMatch(calls[0].sql, /telefono|categoria_id|apodo|fecha_nac/)
  assert.deepEqual(calls[0].params, ['Laura', 'Díaz', 'tenis'])
  assert.equal(
    calls.some((call) => /INSERT INTO jugador_stats/.test(call.sql)),
    false
  )
})
