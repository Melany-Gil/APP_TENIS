const favoritesService = require('./favorites.service')
const { success, error } = require('../../utils/response')

exports.getAll = async (req, res) => {
  try {
    const data = await favoritesService.getAll(req.user.id)
    return success(res, data)
  } catch (err) {
    return error(res, err.message || 'Error al obtener favoritos', err.status || 500)
  }
}

exports.add = async (req, res) => {
  try {
    const { tipo, referencia_id } = req.body

    if (!tipo || !referencia_id) {
      return error(res, 'tipo y referencia_id son requeridos', 400)
    }

    const tiposValidos = ['jugador', 'equipo', 'partido', 'torneo']
    if (!tiposValidos.includes(tipo)) {
      return error(res, `tipo debe ser uno de: ${tiposValidos.join(', ')}`, 400)
    }

    const data = await favoritesService.add(req.user.id, { tipo, referencia_id })
    return success(res, data, 201)
  } catch (err) {
    return error(res, err.message || 'Error al agregar favorito', err.status || 500)
  }
}

exports.remove = async (req, res) => {
  try {
    const { tipo, referencia_id } = req.params
    const data = await favoritesService.remove(req.user.id, { tipo, referencia_id })
    return success(res, data)
  } catch (err) {
    return error(res, err.message || 'Error al eliminar favorito', err.status || 500)
  }
}
