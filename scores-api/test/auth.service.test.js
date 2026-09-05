const test = require('node:test')
const assert = require('node:assert/strict')
const bcrypt = require('bcryptjs')

process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret'

const dbPath = require.resolve('../src/config/db')
const mailerPath = require.resolve('../src/config/mailer')
const servicePath = require.resolve('../src/modules/auth/auth.service')

const loadService = (fakeDb) => {
  delete require.cache[servicePath]
  require.cache[dbPath] = { id: dbPath, filename: dbPath, loaded: true, exports: fakeDb }
  require.cache[mailerPath] = {
    id: mailerPath,
    filename: mailerPath,
    loaded: true,
    exports: { sendMail: async () => ({ messageId: 'test' }) },
  }
  return require(servicePath)
}

const passwordHash = bcrypt.hashSync('Secret123', 4)
const judgeRow = {
  id: 7,
  numero_documento: '1090512345',
  usuario: 'juan.perez',
  nombre: 'Juan',
  apellido: 'Pérez',
  email: 'juan@example.com',
  rol: 'juez',
  activo: 1,
  password: passwordHash,
}

test('login por número de documento sigue funcionando', async () => {
  const calls = []
  const service = loadService({
    async query(sql, params) {
      calls.push({ sql, params })
      return [[judgeRow]]
    },
  })

  const result = await service.login({ identificador: '1090512345', password: 'Secret123' })
  assert.equal(result.user.id, 7)
  assert.equal(result.user.usuario, 'juan.perez')
  assert.ok(result.token)
  assert.equal(Object.hasOwn(result.user, 'password'), false)
  assert.match(calls[0].sql, /numero_documento = \?/)
  assert.match(calls[0].sql, /usuario = \? AND rol = 'juez'/)
})

test('un juez puede iniciar sesión con su usuario', async () => {
  const service = loadService({
    async query(sql, params) {
      assert.equal(params[0], 'juan.perez')
      return [[judgeRow]]
    },
  })

  const result = await service.login({ identificador: 'juan.perez', password: 'Secret123' })
  assert.equal(result.user.id, 7)
})

test('login rechaza credenciales vacías con 400', async () => {
  const service = loadService({ async query() { return [[]] } })
  await assert.rejects(
    service.login({ identificador: '   ', password: 'Secret123' }),
    (error) => error.status === 400
  )
})

test('login con contraseña incorrecta responde 401', async () => {
  const service = loadService({ async query() { return [[judgeRow]] } })
  await assert.rejects(
    service.login({ identificador: 'juan.perez', password: 'otra-clave' }),
    (error) => error.status === 401
  )
})

test('login sin coincidencias responde 401', async () => {
  const service = loadService({ async query() { return [[]] } })
  await assert.rejects(
    service.login({ identificador: 'desconocido', password: 'Secret123' }),
    (error) => error.status === 401
  )
})
