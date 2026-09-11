const test = require('node:test')
const assert = require('node:assert/strict')
const bcrypt = require('bcryptjs')

process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret'

const dbPath = require.resolve('../src/config/db')
const mailerPath = require.resolve('../src/config/mailer')
const servicePath = require.resolve('../src/modules/auth/auth.service')

const loadService = (fakeDb) => {
  delete require.cache[servicePath]
  require.cache[dbPath] = { id: dbPath, filename: dbPath, loaded: true, exports: fakeDb }
  require.cache[mailerPath] = {
    id: mailerPath,
    filename: mailerPath,
    loaded: true,
    exports: { sendMail: async () => ({ messageId: 'test' }) },
  }
  return require(servicePath)
}

const passwordHash = bcrypt.hashSync('Secret123', 4)
const judgeRow = {
  id: 7,
  numero_documento: '1090512345',
  usuario: 'juan.perez',
  nombre: 'Juan',
  apellido: 'Pérez',
  email: 'juan@example.com',
  rol: 'juez',
  activo: 1,
  password: passwordHash,
}

test('ingreso general busca usuario, correo, celular y documento compatible sin escoger entre personas', async () => {
  for (const value of ['ana.garcia', 'ANA@example.com', '+57 3001234567']) {
    const service = loadService({ async query(sql, params) {
      assert.match(sql, /rol IN \('miembro', 'admin'\)/)
      assert.match(sql, /usuario = \? OR email = \? OR telefono_acceso = \? OR numero_documento = \?/)
      assert.match(sql, /LIMIT 2/)
      assert.equal(params[1], value.toLowerCase())
      assert.equal(params[2], value.startsWith('+57') ? '3001234567' : null)
      return [[{ ...judgeRow, rol: 'miembro' }]]
    } })
    assert.ok((await service.login({ identificador: value, tipo_acceso: 'general', password: 'Secret123' })).token)
  }
})
test('identificadores ambiguos de personas distintas no generan una sesión', async () => {
  const service = loadService({ query: async () => [[judgeRow, { ...judgeRow, id: 8 }]] })
  await assert.rejects(service.login({ identificador: '3001234567', tipo_acceso: 'general', password: 'Secret123' }), { status: 401 })
})
test('acceso de jueces solo consulta alias de juez o juez director', async () => {
  for (const role of ['juez', 'juez_director']) {
    const service = loadService({ async query(sql, params) {
      assert.match(sql, /rol IN \('juez', 'juez_director'\) AND usuario = \?/)
      assert.doesNotMatch(sql, /email =|telefono_acceso =|numero_documento =/)
      assert.deepEqual(params, ['juan.perez'])
      return [[{ ...judgeRow, rol: role }]]
    } })
    const result = await service.login({ identificador: 'juan.perez', tipo_acceso: 'juez', password: 'Secret123' })
    assert.equal(result.user.rol, role)
  }
})
test('modo nuevo rechaza cuenta fuera de su acceso o contraseña inválida sin conceder sesión', async () => {
  for (const mode of ['general', 'juez']) {
    for (const rows of [[], [judgeRow]]) {
      const service = loadService({ query: async () => [rows] })
      await assert.rejects(service.login({ identificador: 'juan.perez', tipo_acceso: mode, password: 'incorrecta' }), { status: 401 })
    }
  }
})

test('miembro inicia con celular y contraseña sin correo ni documento', async () => {
  const service = loadService({ async query(sql, params) {
    assert.match(sql, /telefono_acceso = \?/)
    assert.match(sql, /rol = 'miembro'/)
    assert.doesNotMatch(sql, /\bOR\b/)
    assert.deepEqual(params, ['3001234567'])
    return [[{ ...judgeRow, rol: 'miembro', email: null, numero_documento: null }]]
  } })
  const result = await service.login({ identificador: '+57 300 123 4567', tipo_acceso: 'celular', password: 'Secret123' })
  assert.equal(result.user.email, null)
  assert.ok(result.token)
})
test('miembro inicia por usuario sin documento, correo o celular', async () => {
  const service = loadService({ async query(sql, params) {
    assert.match(sql, /usuario = \?/)
    assert.deepEqual(params, ['ana.garcia'])
    return [[{ ...judgeRow, rol: 'miembro', usuario: 'ana.garcia', telefono: null, email: null, numero_documento: null }]]
  } })
  const result = await service.login({ identificador: 'ana.garcia', tipo_acceso: 'usuario', password: 'Secret123' })
  assert.equal(result.user.rol, 'miembro')
  assert.ok(result.token)
})
test('acceso celular no elige cuentas ambiguas ni acepta contraseña incorrecta', async () => {
  for (const rows of [[], [judgeRow, judgeRow], [judgeRow]]) {
    const service = loadService({ query: async () => [rows] })
    await assert.rejects(service.login({ identificador: '3001234567', tipo_acceso: 'celular', password: 'incorrecta' }), { status: 401 })
  }
})

