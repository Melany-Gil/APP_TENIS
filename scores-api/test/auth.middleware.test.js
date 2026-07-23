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

test('requireAuth acepta la sesión desde una cookie HttpOnly', () => {
  const token = jwt.sign({ id: 12, rol: 'miembro' }, process.env.JWT_SECRET)
  const request = { headers: { cookie: `cu_session=${token}` } }
  let nextCalled = false
  const response = {
    status() {
      throw new Error('No debe responder con error')
    },
  }

  requireAuth(request, response, () => {
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
