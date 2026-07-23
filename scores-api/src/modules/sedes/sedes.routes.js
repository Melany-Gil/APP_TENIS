const router = require('express').Router()
const controller = require('./sedes.controller')
const { requireAuth, requireAdmin } = require('../../middlewares/auth.middleware')

router.get('/', requireAuth, controller.getAll)
router.get('/:id/canchas', requireAuth, controller.getCanchasBySede)
router.post('/', requireAuth, requireAdmin, controller.create)
router.delete('/:id', requireAuth, requireAdmin, controller.remove)
router.post('/:id/canchas', requireAuth, requireAdmin, controller.createCancha)
router.delete('/canchas/:canchaId', requireAuth, requireAdmin, controller.removeCancha)

module.exports = router
