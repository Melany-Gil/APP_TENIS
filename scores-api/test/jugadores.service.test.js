const test = require('node:test')
const assert = require('node:assert/strict')

const dbPath = require.resolve('../src/config/db')
const servicePath = require.resolve('../src/modules/jugadores/jugadores.service')

const playerRow = {
  id: 8,
  nombre: 'Laura',
  apellido: 'Díaz',
  apodo: null,
  fecha_nac: new Date('1995-04-12'),
  telefono: '3001234567',
  mano: 'Diestro',
  deporte: 'tenis',
  foto: null,
  activo: 1,
  country_code: 'CO',
  country_name: 'Colombia',
  country_flag: '🇨🇴',
  categoria_id: 3,
  categoria_nombre: '4ta',
  victorias: 4,
  derrotas: 1,
  puntos: 320,
  ranking: 2,
}

const loadService = (fakeDb) => {
  delete require.cache[servicePath]
  require.cache[dbPath] = {
    id: dbPath,
    filename: dbPath,
    loaded: true,
    exports: fakeDb || {
      async query() {
        return [[playerRow]]
      },
    },
  }
  return require(servicePath)
}

test('el perfil público no expone teléfono ni fecha de nacimiento', async () => {
  const player = await loadService().getById(8)

  assert.equal(player.nombre, 'Laura')
  assert.equal(Object.hasOwn(player, 'telefono'), false)
  assert.equal(Object.hasOwn(player, 'fecha_nac'), false)
})

test('las respuestas internas de administración conservan los datos editables', async () => {
  const player = await loadService().getById(8, { includePrivate: true })

  assert.equal(player.telefono, '3001234567')
  assert.deepEqual(player.fecha_nac, playerRow.fecha_nac)
})

test('crear jugador guarda únicamente nombre, apellido y deporte', async () => {
  const calls = []
  const fakeDb = {
    async query(sql, params) {
      calls.push({ sql, params })
      if (calls.length === 1) return [{ insertId: 9 }]
      if (calls.length === 2) return [{}]
      return [[{ ...playerRow, id: 9 }]]
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
})
