const service = require('./categorias.service')
const { success, error } = require('../../utils/response')

exports.getAll = async (req, res) => {
  try {
    const filters = {}
    if (req.query.deporte) filters.deporte = req.query.deporte
    return success(res, await service.getAll(filters))
  } catch (err) {
    return error(res, err.message || 'Error al obtener categorías', err.status || 500)
  }
}

exports.create = async (req, res) => {
  try {
    return success(res, await service.create(req.body), 201)
  } catch (err) {
    return error(res, err.message || 'Error al crear categoría', err.status || 500)
  }
}

exports.update = async (req, res) => {
  try {
    return success(res, await service.update(req.params.id, req.body))
  } catch (err) {
    return error(res, err.message || 'Error al actualizar categoría', err.status || 500)
  }
}

exports.remove = async (req, res) => {
  try {
    return success(res, await service.remove(req.params.id))
  } catch (err) {
    return error(res, err.message || 'Error al eliminar categoría', err.status || 500)
  }
}
