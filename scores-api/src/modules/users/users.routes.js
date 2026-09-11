const router = require('express').Router()
const { body } = require('express-validator')
const controller = require('./users.controller')
const { requireAuth, requireAdmin, requireOfficial } = require('../../middlewares/auth.middleware')
const { uploadAvatar } = require('../../middlewares/upload.middleware')
const validate = require('../../middlewares/validate.middleware')

// Rutas del propio usuario — primero, para que /me no choque con /:id
router.get('/me', requireAuth, controller.getMe)
router.put(
  '/me',
  requireAuth,
  [
    body('nombre').optional().trim().isLength({ min: 2, max: 100 }),
    body('apellido').optional().trim().isLength({ min: 2, max: 100 }),
    body('email').optional().normalizeEmail().isEmail(),
    body('telefono').optional({ values: 'falsy' }).trim().isLength({ max: 20 }),
  ],
  validate,
  controller.updateMe
)
router.put('/me/avatar', requireAuth, uploadAvatar, controller.uploadAvatar)
router.delete('/me/avatar', requireAuth, controller.deleteAvatar)
router.put('/me/password', requireAuth, controller.changePassword)

// Lista de jueces para asignación/reasignación (oficiales y directores)
router.get('/jueces', requireAuth, requireOfficial, controller.getJudges)

// Rutas de administración
router.get('/', requireAuth, requireAdmin, controller.getAll)
router.post(
  '/',
  requireAuth,
  requireAdmin,
  [
    body('numero_documento').trim().isLength({ min: 5, max: 20 }),
    body('usuario')
      .optional({ values: 'falsy' })
      .trim()
      .isLength({ min: 3, max: 50 })
      .withMessage('El usuario debe tener entre 3 y 50 caracteres')
      .matches(/^[a-zA-Z0-9._-]+$/)
      .withMessage('El usuario solo admite letras, números, punto, guion y guion bajo'),
    body('nombre').trim().isLength({ min: 2, max: 100 }),
    body('apellido').trim().isLength({ min: 2, max: 100 }),
    body('email').normalizeEmail().isEmail(),
    body('password').isLength({ min: 8, max: 72 }).matches(/[A-Z]/).matches(/[0-9]/),
    body('rol').optional().isIn(['admin', 'juez_director', 'juez', 'miembro']),
    body('telefono').optional({ values: 'falsy' }).trim().isLength({ max: 20 }),
  ],
  validate,
  controller.create
)
router.get('/:id', requireAuth, requireAdmin, controller.getById)
router.put('/:id', requireAuth, requireAdmin, controller.update)
router.put('/:id/estado', requireAuth, requireAdmin, controller.setActive)
router.put('/:id/password', requireAuth, requireAdmin, controller.resetPassword)
router.delete('/:id', requireAuth, requireAdmin, controller.remove)
router.put(
  '/:id/rol',
  requireAuth,
  requireAdmin,
  [body('rol').isIn(['admin', 'juez_director', 'juez', 'miembro'])],
  validate,
  controller.updateRole
)
router.put(
  '/:id/usuario',
  requireAuth,
  requireAdmin,
  [
    body('usuario')
      .optional({ values: 'falsy' })
      .trim()
      .isLength({ min: 3, max: 50 })
      .withMessage('El usuario debe tener entre 3 y 50 caracteres')
      .matches(/^[a-zA-Z0-9._-]+$/)
      .withMessage('El usuario solo admite letras, números, punto, guion y guion bajo'),
  ],
  validate,
  controller.updateUsuario
)

module.exports = router
