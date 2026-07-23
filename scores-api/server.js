require('dotenv').config()
require('./src/config/env')

const fs = require('fs')
const path = require('path')
const express = require('express')
const cors = require('cors')
const helmet = require('helmet')
const { rateLimit } = require('express-rate-limit')

const authRoutes = require('./src/modules/auth/auth.routes')
const jugadoresRoutes = require('./src/modules/jugadores/jugadores.routes')
const equiposRoutes = require('./src/modules/equipos/equipos.routes')
const torneosRoutes = require('./src/modules/torneos/torneos.routes')
const partidosRoutes = require('./src/modules/matches/matches.routes')
const anunciosRoutes = require('./src/modules/news/news.routes')
const favoritosRoutes = require('./src/modules/favorites/favorites.routes')
const categoriasRoutes = require('./src/modules/categorias/categorias.routes')
const sedesRoutes = require('./src/modules/sedes/sedes.routes')
const posicionesRoutes = require('./src/modules/posiciones/posiciones.routes')
const usersRoutes = require('./src/modules/users/users.routes')
const countriesRoutes = require('./src/modules/countries/countries.routes')

const app = express()
app.set('trust proxy', 1)

const allowedOrigins = (process.env.FRONTEND_URL || 'http://localhost:5173')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean)

app.use(helmet())
app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) return callback(null, true)
      const error = new Error('Origen no permitido por CORS')
      error.status = 403
      return callback(error)
    },
    credentials: true,
  })
)
app.use(express.json({ limit: '100kb' }))
app.use(express.urlencoded({ extended: true, limit: '100kb' }))

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { ok: false, message: 'Demasiados intentos. Intenta nuevamente en 15 minutos.' },
})
app.use('/api/auth/login', authLimiter)
app.use('/api/auth/register', authLimiter)
app.use('/api/auth/forgot-password', authLimiter)
app.use('/api/auth/verify-otp', authLimiter)
app.use('/api/auth/reset-password', authLimiter)

app.use('/api/auth', authRoutes)
app.use('/api/jugadores', jugadoresRoutes)
app.use('/api/equipos', equiposRoutes)
app.use('/api/torneos', torneosRoutes)
app.use('/api/partidos', partidosRoutes)
app.use('/api/anuncios', anunciosRoutes)
app.use('/api/favoritos', favoritosRoutes)
app.use('/api/categorias', categoriasRoutes)
app.use('/api/sedes', sedesRoutes)
app.use('/api/posiciones', posicionesRoutes)
app.use('/api/users', usersRoutes)
app.use('/api/countries', countriesRoutes)

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, message: 'API disponible', timestamp: new Date() })
})

const frontendDist = path.resolve(__dirname, '..', 'scores-app', 'dist')
if (fs.existsSync(frontendDist)) {
  app.use(express.static(frontendDist, { maxAge: '1d', etag: true }))
}

app.use((req, res) => {
  if (req.path.startsWith('/api/') || !fs.existsSync(frontendDist)) {
    return res.status(404).json({ ok: false, message: 'Ruta no encontrada' })
  }
  return res.sendFile(path.join(frontendDist, 'index.html'))
})

app.use((error, _req, res, _next) => {
  console.error('[ERROR]', error)
  res
    .status(error.status || 500)
    .json({ ok: false, message: error.message || 'Error interno del servidor' })
})

const port = process.env.PORT || 3001
if (require.main === module) {
  app.listen(port, '0.0.0.0', () => {
    console.log(`Tenis Club Unión API disponible en el puerto ${port}`)
  })
}

module.exports = app
