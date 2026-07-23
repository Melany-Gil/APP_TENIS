const router = require('express').Router()
const controller = require('./categorias.controller')
const { requireAuth, requireAdmin } = require('../../middlewares/auth.middleware')

router.get('/', requireAuth, controller.getAll)
router.post('/', requireAuth, requireAdmin, controller.create)
router.put('/:id', requireAuth, requireAdmin, controller.update)
router.delete('/:id', requireAuth, requireAdmin, controller.remove)

module.exports = router
