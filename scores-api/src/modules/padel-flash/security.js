const crypto = require('node:crypto')
const { fail } = require('./domain')
const secret = () => {
  const key = process.env.PADEL_VOTE_SECRET || process.env.JWT_SECRET
  if (!key || key.length < 32) fail('La votación no está disponible temporalmente.', 503)
  return key
}
function digest(value) {
  return crypto.createHmac('sha256', secret()).update(`padel:${value}`).digest('hex')
}
function sign(id) {
  return `${id}.${digest(`cookie:${id}`)}`
}
function readBrowser(req) {
  const value =
    req.headers.cookie
      ?.split(';')
      .map((x) => x.trim())
      .find((x) => x.startsWith('pf_browser='))
      ?.slice(11) || ''
  const [id, mac] = value.split('.')
  if (!/^[a-f0-9]{48}$/.test(id || '') || !/^[a-f0-9]{64}$/.test(mac || '')) return null
  return crypto.timingSafeEqual(Buffer.from(mac, 'hex'), Buffer.from(digest(`cookie:${id}`), 'hex'))
    ? id
    : null
}
function browser(req, res) {
  const id = readBrowser(req) || crypto.randomBytes(24).toString('hex')
  res.cookie('pf_browser', sign(id), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/api/padel-flash',
    maxAge: 365 * 86400000,
  })
  return id
}
const key = () => crypto.createHash('sha256').update(`padel-private:${secret()}`).digest()
function encrypt(value) {
  const iv = crypto.randomBytes(12),
    cipher = crypto.createCipheriv('aes-256-gcm', key(), iv)
  const data = Buffer.concat([cipher.update(JSON.stringify(value), 'utf8'), cipher.final()])
  return Buffer.concat([iv, cipher.getAuthTag(), data]).toString('base64')
}
function decrypt(value) {
  const b = Buffer.from(value, 'base64'),
    cipher = crypto.createDecipheriv('aes-256-gcm', key(), b.subarray(0, 12))
  cipher.setAuthTag(b.subarray(12, 28))
  return JSON.parse(Buffer.concat([cipher.update(b.subarray(28)), cipher.final()]).toString('utf8'))
}
module.exports = { digest, browser, readBrowser, encrypt, decrypt }
