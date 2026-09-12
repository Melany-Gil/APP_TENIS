const test = require('node:test')
const assert = require('node:assert/strict')
const crypto = require('node:crypto')
const fs = require('node:fs')
const vm = require('node:vm')
const dbPath = require.resolve('../src/config/db')
const svcPath = require.resolve('../src/modules/support/push.service')
const pair = crypto.createECDH('prime256v1')
pair.generateKeys()
const body = {
  endpoint: 'https://fcm.googleapis.com/fcm/send/test',
  keys: {
    p256dh: pair.getPublicKey().toString('base64url'),
    auth: crypto.randomBytes(16).toString('base64url'),
  },
}
function load(db = {}) {
  require.cache[dbPath] = { id: dbPath, filename: dbPath, loaded: true, exports: db }
  delete require.cache[svcPath]
  return require(svcPath)
}
function configure() {
  process.env.VAPID_PUBLIC_KEY = pair.getPublicKey().toString('base64url')
  process.env.VAPID_PRIVATE_KEY = pair.getPrivateKey().toString('base64url')
  process.env.VAPID_SUBJECT = 'https://example.com'
}
test('push: rechaza URLs arbitrarias, credenciales, puertos y claves inválidas', () => {
  const svc = load()
  assert.deepEqual(svc.validateSubscription(body), body)
  for (const endpoint of [
    'http://fcm.googleapis.com/a',
    'https://127.0.0.1/a',
    'https://fcm.googleapis.com.evil.test/a',
    'https://fcm.googleapis.com:8443/a',
    'https://user@fcm.googleapis.com/a',
    'file:///etc/passwd',
  ])
    assert.throws(
      () => svc.validateSubscription({ ...body, endpoint }),
      (e) => e.status === 400
    )
  assert.throws(
    () => svc.validateSubscription({ ...body, keys: { ...body.keys, auth: 'short' } }),
    (e) => e.status === 400
  )
})
test('push: configuración ausente o par inválido no afecta al arranque', () => {
  const svc = load()
  delete process.env.VAPID_PUBLIC_KEY
  assert.equal(svc.config(), null)
  assert.doesNotThrow(() => svc.start())
  configure()
  assert.equal(svc.config().publicKey, process.env.VAPID_PUBLIC_KEY)
  process.env.VAPID_PRIVATE_KEY = 'bad'
  assert.equal(svc.config(), null)
})
test('push: no transfiere un dispositivo de otra cuenta', async () => {
  configure()
  let rollback = false
  const svc = load({
    getConnection: async () => ({
      beginTransaction: async () => {},
      commit: async () => {},
      rollback: async () => {
        rollback = true
      },
      release: () => {},
      query: async (sql) => (sql.includes('push_suscripciones') ? [[{ id: 1, user_id: 4 }]] : [[]]),
    }),
  })
  await assert.rejects(
    svc.subscribe(body, { id: 3, exp: Date.now() / 1000 + 600 }),
    (e) => e.status === 409
  )
  assert.equal(rollback, true)
})
test('push: baja solo elimina la suscripción del usuario autenticado', async () => {
  let params
  const svc = load({
    query: async (sql, p) => {
      assert.match(sql, /AND user_id=\?/)
      params = p
      return [{}]
    },
  })
  await svc.unsubscribe(body.endpoint, { id: 3 })
  assert.equal(params[1], 3)
  assert.equal(params[0].length, 64)
})
test('push: cola usa lease, entrega mínima y elimina endpoints vencidos', async () => {
  configure()
  for (const statusCode of [0, 410, 503]) {
    const calls = []
    const svc = load({
      query: async (sql, params) => {
        calls.push(sql)
        if (sql.startsWith('SELECT id FROM push_entregas')) return [[{ id: 8 }]]
        if (sql.startsWith('UPDATE push_entregas SET lease')) {
          assert.match(sql, /available_at<=NOW\(\)/)
          return [{ affectedRows: 1 }]
        }
        if (sql.startsWith('SELECT s.id'))
          return [[{ id: 4, endpoint: body.endpoint, ...body.keys, notification_id: 9 }]]
        return [{}]
      },
    })
    const webpush = require('web-push'),
      original = webpush.sendNotification
    let sent = 0
    webpush.sendNotification = async (sub, payload, options) => {
      sent++
      assert.deepEqual(JSON.parse(payload), { tag: 'support-9' })
      assert.equal(options.timeout, 8000)
      if (statusCode) throw { statusCode }
    }
    try {
      await svc.drain()
    } finally {
      webpush.sendNotification = original
    }
    assert.equal(sent, 1)
    assert.equal(
      calls.some((s) => s.startsWith('UPDATE push_entregas SET done')),
      statusCode === 0
    )
    assert.equal(
      calls.some((s) => s === 'DELETE FROM push_suscripciones WHERE id=?'),
      statusCode === 410
    )
  }
})
test('push: no envía si otro trabajador ganó el bloqueo o si la sesión venció', async () => {
  configure()
  for (const claim of [0, 1]) {
    const svc = load({
      query: async (sql) => {
        if (sql.startsWith('SELECT id FROM push_entregas')) return [[{ id: 8 }]]
        if (sql.startsWith('UPDATE push_entregas SET lease')) return [{ affectedRows: claim }]
        if (sql.startsWith('SELECT s.id')) {
          assert.match(sql, /s.session_version=u.session_version/)
          assert.match(sql, /s.expires_at>NOW/)
          return [[]]
        }
        return [{}]
      },
    })
    const webpush = require('web-push'),
      original = webpush.sendNotification
    webpush.sendNotification = () => assert.fail('No se debe enviar')
    try {
      await svc.drain()
    } finally {
      webpush.sendNotification = original
    }
  }
})
test('worker: no intercepta red y no abre destinos suministrados por el payload', async () => {
  const events = {},
    shown = []
  let opened
  const self = {
    addEventListener: (name, fn) => {
      events[name] = fn
    },
    registration: { showNotification: async (...args) => shown.push(args) },
    location: { origin: 'https://example.com' },
    clients: {
      openWindow: async (url) => {
        opened = url
      },
    },
  }
  vm.runInNewContext(
    fs.readFileSync(
      require('node:path').join(__dirname, '../../scores-app/public/push-sw.js'),
      'utf8'
    ),
    { self, URL }
  )
  assert.equal(events.fetch, undefined)
  let promise
  events.push({
    data: { json: () => ({ tag: 'support-1', url: 'https://evil.test', mensaje: 'private' }) },
    waitUntil: (p) => {
      promise = p
    },
  })
  await promise
  assert.equal(JSON.stringify(shown).includes('private'), false)
  events.notificationclick({
    notification: { close() {} },
    waitUntil: (p) => {
      promise = p
    },
  })
  await promise
  assert.equal(opened, 'https://example.com/')
})
