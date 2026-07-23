const router = require('express').Router()
const { body } = require('express-validator')
const controller = require('./users.controller')
const { requireAuth, requireAdmin } = require('../../middlewares/auth.middleware')
const validate = require('../../middlewares/validate.middleware')

// Rutas del propio usuario — primero, para que /me no choque con /:id
router.get('/me', requireAuth, controller.getMe)
router.put('/me', requireAuth, controller.updateMe)
router.put('/me/password', requireAuth, controller.changePassword)

// Rutas de administración
router.get('/', requireAuth, requireAdmin, controller.getAll)
router.post(
  '/',
  requireAuth,
  requireAdmin,
  [
    body('numero_documento').trim().isLength({ min: 5, max: 20 }),
    body('nombre').trim().isLength({ min: 2, max: 100 }),
    body('apellido').trim().isLength({ min: 2, max: 100 }),
    body('email').normalizeEmail().isEmail(),
    body('password').isLength({ min: 8, max: 72 }).matches(/[A-Z]/).matches(/[0-9]/),
    body('rol').optional().isIn(['admin', 'miembro']),
    body('telefono').optional({ values: 'falsy' }).trim().isLength({ max: 20 }),
  ],
  validate,
  controller.create
)
router.get('/:id', requireAuth, requireAdmin, controller.getById)
router.put('/:id/rol', requireAuth, requireAdmin, controller.updateRole)

module.exports = router
