const router = require('express').Router()
const controller = require('./news.controller')
const { uploadAnuncio } = require('../../middlewares/upload.middleware')
const { requireAuth, requireAdmin, optionalAuth } = require('../../middlewares/auth.middleware')

// GET  /api/anuncios?tipo=evento&all=true
router.get('/', optionalAuth, controller.getAll)

// GET  /api/anuncios/:id (exclusivo para usuarios autenticados)
router.get('/:id', requireAuth, controller.getById)

// POST /api/anuncios  (solo admin)
router.post('/', requireAuth, requireAdmin, uploadAnuncio, controller.create)

// PUT /api/anuncios/:id  (solo admin)
router.put('/:id', requireAuth, requireAdmin, uploadAnuncio, controller.update)

// PATCH /api/anuncios/:id/toggle-publicado (solo admin)
router.patch('/:id/toggle-publicado', requireAuth, requireAdmin, controller.togglePublicado)

// DELETE /api/anuncios/:id  (solo admin)
router.delete('/:id', requireAuth, requireAdmin, controller.remove)

module.exports = router