test('juez director inicia sesión por alias y conserva su rol sin exponer la contraseña', async () => {
  const service = loadService({ async query() { return [[{ ...judgeRow, rol: 'juez_director' }]] } })
  const result = await service.login({ identificador: 'juan.perez', tipo_acceso: 'usuario', password: 'Secret123' })
  assert.equal(result.user.rol, 'juez_director')
  assert.ok(result.token)
  assert.equal(Object.hasOwn(result.user, 'password'), false)
})

for (const mode of ['documento', 'usuario']) {
  test(`acceso explícito por ${mode} no mezcla identificadores`, async () => {
    const service = loadService({ async query(sql, params) {
      assert.doesNotMatch(sql, /\bOR\b/)
      assert.match(sql, mode === 'documento' ? /numero_documento = \?/ : /usuario = \? AND rol IN \('miembro', 'juez', 'juez_director', 'admin'\)/)
      assert.deepEqual(params, ['12345'])
      return [[judgeRow]]
    } })
    assert.equal((await service.login({ identificador: '12345', password: 'Secret123', tipo_acceso: mode })).user.id, 7)
  })
}

test('acceso por usuario no cambia a documento si falta la columna', async () => {
  let calls = 0
  const service = loadService({ async query() { calls++; throw { code: 'ER_BAD_FIELD_ERROR' } } })
  await assert.rejects(service.login({ identificador: '12345', password: 'Secret123', tipo_acceso: 'usuario' }), error => error.status === 503)
  assert.equal(calls, 1)
})

test('rechaza modo de acceso desconocido', async () => {
  const service = loadService({ async query() { assert.fail('No debe consultar') } })
  await assert.rejects(service.login({ identificador: '12345', password: 'Secret123', tipo_acceso: 'otro' }), error => error.status === 400)
})

test('login por número de documento sigue funcionando', async () => {
  const calls = []
  const service = loadService({
    async query(sql, params) {
      calls.push({ sql, params })
      return [[judgeRow]]
    },
  })

  const result = await service.login({ identificador: '1090512345', password: 'Secret123' })
  assert.equal(result.user.id, 7)
  assert.equal(result.user.usuario, 'juan.perez')
  assert.ok(result.token)
  assert.equal(Object.hasOwn(result.user, 'password'), false)
  assert.match(calls[0].sql, /numero_documento = \?/)
  assert.match(calls[0].sql, /usuario = \? AND rol IN \('miembro', 'juez', 'juez_director', 'admin'\)/)
})

test('un juez puede iniciar sesión con su usuario', async () => {
  const service = loadService({
    async query(sql, params) {
      assert.equal(params[0], 'juan.perez')
      return [[judgeRow]]
    },
  })

  const result = await service.login({ identificador: 'juan.perez', password: 'Secret123' })
  assert.equal(result.user.id, 7)
})

test('login rechaza credenciales vacías con 400', async () => {
  const service = loadService({ async query() { return [[]] } })
  await assert.rejects(
    service.login({ identificador: '   ', password: 'Secret123' }),
    (error) => error.status === 400
  )
})

test('login con contraseña incorrecta responde 401', async () => {
  const service = loadService({ async query() { return [[judgeRow]] } })
  await assert.rejects(
    service.login({ identificador: 'juan.perez', password: 'otra-clave' }),
    (error) => error.status === 401
  )
})

test('login sin coincidencias responde 401', async () => {
  const service = loadService({ async query() { return [[]] } })
  await assert.rejects(
    service.login({ identificador: 'desconocido', password: 'Secret123' }),
    (error) => error.status === 401
  )
})

test('si falta la columna usuario, degrada a login solo por documento', async () => {
  const calls = []
  const service = loadService({
    async query(sql, params) {
      calls.push(sql)
      if (/usuario = \?/.test(sql)) {
        const err = new Error("Unknown column 'usuario' in 'where clause'")
        err.code = 'ER_BAD_FIELD_ERROR'
        throw err
      }
      assert.equal(params[0], '1090512345')
      return [[judgeRow]]
    },
  })

  const result = await service.login({ identificador: '1090512345', password: 'Secret123' })
  assert.equal(result.user.id, 7)
  assert.ok(calls.some((sql) => /usuario = \?/.test(sql)))
  assert.ok(calls.some((sql) => /numero_documento = \? AND activo = TRUE LIMIT 1/.test(sql)))
})
