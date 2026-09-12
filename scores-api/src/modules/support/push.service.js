const crypto = require('node:crypto')
const db = require('../../config/db')
const fail = (status, message) => {
  throw Object.assign(new Error(message), { status })
}
const hash = (value) => crypto.createHash('sha256').update(value).digest('hex')
exports.validateSubscription = (body) => {
  const endpoint = body?.endpoint
  if (typeof endpoint !== 'string' || endpoint.length > 2048) fail(400, 'Suscripción inválida')
  let url
  try {
    url = new URL(endpoint)
  } catch {
    fail(400, 'Suscripción inválida')
  }
  const allowed =
    ['fcm.googleapis.com', 'updates.push.services.mozilla.com', 'web.push.apple.com'].includes(
      url.hostname
    ) || /^[a-z0-9-]+\.notify\.windows\.com$/.test(url.hostname)
  if (!allowed || url.protocol !== 'https:' || url.port || url.username || url.password || url.hash)
    fail(400, 'Proveedor push no admitido')
  const { p256dh, auth } = body.keys || {}
  const decode = (v, bytes) =>
    typeof v === 'string' &&
    /^[A-Za-z0-9_-]+$/.test(v) &&
    Buffer.from(v, 'base64url').length === bytes
  if (!decode(p256dh, 65) || !decode(auth, 16)) fail(400, 'Claves de suscripción inválidas')
  try {
    crypto.ECDH.convertKey(Buffer.from(p256dh, 'base64url'), 'prime256v1')
  } catch {
    fail(400, 'Clave pública inválida')
  }
  return { endpoint, keys: { p256dh, auth } }
}
exports.config = () => {
  const publicKey = process.env.VAPID_PUBLIC_KEY,
    privateKey = process.env.VAPID_PRIVATE_KEY,
    subject = process.env.VAPID_SUBJECT
  if (!publicKey || !privateKey || !subject) return null
  try {
    if (!/^(mailto:[^\s@]+@[^\s@]+|https:\/\/[^\s]+)$/.test(subject)) return null
    const pair = crypto.createECDH('prime256v1')
    pair.setPrivateKey(Buffer.from(privateKey, 'base64url'))
    if (pair.getPublicKey().toString('base64url') !== publicKey) return null
    return { publicKey, privateKey, subject }
  } catch {
    return null
  }
}
exports.subscribe = async (body, user) => {
  if (!exports.config()) fail(503, 'Las notificaciones push aún no están configuradas')
  const sub = exports.validateSubscription(body)
  if (!Number.isFinite(user.exp) || user.exp * 1000 <= Date.now())
    fail(401, 'Inicia sesión de nuevo')
  const conn = await db.getConnection()
  try {
    await conn.beginTransaction()
    await conn.query('SELECT id FROM users WHERE id=? FOR UPDATE', [user.id])
    const [existing] = await conn.query(
      'SELECT id,user_id FROM push_suscripciones WHERE endpoint_hash=? FOR UPDATE',
      [hash(sub.endpoint)]
    )
    if (existing.length && Number(existing[0].user_id) !== Number(user.id))
      fail(
        409,
        'Este dispositivo tiene otra cuenta vinculada. Desactiva el permiso y vuelve a activarlo.'
      )
    if (!existing.length) {
      const [[count]] = await conn.query(
        'SELECT COUNT(*) AS total FROM push_suscripciones WHERE user_id=?',
        [user.id]
      )
      if (Number(count.total) >= 5)
        fail(409, 'Límite de cinco dispositivos. Desactiva uno antes de añadir otro.')
    }
    await conn.query(
      `INSERT INTO push_suscripciones (user_id,endpoint_hash,endpoint,p256dh,auth,session_version,expires_at)
      VALUES (?,?,?,?,?,?,?) ON DUPLICATE KEY UPDATE p256dh=VALUES(p256dh),auth=VALUES(auth),session_version=VALUES(session_version),expires_at=VALUES(expires_at)`,
      [
        user.id,
        hash(sub.endpoint),
        sub.endpoint,
        sub.keys.p256dh,
        sub.keys.auth,
        Number(user.session_version || 0),
        new Date(user.exp * 1000),
      ]
    )
    await conn.commit()
    return { enabled: true }
  } catch (e) {
    await conn.rollback()
    if (e.code === 'ER_DUP_ENTRY') fail(409, 'Vuelve a intentar la activación')
    throw e
  } finally {
    conn.release()
  }
}
exports.unsubscribe = async (endpoint, user) => {
  if (typeof endpoint !== 'string' || endpoint.length > 2048) fail(400, 'Suscripción inválida')
  await db.query('DELETE FROM push_suscripciones WHERE endpoint_hash=? AND user_id=?', [
    hash(endpoint),
    user.id,
  ])
  return { enabled: false }
}
// Runs inside the ticket transaction: only committed notifications can be delivered.
exports.enqueue = async (conn, key) => {
  await conn.query(
    `INSERT IGNORE INTO push_entregas (notificacion_id,suscripcion_id)
    SELECT n.id,s.id FROM notificaciones n JOIN push_suscripciones s ON s.user_id=n.user_id
    JOIN users u ON u.id=s.user_id WHERE n.clave=? AND u.activo=TRUE
    AND s.session_version=u.session_version AND s.expires_at>NOW()`,
    [key]
  )
}
let running = false,
  timer
