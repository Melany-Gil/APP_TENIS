const router = require('express').Router()
const { rateLimit } = require('express-rate-limit')
const multer = require('multer')
const crypto = require('node:crypto')
const {
  requireAuth,
  requireAdmin,
  requireOfficial,
  optionalAuth,
} = require('../../middlewares/auth.middleware')
const service = require('./service').createPadelService(require('../../config/db'))
const security = require('./security')
const media = require('../media/mediaStorage.service')
const { fail } = require('./domain')
const handle = (work) => async (req, res) => {
  try {
    res.json({ ok: true, data: await work(req, res) })
  } catch (e) {
    res
      .status(e.status || 500)
      .json({
        ok: false,
        message: e.status ? e.message : 'No se pudo completar la operación. Intenta de nuevo.',
      })
  }
}
router.use((_req, res, next) => {
  res.set('Cache-Control', 'private, no-store')
  next()
})
router.use((req, res, next) => {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next()
  const origin = req.get('origin')
  const allowed = (process.env.FRONTEND_URL || 'http://localhost:5173')
    .split(',')
    .map((x) => x.trim())
  if (req.get('sec-fetch-site') === 'cross-site' && (!origin || !allowed.includes(origin)))
    return res.status(403).json({ ok: false, message: 'Origen no permitido' })
  next()
})
router.get(
  '/',
  handle(() => service.list())
)
router.post(
  '/',
  requireAuth,
  requireAdmin,
  handle((req) => service.create(req.body, req.user))
)
router.put(
  '/:id',
  requireAuth,
  requireAdmin,
  handle((req) => service.update(req.params.id, req.body, req.user))
)
router.delete(
  '/:id',
  requireAuth,
  requireAdmin,
  handle(async (req) => {
    const { fotos } = await service.remove(req.params.id, req.body, req.user)
    for (const url of fotos) await media.delete(url).catch(() => {})
    return { ok: true }
  })
)
router.get(
  '/:id',
  optionalAuth,
  handle((req, res) => service.detail(req.params.id, req.user, security.browser(req, res)))
)
router.post(
  '/:id/pairs',
  requireAuth,
  requireAdmin,
  handle((req) => service.pair(req.params.id, null, req.body, req.user))
)
router.put(
  '/:id/pairs/:pair',
  requireAuth,
  requireAdmin,
  handle((req) => service.pair(req.params.id, req.params.pair, req.body, req.user))
)
router.delete(
  '/:id/pairs/:pair',
  requireAuth,
  requireAdmin,
  handle((req) => service.removePair(req.params.id, req.params.pair, req.body, req.user))
)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024, files: 1, fields: 2 },
}).single('foto')
router.post(
  '/:id/pairs/:pair/photo',
  requireAuth,
  requireOfficial,
  (req, res, next) =>
    upload(req, res, (e) =>
      e
        ? res.status(400).json({ ok: false, message: 'Selecciona una imagen de hasta 10 MB.' })
        : next()
    ),
  handle(async (req) => {
    if (!req.file) fail('Selecciona una foto')
    let buffer
    try {
      buffer = await require('sharp')(req.file.buffer, { limitInputPixels: 50000000 })
        .rotate()
        .resize({ width: 1800, height: 1800, fit: 'inside', withoutEnlargement: true })
        .webp({ quality: 90 })
        .toBuffer()
    } catch {
      fail('No se pudo leer la foto. Usa JPG, PNG o WebP de hasta 50 megapíxeles.')
    }
    const url = `/uploads/padel/${crypto.randomUUID()}.webp`
    await media.save(url, buffer, 'image/webp')
    try {
      return await service.photo(req.params.id, req.params.pair, req.body, url, req.user)
    } catch (e) {
      await media.delete(url)
      throw e
    }
  })
)
router.post(
  '/:id/draw',
  requireAuth,
  requireAdmin,
  handle((req) => service.draw(req.params.id, req.body, req.user))
)
router.post(
  '/:id/publish',
  requireAuth,
  requireAdmin,
  handle((req) => service.publish(req.params.id, req.body, req.user))
)
router.put(
  '/:id/matches/:match',
  requireAuth,
  requireOfficial,
  handle((req) => service.result(req.params.id, req.params.match, req.body, req.user))
)
router.post(
  '/:id/matches/:match/start',
  requireAuth,
  requireOfficial,
  handle((req) => service.result(req.params.id, req.params.match, req.body, req.user, true))
)
router.post(
  '/:id/voting',
  requireAuth,
  requireAdmin,
  handle((req) => service.voting(req.params.id, req.body, req.user))
)
const burst = rateLimit({
  windowMs: 60000,
  limit: 120,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { ok: false, message: 'Demasiados intentos. Espera un minuto.' },
})
const browserLimit = rateLimit({
  windowMs: 600000,
  limit: 10,
  keyGenerator: (req) => security.digest(`limit:${security.readBrowser(req)}`),
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { ok: false, message: 'Espera unos minutos antes de volver a intentar.' },
})
router.post(
  '/:id/votes',
  burst,
  (req, res, next) =>
    security.readBrowser(req)
      ? next()
      : res
          .status(400)
          .json({ ok: false, message: 'Activa las cookies y vuelve a abrir la votación' }),
  browserLimit,
  handle((req) => service.vote(req.params.id, req.body, security.readBrowser(req)))
)
router.get(
  '/:id/report',
  requireAuth,
  requireAdmin,
  handle((req) => service.report(req.params.id, req.user, req.query.after || 0))
)
module.exports = router
