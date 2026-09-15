const test = require('node:test')
const assert = require('node:assert/strict')
const load = () => import('../../scores-app/src/utils/judgeSession.js')
const response = (point = '0') => ({ data: { marcador: { punto_j1: point } } })
const deferred = () => { let resolve; const promise = new Promise(r => { resolve = r }); return { promise, resolve } }

test('revisión de conflicto exige versión vigente y archiva antes de retirar pendientes', async () => {
  const { createJudgeSession } = await load()
  const key = 'judge-outbox-v2:12'
  const action = { client_action_id: 'pending', expected_revision: '1:1', tipo: 'punto' }
  const data = new Map([[key, JSON.stringify({ match: { id: 7 }, confirmed: { marcador: {}, revision: '1:1' }, queue: [action] })]])
  let revision = '1:2', blocked = false, view
  const storage = { getItem: k => data.get(k), removeItem: k => data.delete(k), setItem: (k, v) => { if (blocked) throw Error('Sin espacio'); data.set(k, v) } }
  const session = createJudgeSession({
    addJudgeEvent: async () => { throw { status: 409, message: 'Conflicto' } },
    getLiveState: async () => ({ data: { marcador: {}, revision } }),
  }, value => { view = value }, { storage, userId: 12, project: s => s, makeId: () => 'review-1' })
  await session.sync()
  assert.equal(view.conflict, true)
  assert.equal(await session.discardConflict(), false)
  const review = await session.reviewConflict()
  assert.equal(review.actions.length, 1)
  revision = '1:3'
  assert.equal(await session.discardConflict(review.revision), false)
  assert.ok(data.has(key))
  blocked = true
  assert.equal(await session.discardConflict('1:3'), false)
  assert.equal(session.getPending().length, 1)
  blocked = false
  assert.equal(await session.discardConflict('1:3'), true)
  assert.equal(data.has(key), false)
  assert.equal(JSON.parse(data.get(`${key}:review:review-1`)).actions[0].client_action_id, 'pending')
  assert.equal(view.conflict, false)
})

test('recuperación de sesión conserva solo cuenta y ruta oficial, nunca credenciales ni cola', async () => {
  const { saveSessionRecovery, readSessionRecovery, clearSessionRecovery } = await import('../../scores-app/src/utils/sessionRecovery.js')
  const data = new Map([['judge-outbox-v2:12', 'pendientes']])
  const storage = { getItem: key => data.get(key), setItem: (key, value) => data.set(key, value), removeItem: key => data.delete(key) }
  saveSessionRecovery(storage, { id: 12, rol: 'juez', password: 'secret' }, '/juez')
  assert.deepEqual(readSessionRecovery(storage), { userId: '12', role: 'juez', path: '/juez' })
  assert.equal(data.get('session-recovery-v1').includes('secret'), false)
  clearSessionRecovery(storage)
  assert.equal(readSessionRecovery(storage), null)
  assert.equal(data.get('judge-outbox-v2:12'), 'pendientes')
  for (const path of ['//example.com', '/admin', '/juez-falso', 'https://example.com']) {
    saveSessionRecovery(storage, { id: 12 }, path)
    assert.equal(readSessionRecovery(storage), null)
  }
  data.set('session-recovery-v1', '{roto')
  assert.equal(readSessionRecovery(storage), null)
  assert.doesNotThrow(() => saveSessionRecovery({ setItem() { throw Error('bloqueado') } }, { id: 12 }, '/juez'))
})

test('salida del juez comprueba pendientes solo de su cuenta sin modificar la cola', async () => {
  const { getPendingJudgeCount } = await load()
  const saved = JSON.stringify({ queue: [{ client_action_id: 'a' }, { client_action_id: 'b' }] })
  const storage = { getItem: key => key === 'judge-outbox-v2:12' ? saved : null }
  assert.equal(getPendingJudgeCount(storage, 12), 2)
  assert.equal(getPendingJudgeCount(storage, 13), 0)
  assert.equal(getPendingJudgeCount(storage, null), 0)
  assert.equal(storage.getItem('judge-outbox-v2:12'), saved)
  assert.throws(() => getPendingJudgeCount({getItem:()=>'{broken'}, 12))
  assert.throws(() => getPendingJudgeCount({getItem:()=>JSON.stringify({})}, 12))
  assert.throws(() => getPendingJudgeCount({getItem:()=>{throw Error('Storage bloqueado')}}, 12))
})

test('juez reutiliza respuesta al marcar, bloquea doble toque y no recarga la lista', async () => {
  const { createJudgeSession } = await load()
  let view, reads = 0, writes = 0
  const session = createJudgeSession({ async getLiveState() { reads++; return response() } }, value => { view = value })
  await session.select({ id: 1 })
  const pending = deferred()
  const first = session.write(() => { writes++; return pending.promise })
  assert.equal(view.busy, true)
  assert.equal(await session.write(() => { writes++; return response() }), false)
  await session.sync() // notification for the judge's own pending action
  pending.resolve(response('15'))
  assert.equal(await first, true)
  assert.equal(view.control.marcador.punto_j1, '15')
  assert.equal(view.busy, false)
  assert.equal(writes, 1)
  assert.equal(reads, 1)
})

test('lectura atrasada no revierte un punto confirmado', async () => {
  const { createJudgeSession } = await load()
  const slow = deferred()
  let calls = 0, view
  const session = createJudgeSession({ getLiveState() { return ++calls === 1 ? response() : slow.promise } }, value => { view = value })
  await session.select({ id: 1 })
  const refresh = session.sync()
  await session.write(async () => response('15'))
  slow.resolve(response('0'))
  await refresh
  assert.equal(view.control.marcador.punto_j1, '15')
})

test('cambiar partido descarta respuesta del partido anterior', async () => {
  const { createJudgeSession } = await load()
  const slow = deferred()
  let view
  const session = createJudgeSession({ getLiveState(id) { return id === 1 ? slow.promise : response('30') } }, value => { view = value })
  const old = session.select({ id: 1 })
  await session.select({ id: 2 })
  slow.resolve(response('15'))
  await old
  assert.equal(view.match.id, 2)
  assert.equal(view.control.marcador.punto_j1, '30')
})

test('timeout no reenvía el punto y exige sincronizar antes de continuar', async () => {
  const { createJudgeSession } = await load()
  let view
  const session = createJudgeSession({ async getLiveState() { return response('15') } }, value => { view = value })
  await session.select({ id: 1 })
  assert.equal(await session.write(async () => { throw new Error('Timeout') }), false)
  assert.equal(view.needsSync, true)
  assert.equal(await session.write(() => { assert.fail('No se debe reenviar') }), false)
  await session.sync()
  assert.equal(view.needsSync, false)
  assert.equal(view.control.marcador.punto_j1, '15')
})

test('desmontar la mesa descarta respuestas pendientes', async () => {
  const { createJudgeSession } = await load()
  const slow = deferred()
  let publications = 0
  const session = createJudgeSession({ getLiveState() { return slow.promise } }, () => { publications++ })
  const pending = session.select({ id: 1 })
  session.dispose()
  const before = publications
  slow.resolve(response())
  await pending
  assert.equal(publications, before)
})
