const router = require('express').Router()
const controller = require('./matches.controller')
const { requireAuth, requireAdmin, requireOfficial } = require('../../middlewares/auth.middleware')

// GET  /api/partidos?estado=en_vivo&deporte=tenis&categoria_id=1
router.get('/', controller.getAll)
router.get('/gestion/mis-partidos', requireAuth, requireOfficial, controller.getManaged)
// GET  /api/partidos/:id
router.get('/:id/estadisticas', controller.getStats)
router.get('/:id', controller.getById)
router.get('/:id/control', requireAuth, requireOfficial, controller.getControl)
router.post('/:id/iniciar', requireAuth, requireOfficial, controller.startMatch)
router.put('/:id/pausa', requireAuth, requireOfficial, controller.setPaused)
router.put('/:id/saque', requireAuth, requireOfficial, controller.changeServer)
router.post('/:id/eventos', requireAuth, requireOfficial, controller.addEvent)
router.post('/:id/deshacer', requireAuth, requireOfficial, controller.undoEvent)
// POST /api/partidos
router.post('/', requireAuth, requireOfficial, controller.create)
// PUT  /api/partidos/:id
router.put('/:id', requireAuth, requireOfficial, controller.update)
// PUT  /api/partidos/:id/marcador  — actualizar sets en vivo
router.put('/:id/marcador', requireAuth, requireOfficial, controller.updateMarcador)
// DELETE /api/partidos/:id
router.delete('/:id', requireAuth, requireAdmin, controller.remove)

module.exports = router
