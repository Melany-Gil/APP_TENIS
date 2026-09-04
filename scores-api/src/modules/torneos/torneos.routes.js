const router = require('express').Router()
const controller = require('./torneos.controller')
const { requireAuth, requireAdmin } = require('../../middlewares/auth.middleware')
const { body } = require('express-validator')
const validate = require('../../middlewares/validate.middleware')

// ── Validaciones ────────────────────────────────────────────────────────────────
const torneoRules = [
  body('nombre').notEmpty().withMessage('El nombre es obligatorio'),
  body('deporte').isIn(['tenis', 'padel']).withMessage('El deporte debe ser tenis o padel'),
  body('categoria_id')
    .optional({ values: 'falsy' })
    .isInt({ min: 1 })
    .withMessage('La categoría debe ser válida'),
  body('modalidad')
    .isIn(['individual', 'dobles'])
    .withMessage('La modalidad debe ser individual o dobles'),
  body('sistema')
    .isIn(['por_definir', 'eliminacion_directa', 'todos_contra_todos', 'grupos_eliminacion'])
    .withMessage('Selecciona un sistema de competencia válido'),
  body('fecha_inicio')
    .optional({ values: 'falsy' })
    .isDate()
    .withMessage('fecha_inicio debe ser una fecha válida'),
  body('fecha_fin')
    .optional({ values: 'falsy' })
    .isDate()
    .withMessage('fecha_fin debe ser una fecha válida'),
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
