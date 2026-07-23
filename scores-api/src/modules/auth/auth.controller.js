const authService = require('./auth.service')
const { success, error } = require('../../utils/response')

const sessionCookie = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax',
  path: '/',
  maxAge: Number.parseInt(process.env.SESSION_HOURS || '8', 10) * 60 * 60 * 1000,
}

exports.login = async (req, res) => {
  try {
    const result = await authService.login(req.body)
    res.cookie('cu_session', result.token, sessionCookie)
    return res.status(200).json({ ok: true, user: result.user })
  } catch (err) {
    return error(res, err.message || 'Error en el login', err.status || 500)
  }
}

exports.register = async (req, res) => {
  try {
    const result = await authService.register(req.body)
    res.cookie('cu_session', result.token, sessionCookie)
    return res.status(201).json({ ok: true, user: result.user })
  } catch (err) {
    return error(res, err.message || 'Error en el registro', err.status || 500)
  }
}

exports.forgotPassword = async (req, res) => {
  try {
    await authService.forgotPassword(req.body)
    return success(res, null)
    // Respuesta consistente sin revelar si el email existe
  } catch (err) {
    console.error('❌  Error al enviar el código OTP:', err.message)
    return error(res, err.message || 'Error al enviar el OTP', err.status || 500)
  }
}

exports.verifyOTP = async (req, res) => {
  try {
    await authService.verifyOTP(req.body)
    return res.status(200).json({ ok: true, message: 'OTP válido' })
  } catch (err) {
    return error(res, err.message || 'Error al verificar OTP', err.status || 500)
  }
}

exports.resetPassword = async (req, res) => {
  try {
    await authService.resetPassword(req.body)
    return res.status(200).json({ ok: true, message: 'Contraseña actualizada correctamente' })
  } catch (err) {
    return error(res, err.message || 'Error al resetear contraseña', err.status || 500)
  }
}

exports.logout = (_req, res) => {
  res.clearCookie('cu_session', { ...sessionCookie, maxAge: undefined })
  // JWT es stateless; el frontend elimina el token.
  // Aquí se podría implementar una blacklist si fuera necesario.
  return res.status(200).json({ ok: true, message: 'Sesión cerrada correctamente' })
}
