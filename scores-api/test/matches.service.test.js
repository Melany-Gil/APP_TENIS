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
              estado: 'finalizado',
              ganador: 'jugador1',
              notas: 'Partido finalizado por retiro',
              fecha_inicio: new Date('2026-07-20T18:00:00Z'),
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
  assert.equal(result[0].notas, 'Partido finalizado por retiro')
  assert.deepEqual(
    result[0].sets.map((set) => [set.numero_set, set.games_j1, set.games_j2]),
    [
      [1, 6, 3],
      [2, 6, 4],
    ]
  )
  assert.match(calls[0].sql, /LEFT JOIN categorias cat ON cat\.id = p\.categoria_id/)
  assert.match(calls[0].sql, /p\.categoria_id = \?/)
  assert.match(calls[0].sql, /DATE\(p\.fecha_inicio\) = \?/)
  assert.match(calls[0].sql, /CONCAT_WS/)
  assert.deepEqual(calls[0].params, [
    'finalizado',
    'tenis',
    '3',
    '2026-07-20',
    '%Ana%',
    '%Ana%',
    '%Ana%',
    '%Ana%',
  ])
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

test('create asigna la categoría directamente al partido', async () => {
  const calls = []
  const fakeDb = {
    async query(sql, params) {
      calls.push({ sql, params })
      if (calls.length === 1) return [[{ deporte: 'tenis' }]]
      if (calls.length === 2) return [{ insertId: 15 }]
      if (calls.length === 3) {
        return [
          [
            {
              id: 15,
              deporte: 'tenis',
              estado: 'programado',
              ganador: null,
              fecha_inicio: new Date('2026-08-01T14:00:00Z'),
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
      return [[]]
    },
  }
  const service = loadService(fakeDb)

  const result = await service.create(
    {
      deporte: 'tenis',
      categoria_id: '3',
      jugador1_id: '10',
      jugador2_id: '11',
      estado: 'programado',
      fecha_inicio: '2026-08-01T09:00',
      notas: 'Cancha húmeda',
      torneo_id: '7',
      ronda: 'Final',
    },
    2
  )

  assert.match(calls[1].sql, /deporte, categoria_id, jugador1_id, jugador2_id/)
  assert.match(calls[1].sql, /fecha_inicio, notas, created_by/)
  assert.doesNotMatch(calls[1].sql, /torneo_id|ronda|cancha_id/)
  assert.equal(calls[1].params[1], 3)
  assert.equal(calls[1].params[8], 'Cancha húmeda')
  assert.equal(result.categoria.nombre, '4ta')
})
