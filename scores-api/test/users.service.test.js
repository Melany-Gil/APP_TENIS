const test = require('node:test')
const assert = require('node:assert/strict')

const dbPath = require.resolve('../src/config/db')
const servicePath = require.resolve('../src/modules/users/users.service')

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

test('getById devuelve avatar y jugador vinculado sin exponer contraseña', async () => {
  const fakeDb = {
    async query() {
      return [[{
        id: 4,
        numero_documento: '12345',
        nombre: 'Laura',
        apellido: 'Díaz',
        email: 'laura@example.com',
        telefono: null,
        avatar: '/uploads/avatars/laura.jpg',
        rol: 'miembro',
        activo: 1,
        jugador_id: 8,
        jugador_nombre: 'Laura',
        jugador_apellido: 'Díaz',
        jugador_foto: '/uploads/players/laura.jpg',
      }]]
    },
  }

  const user = await loadService(fakeDb).getById(4)

  assert.equal(user.avatar, '/uploads/avatars/laura.jpg')
  assert.equal(Object.hasOwn(user, 'password'), false)
  assert.deepEqual(user.jugador, {
    id: 8,
    nombre: 'Laura',
    apellido: 'Díaz',
    foto: '/uploads/players/laura.jpg',
  })
})

test('updateAvatar permite establecer y retirar la foto', async () => {
  const calls = []
  const fakeDb = {
    async query(sql, params) {
      calls.push({ sql, params })
      if (/SELECT id FROM users/.test(sql)) return [[{ id: 4 }]]
      if (/UPDATE users SET avatar/.test(sql)) return [{ affectedRows: 1 }]
      return [[{
        id: 4,
        numero_documento: '12345',
        nombre: 'Laura',
        apellido: 'Díaz',
        email: 'laura@example.com',
        avatar: null,
        rol: 'miembro',
        activo: 1,
      }]]
    },
  }

  await loadService(fakeDb).updateAvatar(4, null)

  const update = calls.find((call) => /UPDATE users SET avatar/.test(call.sql))
  assert.deepEqual(update.params, [null, 4])
})
