const test = require('node:test')
const assert = require('node:assert/strict')
const path = require('node:path')

const dbPath = require.resolve('../src/config/db')
const servicePath = require.resolve('../src/modules/matches/matches.service')

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

test('getAll devuelve sets, categoría y aplica los filtros del historial', async () => {
  const calls = []
  const fakeDb = {
    async query(sql, params) {
      calls.push({ sql, params })
      if (calls.length === 1) {
        return [
          [
            {
              id: 7,
              deporte: 'tenis',
              ronda: 'Final',
              estado: 'finalizado',
              ganador: 'jugador1',
              fecha_inicio: new Date('2026-07-20T18:00:00Z'),
              torneo_id: 2,
              torneo_nombre: 'Copa Club Unión',
              categoria_id: 3,
              categoria_nombre: '4ta',
              j1_id: 10,
              j1_nombre: 'Ana',
              j1_apellido: 'Rojas',
              j2_id: 11,
              j2_nombre: 'Laura',
              j2_apellido: 'Díaz',
            },
          ],
        ]
      }
      return [
        [
          {
            partido_id: 7,
            numero_set: 1,
            games_j1: 6,
            games_j2: 3,
            completado: 1,
          },
          {
            partido_id: 7,
            numero_set: 2,
            games_j1: 6,
            games_j2: 4,
            completado: 1,
          },
        ],
      ]
    },
  }
  const service = loadService(fakeDb)

  const result = await service.getAll({
    estado: 'finalizado',
    deporte: 'tenis',
    categoria_id: '3',
    fecha: '2026-07-20',
    jugador: 'Ana',
  })

  assert.equal(result.length, 1)
  assert.equal(result[0].categoria.nombre, '4ta')
  assert.deepEqual(
    result[0].sets.map((set) => [set.numero_set, set.games_j1, set.games_j2]),
    [
      [1, 6, 3],
      [2, 6, 4],
    ]
  )
  assert.match(calls[0].sql, /COALESCE\(t\.categoria_id/)
  assert.match(calls[0].sql, /DATE\(p\.fecha_inicio\) = \?/)
  assert.match(calls[0].sql, /CONCAT_WS/)
  assert.deepEqual(calls[0].params, ['finalizado', 'tenis', '3', '2026-07-20', '%Ana%', '%Ana%'])
})

test('updateMarcador rechaza sets duplicados antes de escribir', async () => {
  const fakeDb = {
    async query() {
      return [[{ id: 7 }]]
    },
    getConnection() {
      throw new Error('No debe abrir una transacción para datos inválidos')
    },
  }
  const service = loadService(fakeDb)

  await assert.rejects(
    service.updateMarcador(7, {
      estado: 'en_vivo',
      ganador: null,
      sets: [
        { numero_set: 1, games_j1: 6, games_j2: 4 },
        { numero_set: 1, games_j1: 1, games_j2: 0 },
      ],
    }),
    (error) => error.status === 400
  )
})
