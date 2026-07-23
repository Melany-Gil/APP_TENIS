const router = require('express').Router()
const controller = require('./jugadores.controller')
const { requireAuth, requireAdmin } = require('../../middlewares/auth.middleware')
const { body } = require('express-validator')
const validate = require('../../middlewares/validate.middleware')

// ── Validaciones ────────────────────────────────────────────────────────────────
const jugadorRules = [
  body('nombre').notEmpty().withMessage('El nombre es obligatorio'),
  body('apellido').notEmpty().withMessage('El apellido es obligatorio'),
  body('deporte').notEmpty().withMessage('El deporte es obligatorio'),
  body('categoria_id').isInt({ min: 1 }).withMessage('categoria_id debe ser un entero válido'),
  body('country_id')
    .optional()
    .isInt({ min: 1 })
    .withMessage('country_id debe ser un número entero positivo'),
  body('mano').optional().isString(),
  body('fecha_nac').optional().isDate().withMessage('fecha_nac debe ser una fecha válida'),
  body('telefono').optional().isString(),
  body('apodo').optional().isString(),
]

// ── Rutas públicas (auth) ───────────────────────────────────────────────────────
router.get('/', requireAuth, controller.getAll)
router.get('/:id', requireAuth, controller.getById)

// ── Rutas admin ─────────────────────────────────────────────────────────────────
router.post('/', requireAuth, requireAdmin, jugadorRules, validate, controller.create)
router.put('/:id', requireAuth, requireAdmin, jugadorRules, validate, controller.update)
router.delete('/:id', requireAuth, requireAdmin, controller.remove)

module.exports = router
