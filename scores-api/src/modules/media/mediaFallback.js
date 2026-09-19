const storage = require('./mediaStorage.service')

// Serve the durable copy without writing untrusted request paths to disk.
module.exports = async (req, res, next) => {
  if (!['GET', 'HEAD'].includes(req.method)) return next()
  if (!/^\/(avatars|players|anuncios|logos)\/[a-zA-Z0-9_-]+\.(webp|png|jpg)$/.test(req.path)) return res.sendStatus(404)
  try {
    const media = await storage.get(`/uploads${req.path}`)
    if (!media) return res.sendStatus(404)
    res.setHeader('Content-Type', media.mimeType)
    res.setHeader('Content-Length', media.data.length)
    res.setHeader('Cache-Control', 'public, max-age=86400')
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin')
    return req.method === 'HEAD' ? res.end() : res.send(media.data)
  } catch {
    res.setHeader('Cache-Control', 'no-store')
    return res.status(503).send('Imagen temporalmente no disponible')
  }
}
