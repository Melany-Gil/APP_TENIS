const router = require('express').Router()
const controller = require('./news.controller')
const { requireAuth, requireAdmin } = require('../../middlewares/auth.middleware')

// GET  /api/anuncios?tipo=evento
router.get('/', requireAuth, controller.getAll)
// GET  /api/anuncios/:id
router.get('/:id', requireAuth, controller.getById)
// POST /api/anuncios  (solo admin)
router.post('/', requireAuth, requireAdmin, controller.create)
// DELETE /api/anuncios/:id  (solo admin)
router.delete('/:id', requireAuth, requireAdmin, controller.remove)

module.exports = router
