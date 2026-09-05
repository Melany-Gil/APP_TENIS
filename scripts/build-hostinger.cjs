const { spawnSync } = require('node:child_process')
const path = require('node:path')
const fs = require('node:fs')

const root = path.resolve(__dirname, '..')
function npm(args) {
  const result = spawnSync(process.platform === 'win32' ? 'npm.cmd' : 'npm', args, {
    cwd: root,
    stdio: 'inherit',
    shell: process.platform === 'win32',
    env: { ...process.env, VITE_API_URL: '/api' },
  })
  if (result.error) throw result.error
  if (result.status !== 0) process.exit(result.status || 1)
}

// Explicitly include build tooling even when the hosting sets NODE_ENV=production.
npm(['ci', '--prefix', 'scores-api', '--omit=dev'])
npm(['ci', '--prefix', 'scores-app', '--include=dev'])
npm(['run', 'build', '--prefix', 'scores-app'])
if (!fs.existsSync(path.join(root, 'scores-app', 'dist', 'index.html'))) {
  throw new Error('No se generó la interfaz de la aplicación')
}
