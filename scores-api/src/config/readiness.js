module.exports = function createReadiness(initialize) {
  let status = 'pending'
  let promise
  const start = () => {
    if (!promise) {
      promise = Promise.resolve().then(initialize).then(() => {
        status = 'ready'
      }, (error) => {
        status = 'failed'
        throw error
      })
    }
    return promise
  }
  const middleware = (_req, res, next) => {
    if (status === 'ready') return next()
    res.set('Retry-After', '5')
    res.set('Cache-Control', 'no-store')
    return res.status(503).json({
      ok: false,
      message: status === 'failed'
        ? 'No se pudo preparar la base de datos. Contacta al administrador.'
        : 'La aplicación se está preparando. Intenta nuevamente en unos segundos.',
    })
  }
  return { start, middleware }
}
