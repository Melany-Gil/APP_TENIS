const router = require('express').Router()
const { body } = require('express-validator')
const controller = require('./auth.controller')
const { requireAuth } = require('../../middlewares/auth.middleware')
const validate = require('../../middlewares/validate.middleware')

// POST /api/auth/login
router.post(
  '/login',
  [
    body('numero_documento').notEmpty().withMessage('El número de documento es requerido'),
    body('password').notEmpty().withMessage('La contraseña es requerida'),
  ],
  validate,
  controller.login
)

// POST /api/auth/register
router.post(
  '/register',
  [
    body('numero_documento')
      .notEmpty()
      .withMessage('El número de documento es requerido')
      .isLength({ min: 5, max: 20 })
      .withMessage('Documento inválido'),
    body('nombre').notEmpty().withMessage('El nombre es requerido'),
    body('apellido').notEmpty().withMessage('El apellido es requerido'),
    body('email').isEmail().withMessage('Email inválido'),
    body('password')
      .isLength({ min: 8 })
      .withMessage('La contraseña debe tener al menos 8 caracteres')
      .matches(/[A-Z]/)
      .withMessage('La contraseña debe contener al menos una mayúscula')
      .matches(/[0-9]/)
      .withMessage('La contraseña debe contener al menos un número'),
  ],
  validate,
  controller.register
)

// POST /api/auth/forgot-password
router.post(
  '/forgot-password',
  [body('email').isEmail().withMessage('Email inválido')],
  validate,
  controller.forgotPassword
)

// POST /api/auth/verify-otp
router.post(
  '/verify-otp',
  [
    body('email').isEmail().withMessage('Email inválido'),
    body('otp_code')
      .isLength({ min: 6, max: 6 })
      .withMessage('El OTP debe tener 6 dígitos')
      .isNumeric()
      .withMessage('El OTP debe ser numérico'),
  ],
  validate,
  controller.verifyOTP
)

// POST /api/auth/reset-password
router.post(
  '/reset-password',
  [
    body('email').isEmail().withMessage('Email inválido'),
    body('otp_code')
      .isLength({ min: 6, max: 6 })
      .withMessage('El OTP debe tener 6 dígitos')
      .isNumeric()
      .withMessage('El OTP debe ser numérico'),
    body('password')
      .isLength({ min: 8 })
      .withMessage('La contraseña debe tener al menos 8 caracteres')
      .matches(/[A-Z]/)
      .withMessage('La contraseña debe contener al menos una mayúscula')
      .matches(/[0-9]/)
      .withMessage('La contraseña debe contener al menos un número'),
  ],
  validate,
  controller.resetPassword
)

// POST /api/auth/logout  (requiere token)
router.post('/logout', requireAuth, controller.logout)

module.exports = router
