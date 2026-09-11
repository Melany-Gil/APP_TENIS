// Solo API simulada; nunca consulta ni modifica la base de datos real.
const { chromium } = require(process.argv[2] || 'playwright')
const assert = require('node:assert/strict')
const base = 'http://127.0.0.1:4175'
;(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true })
  try {
    for (const width of [360, 1280]) {
      const context = await browser.newContext({ viewport: { width, height: 850 } })
      const page = await context.newPage()
      const errors = []
      let mode = 'normal'
      const match = { id: 10, deporte: 'tenis', modalidad: 'dobles', estado: 'finalizado', ganador: 'jugador1', resultado: 'victoria', mi_lado: 'jugador1', equipo1: { id: 1, nombre: 'Pérez / García' }, equipo2: { id: 2, nombre: 'López / Suárez' }, torneo: { id: 1, nombre: 'Abierto Club Unión' }, sets: [{ games_j1: 6, games_j2: 2 }, { games_j1: 6, games_j2: 4 }] }
      page.on('pageerror', e => errors.push(e.message))
      await page.addInitScript(() => localStorage.setItem('auth-storage-v2', JSON.stringify({ state: { isAuthenticated: true, user: { id: 1, rol: 'miembro', nombre: 'Ana', apellido: 'Pérez' } }, version: 0 })))
      await page.route('**/*', async route => {
        const url = new URL(route.request().url())
        if (url.pathname.startsWith('/api/')) {
          let data = []
          if (url.pathname === '/api/partidos/mios') {
            if (mode === 'unlinked') return route.fulfill({ status: 404, contentType: 'application/json', body: JSON.stringify({ message: 'Sin vínculo' }) })
            data = { jugador: { id: 8 }, en_vivo: [], proximos: [], historial: mode === 'empty' ? [] : [match] }
          } else if (url.pathname === '/api/partidos/10') data = match
          else if (url.pathname.endsWith('/estadisticas')) data = { total_sets: 2, estadisticas: { jugador1: { puntos_ganados: 50, aces: 3 }, jugador2: { puntos_ganados: 30, aces: 1 } } }
          else if (url.pathname.endsWith('/foto')) data = null
          return route.fulfill({ contentType: 'application/json', body: JSON.stringify({ ok: true, data }) })
        }
        if (url.origin === base) return route.continue()
        return route.abort()
      })
      await page.goto(base)
      await page.getByRole('heading', { name: 'Hola, Ana' }).waitFor()
      await page.getByText('100%', { exact: true }).waitFor()
      await page.getByRole('button', { name: 'Abrir menú de Ana Pérez' }).click()
      await page.getByRole('button', { name: 'Cerrar sesión', exact: true }).waitFor()
      await page.screenshot({ path: require('node:path').join(require('node:os').tmpdir(), `profile-menu-${width}.png`) })
      await page.keyboard.press('Escape')
      await page.getByRole('combobox').selectOption('1')
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false)
      await page.screenshot({ path: require('node:path').join(require('node:os').tmpdir(), `player-dashboard-${width}.png`), fullPage: true })
      await page.getByRole('link', { name: 'Ver estadísticas y comparación' }).click()
      await page.getByRole('button', { name: 'Comparación gráfica' }).waitFor()
      await page.getByRole('img', { name: 'Diagrama ilustrativo de una cancha de polvo de ladrillo' }).waitFor()
      await page.getByRole('button', { name: 'Set 2', exact: true }).click()
      await page.getByRole('button', { name: 'Tabla de datos' }).click()
      await page.getByRole('button', { name: 'Comparación gráfica' }).click()
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false)
      await page.screenshot({ path: require('node:path').join(require('node:os').tmpdir(), `player-stats-${width}.png`), fullPage: true })
      await page.goto(`${base}/settings`)
      await page.getByRole('button', { name: 'Cambiar contraseña Actualiza tu contraseña' }).click()
      await page.getByRole('dialog').getByLabel('Contraseña actual', { exact: true }).fill('Anterior123')
      await page.keyboard.press('Escape')
      await page.getByRole('dialog').waitFor({ state: 'detached' })
      mode = 'unlinked'
      await page.goto(base)
      await page.getByRole('heading', { name: 'Vincula tu cuenta con tu ficha de jugador' }).waitFor()
      mode = 'empty'
      await page.reload()
      await page.getByText('No hay partidos en esta selección.').waitFor()
      assert.deepEqual(errors, [])
      await context.close()
      console.log(`Panel y estadísticas OK: ${width}px`)
    }
  } finally { await browser.close() }
})().catch(e => { console.error(e); process.exitCode = 1 })
