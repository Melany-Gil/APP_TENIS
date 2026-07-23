const router = require('express').Router()
const controller = require('./favorites.controller')
const { requireAuth } = require('../../middlewares/auth.middleware')

router.get('/', requireAuth, controller.getAll)
router.post('/', requireAuth, controller.add)
router.delete('/:tipo/:referencia_id', requireAuth, controller.remove)

module.exports = router
