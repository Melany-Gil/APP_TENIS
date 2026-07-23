const router = require('express').Router()
const controller = require('./posiciones.controller')
const { requireAuth } = require('../../middlewares/auth.middleware')

// ── Routes ──────
router.get('/:torneo_id', requireAuth, controller.getByTorneo)

module.exports = router
