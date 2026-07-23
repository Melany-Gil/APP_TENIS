const { validationResult } = require('express-validator')
const { error } = require('../utils/response')

/**
 * Middleware que recoge los errores de express-validator y los devuelve
 * como respuesta de error estándar si existen.
 */
module.exports = (req, res, next) => {
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    const messages = errors
      .array()
      .map((e) => e.msg)
      .join('. ')
    return error(res, messages, 422)
  }
  next()
}
