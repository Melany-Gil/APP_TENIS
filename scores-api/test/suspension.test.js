const test = require('node:test')
const assert = require('node:assert/strict')

test('suspensión valida motivo, conserva marcador y audita en la transacción', async () => {
  const calls = []
  let paused = false
  const conn = {
    async beginTransaction() {}, async commit() { calls.push(['commit']) },
    async rollback() { calls.push(['rollback']) }, release() {},
    async query(sql, params) {
      calls.push([sql, params])
      if (sql.startsWith('SELECT * FROM partidos')) return [[{ id: 1, estado: 'en_vivo', juez_id: 3 }]]
      if (sql.startsWith('SELECT pausado_at')) return [[{ pausado_at: paused ? new Date() : null }]]
      return [{ affectedRows: 1 }]
    },
  }
  const dbPath = require.resolve('../src/config/db')
  require.cache[dbPath] = { id: dbPath, filename: dbPath, loaded: true, exports: { getConnection: async () => conn } }
  const service = require('../src/modules/matches/match-events.service')
  service.getControl = async () => ({ ok: true })
  const user = { id: 3, rol: 'juez' }
  for (const reason of ['', '    ', 'a', null, 123, 'a'.repeat(501)]) {
    await assert.rejects(service.setPaused(1, true, user, reason), e => e.status === 400)
  }
  await assert.rejects(service.setPaused(1, 'false', user), e => e.status === 400)
  assert.equal(calls.length, 0)
  await service.setPaused(1, true, user, '  Lluvia intensa  ')
  const audit = calls.find(([sql]) => sql.startsWith('INSERT INTO auditoria_control'))
  assert.equal(audit[1][2], 'suspender')
  assert.equal(JSON.parse(audit[1][3]).motivo, 'Lluvia intensa')
  assert.ok(calls.some(([sql]) => sql.includes('SET pausado_at = NOW()')))
  assert.ok(!calls.some(([sql]) => /UPDATE partidos|INSERT INTO eventos_partido|DELETE/.test(sql)))
  paused = true
  await service.setPaused(1, false, user)
  assert.ok(calls.some(([sql, params]) => sql.startsWith('INSERT INTO auditoria_control') && params[2] === 'reanudar'))
  assert.ok(calls.some(([sql]) => sql.includes('TIMESTAMPDIFF')))
  await assert.rejects(service.setPaused(1, true, { id: 9, rol: 'juez' }, 'Lluvia intensa'), e => e.status === 403)
  assert.equal(calls.at(-1)[0], 'rollback')
})