exports.drain = async () => {
  const vapidDetails = exports.config()
  if (running || !vapidDetails) return
  running = true
  try {
    const [jobs] = await db.query(`SELECT id FROM push_entregas WHERE done=FALSE AND attempts<4
      AND available_at<=NOW() AND created_at>DATE_SUB(NOW(),INTERVAL 1 DAY) ORDER BY id LIMIT 10`)
    for (const job of jobs) {
      const lease = crypto.randomUUID()
      const [claim] = await db.query(
        `UPDATE push_entregas SET lease=?,attempts=attempts+1,available_at=DATE_ADD(NOW(),INTERVAL 2 MINUTE)
        WHERE id=? AND done=FALSE AND attempts<4 AND available_at<=NOW()`,
        [lease, job.id]
      )
      if (!claim.affectedRows) continue
      const [rows] = await db.query(
        `SELECT s.id,s.endpoint,s.p256dh,s.auth,n.id AS notification_id FROM push_entregas d
        JOIN push_suscripciones s ON s.id=d.suscripcion_id JOIN notificaciones n ON n.id=d.notificacion_id
        JOIN users u ON u.id=s.user_id WHERE d.id=? AND d.lease=? AND n.user_id=s.user_id
        AND u.activo=TRUE AND s.session_version=u.session_version AND s.expires_at>NOW()`,
        [job.id, lease]
      )
      if (!rows.length) {
        await db.query('UPDATE push_entregas SET done=TRUE WHERE id=? AND lease=?', [job.id, lease])
        continue
      }
      const row = rows[0]
      try {
        const subscription = exports.validateSubscription({
          endpoint: row.endpoint,
          keys: { p256dh: row.p256dh, auth: row.auth },
        })
        await require('web-push').sendNotification(
          subscription,
          JSON.stringify({ tag: `support-${row.notification_id}` }),
          { vapidDetails, TTL: 3600, timeout: 8000, urgency: 'normal' }
        )
        await db.query('UPDATE push_entregas SET done=TRUE WHERE id=? AND lease=?', [job.id, lease])
      } catch (e) {
        if ([404, 410].includes(e.statusCode) || e.status === 400)
          await db.query('DELETE FROM push_suscripciones WHERE id=?', [row.id])
        else if (e.statusCode && ![429].includes(e.statusCode) && e.statusCode < 500)
          await db.query('UPDATE push_entregas SET done=TRUE WHERE id=? AND lease=?', [
            job.id,
            lease,
          ])
        // Network/429/5xx failures retry after the lease; never log endpoints or keys.
      }
    }
    await db.query('DELETE FROM push_suscripciones WHERE expires_at<=NOW() LIMIT 100')
    await db.query(
      'DELETE FROM push_entregas WHERE created_at<DATE_SUB(NOW(),INTERVAL 7 DAY) LIMIT 500'
    )
  } catch {
    console.warn('[push] Cola temporalmente no disponible; se reintentará.')
  } finally {
    running = false
  }
}
exports.start = () => {
  if (timer || !exports.config()) return
  void exports.drain()
  timer = setInterval(() => void exports.drain(), 15000)
  timer.unref()
}
