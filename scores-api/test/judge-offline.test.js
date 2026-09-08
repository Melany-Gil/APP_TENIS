const test = require('node:test')
const assert = require('node:assert/strict')
const { createInitialState, applyEvent, serializeState } = require('../src/modules/matches/score.engine')
const modules = async () => ({
  ...(await import('../../scores-app/src/utils/judgeSession.js')),
  ...(await import('../../scores-app/src/utils/judgeState.js')),
  ...(await import('../../scores-app/src/utils/projectJudgeEvent.js')),
})
const memory = () => { const values = new Map(); return { getItem: k => values.get(k), setItem: (k,v) => values.set(k,v), removeItem: k => values.delete(k) } }
const makeFixture = async (extra = {}) => {
  const { createJudgeSession, toJudgeState, projectJudgeEvent } = await modules()
  let state = createInitialState(), seq = 0, online = false, view, time = 0, writes = 0
  const receipts = new Set(), storage = memory()
  const control = () => toJudgeState({ partido: { id: 30, estado: state.winner ? 'finalizado' : 'en_vivo', formato: {} }, marcador: serializeState(state), revision: `${seq}:${seq}`, eventos_recientes: [] })
  const service = {
    getLiveState: async () => ({ data: control() }),
    async addJudgeEvent(id, event) {
      writes++
      if (!receipts.has(event.client_action_id)) {
        if (event.expected_revision !== `${seq}:${seq}`) throw { status: 409, message: 'Conflicto' }
        state = applyEvent(state, event); seq++; receipts.add(event.client_action_id)
      }
      if (extra.loseResponse && writes === 1) throw new Error('Timeout after commit')
      return { data: control() }
    },
  }
  const options = { storage, userId: 12, isOnline: () => online, project: projectJudgeEvent, makeId: () => require('node:crypto').randomUUID(), now: () => time += 300 }
  const create = () => createJudgeSession(service, value => { view = value }, options)
  const session = create()
  await session.select({ id: 30 })
  return { session, create, storage, options, service, get view() { return view }, get state() { return state }, get writes() { return writes }, connect() { online = true }, externalPoint() { state = applyEvent(state, { tipo: 'punto', ganador: 'jugador2', motivo: 'tiro_ganador' }); seq++ } }
}
const point = { tipo: 'punto', ganador: 'jugador1', motivo: 'tiro_ganador' }

test('sin internet permite varios puntos instantáneos y sincroniza en orden', async () => {
  const f = await makeFixture()
  for (let i = 0; i < 3; i++) assert.equal(await f.session.record(point), true)
  assert.equal(f.view.control.marcador.punto_j1, '40')
  assert.equal(f.view.pendingCount, 3)
  assert.equal(f.writes, 0)
  f.connect(); await f.session.sync()
  assert.equal(f.view.pendingCount, 0)
  assert.deepEqual(f.state.points, [3, 0])
  assert.equal(f.writes, 3)
})

test('cola sobrevive recarga y reenvía UUID confirmado sin duplicar', async () => {
  const f = await makeFixture({ loseResponse: true })
  await f.session.record(point)
  await f.session.record(point)
  f.connect(); await f.session.sync()
  assert.equal(f.view.pendingCount, 2)
  f.session.dispose()
  const restored = f.create()
  assert.equal(f.view.control.marcador.punto_j1, '30')
  await restored.sync()
  assert.equal(f.view.pendingCount, 0)
  assert.deepEqual(f.state.points, [2, 0])
  assert.equal(f.writes, 3)
})

test('cola reproduce falta, let y doble falta usando el mismo motor del servidor', async () => {
  const f = await makeFixture()
  await f.session.record({ tipo: 'primera_falta' })
  await f.session.record({ tipo: 'let' })
  assert.equal(f.view.control.marcador.numero_servicio, 2)
  await f.session.record({ tipo: 'punto', ganador: 'jugador2', motivo: 'doble_falta' })
  assert.equal(f.view.control.marcador.punto_j2, '15')
  f.connect(); await f.session.sync()
  assert.deepEqual(f.state.points, [0, 1])
})

test('conflicto externo detiene cola y conserva pendientes para revisión', async () => {
  const f = await makeFixture()
  await f.session.record(point)
  f.externalPoint(); f.connect(); await f.session.sync()
  assert.equal(f.view.conflict, true)
  assert.equal(f.view.pendingCount, 1)
  assert.equal(await f.session.record(point), false)
  assert.deepEqual(f.state.points, [0, 1])
  await f.session.sync() // read the authoritative score without flushing
  assert.equal(f.view.control.marcador.punto_j2, '15')
})

test('no muestra un punto si falla el almacenamiento local', async () => {
  const f = await makeFixture()
  f.storage.setItem = () => { throw new Error('Quota exceeded') }
  assert.equal(await f.session.record(point), false)
  assert.equal(f.view.control.marcador.punto_j1, '0')
  assert.equal(f.writes, 0)
})

test('motor generado coincide exactamente con el motor canónico', async () => {
  const fs = require('node:fs'), path = require('node:path')
  const canonical = fs.readFileSync(path.join(__dirname, '../src/modules/matches/score.engine.js'), 'utf8').replace(/\r\n/g, '\n')
  const generated = fs.readFileSync(path.join(__dirname, '../../scores-app/src/generated/scoreEngine.js'), 'utf8').replace(/\r\n/g, '\n')
  assert.equal(generated, '// Generated by scripts/sync-score-engine.cjs.\n' + canonical.replace('module.exports = {', 'export {'))
})

test('deshacer local retira solo acciones que nunca fueron enviadas', async () => {
  const f = await makeFixture()
  await f.session.record(point)
  await f.session.record(point)
  assert.equal(f.session.undoLocal(), true)
  assert.equal(f.view.control.marcador.punto_j1, '15')
  f.connect(); await f.session.sync()
  assert.deepEqual(f.state.points, [1,0])
})

test('no descarta localmente una acción cuyo envío quedó incierto', async () => {
  const f = await makeFixture({ loseResponse: true })
  await f.session.record(point)
  f.connect(); await f.session.sync()
  assert.equal(f.session.undoLocal(), false)
  assert.equal(f.view.pendingCount, 1)
})
