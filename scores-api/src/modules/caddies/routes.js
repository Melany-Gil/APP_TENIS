const router = require('express').Router()
const { requireAuth, requireAdmin, requireOfficial } = require('../../middlewares/auth.middleware')
const { success, error } = require('../../utils/response')
const service = require('./service')
const wrap = (action) => async (req, res) => {
  try {
    return success(res, await action(req))
  } catch (e) {
    return error(
      res,
      e.status ? e.message : 'No se pudo completar la operación. Inténtalo nuevamente.',
      e.status || 500
    )
  }
}
router.use(requireAuth)
router.get(
  '/',
  requireOfficial,
  wrap(() => service.list())
)
router.get(
  '/contexto',
  wrap((req) => service.context(req.user))
)
router.get(
  '/mis-partidos',
  wrap((req) => service.inbox(req.user, req.query.before, req.query.vista))
)
router.put(
  '/usuarios/:id/rol',
  requireAdmin,
  wrap((req) => service.setRole(req.params.id, req.body))
)
router.put(
  '/usuarios/:id/jugador',
  requireAdmin,
  wrap((req) => service.linkPlayer(req.params.id, req.body))
)
router.get(
  '/partidos/:id',
  wrap((req) => service.detail(req.params.id, req.user, req.query.vista))
)
router.put(
  '/partidos/:id',
  requireOfficial,
  wrap((req) => service.assign(req.params.id, req.body, req.user))
)
router.post(
  '/partidos/:id/evaluacion',
  wrap((req) => service.review(req.params.id, req.body, req.user))
)
module.exports = router
