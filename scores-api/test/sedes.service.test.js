const test = require('node:test')
const assert = require('node:assert/strict')

const dbPath = require.resolve('../src/config/db')
const servicePath = require.resolve('../src/modules/sedes/sedes.service')

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

test('actualiza nombre, deporte y superficie de una cancha activa', async () => {
  const calls = []
  const fakeDb = {
    async query(sql, params) {
      calls.push({ sql, params })
      if (/SELECT c\.id, c\.deporte/.test(sql)) return [[{ id: 5, deporte: 'tenis' }]]
      if (/SELECT id, nombre, deporte, superficie/.test(sql)) {
        return [[{ id: 5, nombre: 'Central', deporte: 'tenis', superficie: 'Arcilla' }]]
      }
      return [{}]
    },
  }

  const result = await loadService(fakeDb).updateCancha(5, {
    nombre: '  Central  ',
    deporte: 'tenis',
    superficie: 'Arcilla',
  })

  const update = calls.find((call) => /UPDATE canchas/.test(call.sql))
  assert.deepEqual(update.params, ['Central', 'tenis', 'Arcilla', 5])
  assert.equal(result.nombre, 'Central')
})

test('impide cambiar el deporte de una cancha con partidos asociados', async () => {
  const fakeDb = {
    async query(sql) {
      if (/SELECT c\.id, c\.deporte/.test(sql)) return [[{ id: 5, deporte: 'tenis' }]]
      if (/COUNT\(\*\).*FROM partidos/.test(sql)) return [[{ total: 2 }]]
      return [[]]
    },
  }

  await assert.rejects(
    loadService(fakeDb).updateCancha(5, {
      nombre: 'Central',
      deporte: 'padel',
      superficie: 'Cemento',
    }),
    (error) => error.status === 409
  )
})

test('eliminar una cancha la desactiva sin borrar el registro', async () => {
  const calls = []
  const fakeDb = {
    async query(sql, params) {
      calls.push({ sql, params })
      if (/SELECT id FROM canchas/.test(sql)) return [[{ id: 5 }]]
      return [{}]
    },
  }

  const result = await loadService(fakeDb).removeCancha(5)

  assert.equal(result.message, 'Cancha eliminada correctamente')
  assert.ok(calls.some((call) => /SET activa = FALSE/.test(call.sql)))
  assert.equal(calls.some((call) => /^DELETE FROM canchas/.test(call.sql.trim())), false)
})
