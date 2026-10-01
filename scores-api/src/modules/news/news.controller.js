const newsService = require('./news.service')
const { success, error } = require('../../utils/response')
const { toPublicUploadPath, deleteUpload } = require('../../middlewares/upload.middleware')

const payload = (req) => ({
  titulo: req.body.titulo,
  contenido: req.body.contenido,
  tipo: req.body.tipo,
  publicado:
    req.body.publicado !== undefined
      ? [true, 'true', 1, '1'].includes(req.body.publicado)
      : undefined,
  imagen_url: req.file
    ? toPublicUploadPath(req.file)
    : ['true', true].includes(req.body.remove_image)
      ? null
      : undefined,
})

exports.getAll = async (req, res) => {
  try {
    res.set?.('Cache-Control', 'private, no-store')
    const { tipo, all } = req.query
    const isAdmin = req.user?.rol === 'admin'
    const includeAll = Boolean(isAdmin && (all === 'true' || all === '1'))
    return success(res, await newsService.getAll({ tipo, includeAll }))
  } catch (err) {
    return error(res, err.status ? err.message : 'Error al obtener anuncios', err.status || 500)
  }
}

exports.getById = async (req, res) => {
  try {
    const isAdmin = req.user?.rol === 'admin'
    return success(res, await newsService.getById(req.params.id, { includeAll: isAdmin }))
  } catch (err) {
    return error(res, err.status ? err.message : 'Error al obtener anuncio', err.status || 500)
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
  try {
    return success(res, await newsService.update(req.params.id, payload(req)))
  } catch (err) {
    if (req.file) deleteUpload(toPublicUploadPath(req.file))
    return error(res, err.status ? err.message : 'Error al actualizar anuncio', err.status || 500)
  }
}

exports.togglePublicado = async (req, res) => {
  try {
    if (req.body?.publicado !== undefined && typeof req.body.publicado !== 'boolean')
      return error(res, 'Estado de publicación inválido', 400)
    return success(res, await newsService.togglePublicado(req.params.id, req.body?.publicado))
  } catch (err) {
    return error(res, err.status ? err.message : 'Error al cambiar estado de publicación', err.status || 500)
  }
}

exports.remove = async (req, res) => {
  try {
    return success(res, await newsService.remove(req.params.id))
  } catch (err) {
    return error(res, err.status ? err.message : 'Error al eliminar anuncio', err.status || 500)
  }
}
