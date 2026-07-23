const torneosService = require('./torneos.service')
const { success, error } = require('../../utils/response')

// ── Listar todos ────────────────────────────────────────────────────────────────
exports.getAll = async (req, res) => {
  try {
    const { deporte, estado } = req.query
    const data = await torneosService.getAll({ deporte, estado })
    return success(res, data)
  } catch (err) {
    return error(res, err.message || 'Error al obtener torneos', err.status || 500)
  }
}

// ── Obtener por ID ──────────────────────────────────────────────────────────────
exports.getById = async (req, res) => {
  try {
    const data = await torneosService.getById(req.params.id)
    return success(res, data)
  } catch (err) {
    return error(res, err.message || 'Error al obtener torneo', err.status || 500)
  }
}

// ── Crear ────────────────────────────────────────────────────────────────────────
exports.create = async (req, res) => {
  try {
    const data = await torneosService.create(req.body)
    return success(res, data, 201)
  } catch (err) {
    return error(res, err.message || 'Error al crear torneo', err.status || 500)
  }
}

// ── Actualizar ──────────────────────────────────────────────────────────────────
exports.update = async (req, res) => {
  try {
    const data = await torneosService.update(req.params.id, req.body)
    return success(res, data)
  } catch (err) {
    return error(res, err.message || 'Error al actualizar torneo', err.status || 500)
  }
}

// ── Eliminar ────────────────────────────────────────────────────────────────────
exports.remove = async (req, res) => {
  try {
    const data = await torneosService.remove(req.params.id)
    return success(res, data)
  } catch (err) {
    return error(res, err.message || 'Error al eliminar torneo', err.status || 500)
  }
}
