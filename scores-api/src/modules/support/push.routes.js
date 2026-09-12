const router = require('express').Router()
const { rateLimit } = require('express-rate-limit')
const { requireAuth, requireOfficial } = require('../../middlewares/auth.middleware')
const { success, error } = require('../../utils/response')
const svc = require('./push.service')
router.use(requireAuth, requireOfficial, (_req, res, next) => {
  res.set('Cache-Control', 'no-store')
  next()
})
router.get('/config', (_req, res) => success(res, { publicKey: svc.config()?.publicKey || null }))
router.use(rateLimit({ windowMs: 60000, limit: 20, standardHeaders: true, legacyHeaders: false }))
router.post('/subscribe', async (req, res) => {
  try {
    return success(res, await svc.subscribe(req.body, req.user))
  } catch (e) {
    return error(res, e.status ? e.message : 'No se pudo activar push', e.status || 503)
  }
})
router.post('/unsubscribe', async (req, res) => {
  try {
    return success(res, await svc.unsubscribe(req.body?.endpoint, req.user))
  } catch (e) {
    return error(res, e.status ? e.message : 'No se pudo desactivar push', e.status || 503)
  }
})
module.exports = router
