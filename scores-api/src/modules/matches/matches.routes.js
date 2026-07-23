const router = require('express').Router()
const controller = require('./matches.controller')
const { requireAuth, requireAdmin } = require('../../middlewares/auth.middleware')

// GET  /api/partidos?estado=en_vivo&deporte=tenis&torneo_id=1
router.get('/', requireAuth, controller.getAll)
// GET  /api/partidos/:id
router.get('/:id', requireAuth, controller.getById)
// POST /api/partidos
router.post('/', requireAuth, requireAdmin, controller.create)
// PUT  /api/partidos/:id
router.put('/:id', requireAuth, requireAdmin, controller.update)
// PUT  /api/partidos/:id/marcador  — actualizar sets en vivo
router.put('/:id/marcador', requireAuth, requireAdmin, controller.updateMarcador)
// DELETE /api/partidos/:id
router.delete('/:id', requireAuth, requireAdmin, controller.remove)

module.exports = router
