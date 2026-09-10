const router = require('express').Router()
const controller = require('./matches.controller')
const { requireAuth, requireAdmin, requireOfficial, requireDirector, requireScorer } = require('../../middlewares/auth.middleware')

// GET  /api/partidos?estado=en_vivo&deporte=tenis&categoria_id=1
router.get('/', controller.getAll)
router.get('/stream', controller.stream)
router.get('/mios', requireAuth, controller.getMyMatches)
router.get('/gestion/mis-partidos', requireAuth, requireOfficial, controller.getManaged)
router.use('/:id/foto', require('./match-photo.routes'))
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
router.put('/:id', requireAuth, requireScorer, controller.update)
// PUT  /api/partidos/:id/participantes  — renombrar o reasignar participantes
router.put('/:id/participantes', requireAuth, requireOfficial, controller.updateParticipants)
// PUT  /api/partidos/:id/reasignar-juez — reasignar juez
router.put('/:id/reasignar-juez', requireAuth, requireDirector, controller.reassignJudge)
// PUT  /api/partidos/:id/cancelar — bajar o cancelar partido
router.put('/:id/cancelar', requireAuth, requireDirector, controller.cancelMatch)
// PUT  /api/partidos/:id/reactivar — reactivar partido cancelado
router.put('/:id/reactivar', requireAuth, requireDirector, controller.reactivateMatch)
// PUT  /api/partidos/:id/marcador  — actualizar sets en vivo
router.put('/:id/correccion', requireAuth, requireDirector, controller.correctScore)
router.put('/:id/sustitucion', requireAuth, requireDirector, controller.substitute)
router.put('/:id/marcador', requireAuth, requireScorer, controller.updateMarcador)
// DELETE /api/partidos/:id
router.delete('/:id', requireAuth, requireAdmin, controller.remove)

module.exports = router
