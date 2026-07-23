const test = require('node:test')
const assert = require('node:assert/strict')

const dbPath = require.resolve('../src/config/db')
const servicePath = require.resolve('../src/modules/torneos/torneos.service')

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

test('crear torneo guarda únicamente la información básica', async () => {
  const calls = []
  const fakeDb = {
    async query(sql, params) {
      calls.push({ sql, params })
      if (calls.length === 1) return [{ insertId: 4 }]
      return [
        [
          {
            id: 4,
            nombre: 'Torneo interno',
            deporte: 'tenis',
            fecha_inicio: null,
            fecha_fin: null,
            estado: 'proximo',
          },
        ],
      ]
    },
  }

  const result = await loadService(fakeDb).create({
    nombre: 'Torneo interno',
    deporte: 'tenis',
    fecha_inicio: '',
    fecha_fin: '',
    estado: 'proximo',
    categoria_id: 99,
    premio: 'No debe guardarse',
  })

  assert.match(calls[0].sql, /nombre, deporte, fecha_inicio, fecha_fin, estado/)
  assert.doesNotMatch(calls[0].sql, /categoria_id|premio/)
  assert.deepEqual(calls[0].params, ['Torneo interno', 'tenis', null, null, 'proximo'])
  assert.deepEqual(Object.keys(result), [
    'id',
    'nombre',
    'deporte',
    'fecha_inicio',
    'fecha_fin',
    'estado',
  ])
})
