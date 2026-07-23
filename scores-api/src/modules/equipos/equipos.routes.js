const router = require('express').Router()
const controller = require('./equipos.controller')
const { requireAuth, requireAdmin } = require('../../middlewares/auth.middleware')
const { body } = require('express-validator')
const validate = require('../../middlewares/validate.middleware')

// ── Validaciones ────────────────────────────────────────────────────────────────
const equipoRules = [
  body('nombre').notEmpty().withMessage('El nombre es obligatorio'),
  body('jugador1_id').isInt({ min: 1 }).withMessage('jugador1_id debe ser un entero válido'),
  body('jugador2_id').isInt({ min: 1 }).withMessage('jugador2_id debe ser un entero válido'),
  body('categoria_id').isInt({ min: 1 }).withMessage('categoria_id debe ser un entero válido'),
]

// ── Rutas públicas (auth) ───────────────────────────────────────────────────────
router.get('/', requireAuth, controller.getAll)
router.get('/:id', requireAuth, controller.getById)

// ── Rutas admin ─────────────────────────────────────────────────────────────────
router.post('/', requireAuth, requireAdmin, equipoRules, validate, controller.create)
router.put('/:id', requireAuth, requireAdmin, equipoRules, validate, controller.update)
router.delete('/:id', requireAuth, requireAdmin, controller.remove)

module.exports = router
