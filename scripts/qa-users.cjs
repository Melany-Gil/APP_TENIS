// Mock API only: this check never contacts a real backend or database.
const { chromium } = require(process.argv[2] || 'playwright')
const assert = require('node:assert/strict')
const base = 'http://127.0.0.1:4175'
;(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true })
  try {
    for (const width of [360, 1280]) {
      const context = await browser.newContext({ viewport: { width, height: 850 } })
      const page = await context.newPage()
      const errors = [], writes = []
      const users = [
        { id: 1, nombre: 'Admin', apellido: 'Prueba', numero_documento: '123456', email: 'admin@example.test', rol: 'admin', activo: true },
        { id: 2, nombre: 'Juez', apellido: 'Prueba', numero_documento: '987654', email: 'juez@example.test', usuario: 'juez.p', rol: 'juez', activo: true },
      ]
      page.on('pageerror', (err) => errors.push(err.message))
      await page.addInitScript(() => localStorage.setItem('auth-storage-v2', JSON.stringify({ state: { isAuthenticated: true, user: { id: 1, rol: 'admin', nombre: 'Admin', apellido: 'Prueba' } }, version: 0 })))
      await page.route('**/*', async (route) => {
        const req = route.request(), url = new URL(req.url())
        if (url.pathname.startsWith('/api/')) {
          const path = url.pathname.replace('/api', '')
          if (path === '/health') return route.fulfill({ status: 503, body: '{}' })
          let data = []
          if (req.method() === 'PUT' && path.endsWith('/avatar')) {
            assert.match(req.headers()['content-type'], /multipart\/form-data/)
            writes.push({ path })
            data = { ...users[1], avatar: null }
          } else if (req.method() === 'POST' && path === '/users') {
            const body = req.postDataJSON(); writes.push({ path, body })
            users.push({ ...body, id: users.length + 1, activo: true, acceso_celular: false })
            data = users.at(-1)
          } else if (req.method() === 'PUT') {
            const body = req.postDataJSON(); writes.push({ path, body })
            if (path === '/users/2') Object.assign(users[1], body)
            if (path === '/users/2/estado') users[1].activo = body.activo
          } else if (req.method() === 'DELETE') {
            writes.push({ path })
            return route.fulfill({ status: 409, contentType: 'application/json', body: JSON.stringify({ message: 'La cuenta tiene partidos asignados. Puedes desactivarla para conservar su historial.' }) })
          } else if (path === '/users') data = users
          else if (path === '/users/me') data = users[0]
          else if (path === '/jugadores/gestion') data = [{ id: 7, nombre: 'Existente', apellido: 'Jugador', deporte: 'tenis', activo: true, usuario: null }, { id: 8, nombre: 'Ya', apellido: 'Vinculado', deporte: 'tenis', activo: true, usuario: { id: 90 } }]
          else if (path === '/categorias') data = [{ id: 1, nombre: 'Tercera', deporte: 'tenis' }]
          return route.fulfill({ contentType: 'application/json', body: JSON.stringify({ ok: true, data }) })
        }
        if (url.origin === base) return route.continue()
        return route.abort()
      })
      await page.clock.install()
      await page.goto(`${base}/admin/usuarios`)
      await page.getByRole('heading', { name: 'Usuarios / Miembros' }).waitFor()
      await page.getByRole('button', { name: 'Nuevo usuario' }).click()
      await page.getByLabel('Nombres', { exact: true }).fill('Nueva')
      await page.getByLabel('Apellidos', { exact: true }).fill('Miembro')
      await page.locator('form').getByLabel('Usuario de acceso', { exact: false }).fill('nueva.miembro')
      await page.getByLabel('Contraseña temporal').fill('PruebaSegura456')
      await page.getByLabel('Vinculación de jugador').selectOption('nuevo')
      await page.getByLabel('Deporte del jugador').selectOption('tenis')
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, 'Formulario nuevo sin desbordamiento')
      await page.screenshot({ path: require('node:path').join(require('node:os').tmpdir(), `member-player-${width}.png`), fullPage: true })
      await page.getByRole('button', { name: 'Crear usuario', exact: true }).click()
      await page.locator('[aria-label="Acciones de Nueva Miembro"]').waitFor()
      assert.equal(writes.at(-1).body.email, '')
      assert.equal(writes.at(-1).body.numero_documento, '')
      assert.equal(writes.at(-1).body.telefono, '')
      assert.equal(writes.at(-1).body.jugador.modo, 'nuevo')
      await page.getByRole('button', { name: 'Nuevo usuario' }).click()
      await page.getByLabel('Vinculación de jugador').selectOption('existente')
      await page.getByLabel('Jugador disponible').selectOption('7')
      assert.equal(await page.getByLabel('Nombres', { exact: true }).inputValue(), 'Existente')
      assert.equal(await page.getByLabel('Jugador disponible').locator('option[value="8"]').count(), 0)
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, 'Selector de jugador sin desbordamiento')
      await page.locator('form').getByLabel('Usuario de acceso', { exact: false }).fill('existente.jugador')
      await page.getByLabel('Contraseña temporal').fill('PruebaSegura456')
      await page.getByRole('button', { name: 'Crear usuario', exact: true }).click()
      await page.locator('[aria-label="Acciones de Existente Jugador"]').waitFor()
      assert.equal(writes.at(-1).body.jugador.id, '7')
      const actions = () => page.locator('[aria-label="Acciones de Juez Prueba"]')
      await actions().getByRole('button', { name: 'Foto de perfil', exact: true }).click()
      await page.getByRole('dialog').locator('input[type=file]').setInputFiles({ name: 'avatar.png', mimeType: 'image/png', buffer: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jg9sAAAAASUVORK5CYII=', 'base64') })
      await page.getByRole('dialog').getByRole('button', { name: 'Guardar cambios' }).click()
      await page.getByRole('dialog').waitFor({ state: 'detached' })
      assert.equal(writes.at(-1).path, '/users/2/avatar')
      await actions().getByRole('button', { name: 'Editar datos', exact: true }).click()
      let dialog = page.getByRole('dialog')
      await dialog.getByLabel('Teléfono (opcional)').fill('3001234567')
      await dialog.getByRole('button', { name: 'Guardar cambios' }).click()
      await dialog.waitFor({ state: 'detached' })
      assert.equal(writes.at(-1).body.telefono, '3001234567')
      await actions().getByRole('button', { name: 'Restablecer contraseña' }).click()
      dialog = page.getByRole('dialog')
      await dialog.getByLabel('Nueva contraseña').fill('PruebaSegura456')
      await dialog.getByLabel('Repetir contraseña').fill('PruebaSegura456')
      await dialog.getByRole('button', { name: 'Guardar cambios' }).click()
      await dialog.waitFor({ state: 'detached' })
      assert.equal(writes.at(-1).path, '/users/2/password')
      await actions().getByRole('button', { name: 'Desactivar', exact: true }).click()
      await page.getByRole('dialog').getByRole('button', { name: 'Desactivar', exact: true }).click()
      await page.getByText('Cuenta inactiva', { exact: false }).waitFor({ state: 'hidden' })
      await page.getByLabel('Estado de las cuentas').selectOption('todos')
      await actions().getByRole('button', { name: 'Reactivar', exact: true }).click()
      await page.getByRole('dialog').getByRole('button', { name: 'Reactivar', exact: true }).click()
      await actions().getByRole('button', { name: 'Desactivar', exact: true }).waitFor()
      await actions().getByRole('button', { name: 'Eliminar', exact: true }).click()
      dialog = page.getByRole('dialog')
      await dialog.locator('input').fill('Juez Prueba')
      await dialog.getByRole('button', { name: 'Eliminar cuenta' }).click()
      await page.getByRole('heading', { name: 'No se puede eliminar' }).waitFor()
      await page.getByRole('button', { name: 'Entendido' }).click()
      assert.equal(await page.locator('[aria-label="Acciones de Admin Prueba"]').getByRole('button', { name: 'Eliminar', exact: true }).isDisabled(), true)
      // Force several health retries with virtual time; the authenticated page must remain.
      await page.clock.runFor(180000)
      assert.match(page.url(), /\/admin\/usuarios$/)
      assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('auth-storage-v2')).state.isAuthenticated), true)
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false)
      assert.deepEqual(errors, [])
      await page.screenshot({ path: require('node:path').join(require('node:os').tmpdir(), `users-${width}.png`), fullPage: true })
      console.log(`Usuarios ${width}px: alias, jugador nuevo/existente, foto, edición, contraseña, estado y sesión OK`)
      await context.close()
    }
    const context = await browser.newContext({ viewport: { width: 360, height: 850 } })
    const page = await context.newPage()
    let credentials
    await page.route('**/*', async (route) => {
      const url = new URL(route.request().url())
      if (url.pathname.startsWith('/api/')) {
        const member = { id: 3, rol: 'miembro', nombre: 'Nueva', apellido: 'Miembro', usuario: 'nueva.miembro', telefono: null, email: null, numero_documento: null }
        let data = []
        if (url.pathname.endsWith('/auth/login')) { credentials = route.request().postDataJSON(); data = { user: member } }
        if (url.pathname.endsWith('/users/me')) data = member
        return route.fulfill({ contentType: 'application/json', body: JSON.stringify({ ok: true, data }) })
      }
      if (url.origin === base) return route.continue()
      return route.abort()
    })
    await page.goto(`${base}/login`)
    assert.equal(await page.getByRole('radio').count(), 0)
    await page.getByRole('button', { name: 'Ingresar como juez', exact: true }).click()
    assert.equal(page.url(), `${base}/login`)
    await page.getByPlaceholder('Ingresa tu nombre de usuario').fill('juez.prueba')
    await page.getByLabel('Contraseña', { exact: true }).fill('PruebaSegura456')
    await page.getByRole('button', { name: 'Volver al ingreso general' }).click()
    assert.equal(await page.getByPlaceholder('Ingresa tu usuario, correo o celular').inputValue(), '')
    assert.equal(await page.getByLabel('Contraseña', { exact: true }).inputValue(), '')
    await page.getByPlaceholder('Ingresa tu usuario, correo o celular').fill('nueva.miembro')
    await page.getByLabel('Contraseña', { exact: true }).fill('PruebaSegura456')
    await page.getByRole('button', { name: 'Iniciar sesión', exact: true }).click()
    await page.waitForURL(`${base}/`)
    assert.equal(credentials.tipo_acceso, 'general')
    assert.equal(credentials.identificador, 'nueva.miembro')
    console.log('Ingreso unificado y cambio de modo juez en la misma página: OK')
    await context.close()
  } finally { await browser.close() }
})().catch((err) => { console.error(err); process.exitCode = 1 })
