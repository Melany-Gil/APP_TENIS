const test = require('node:test')
const assert = require('node:assert/strict')
const bcrypt = require('bcryptjs')
const dbPath = require.resolve('../src/config/db')
const uploadPath = require.resolve('../src/middlewares/upload.middleware')
function load(module, db) {
  require.cache[dbPath] = { id: dbPath, filename: dbPath, loaded: true, exports: db }
  const key = require.resolve(module); delete require.cache[key]; return require(key)
}
test('contraseña: valida antes de consultar y revoca sesiones/códigos al confirmar', async () => {
  const calls = []
  const hash = await bcrypt.hash('Anterior123', 4)
  const conn = { beginTransaction: async () => calls.push('begin'), commit: async () => calls.push('commit'), rollback: async () => calls.push('rollback'), release: () => calls.push('release'), query: async sql => { calls.push(sql); return [{ affectedRows: 1 }] } }
  const svc = load('../src/modules/users/users.service', { query: async () => [[{ password: hash }]], getConnection: async () => conn })
  await assert.rejects(svc.changePassword(1, 'Anterior123', 'corta'), e => e.status === 400)
  assert.equal(calls.length, 0)
  await assert.rejects(svc.changePassword(1, 'Incorrecta', 'NuevaSegura456'), e => e.status === 400)
  assert.equal(calls.length, 0)
  await svc.changePassword(1, 'Anterior123', 'NuevaSegura456')
  assert.ok(calls.some(x => x.includes('session_version = session_version + 1')))
  assert.ok(calls.some(x => x.includes('UPDATE password_resets')))
  assert.deepEqual(calls.slice(-2), ['commit', 'release'])
})
test('avisos: edición conserva ID y elimina la imagen anterior solo tras commit', async () => {
  const calls = []
  require.cache[uploadPath] = { id: uploadPath, filename: uploadPath, loaded: true, exports: { deleteUpload: p => calls.push(`delete:${p}`) } }
  const conn = { beginTransaction: async () => {}, commit: async () => calls.push('commit'), rollback: async () => {}, release: () => {}, query: async (sql, values) => { calls.push(sql); if (sql.startsWith('SELECT')) return [[{ imagen_url: '/uploads/anuncios/old.webp' }]]; assert.equal(values.at(-1), 6); return [{}] } }
  const svc = load('../src/modules/news/news.service', { getConnection: async () => conn })
  await svc.update(6, { titulo: 'Aviso', contenido: 'Contenido', tipo: 'noticia', imagen_url: '/uploads/anuncios/new.webp' })
  assert.ok(calls.findIndex(x => x === 'commit') < calls.findIndex(x => x.startsWith('delete:')))
  assert.equal(calls.some(x => x.includes('DELETE FROM') || x.includes('INSERT INTO')), false)
  await assert.rejects(svc.update(6, { titulo: '', contenido: 'x' }), e => e.status === 400)
})
test('auditoría: valida cursor y limita la lectura de eventos', async () => {
  let count = 0
  const svc = load('../src/modules/matches/matchAudit.service', { query: async (sql, values) => {
    count++
    if (sql.includes('SELECT id FROM partidos')) return [[{ id: 2 }]]
    if (sql.includes('FROM eventos_partido')) { assert.match(sql, /LIMIT 101/); assert.deepEqual(values, [2, 10]); return [Array.from({ length: 101 }, (_, n) => ({ secuencia: n + 11 }))] }
    return [[]]
  } })
  await assert.rejects(svc.getAudit('bad'), e => e.status === 400)
  assert.equal(count, 0)
  const data = await svc.getAudit(2, 10)
  assert.equal(data.eventos.length, 100)
  assert.equal(data.siguiente, 110)
})
