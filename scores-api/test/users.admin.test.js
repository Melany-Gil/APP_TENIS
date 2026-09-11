const test = require('node:test')
const assert = require('node:assert/strict')
const bcrypt = require('bcryptjs')
let queries, target, admins, counts, duplicate
const conn = {
  async beginTransaction() { queries.push('begin') },
  async commit() { queries.push('commit') },
  async rollback() { queries.push('rollback') },
  release() { queries.push('release') },
  async query(sql, values) {
    queries.push({ sql, values })
    if (sql.includes("rol = 'admin'")) return [admins]
    if (sql.includes('SELECT id, rol, activo')) return [target ? [target] : []]
    if (sql.includes('information_schema.KEY_COLUMN_USAGE')) return [[{ tabla: 'partidos', columna: 'juez_id' }, { tabla: 'jugadores', columna: 'user_id' }]]
    if (sql.includes('COUNT(*)')) return [[{ total: Object.entries(counts).find(([table]) => sql.includes('`' + table + '`'))?.[1] || 0 }]]
    if (sql.startsWith('SELECT id FROM users')) return [[]]
    if (sql.startsWith('SELECT id, telefono FROM users')) return [[]]
    if (/^(UPDATE|DELETE)/.test(sql)) {
      if (duplicate) throw { code: 'ER_DUP_ENTRY' }
      return [{ affectedRows: 1 }]
    }
    throw new Error(`Unexpected SQL: ${sql}`)
  },
}
const dbPath = require.resolve('../src/config/db')
require.cache[dbPath] = { id: dbPath, filename: dbPath, loaded: true, exports: { getConnection: async () => conn } }
const service = require('../src/modules/users/users.admin.service')
test.beforeEach(() => { queries = []; target = { id: 2, rol: 'juez', activo: 1, numero_documento: '12345', email: 'test@example.test' }; admins = [{ id: 1 }]; counts = {}; duplicate = false })
const writes = () => queries.filter((q) => /^(UPDATE|DELETE)/.test(q.sql || ''))

test('elimina una cuenta sin historial después de comprobar relaciones y autoría de fotos', async () => {
  await service.remove(2, 1)
  assert.equal(writes().at(-1).sql, 'DELETE FROM users WHERE id = ?')
  assert.ok(writes().some((q) => q.sql === 'DELETE FROM password_resets WHERE user_id = ?'))
  assert.ok(queries.some((q) => q.sql?.includes('`fotos_partido`')))
  assert.ok(queries.indexOf('commit') > queries.findIndex((q) => q.sql?.startsWith('DELETE')))
})
test('bloquea eliminación con explicación, sin borrar partidos ni jugadores', async () => {
  counts = { partidos: 3, jugadores: 1, fotos_partido: 2 }
  await assert.rejects(service.remove(2, 1), (err) => err.status === 409 && /3 partidos asignados/.test(err.message) && /2 fotografías/.test(err.message) && /desactivarla/.test(err.message))
  assert.equal(writes().length, 0)
  assert.ok(queries.includes('rollback'))
})
test('no permite eliminar, desactivar o degradar la cuenta propia', async () => {
  target = { id: 1, rol: 'admin', activo: 1 }
  for (const call of [() => service.remove(1, 1), () => service.setActive(1, 1, false), () => service.updateRole(1, 1, 'miembro')]) await assert.rejects(call, { status: 400 })
  assert.equal(writes().length, 0)
})
test('vuelve a comprobar el administrador dentro de la transacción', async () => {
  admins = [{ id: 9 }]
  await assert.rejects(service.remove(2, 1), { status: 403 })
  assert.equal(writes().length, 0)
})
test('no permite dejar la plataforma sin administrador activo', async () => {
  target = { id: 2, rol: 'admin', activo: 1 }
  await assert.rejects(service.setActive(2, 1, false), { status: 409 })
  assert.equal(writes().length, 0)
})
test('desactiva y reactiva sin borrar historial y revoca sesiones anteriores', async () => {
  await service.setActive(2, 1, false)
  target.activo = 0
  await service.setActive(2, 1, true)
  assert.deepEqual(writes().map((q) => q.values), [[false, 2], [true, 2]])
  assert.ok(writes().every((q) => q.sql.includes('session_version = session_version + 1')))
})
test('solo admite estados booleanos y roles válidos', async () => {
  await assert.rejects(service.setActive(2, 1, 'false'), { status: 400 })
  await assert.rejects(service.updateRole(2, 1, 'superuser'), { status: 400 })
  assert.equal(writes().length, 0)
})
test('cambio de rol invalida tokens y bloquea administradores en orden estable', async () => {
  await service.updateRole(2, 1, 'admin')
  assert.match(queries[1].sql, /ORDER BY id FOR UPDATE/)
  assert.match(writes()[0].sql, /session_version/)
})
test('restablece contraseña con hash y revoca sesiones, sin devolverla', async () => {
  const result = await service.resetPassword(2, 1, 'PruebaSegura456')
  const write = writes()[0]
  assert.equal(await bcrypt.compare('PruebaSegura456', write.values[0]), true)
  assert.match(write.sql, /session_version/)
  assert.doesNotMatch(JSON.stringify(result), /PruebaSegura|password/)
  assert.ok(writes().some((q) => q.sql.includes('UPDATE password_resets SET used')))
})
test('rechaza contraseñas débiles o demasiado largas', async () => {
  for (const password of ['abc', 'nouppercase123', 'A'.repeat(73) + '1']) await assert.rejects(service.resetPassword(2, 1, password), { status: 400 })
  assert.equal(writes().length, 0)
})
test('administrador puede restablecer su propia contraseña y revocar sus sesiones', async () => {
  target = { id: 1, rol: 'admin', activo: 1 }
  await service.resetPassword(1, 1, 'PruebaSegura123')
  assert.match(writes()[0].sql, /session_version/)
})
test('edita miembro sin documento ni correo guardando NULL y celular normalizado', async () => {
  target.rol = 'miembro'
  await service.update(2, 1, { nombre: 'Ana', apellido: 'García', telefono: '+57 300 123 4567' })
  assert.deepEqual(writes()[0].values.slice(2), [null, null, '+57 300 123 4567', null, '3001234567', 2])
})
test('edita identidad sin permitir asignación masiva de permisos', async () => {
  const input = { nombre: ' Ana ', apellido: 'García', numero_documento: '123456', email: 'ana@example.test', telefono: '', usuario: 'ana.g', rol: 'admin', activo: false }
  await service.update(2, 1, input)
  assert.equal(writes()[0].values[0], 'Ana')
  assert.doesNotMatch(writes()[0].sql, /rol|activo|password/)
  duplicate = true
  await assert.rejects(service.update(2, 1, input), { status: 409 })
})
test('responde 404 para cuenta inexistente y 400 para identificador inválido', async () => {
  target = null
  await assert.rejects(service.remove(99, 1), { status: 404 })
  await assert.rejects(service.remove('1 OR 1', 1), { status: 400 })
})
