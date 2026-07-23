const newsService = require('./news.service')
const { success, error } = require('../../utils/response')

exports.getAll = async (req, res) => {
  try {
    const { tipo } = req.query
    return success(res, await newsService.getAll({ tipo }))
  } catch (err) {
    return error(res, err.message || 'Error al obtener anuncios', err.status || 500)
  }
}

exports.getById = async (req, res) => {
  try {
    return success(res, await newsService.getById(req.params.id))
  } catch (err) {
    return error(res, err.message || 'Error al obtener anuncio', err.status || 500)
  }
}

exports.create = async (req, res) => {
  try {
    return success(res, await newsService.create(req.body, req.user.id), 201)
  } catch (err) {
    return error(res, err.message || 'Error al crear anuncio', err.status || 500)
  }
}

exports.remove = async (req, res) => {
  try {
    return success(res, await newsService.remove(req.params.id))
  } catch (err) {
    return error(res, err.message || 'Error al eliminar anuncio', err.status || 500)
  }
}
