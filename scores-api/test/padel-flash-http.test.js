const test = require('node:test')
const assert = require('node:assert/strict')
const { once } = require('node:events')
const express = require('express')
const jwt = require('jsonwebtoken')

test('pádel HTTP: roles, cookie firmada, CSRF, caché privada y fotos persistentes', async () => {
  process.env.JWT_SECRET = 'padel-http-test-key-not-for-production-2026'
  const dbPath = require.resolve('../src/config/db'),
    servicePath = require.resolve('../src/modules/padel-flash/service'),
    mediaPath = require.resolve('../src/modules/media/mediaStorage.service')
  const calls = []
  require.cache[dbPath] = {
    id: dbPath,
    filename: dbPath,
    loaded: true,
    exports: {
      query: async (_sql, args) => [
        [
          {
            rol: args[0] === 1 ? 'admin' : args[0] === 2 ? 'juez' : 'miembro',
            activo: 1,
            session_version: 0,
          },
        ],
      ],
    },
  }
  const service = Object.fromEntries(
    [
      'list',
      'create',
      'update',
      'detail',
      'pair',
      'removePair',
      'photo',
      'draw',
      'publish',
      'result',
      'voting',
      'vote',
      'report',
    ].map((method) => [
      method,
      async (...args) => {
        calls.push({ method, args })
        return { method }
      },
    ])
  )
  require.cache[servicePath] = {
    id: servicePath,
    filename: servicePath,
    loaded: true,
    exports: { createPadelService: () => service },
  }
  require.cache[mediaPath] = {
    id: mediaPath,
    filename: mediaPath,
    loaded: true,
    exports: {
      get: async () => ({ mimeType: 'image/webp', data: Buffer.from('image') }),
      save: async () => {},
      delete: async () => {},
    },
  }
  const app = express()
  app.use(express.json())
  app.use('/api/padel-flash', require('../src/modules/padel-flash/routes'))
  app.use('/uploads', require('../src/modules/media/mediaFallback'))
  const server = app.listen(0, '127.0.0.1')
  await once(server, 'listening')
  const origin = `http://127.0.0.1:${server.address().port}`,
    base = origin + '/api/padel-flash'
  const headers = (id) => ({
    'Content-Type': 'application/json',
    Authorization: `Bearer ${jwt.sign({ id, rol: 'admin', session_version: 0 }, process.env.JWT_SECRET)}`,
  })
  try {
    for (const [method, url] of [
      ['POST', ''],
      ['POST', '/1/draw'],
      ['POST', '/1/voting'],
      ['GET', '/1/report'],
    ]) {
      assert.equal((await fetch(base + url, { method })).status, 401)
      assert.equal((await fetch(base + url, { method, headers: headers(3) })).status, 403)
      assert.equal((await fetch(base + url, { method, headers: headers(2) })).status, 403)
    }
    assert.equal(
      (await fetch(base + '/1/matches/1', { method: 'PUT', headers: headers(3), body: '{}' }))
        .status,
      403
    )
    assert.equal(
      (await fetch(base + '/1/matches/1', { method: 'PUT', headers: headers(2), body: '{}' }))
        .status,
      200
    )
    assert.equal((await fetch(base + '/1/pairs/1/photo', { method: 'POST' })).status, 401)
    const response = await fetch(base + '/1')
    assert.equal(response.status, 200)
    assert.match(response.headers.get('cache-control'), /no-store/)
    const cookie = response.headers.get('set-cookie')
    assert.match(cookie, /HttpOnly/i)
    assert.match(cookie, /SameSite=Lax/i)
    assert.equal(
      (
        await fetch(base + '/1/votes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: '{}',
        })
      ).status,
      400
    )
    assert.equal(
      (
        await fetch(base + '/1/votes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Cookie: cookie.split(';')[0] },
          body: '{}',
        })
      ).status,
      200
    )
    assert.equal(
      (
        await fetch(base + '/1/draw', {
          method: 'POST',
          headers: {
            ...headers(1),
            'Sec-Fetch-Site': 'cross-site',
            Origin: 'https://evil.invalid',
          },
          body: '{}',
        })
      ).status,
      403
    )
    assert.equal((await fetch(origin + '/uploads/padel/test.webp')).status, 200)
    assert.equal((await fetch(origin + '/uploads/padel/test.html')).status, 404)
    assert.ok(calls.some((c) => c.method === 'vote' && typeof c.args[2] === 'string'))
  } finally {
    server.closeAllConnections()
    await new Promise((r) => server.close(r))
    ;[dbPath, servicePath, mediaPath].forEach((p) => delete require.cache[p])
  }
})
