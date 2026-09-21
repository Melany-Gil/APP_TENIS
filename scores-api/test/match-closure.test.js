const test = require('node:test')
const assert = require('node:assert/strict')
const { configurationOf } = require('../src/modules/matches/eventDelivery')

test('cierre protege permisos, versión, motivo, ganador y cruces; conserva puntos', async () => {
  const calls = []
  const match = { id: 1, estado: 'en_vivo', juez_id: 3, jugador1_id: 10, jugador2_id: 11, control_version: 2 }
  let dependent = false
  const conn = {
    async beginTransaction() {}, async commit() { calls.push(['commit']) },
    async rollback() { calls.push(['rollback']) }, release() {},
    async query(sql, params) {
      calls.push([sql, params])
      if (sql.startsWith('SELECT * FROM partidos')) return [[match]]
      if (sql.includes('MAX(secuencia)')) return [[{ sequence: 4, active: 4 }]]
      if (sql.includes('AS has_history')) return [dependent ? [{ estado: 'en_vivo', has_history: 1 }] : []]
      return [{ affectedRows: 1 }]
    },
  }
  const dbPath = require.resolve('../src/config/db')
  require.cache[dbPath] = { id: dbPath, filename: dbPath, loaded: true, exports: { getConnection: async () => conn } }
  const service = require('../src/modules/matches/match-events.service')
  service.getControl = async () => ({ ok: true })
  const user = { id: 3, rol: 'juez' }
  const body = { expected_control_version: 2, expected_revision: '4:4', expected_configuration: configurationOf(match), ganador: 'jugador1', retirado: 'jugador2', motivo: 'No se presentó' }
  await assert.rejects(service.walkover(1, body, { id: 9, rol: 'juez' }), e => e.status === 403)
  for (const change of [{ expected_control_version: 1 }, { expected_revision: '3:3' }, { expected_configuration: 'old' }])
    await assert.rejects(service.walkover(1, { ...body, ...change }, user), e => e.status === 409)
  for (const change of [{ motivo: 'a' }, { motivo: 'x'.repeat(501) }, { retirado: 'jugador1' }, { retirado: 'ambos' }, { persona_retirada: {} }])
    await assert.rejects(service.walkover(1, { ...body, ...change }, user), e => e.status === 400)
  dependent = true
  await assert.rejects(service.walkover(1, body, user), e => e.status === 409)
  dependent = false
  calls.length = 0
  await service.walkover(1, body, user)
  assert.ok(calls.some(([sql]) => sql.includes('control_version = control_version + 1')))
  assert.ok(calls.some(([sql, params]) => sql.includes('WHERE origen_partido1_id') && params[0] === 10))
  assert.ok(!calls.some(([sql]) => /DELETE|INSERT INTO eventos_partido|INSERT INTO sets_partido/.test(sql)))
  assert.equal(calls.at(-1)[0], 'commit')
  calls.length = 0
  await service.walkover(1, { ...body, ganador: null, retirado: 'ambos' }, user)
  const audit = calls.find(([sql]) => sql.includes('INSERT INTO auditoria_control'))
  assert.equal(JSON.parse(audit[1][2]).retirado, 'ambos')
  calls.length = 0
  await service.cancelMatch(1, body, user)
  assert.ok(calls.some(([sql, params]) => sql.includes('WHERE origen_partido1_id') && params[0] === null))
  assert.equal(calls.at(-1)[0], 'commit')
})
