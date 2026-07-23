const router = require('express').Router()
const controller = require('./torneos.controller')
const { requireAuth, requireAdmin } = require('../../middlewares/auth.middleware')
const { body } = require('express-validator')
const validate = require('../../middlewares/validate.middleware')

// ── Validaciones ────────────────────────────────────────────────────────────────
const torneoRules = [
  body('nombre').notEmpty().withMessage('El nombre es obligatorio'),
  body('deporte').notEmpty().withMessage('El deporte es obligatorio'),
  body('categoria_id').isInt({ min: 1 }).withMessage('categoria_id debe ser un entero válido'),
  body('sede_id').isInt({ min: 1 }).withMessage('sede_id debe ser un entero válido'),
  body('formato').optional().isString(),
  body('descripcion').optional().isString(),
  body('premio').optional().isString(),
  body('cupo_max').optional().isInt({ min: 1 }).withMessage('cupo_max debe ser un entero positivo'),
  body('fecha_inicio').optional().isDate().withMessage('fecha_inicio debe ser una fecha válida'),
  body('fecha_fin').optional().isDate().withMessage('fecha_fin debe ser una fecha válida'),
  body('estado')
    .optional()
    .isIn(['proximo', 'en_curso', 'finalizado', 'cancelado'])
    .withMessage('Estado inválido. Valores: proximo, en_curso, finalizado, cancelado'),
]

// ── Rutas públicas (auth) ───────────────────────────────────────────────────────
router.get('/', requireAuth, controller.getAll)
router.get('/:id', requireAuth, controller.getById)

// ── Rutas admin ─────────────────────────────────────────────────────────────────
router.post('/', requireAuth, requireAdmin, torneoRules, validate, controller.create)
router.put('/:id', requireAuth, requireAdmin, torneoRules, validate, controller.update)
router.delete('/:id', requireAuth, requireAdmin, controller.remove)

module.exports = router
