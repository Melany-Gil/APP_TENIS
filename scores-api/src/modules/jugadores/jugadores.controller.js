const jugadoresService = require('./jugadores.service')
const { success, error } = require('../../utils/response')
const { deleteUpload, toPublicUploadPath } = require('../../middlewares/upload.middleware')

// ── Listar todos ────────────────────────────────────────────────────────────────
exports.getAll = async (req, res) => {
  try {
    const { deporte, categoria_id, activo } = req.query
    const data = await jugadoresService.getAll({ deporte, categoria_id, activo })
    return success(res, data)
  } catch (err) {
    return error(res, err.message || 'Error al obtener jugadores', err.status || 500)
  }
}

// ── Obtener por ID ──────────────────────────────────────────────────────────────
exports.getById = async (req, res) => {
  try {
    const data = await jugadoresService.getById(req.params.id)
    return success(res, data)
  } catch (err) {
    return error(res, err.message || 'Error al obtener jugador', err.status || 500)
  }
}

exports.getAdminAll = async (req, res) => {
  try {
    const data = await jugadoresService.getAll({ ...req.query, includeAccount: true })
    return success(res, data)
  } catch (err) {
    return error(res, err.message || 'Error al obtener jugadores', err.status || 500)
  }
}

// ── Crear ────────────────────────────────────────────────────────────────────────
exports.create = async (req, res) => {
  try {
    const data = await jugadoresService.create(req.body)
    return success(res, data, 201)
  } catch (err) {
    return error(res, err.message || 'Error al crear jugador', err.status || 500)
  }
}

// ── Actualizar ──────────────────────────────────────────────────────────────────
exports.update = async (req, res) => {
  try {
    const data = await jugadoresService.update(req.params.id, req.body)
    return success(res, data)
  } catch (err) {
    return error(res, err.message || 'Error al actualizar jugador', err.status || 500)
  }
}

// ── Eliminar ────────────────────────────────────────────────────────────────────
exports.remove = async (req, res) => {
  try {
    const previous = await jugadoresService.getById(req.params.id)
    const data = await jugadoresService.remove(req.params.id)
    deleteUpload(previous.foto)
    return success(res, data)
  } catch (err) {
    return error(res, err.message || 'Error al eliminar jugador', err.status || 500)
  }
}

exports.uploadFoto = async (req, res) => {
  if (!req.file) return error(res, 'No se envió ninguna imagen', 400)
  const fotoPath = toPublicUploadPath(req.file)
  try {
    const previous = await jugadoresService.getById(req.params.id)
    const updated = await jugadoresService.updateFoto(req.params.id, fotoPath)
    deleteUpload(previous.foto)
    return success(res, updated)
  } catch (err) {
    deleteUpload(fotoPath)
    return error(res, err.message || 'Error al subir la foto', err.status || 500)
  }
}

exports.deleteFoto = async (req, res) => {
  try {
    const previous = await jugadoresService.getById(req.params.id)
    const updated = await jugadoresService.updateFoto(req.params.id, null)
    deleteUpload(previous.foto)
    return success(res, updated)
  } catch (err) {
    return error(res, err.message || 'Error al eliminar la foto', err.status || 500)
  }
}

exports.linkUser = async (req, res) => {
  try {
    return success(res, await jugadoresService.linkUser(req.params.id, req.body.user_id))
  } catch (err) {
    return error(res, err.message || 'Error al vincular la cuenta', err.status || 500)
  }
}

exports.unlinkUser = async (req, res) => {
  try {
    return success(res, await jugadoresService.unlinkUser(req.params.id))
  } catch (err) {
    return error(res, err.message || 'Error al desvincular la cuenta', err.status || 500)
  }
}
