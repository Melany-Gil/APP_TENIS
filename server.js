// Hostinger entry point. Render continues using scores-api/server.js directly.
const fs = require('node:fs')
const path = require('node:path')
if (!fs.existsSync(path.join(__dirname, 'scores-app', 'dist', 'index.html'))) {
  throw new Error('Falta la interfaz compilada. Ejecuta npm run build antes de iniciar.')
}
const app = require('./scores-api/server')
if (require.main === module) app.start()
module.exports = app
