const service = require('./sedes.service')
const { success, error } = require('../../utils/response')

exports.getAll = async (req, res) => {
  try {
    return success(res, await service.getAll())
  } catch (err) {
    return error(res, err.message || 'Error al obtener sedes', err.status || 500)
  }
}

exports.getCanchasBySede = async (req, res) => {
  try {
    return success(res, await service.getCanchasBySede(req.params.id))
  } catch (err) {
    return error(res, err.message || 'Error al obtener canchas', err.status || 500)
  }
}

exports.create = async (req, res) => {
  try {
    return success(res, await service.create(req.body), 201)
  } catch (err) {
    return error(res, err.message || 'Error al crear sede', err.status || 500)
  }
}

exports.remove = async (req, res) => {
  try {
    return success(res, await service.remove(req.params.id))
  } catch (err) {
    return error(res, err.message || 'Error al eliminar sede', err.status || 500)
  }
}

exports.createCancha = async (req, res) => {
  try {
    return success(res, await service.createCancha(req.params.id, req.body), 201)
  } catch (err) {
    return error(res, err.message || 'Error al crear cancha', err.status || 500)
  }
}

exports.removeCancha = async (req, res) => {
  try {
    return success(res, await service.removeCancha(req.params.canchaId))
  } catch (err) {
    return error(res, err.message || 'Error al eliminar cancha', err.status || 500)
  }
}
