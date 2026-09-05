const test = require('node:test')
const assert = require('node:assert/strict')

const dbPath = require.resolve('../src/config/db')
const matchesPath = require.resolve('../src/modules/matches/matches.service')
const servicePath = require.resolve('../src/modules/matches/match-events.service')

const loadService = (fakeDb, fakeMatches) => {
  delete require.cache[servicePath]
  require.cache[dbPath] = {
    id: dbPath,
    filename: dbPath,
    loaded: true,
    exports: fakeDb,
  }
  require.cache[matchesPath] = {
    id: matchesPath,
    filename: matchesPath,
    loaded: true,
    exports: fakeMatches,
  }
  return require(servicePath)
}

test('la bandeja del juez solicita solamente sus partidos asignados', async () => {
  let receivedFilters
  const service = loadService({}, {
    async getAll(filters) {
      receivedFilters = filters
      return []
    },
  })

  await service.getManagedMatches({ id: 12, rol: 'juez' })
  assert.deepEqual(receivedFilters, { juez_id: 12, orden: 'asc' })
})

test('un juez puede abrir el control de un partido que le corresponde', async () => {
  let call = 0
  const fakeDb = {
    async query() {
      call += 1
      if (call === 1) return [[{ id: 30, juez_id: 12, mejor_de_sets: 3 }]]
      return [[]]
    },
  }
  const service = loadService(fakeDb, {
    async getById() {
      return { id: 30, estado: 'programado', formato: { mejor_de_sets: 3 } }
    },
  })

  const control = await service.getControl(30, { id: 12, rol: 'juez' })
  assert.equal(control.partido.id, 30)
  assert.equal(control.marcador.winner, null)
})

test('un juez no puede registrar puntos en un partido asignado a otro juez', async () => {
  let inserted = false
  const connection = {
    async beginTransaction() {},
    async query(sql) {
      if (/SELECT \* FROM partidos/.test(sql)) return [[{ id: 30, juez_id: 99 }]]
      if (/INSERT INTO eventos_partido/.test(sql)) inserted = true
      return [[]]
    },
    async rollback() {},
    async commit() {},
    release() {},
  }
  const service = loadService(
    { async getConnection() { return connection } },
    { async getById() { return { id: 30 } } }
  )

  await assert.rejects(
    service.addEvent(30, { tipo: 'punto', ganador: 'jugador1' }, { id: 12, rol: 'juez' }),
    (error) => error.status === 403 && /no está asignado/.test(error.message)
  )
  assert.equal(inserted, false)
})
