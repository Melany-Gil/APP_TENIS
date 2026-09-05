// Aplica el esquema (ensureSchema) contra la base configurada en las variables
// de entorno. Es idempotente: se puede ejecutar tantas veces como haga falta.
//
//   cd scores-api && npm run db:migrate
//
// Útil cuando el arranque gestionado del hosting no ejecuta ensureSchema por sí
// solo y falta alguna columna nueva (por ejemplo users.usuario).
require('dotenv').config()

const { ensureSchema } = require('../src/config/schema')
const db = require('../src/config/db')

;(async () => {
  try {
    await ensureSchema()
    console.log('✅  Esquema al día')
    process.exitCode = 0
  } catch (error) {
    console.error('❌  Falló la migración del esquema:', error.message)
    process.exitCode = 1
  } finally {
    await db.end().catch(() => {})
  }
})()
