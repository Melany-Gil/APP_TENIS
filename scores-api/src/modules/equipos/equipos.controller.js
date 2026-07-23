const equiposService = require('./equipos.service')
const { success, error } = require('../../utils/response')

// ── Listar todos ────────────────────────────────────────────────────────────────
exports.getAll = async (req, res) => {
  try {
    const { categoria_id, activo } = req.query
    const data = await equiposService.getAll({ categoria_id, activo })
    return success(res, data)
  } catch (err) {
    return error(res, err.message || 'Error al obtener equipos', err.status || 500)
  }
}

// ── Obtener por ID ──────────────────────────────────────────────────────────────
exports.getById = async (req, res) => {
  try {
    const data = await equiposService.getById(req.params.id)
    return success(res, data)
  } catch (err) {
    return error(res, err.message || 'Error al obtener equipo', err.status || 500)
  }
}

// ── Crear ────────────────────────────────────────────────────────────────────────
exports.create = async (req, res) => {
  try {
    const data = await equiposService.create(req.body)
    return success(res, data, 201)
  } catch (err) {
    return error(res, err.message || 'Error al crear equipo', err.status || 500)
  }
}

// ── Actualizar ──────────────────────────────────────────────────────────────────
exports.update = async (req, res) => {
  try {
    const data = await equiposService.update(req.params.id, req.body)
    return success(res, data)
  } catch (err) {
    return error(res, err.message || 'Error al actualizar equipo', err.status || 500)
  }
}

// ── Eliminar ────────────────────────────────────────────────────────────────────
exports.remove = async (req, res) => {
  try {
    const data = await equiposService.remove(req.params.id)
    return success(res, data)
  } catch (err) {
    return error(res, err.message || 'Error al eliminar equipo', err.status || 500)
  }
}
