const router = require('express').Router()
const { requireAuth, requireOfficial, requireAdmin } = require('../../middlewares/auth.middleware')
const { rateLimit } = require('express-rate-limit')
const svc = require('./support.service')
const { success, error } = require('../../utils/response')
const handle = (fn) => async (req, res) => {
  try {
    return success(res, await fn(req))
  } catch (e) {
    return error(res, e.status ? e.message : 'No se pudo procesar la solicitud', e.status || 500)
  }
}
router.use(requireAuth, requireOfficial)
router.get(
  '/',
  handle((req) => svc.list(req.user))
)
router.get(
  '/:id',
  handle((req) => svc.detail(req.params.id, req.user))
)
router.post(
  '/',
  rateLimit({ windowMs: 60000, limit: 10, standardHeaders: true, legacyHeaders: false }),
  handle((req) => svc.create(req.body, req.user))
)
router.put(
  '/:id/responder',
  requireAdmin,
  handle((req) => svc.reply(req.params.id, req.body, req.user))
)
module.exports = router
