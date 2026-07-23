const router = require('express').Router()
const controller = require('./jugadores.controller')
const { requireAuth, requireAdmin } = require('../../middlewares/auth.middleware')
const { body } = require('express-validator')
const validate = require('../../middlewares/validate.middleware')

// ── Validaciones ────────────────────────────────────────────────────────────────
const jugadorRules = [
  body('nombre').trim().notEmpty().withMessage('El nombre es obligatorio'),
  body('apellido').trim().notEmpty().withMessage('El apellido es obligatorio'),
  body('deporte')
    .isIn(['tenis', 'padel', 'ambos'])
    .withMessage('El deporte debe ser tenis, padel o ambos'),
]

// ── Consulta pública ─────────────────────────────────────────────────────────────
router.get('/', controller.getAll)
router.get('/:id', controller.getById)

// ── Rutas admin ─────────────────────────────────────────────────────────────────
router.post('/', requireAuth, requireAdmin, jugadorRules, validate, controller.create)
router.put('/:id', requireAuth, requireAdmin, jugadorRules, validate, controller.update)
router.delete('/:id', requireAuth, requireAdmin, controller.remove)

module.exports = router
