const newsService = require('./news.service')
const { success, error } = require('../../utils/response')
const { toPublicUploadPath, deleteUpload } = require('../../middlewares/upload.middleware')
const payload = req => ({ titulo: req.body.titulo, contenido: req.body.contenido, tipo: req.body.tipo,
  imagen_url: req.file ? toPublicUploadPath(req.file) : ['true', true].includes(req.body.remove_image) ? null : undefined })

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
    return success(res, await newsService.create(payload(req), req.user.id), 201)
  } catch (err) {
    if (req.file) deleteUpload(toPublicUploadPath(req.file))
    return error(res, err.status ? err.message : 'Error al crear anuncio', err.status || 500)
  }
}

exports.update = async (req, res) => {
  try { return success(res, await newsService.update(req.params.id, payload(req))) }
  catch (err) {
    if (req.file) deleteUpload(toPublicUploadPath(req.file))
    return error(res, err.status ? err.message : 'Error al actualizar anuncio', err.status || 500)
  }
}

exports.remove = async (req, res) => {
  try {
    return success(res, await newsService.remove(req.params.id))
  } catch (err) {
    return error(res, err.message || 'Error al eliminar anuncio', err.status || 500)
  }
}
