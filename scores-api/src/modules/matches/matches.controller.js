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
    return success(res, await service.create(req.body, req.user), 201)
  } catch (err) {
    return error(res, err.message, err.status || 500)
  }
}

exports.update = async (req, res) => {
  try {
    return success(res, await service.update(req.params.id, req.body, req.user))
  } catch (err) {
    return error(res, err.message, err.status || 500)
  }
}

// PUT /api/partidos/:id/marcador — actualizar sets en tiempo real
exports.updateMarcador = async (req, res) => {
  try {
    return success(res, await service.updateMarcador(req.params.id, req.body, req.user))
  } catch (err) {
    return error(res, err.message, err.status || 500)
  }
}

const eventService = require('./match-events.service')

exports.getManaged = async (req, res) => {
  try {
    return success(res, await eventService.getManagedMatches(req.user))
  } catch (err) {
    return error(res, err.message, err.status || 500)
  }
}

exports.getControl = async (req, res) => {
  try {
    return success(res, await eventService.getControl(req.params.id, req.user))
  } catch (err) {
    return error(res, err.message, err.status || 500)
  }
}

exports.addEvent = async (req, res) => {
  try {
    return success(res, await eventService.addEvent(req.params.id, req.body, req.user), 201)
  } catch (err) {
    return error(res, err.message, err.status || 500)
  }
}

exports.undoEvent = async (req, res) => {
  try {
    return success(res, await eventService.undoLastEvent(req.params.id, req.user))
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
