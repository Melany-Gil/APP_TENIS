const { chromium } = require(process.argv[2] || 'playwright')
const assert = require('node:assert/strict')
const base = 'http://127.0.0.1:4175'
;(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true })
  try {
    for (const width of [360, 768, 1366]) {
      const page = await browser.newPage({ viewport: { width, height: 1000 } })
      const errors = []
      page.on('pageerror', e => errors.push(e.message))
      await page.addInitScript(() => localStorage.setItem('auth-storage-v2', JSON.stringify({ state: { isAuthenticated: true, user: { id: 1, rol: 'admin', nombre: 'Melany', apellido: 'Gil' } }, version: 0 })))
      await page.route('**/*', route => {
        const url = new URL(route.request().url())
        if (url.pathname.startsWith('/api/')) {
          let data = []
          if (url.pathname === '/api/partidos/10') data = { id: 10, deporte: 'tenis', modalidad: 'individual', estado: 'programado', jugador1: { nombre: 'Ana', apellido: 'Pérez' }, jugador2: { nombre: 'Luis', apellido: 'García' }, sets: [] }
          if (url.pathname.endsWith('/foto')) data = null
          return route.fulfill({ contentType: 'application/json', body: JSON.stringify({ ok: true, data }) })
        }
        return url.origin === base ? route.continue() : route.abort()
      })
      await page.goto(`${base}/match/10`)
      await page.locator('.clay-court').waitFor()
      const valid = await page.evaluate(() => {
        const nav = document.querySelector('.top-navigation-links-organized').getBoundingClientRect()
        const primary = document.querySelector('.top-navigation-primary').getBoundingClientRect()
        const links = [...document.querySelectorAll('.top-navigation-link')].map(e => e.getBoundingClientRect())
        return nav.top >= primary.bottom - 1 && links.every(r => r.left >= 0 && r.right <= innerWidth && r.bottom <= nav.bottom + 1) && document.documentElement.scrollWidth <= innerWidth
      })
      assert.equal(valid, true, `Nav visible sin solaparse: ${width}`)
      await page.screenshot({ path: require('node:path').join(require('node:os').tmpdir(), `nav-court-${width}.png`), fullPage: true })
      assert.deepEqual(errors, [])
      await page.close()
      console.log(`Nav y cancha OK: ${width}px`)
    }
  } finally { await browser.close() }
})().catch(e => { console.error(e); process.exitCode = 1 })
