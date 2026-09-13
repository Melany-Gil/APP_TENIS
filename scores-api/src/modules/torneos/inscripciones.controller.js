const inscripcionesService = require('./inscripciones.service')
const { success, error } = require('../../utils/response')

exports.getByTorneo = async (req, res) => {
  try {
    const data = await inscripcionesService.getByTorneo(req.params.id)
    return success(res, data)
  } catch (err) {
    return error(
      res,
      err.status ? err.message : 'No se pudo procesar la inscripción',
      err.status || 500
    )
  }
}

exports.inscribirBulk = async (req, res) => {
  try {
    const data = await inscripcionesService.inscribirBulk(req.params.id, req.body.equipo_ids)
    return success(res, data)
  } catch (err) {
    return error(
      res,
      err.status ? err.message : 'No se pudo procesar la inscripción',
      err.status || 500
    )
  }
}

exports.removeInscripcion = async (req, res) => {
  try {
    const data = await inscripcionesService.removeInscripcion(req.params.id, req.params.equipo_id)
    return success(res, data)
  } catch (err) {
    return error(
      res,
      err.status ? err.message : 'No se pudo procesar la inscripción',
      err.status || 500
    )
  }
}
