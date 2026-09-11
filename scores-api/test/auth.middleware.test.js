const test = require('node:test')
const assert = require('node:assert/strict')
const jwt = require('jsonwebtoken')

process.env.JWT_SECRET = 'test-secret-with-at-least-thirty-two-characters'

const dbPath = require.resolve('../src/config/db')
require.cache[dbPath] = {
  id: dbPath,
  filename: dbPath,
  loaded: true,
  exports: {
    async query() {
      return [[{ rol: 'admin', activo: 1 }]]
    },
  },
}

const { requireAuth, requireAdmin } = require('../src/middlewares/auth.middleware')
const db = require('../src/config/db')
const originalQuery = db.query
test.afterEach(() => { db.query = originalQuery })

test('requireAuth acepta la sesión desde una cookie HttpOnly', async () => {
  const token = jwt.sign({ id: 12, rol: 'miembro' }, process.env.JWT_SECRET)
  const request = { headers: { cookie: `cu_session=${token}` } }
  let nextCalled = false
  const response = {
    status() {
      throw new Error('No debe responder con error')
    },
  }

  await requireAuth(request, response, () => {
    nextCalled = true
  })

  assert.equal(nextCalled, true)
  assert.equal(request.user.id, 12)
})

test('requireAdmin vuelve a verificar el rol en la base de datos', async () => {
  const request = { user: { id: 12, rol: 'miembro' } }
  let nextCalled = false
  const response = {
    status() {
      throw new Error('No debe responder con error')
    },
  }

  await requireAdmin(request, response, () => {
    nextCalled = true
  })

  assert.equal(nextCalled, true)
  assert.equal(request.user.rol, 'admin')
})

test('una caída de base de datos responde 503, no invalida la sesión con 401', async () => {
  db.query = async () => { throw new Error('connection timeout') }
  const token = jwt.sign({ id: 12 }, process.env.JWT_SECRET)
  let status
  await requireAuth({ headers: { authorization: `Bearer ${token}` } }, { status(n) { status = n; return this }, json() {} }, () => assert.fail('No debe continuar'))
  assert.equal(status, 503)
})
test('cuentas eliminadas o sesiones revocadas reciben 401', async () => {
  const token = jwt.sign({ id: 12, session_version: 0 }, process.env.JWT_SECRET)
  for (const rows of [[], [{ rol: 'admin', activo: 1, session_version: 1 }]]) {
    db.query = async () => [rows]
    let status
    await requireAuth({ headers: { cookie: `cu_session=${token}` } }, { status(n) { status = n; return this }, json() {} }, () => assert.fail('No debe continuar'))
    assert.equal(status, 401)
  }
})
