/**
 * Envía una respuesta exitosa estandarizada.
 * @param {import('express').Response} res
 * @param {*} data
 * @param {number} status
 */
exports.success = (res, data, status = 200) => res.status(status).json({ ok: true, data })

/**
 * Envía una respuesta de error estandarizada.
 * @param {import('express').Response} res
 * @param {string} message
 * @param {number} status
 */
exports.error = (res, message, status = 400) => res.status(status).json({ ok: false, message })
