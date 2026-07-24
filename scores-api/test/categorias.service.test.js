const test = require('node:test')
const assert = require('node:assert/strict')

const dbPath = require.resolve('../src/config/db')
const servicePath = require.resolve('../src/modules/categorias/categorias.service')

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

test('getAll filtra por deporte sin depender del modo ANSI_QUOTES de MySQL', async () => {
  const calls = []
  const fakeDb = {
    async query(sql, params) {
      calls.push({ sql, params })
      return [[{ id: 1, nombre: '2da', deporte: 'tenis', orden: 1 }]]
    },
  }

  const result = await loadService(fakeDb).getAll({ deporte: 'tenis' })

  assert.equal(result.length, 1)
  assert.match(calls[0].sql, /deporte = \? OR deporte = \?/)
  assert.doesNotMatch(calls[0].sql, /"ambos"/)
  assert.deepEqual(calls[0].params, ['tenis', 'ambos'])
})
