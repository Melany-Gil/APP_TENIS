const service = require('./users.service')
const { success, error } = require('../../utils/response')

// GET /api/users — solo admin
exports.getAll = async (req, res) => {
  try {
    return success(res, await service.getAll())
  } catch (err) {
    return error(res, err.message || 'Error al obtener usuarios', err.status || 500)
  }
}

// GET /api/users/me — usuario autenticado
exports.getMe = async (req, res) => {
  try {
    return success(res, await service.getById(req.user.id))
  } catch (err) {
    return error(res, err.message || 'Error al obtener perfil', err.status || 500)
  }
}

// GET /api/users/:id — solo admin
exports.getById = async (req, res) => {
  try {
    return success(res, await service.getById(req.params.id))
  } catch (err) {
    return error(res, err.message || 'Error al obtener usuario', err.status || 500)
  }
}

// PUT /api/users/:id/rol — solo admin
exports.create = async (req, res) => {
  try {
    return success(res, await service.create(req.body), 201)
  } catch (err) {
    return error(res, err.message || 'Error al crear usuario', err.status || 500)
  }
}

exports.updateRole = async (req, res) => {
  try {
    return success(res, await service.updateRole(req.params.id, req.body.rol, req.user.id))
  } catch (err) {
    return error(res, err.message || 'Error al actualizar rol', err.status || 500)
  }
}

// PUT /api/users/me — usuario autenticado
exports.updateMe = async (req, res) => {
  try {
    return success(res, await service.updateMe(req.user.id, req.body))
  } catch (err) {
    return error(res, err.message || 'Error al actualizar perfil', err.status || 500)
  }
}

// PUT /api/users/me/password — usuario autenticado
exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body
    return success(res, await service.changePassword(req.user.id, currentPassword, newPassword))
  } catch (err) {
    return error(res, err.message || 'Error al cambiar contraseña', err.status || 500)
  }
}
