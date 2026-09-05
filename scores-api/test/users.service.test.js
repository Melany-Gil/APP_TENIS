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

test('crear usuario guarda el alias y valida que no esté repetido', async () => {
  const calls = []
  const fakeDb = {
    async query(sql, params) {
      calls.push({ sql, params })
      if (/numero_documento = \? OR email = \?/.test(sql)) return [[]]
      if (/SELECT id FROM users WHERE usuario = \? LIMIT 1/.test(sql)) return [[]]
      if (/INSERT INTO users/.test(sql)) return [{ insertId: 11 }]
      return [[{
        id: 11,
        numero_documento: '99887766',
        usuario: 'juan.perez',
        nombre: 'Juan',
        apellido: 'Pérez',
        email: 'juan@example.com',
        rol: 'juez',
        activo: 1,
      }]]
    },
  }

  const user = await loadService(fakeDb).create({
    numero_documento: '99887766',
    usuario: '  juan.perez  ',
    nombre: 'Juan',
    apellido: 'Pérez',
    email: 'JUAN@example.com',
    password: 'Secret123',
    rol: 'juez',
  })

  assert.equal(user.usuario, 'juan.perez')
  const insert = calls.find((call) => /INSERT INTO users/.test(call.sql))
  assert.match(insert.sql, /\(numero_documento, usuario, nombre/)
  assert.equal(insert.params[1], 'juan.perez')
})

test('crear usuario rechaza un alias ya usado por otra cuenta', async () => {
  const fakeDb = {
    async query(sql) {
      if (/numero_documento = \? OR email = \?/.test(sql)) return [[]]
      if (/SELECT id FROM users WHERE usuario = \? LIMIT 1/.test(sql)) return [[{ id: 3 }]]
      return [[]]
    },
  }

  await assert.rejects(
    loadService(fakeDb).create({
      numero_documento: '99887766',
      usuario: 'juan.perez',
      nombre: 'Juan',
      apellido: 'Pérez',
      email: 'juan@example.com',
      password: 'Secret123',
      rol: 'juez',
    }),
    (error) => error.status === 409 && /usuario ya está en uso/.test(error.message)
  )
})

test('updateUsuario permite fijar y retirar el alias', async () => {
  const calls = []
  const fakeDb = {
    async query(sql, params) {
      calls.push({ sql, params })
      if (/SELECT id FROM users WHERE id = \?/.test(sql)) return [[{ id: 7 }]]
      if (/SELECT id FROM users WHERE usuario = \? AND id != \?/.test(sql)) return [[]]
      if (/UPDATE users SET usuario/.test(sql)) return [{ affectedRows: 1 }]
      return [[{ id: 7, numero_documento: '1', nombre: 'J', apellido: 'P', email: 'j@e.com', rol: 'juez', activo: 1 }]]
    },
  }

  const service = loadService(fakeDb)
  await service.updateUsuario(7, 'nuevo.alias')
  await service.updateUsuario(7, '')

  const updates = calls.filter((call) => /UPDATE users SET usuario/.test(call.sql))
  assert.deepEqual(updates.map((call) => call.params[0]), ['nuevo.alias', null])
})
