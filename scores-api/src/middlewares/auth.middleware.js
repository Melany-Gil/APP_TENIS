const jwt = require('jsonwebtoken')
const db = require('../config/db')
const { error } = require('../utils/response')

/**
 * Middleware que verifica el Bearer token JWT en el header Authorization.
 * Si es válido, adjunta el payload decodificado a req.user.
 */
exports.requireAuth = async (req, res, next) => {
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

  let decoded
  try {
    decoded = jwt.verify(decodeURIComponent(token), process.env.JWT_SECRET)
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return error(res, 'Token expirado', 401)
    }
    return error(res, 'Token inválido', 401)
  }
  try {
    const [rows] = await db.query('SELECT rol, activo, session_version FROM users WHERE id = ? AND activo = TRUE LIMIT 1', [decoded.id])
    if (!rows.length || Number(decoded.session_version || 0) !== Number(rows[0].session_version || 0)) {
      return error(res, 'La cuenta fue desactivada o su sesión fue revocada. Inicia sesión de nuevo.', 401)
    }
    req.user = { ...decoded, rol: rows[0].rol }
    req.sessionChecked = true
    return next()
  } catch {
    return error(res, 'No se pudo verificar la sesión temporalmente. Reintenta sin cerrar la página.', 503)
  }
}

/**
 * Middleware que verifica que el usuario autenticado tenga rol 'admin'.
 * Debe usarse DESPUÉS de requireAuth.
 */
exports.requireRoles = (...allowedRoles) => async (req, res, next) => {
  if (req.sessionChecked) {
    return allowedRoles.includes(req.user.rol) ? next() : error(res, 'No tienes permisos para realizar esta acción', 403)
  }
  try {
    const [rows] = await db.query(
      'SELECT rol, activo FROM users WHERE id = ? AND activo = TRUE LIMIT 1',
      [req.user.id]
    )
    if (!rows.length || !allowedRoles.includes(rows[0].rol)) {
      return error(res, 'No tienes permisos para realizar esta acción', 403)
    }
    req.user.rol = rows[0].rol
    next()
  } catch (databaseError) {
    next(databaseError)
  }
}

exports.requireAdmin = exports.requireRoles('admin')
exports.requireDirector = exports.requireRoles('admin', 'juez_director')
exports.requireScorer = exports.requireRoles('admin', 'juez')
exports.requireOfficial = exports.requireRoles('admin', 'juez_director', 'juez')
