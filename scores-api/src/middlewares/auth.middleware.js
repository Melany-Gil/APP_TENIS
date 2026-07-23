const jwt = require('jsonwebtoken')
const db = require('../config/db')
const { error } = require('../utils/response')

/**
 * Middleware que verifica el Bearer token JWT en el header Authorization.
 * Si es válido, adjunta el payload decodificado a req.user.
 */
exports.requireAuth = (req, res, next) => {
  const authHeader = req.headers.authorization
  const bearerToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null
  const cookieToken = req.headers.cookie
    ?.split(';')
    .map((cookie) => cookie.trim().split('='))
    .find(([name]) => name === 'cu_session')?.[1]
  const token = bearerToken || cookieToken

  if (!token) {
    return error(res, 'Token de acceso requerido', 401)
  }

  try {
    const decoded = jwt.verify(decodeURIComponent(token), process.env.JWT_SECRET)
    req.user = decoded
    next()
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return error(res, 'Token expirado', 401)
    }
    return error(res, 'Token inválido', 401)
  }
}

/**
 * Middleware que verifica que el usuario autenticado tenga rol 'admin'.
 * Debe usarse DESPUÉS de requireAuth.
 */
exports.requireAdmin = async (req, res, next) => {
  try {
    const [rows] = await db.query(
      "SELECT rol, activo FROM users WHERE id = ? AND rol = 'admin' AND activo = TRUE LIMIT 1",
      [req.user.id]
    )
    if (!rows.length) {
      return error(res, 'Acceso restringido a administradores', 403)
    }
    req.user.rol = 'admin'
    next()
  } catch (databaseError) {
    next(databaseError)
  }
}
