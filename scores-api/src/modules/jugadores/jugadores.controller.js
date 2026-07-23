const jugadoresService = require('./jugadores.service')
const { success, error } = require('../../utils/response')

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
    const data = await jugadoresService.remove(req.params.id)
    return success(res, data)
  } catch (err) {
    return error(res, err.message || 'Error al eliminar jugador', err.status || 500)
  }
}
