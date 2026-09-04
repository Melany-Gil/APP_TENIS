const service = require('./matches.service')
const realtime = require('./match-realtime')
const { success, error } = require('../../utils/response')

const changed = (res, data, matchId, status = 200, action = 'updated') => {
  realtime.publishMatchChange({ matchId, action })
  return success(res, data, status)
}

exports.stream = (req, res) => realtime.subscribe(req, res)

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
    const data = await service.create(req.body, req.user)
    return changed(res, data, data.id, 201, 'created')
  } catch (err) {
    return error(res, err.message, err.status || 500)
  }
}

exports.update = async (req, res) => {
  try {
    return changed(res, await service.update(req.params.id, req.body, req.user), req.params.id)
  } catch (err) {
    return error(res, err.message, err.status || 500)
  }
}

// PUT /api/partidos/:id/marcador — actualizar sets en tiempo real
exports.updateMarcador = async (req, res) => {
  try {
    return changed(res, await service.updateMarcador(req.params.id, req.body, req.user), req.params.id)
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

exports.getStats = async (req, res) => {
  try {
    return success(res, await eventService.getStats(req.params.id, req.query.set))
  } catch (err) {
    return error(res, err.message, err.status || 500)
  }
}

exports.startMatch = async (req, res) => {
  try {
    return changed(res, await eventService.startMatch(req.params.id, req.user), req.params.id, 200, 'started')
  } catch (err) {
    return error(res, err.message, err.status || 500)
  }
}

exports.setPaused = async (req, res) => {
  try {
    return changed(
      res,
      await eventService.setPaused(req.params.id, Boolean(req.body.pausado), req.user),
      req.params.id,
      200,
      req.body.pausado ? 'paused' : 'resumed'
    )
  } catch (err) {
    return error(res, err.message, err.status || 500)
  }
}

exports.changeServer = async (req, res) => {
  try {
    return changed(res, await eventService.changeServer(req.params.id, req.body.servidor, req.user), req.params.id)
  } catch (err) {
    return error(res, err.message, err.status || 500)
  }
}

exports.addEvent = async (req, res) => {
  try {
    return changed(res, await eventService.addEvent(req.params.id, req.body, req.user), req.params.id, 201, 'score')
  } catch (err) {
    return error(res, err.message, err.status || 500)
  }
}

exports.undoEvent = async (req, res) => {
  try {
    return changed(res, await eventService.undoLastEvent(req.params.id, req.user), req.params.id, 200, 'undo')
  } catch (err) {
    return error(res, err.message, err.status || 500)
  }
}

exports.remove = async (req, res) => {
  try {
    return changed(res, await service.remove(req.params.id), req.params.id, 200, 'deleted')
  } catch (err) {
    return error(res, err.message, err.status || 500)
  }
}
