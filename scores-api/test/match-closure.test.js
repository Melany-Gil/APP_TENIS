const test = require('node:test')
const assert = require('node:assert/strict')
const { configurationOf } = require('../src/modules/matches/eventDelivery')

test('cierre protege permisos, versión, motivo, ganador y cruces; conserva puntos', async () => {
  const calls = []
  const match = { id: 1, estado: 'en_vivo', juez_id: 3, jugador1_id: 10, jugador2_id: 11, control_version: 2 }
  let dependent = false
  let played = true
  let failInsert = false
  const conn = {
    async beginTransaction() {}, async commit() { calls.push(['commit']) },
    async rollback() { calls.push(['rollback']) }, release() {},
    async query(sql, params) {
      calls.push([sql, params])
      if (sql.startsWith('SELECT * FROM partidos')) return [[match]]
      if (sql.includes('MAX(secuencia)')) return [[{ sequence: 4, active: 4 }]]
      if (sql.includes('AS has_history')) return [dependent ? [{ estado: 'en_vivo', has_history: 1 }] : []]
      if (sql.includes('AS has_points')) return [[{ has_points: played ? 1 : 0, has_score: 0 }]]
      if (failInsert && sql.includes('INSERT INTO sets_partido')) throw new Error('Simulated insert failure')
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
  played = false
  for (const ganador of ['jugador1', 'jugador2']) {
    calls.length = 0
    await service.walkover(1, { ...body, ganador, retirado: ganador === 'jugador1' ? 'jugador2' : 'jugador1' }, user)
    const insert = calls.find(([sql]) => sql.includes('INSERT INTO sets_partido'))
    assert.deepEqual(insert[1], ganador === 'jugador1' ? [1, 6, 0, 1, 6, 0] : [1, 0, 6, 1, 0, 6])
    const update = calls.find(([sql]) => sql.startsWith('UPDATE partidos'))
    assert.ok(!update[1][1].includes(body.motivo), 'Private reason belongs only in audit')
  }
  calls.length = 0
  failInsert = true
  await assert.rejects(service.walkover(1, body, user), /Simulated insert failure/)
  assert.equal(calls.at(-1)[0], 'rollback')
  failInsert = false
  calls.length = 0
  await service.walkover(1, { ...body, tipo_incidencia: 'Retiro por lesión física' }, user)
  assert.ok(!calls.some(([sql]) => /DELETE|INSERT INTO sets_partido/.test(sql)))
  calls.length = 0
  await service.walkover(1, { ...body, ganador: null, retirado: 'ambos' }, user)
  assert.ok(!calls.some(([sql]) => /DELETE|INSERT INTO sets_partido/.test(sql)))
  const audit = calls.find(([sql]) => sql.includes('INSERT INTO auditoria_control'))
  assert.equal(JSON.parse(audit[1][2]).retirado, 'ambos')
  calls.length = 0
  await service.cancelMatch(1, body, user)
  assert.ok(calls.some(([sql, params]) => sql.includes('WHERE origen_partido1_id') && params[0] === null))
  assert.equal(calls.at(-1)[0], 'commit')
})
