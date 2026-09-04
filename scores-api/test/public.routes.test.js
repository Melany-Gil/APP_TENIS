const test = require('node:test')
const assert = require('node:assert/strict')

const dbPath = require.resolve('../src/config/db')
require.cache[dbPath] = {
  id: dbPath,
  filename: dbPath,
  loaded: true,
  exports: {
    async query() {
      return [[]]
    },
  },
}

const {
  requireAuth,
  requireAdmin,
  requireOfficial,
} = require('../src/middlewares/auth.middleware')

const routes = {
  categorias: require('../src/modules/categorias/categorias.routes'),
  equipos: require('../src/modules/equipos/equipos.routes'),
  jugadores: require('../src/modules/jugadores/jugadores.routes'),
  partidos: require('../src/modules/matches/matches.routes'),
  anuncios: require('../src/modules/news/news.routes'),
}

const handlersFor = (router, method, path) => {
  const layer = router.stack.find(
    (candidate) => candidate.route?.path === path && candidate.route.methods[method]
  )
  assert.ok(layer, `No se encontró ${method.toUpperCase()} ${path}`)
  return layer.route.stack.map((handler) => handler.handle)
}

test('las consultas necesarias para ver marcadores no exigen autenticación', () => {
  const publicReads = [
    [routes.categorias, '/'],
    [routes.equipos, '/'],
    [routes.equipos, '/:id'],
    [routes.jugadores, '/'],
    [routes.jugadores, '/:id'],
    [routes.partidos, '/'],
    [routes.partidos, '/stream'],
    [routes.partidos, '/:id'],
    [routes.partidos, '/:id/estadisticas'],
    [routes.anuncios, '/'],
  ]

  for (const [router, path] of publicReads) {
    assert.equal(handlersFor(router, 'get', path).includes(requireAuth), false)
  }
})

test('las operaciones de administración siguen protegidas', () => {
  const protectedWrites = [
    [routes.categorias, 'post', '/', requireAdmin],
    [routes.equipos, 'post', '/', requireAdmin],
    [routes.jugadores, 'post', '/', requireAdmin],
    [routes.partidos, 'post', '/', requireOfficial],
    [routes.partidos, 'put', '/:id/marcador', requireOfficial],
    [routes.partidos, 'post', '/:id/iniciar', requireOfficial],
    [routes.partidos, 'put', '/:id/pausa', requireOfficial],
    [routes.partidos, 'put', '/:id/saque', requireOfficial],
    [routes.anuncios, 'post', '/', requireAdmin],
  ]

  for (const [router, method, path, roleGuard] of protectedWrites) {
    const handlers = handlersFor(router, method, path)
    assert.ok(handlers.includes(requireAuth))
    assert.ok(handlers.includes(roleGuard))
  }
})
