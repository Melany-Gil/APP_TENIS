const test = require('node:test')
const assert = require('node:assert/strict')
const { once } = require('node:events')
const express = require('express')
const jwt = require('jsonwebtoken')
const dbPath = require.resolve('../src/config/db')
const servicePath = require.resolve('../src/modules/support/support.service')
function load(db) {
  require.cache[dbPath] = { id: dbPath, filename: dbPath, loaded: true, exports: db }
  delete require.cache[servicePath]
  return require(servicePath)
}
const body = {
  asunto: 'Marcador',
  mensaje: 'Necesito ayuda',
  categoria: 'marcador',
  prioridad: 'alta',
  request_id: '12345678-1234-1234-1234-123456789abc',
}
const judge = { id: 3, rol: 'juez' }
test('tickets: consulta limitada al propietario, admin puede consultar todos', async () => {
  const calls = []
  const svc = load({
    query: async (sql, values) => {
      calls.push([sql, values])
      return [[]]
    },
  })
  await svc.list(judge)
  assert.match(calls[0][0], /WHERE t.user_id = \?/)
  assert.deepEqual(calls[0][1], [3])
  await svc.list({ id: 1, rol: 'admin' })
  assert.doesNotMatch(calls[1][0], /WHERE t.user_id/)
  await assert.rejects(svc.detail(22, judge), (e) => e.status === 404)
  assert.deepEqual(calls[2][1], [22, 3])
})
test('tickets: valida texto, bloquea partido ajeno y revierte transacción', async () => {
  const calls = []
  const conn = {
    beginTransaction: async () => {},
    commit: async () => calls.push('commit'),
    rollback: async () => calls.push('rollback'),
    release: () => {},
    query: async (sql) => (sql.includes('SELECT juez_id') ? [[{ juez_id: 4 }]] : [[]]),
  }
  const svc = load({ getConnection: async () => conn })
  await assert.rejects(
    svc.create({ ...body, mensaje: 'x'.repeat(4001) }, judge),
    (e) => e.status === 400
  )
  await assert.rejects(svc.create({ ...body, partido_id: 1 }, judge), (e) => e.status === 403)
  assert.deepEqual(calls, ['rollback'])
})
test('tickets: reintento devuelve el ticket existente sin volver a notificar', async () => {
  let queries = 0
  const svc = load({
    getConnection: async () => ({
      beginTransaction: async () => {},
      commit: async () => {},
      rollback: async () => {},
      release: () => {},
      query: async () => {
        queries++
        return [[{ id: 7 }]]
      },
    }),
  })
  assert.deepEqual(await svc.create(body, judge), { id: 7 })
  assert.equal(queries, 1)
})
test('tickets: creación y notificación a administradores se confirman juntas', async () => {
  const calls = []
  const svc = load({
    getConnection: async () => ({
      beginTransaction: async () => {},
      commit: async () => calls.push(['commit']),
      rollback: async () => {},
      release: () => {},
      query: async (sql, values) => {
        calls.push([sql, values])
        return sql.startsWith('SELECT') ? [[]] : [{ insertId: 9 }]
      },
    }),
  })
  assert.deepEqual(await svc.create(body, judge), { id: 9 })
  const notify = calls.find(([sql]) => sql.includes('INTO notificaciones'))
  assert.match(notify[0], /rol='admin' AND activo=TRUE/)
  assert.equal(notify[1][0], 'ticket:9')
  assert.equal(calls.at(-1)[0], 'commit')
})
test('tickets: respuesta concurrente no sobrescribe otro cambio', async () => {
  let writes = 0,
    rollback = false
  const svc = load({
    getConnection: async () => ({
      beginTransaction: async () => {},
      commit: async () => {},
      rollback: async () => {
        rollback = true
      },
      release: () => {},
      query: async (sql) => {
        if (sql.startsWith('SELECT')) return [[{ user_id: 3, version: 2 }]]
        writes++
        return [{}]
      },
    }),
  })
  await assert.rejects(
    svc.reply(7, { mensaje: 'Resuelto', estado: 'resuelto', version: 1 }, { id: 1, rol: 'admin' }),
    (e) => e.status === 409
  )
  assert.equal(writes, 0)
  assert.equal(rollback, true)
})
test('HTTP: tickets protegidos por rol real y notificaciones por propietario', async () => {
  process.env.JWT_SECRET = 'support-http-fixture-only-not-production'
  let role = 'juez'
  load({
    query: async (sql, values) => {
      if (sql.includes('SELECT rol, activo')) return [[{ rol: role, activo: 1 }]]
      if (sql.startsWith('UPDATE notificaciones')) {
        assert.deepEqual(values, [88, 3])
        return [{ affectedRows: 0 }]
      }
      throw Error('Unexpected database access')
    },
  })
  const app = express()
  app.use(express.json())
  app.use('/tickets', require('../src/modules/support/support.routes'))
  app.use('/notificaciones', require('../src/modules/support/notifications.routes'))
  const server = app.listen(0, '127.0.0.1')
  await once(server, 'listening')
  const base = `http://127.0.0.1:${server.address().port}`
  const headers = {
    Authorization: `Bearer ${jwt.sign({ id: 3, rol: 'admin' }, process.env.JWT_SECRET)}`,
    'Content-Type': 'application/json',
  }
  try {
    assert.equal((await fetch(base + '/tickets')).status, 401)
    assert.equal(
      (await fetch(base + '/tickets/1/responder', { method: 'PUT', headers, body: '{}' })).status,
      403
    )
    role = 'miembro'
    assert.equal((await fetch(base + '/tickets', { headers })).status, 403)
    assert.equal(
      (await fetch(base + '/notificaciones/88/leer', { method: 'PUT', headers })).status,
      404
    )
  } finally {
    server.closeAllConnections()
    await new Promise((resolve) => server.close(resolve))
  }
})
