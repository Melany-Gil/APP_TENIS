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

test('crear torneo guarda modalidad, sistema y categoría', async () => {
  const calls = []
  const fakeDb = {
    async query(sql, params) {
      calls.push({ sql, params })
      if (/SELECT deporte FROM categorias/.test(sql)) return [[{ deporte: 'tenis' }]]
      if (/INSERT INTO torneos/.test(sql)) return [{ insertId: 4 }]
      return [
        [
          {
            id: 4,
            nombre: 'Torneo interno',
            deporte: 'tenis',
            categoria_id: 99,
            categoria_nombre: '4ta',
            modalidad: 'individual',
            sistema: 'todos_contra_todos',
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
    modalidad: 'individual',
    sistema: 'todos_contra_todos',
    premio: 'No debe guardarse',
  })

  const insert = calls.find((call) => /INSERT INTO torneos/.test(call.sql))
  assert.match(insert.sql, /categoria_id, modalidad, sistema/)
  assert.doesNotMatch(insert.sql, /premio/)
  assert.deepEqual(insert.params, [
    'Torneo interno',
    'tenis',
    99,
    'individual',
    'todos_contra_todos',
    null,
    null,
    'proximo',
  ])
  assert.deepEqual(Object.keys(result), [
    'id',
    'nombre',
    'deporte',
    'modalidad',
    'sistema',
    'categoria',
    'fecha_inicio',
    'fecha_fin',
    'estado',
    'partidos_count',
  ])
})

test('crear torneo usa todas las categorías y sistema por definir por defecto', async () => {
  const calls = []
  const fakeDb = {
    async query(sql, params) {
      calls.push({ sql, params })
      if (/INSERT INTO torneos/.test(sql)) return [{ insertId: 8 }]
      return [
        [
          {
            id: 8,
            nombre: 'Abierto Club Unión',
            deporte: 'tenis',
            categoria_id: null,
            categoria_nombre: null,
            modalidad: 'individual',
            sistema: 'por_definir',
            fecha_inicio: null,
            fecha_fin: null,
            estado: 'proximo',
          },
        ],
      ]
    },
  }

  const result = await loadService(fakeDb).create({
    nombre: 'Abierto Club Unión',
    deporte: 'tenis',
    modalidad: 'individual',
    estado: 'proximo',
  })

  const insert = calls.find((call) => /INSERT INTO torneos/.test(call.sql))
  assert.deepEqual(insert.params, [
    'Abierto Club Unión',
    'tenis',
    null,
    'individual',
    'por_definir',
    null,
    null,
    'proximo',
  ])
  assert.equal(result.categoria, null)
  assert.equal(result.sistema, 'por_definir')
  assert.equal(
    calls.some((call) => /FROM categorias/.test(call.sql)),
    false
  )
})
