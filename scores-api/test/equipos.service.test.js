const test = require('node:test')
const assert = require('node:assert/strict')

const dbPath = require.resolve('../src/config/db')
const servicePath = require.resolve('../src/modules/equipos/equipos.service')

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

test('explica por qué una pareja con partidos no se puede eliminar', async () => {
  const calls = []
  const fakeDb = {
    async query(sql) {
      calls.push(sql)
      if (/SELECT id, nombre FROM equipos_padel/.test(sql)) {
        return [[{ id: 5, nombre: 'García / López' }]]
      }
      if (/SELECT\s+\(SELECT COUNT\(\*\) FROM partidos/.test(sql)) {
        return [[{ partidos: 4, inscripciones: 1 }]]
      }
      throw new Error('No debe intentar borrar una pareja relacionada')
    },
  }

  await assert.rejects(
    loadService(fakeDb).remove(5),
    (error) =>
      error.status === 409 &&
      /García \/ López/.test(error.message) &&
      /4 partidos/.test(error.message) &&
      /1 inscripción/.test(error.message)
  )
  assert.equal(calls.some((sql) => /^DELETE/.test(sql.trim())), false)
})
