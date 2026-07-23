const service = require('./matches.service')
const { success, error } = require('../../utils/response')

exports.getAll = async (req, res) => {
  try {
    return success(res, await service.getAll(req.query))
  } catch (err) {
    return error(res, err.message, err.status || 500)
  }
}

exports.getById = async (req, res) => {
  try {
    return success(res, await service.getById(req.params.id))
  } catch (err) {
    return error(res, err.message, err.status || 500)
  }
}

exports.create = async (req, res) => {
  try {
    return success(res, await service.create(req.body, req.user.id), 201)
  } catch (err) {
    return error(res, err.message, err.status || 500)
  }
}

exports.update = async (req, res) => {
  try {
    return success(res, await service.update(req.params.id, req.body))
  } catch (err) {
    return error(res, err.message, err.status || 500)
  }
}

// PUT /api/partidos/:id/marcador — actualizar sets en tiempo real
exports.updateMarcador = async (req, res) => {
  try {
    return success(res, await service.updateMarcador(req.params.id, req.body))
  } catch (err) {
    return error(res, err.message, err.status || 500)
  }
}

exports.remove = async (req, res) => {
  try {
    return success(res, await service.remove(req.params.id))
  } catch (err) {
    return error(res, err.message, err.status || 500)
  }
}
