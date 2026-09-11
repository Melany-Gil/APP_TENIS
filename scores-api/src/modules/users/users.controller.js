const service = require('./users.service')
const adminService = require('./users.admin.service')
const { success, error } = require('../../utils/response')
const { deleteUpload, toPublicUploadPath } = require('../../middlewares/upload.middleware')

// GET /api/users — solo admin
exports.getAll = async (req, res) => {
  try {
    return success(res, await service.getAll(req.query))
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

// GET /api/users/jueces — oficiales (jueces, juez director, admin)
exports.getJudges = async (req, res) => {
  try {
    return success(res, await service.getJudges())
  } catch (err) {
    return error(res, err.message || 'Error al obtener jueces', err.status || 500)
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
    return success(res, await adminService.updateRole(req.params.id, req.user.id, req.body.rol))
  } catch (err) {
    return error(res, err.message || 'Error al actualizar rol', err.status || 500)
  }
}

// PUT /api/users/:id/usuario — solo admin
exports.updateUsuario = async (req, res) => {
  try {
    return success(res, await service.updateUsuario(req.params.id, req.body.usuario))
  } catch (err) {
    return error(res, err.message || 'Error al actualizar el usuario', err.status || 500)
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

exports.uploadAvatar = async (req, res) => {
  if (!req.file) return error(res, 'No se envió ninguna imagen', 400)
  const avatarPath = toPublicUploadPath(req.file)
  try {
    const previous = await service.getById(req.user.id)
    const updated = await service.updateAvatar(req.user.id, avatarPath)
    deleteUpload(previous.avatar)
    return success(res, updated)
  } catch (err) {
    deleteUpload(avatarPath)
    return error(res, err.message || 'Error al subir el avatar', err.status || 500)
  }
}

exports.deleteAvatar = async (req, res) => {
  try {
    const previous = await service.getById(req.user.id)
    const updated = await service.updateAvatar(req.user.id, null)
    deleteUpload(previous.avatar)
    return success(res, updated)
  } catch (err) {
    return error(res, err.message || 'Error al eliminar el avatar', err.status || 500)
  }
}

// Admin operates on the selected account, never by impersonating its session.
exports.adminUploadAvatar = async (req, res) => {
  if (!req.file) return error(res, 'No se envió ninguna imagen', 400)
  const avatarPath = toPublicUploadPath(req.file)
  try {
    const previous = await service.getById(req.params.id)
    const updated = await service.updateAvatar(req.params.id, avatarPath)
    deleteUpload(previous.avatar)
    return success(res, updated)
  } catch (err) {
    deleteUpload(avatarPath)
    return error(res, err.status ? err.message : 'No se pudo guardar la foto', err.status || 500)
  }
}
exports.adminDeleteAvatar = async (req, res) => {
  try {
    const previous = await service.getById(req.params.id)
    const updated = await service.updateAvatar(req.params.id, null)
    deleteUpload(previous.avatar)
    return success(res, updated)
  } catch (err) { return error(res, err.status ? err.message : 'No se pudo quitar la foto', err.status || 500) }
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

for (const [name, payload] of Object.entries({ update: (req) => req.body, setActive: (req) => req.body.activo, resetPassword: (req) => req.body.password, remove: () => undefined })) {
  exports[name] = async (req, res) => {
    try {
      return success(res, await adminService[name](req.params.id, req.user.id, payload(req)))
    } catch (err) {
      return error(res, err.status ? err.message : 'No se pudo completar la operación. Reintenta.', err.status || 500)
    }
  }
}
