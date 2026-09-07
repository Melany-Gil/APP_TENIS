// Local-only browser check. All API requests are intercepted with fixtures;
// no production service or database is contacted. Pass Playwright module path.
const { chromium } = require(process.argv[2] || 'playwright')
const assert = require('node:assert/strict')
const path = require('node:path')
const os = require('node:os')
const { createInitialState, applyEvent, serializeState } = require('../scores-api/src/modules/matches/score.engine')

;(async () => {
  const browser = await chromium.launch({ headless: true, channel: 'chrome' })
  try {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } })
    const failures = []
    page.on('pageerror', error => failures.push(error.message))
    const user = { id: 12, rol: 'juez', nombre: 'Juez', apellido: 'Prueba' }
    let match = { id: 30, juez_id: 12, modalidad: 'singles', estado: 'en_vivo', jugador1: { nombre: 'Carlos', apellido: 'Rodríguez' }, jugador2: { nombre: 'Andrés', apellido: 'Martínez' }, cancha: { nombre: 'Cancha 1' }, formato: { mejor_de_sets: 3, juegos_por_set: 6 } }
    let state = createInitialState(), events = [], snapshots = [], posts = 0, reads = 0, drop = false
    let paused = false
    const control = () => ({ partido: match, marcador: serializeState(state), eventos_recientes: events, en_vivo: { iniciado_at: new Date().toISOString(), pausado_at: paused ? new Date().toISOString() : null, segundos_pausa: 0 } })
    await page.addInitScript((user) => localStorage.setItem('auth-storage-v2', JSON.stringify({ state: { isAuthenticated: true, user }, version: 0 })), user)
    await page.route('**/*', async route => {
      const req = route.request(), url = new URL(req.url())
      if (url.pathname.startsWith('/api/')) {
        const endpoint = url.pathname.replace('/api', '')
        let data
        if (endpoint.endsWith('/stream')) return route.fulfill({ status: 200, contentType: 'text/event-stream', body: ': fixture\n\n' })
        if (endpoint === '/partidos/gestion/mis-partidos') data = [match]
        else if (endpoint.endsWith('/control')) { reads++; data = control() }
        else if (endpoint.endsWith('/eventos')) {
          posts++
          const event = req.postDataJSON()
          snapshots.push(structuredClone(state))
          state = applyEvent(state, event)
          events.unshift({ id: posts, secuencia: posts, ...event })
          if (drop) { drop = false; return route.abort('failed') }
          await new Promise(resolve => setTimeout(resolve, 200))
          data = control()
        } else if (endpoint.endsWith('/deshacer')) { state = snapshots.pop(); events.shift(); data = control() }
        else if (endpoint.endsWith('/pausa')) { paused = req.postDataJSON().pausado; data = control() }
        else if (endpoint.endsWith('/estadisticas')) data = { estadisticas: { jugador1: { puntos_ganados: 1 }, jugador2: { puntos_ganados: 1 } }, total_sets: 1 }
        else if (endpoint === '/users/me') data = user
        else data = {}
        return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, data }) })
      }
      if (url.hostname !== '127.0.0.1') return route.abort()
      return route.continue()
    })
    await page.goto('http://127.0.0.1:4173/sponsors')
    await page.waitForURL('**/juez')
    await page.getByRole('button', { name: /Carlos Rodríguez.*Andrés Martínez/ }).click()
    await page.locator('.judge-point').first().waitFor()
    for (const [width, height] of [[390,844], [360,640], [320,568], [1440,900]]) {
      await page.setViewportSize({ width, height })
      const metrics = await page.evaluate(() => ({ height: document.documentElement.scrollHeight, width: document.documentElement.scrollWidth, viewport: innerHeight, bottom: document.querySelector('.judge-bottom-controls').getBoundingClientRect().bottom }))
      console.log('layout', width, height, metrics)
      assert.ok(metrics.width <= width, 'No horizontal overflow')
      assert.ok(metrics.bottom <= height, 'All primary controls visible without scrolling')
    }
    await page.setViewportSize({ width: 390, height: 844 })
    const initialReads = reads
    await page.locator('.judge-point').first().evaluate(button => { button.click(); button.click() })
    await page.waitForFunction(() => document.querySelector('.judge-points').textContent === '15')
    assert.equal(posts, 1, 'Double tap writes once')
    assert.equal(reads, initialReads, 'Point response does not trigger an extra control read')
    await page.getByRole('button', { name: '1ª falta · sin punto' }).click()
    await page.getByRole('button', { name: 'Doble falta · punto al receptor' }).waitFor()
    await page.getByRole('button', { name: 'Let / repetir' }).click()
    await page.waitForFunction(() => document.querySelector('.judge-feedback').textContent.includes('Let'))
    assert.equal(state.serviceAttempt, 2, 'Let preserves second serve')
    await page.getByRole('button', { name: 'Doble falta · punto al receptor' }).click()
    await page.getByRole('button', { name: '1ª falta · sin punto' }).waitFor()
    assert.deepEqual(state.points, [1, 1])
    await page.getByRole('checkbox', { name: /Registrar motivo/ }).check()
    await page.locator('.judge-point').nth(1).click()
    assert.equal(await page.getByRole('button', { name: /^Ace/ }).isDisabled(), true)
    await page.getByRole('button', { name: /^Error del rival/ }).click()
    await page.waitForFunction(() => !document.querySelector('dialog'))
    assert.equal(events[0].motivo, 'error_no_forzado')
    await page.getByRole('button', { name: 'Pausar', exact: true }).click()
    await page.getByRole('button', { name: 'Reanudar', exact: true }).waitFor()
    assert.equal(await page.locator('.judge-point').first().isDisabled(), true)
    await page.getByRole('button', { name: 'Reanudar', exact: true }).click()
    await page.getByRole('button', { name: 'Pausar', exact: true }).waitFor()
    await page.getByRole('button', { name: 'Deshacer', exact: true }).click()
    await page.getByRole('button', { name: 'Deshacer', exact: true }).last().click()
    await page.waitForFunction(() => document.querySelectorAll('.judge-points')[1].textContent === '15')
    await page.getByRole('checkbox', { name: /Registrar motivo/ }).uncheck()
    drop = true
    await page.locator('.judge-point').first().click()
    await page.getByRole('alert').waitFor()
    assert.equal(await page.locator('.judge-point').first().isDisabled(), true)
    const postFailure = posts
    await page.getByRole('button', { name: 'Sincronizar marcador' }).click()
    await page.waitForFunction(() => document.querySelector('.judge-points').textContent === '30')
    assert.equal(posts, postFailure, 'No automatic retry after lost response')
    await page.screenshot({ path: path.join(os.tmpdir(), 'tenis-judge-mobile.png') })
    await page.getByRole('button', { name: 'Estadísticas', exact: true }).click()
    await page.getByRole('heading', { name: 'Estadísticas y últimas acciones' }).waitFor()
    await page.getByRole('button', { name: 'Cerrar panel' }).click()
    await page.getByRole('link', { name: 'Mi perfil', exact: true }).click()
    await page.getByRole('heading', { name: 'Mi perfil', exact: true }).waitFor()
    assert.equal(await page.locator('.sponsor-dock').count(), 0)
    assert.equal(await page.getByRole('heading', { name: 'Mis partidos', exact: true }).count(), 0)
    for (const route of ['/pantalla', '/', '/admin', '/settings']) {
      await page.goto(`http://127.0.0.1:4173${route}`)
      await page.waitForURL('**/juez')
    }
    assert.deepEqual(failures, [])
    console.log('PASS: judge mobile layout, scoring, faults, let, undo, pause, network recovery and restricted routes')
    console.log('Screenshot:', path.join(os.tmpdir(), 'tenis-judge-mobile.png'))
  } finally { await browser.close() }
})().catch(error => { console.error(error); process.exitCode = 1 })
