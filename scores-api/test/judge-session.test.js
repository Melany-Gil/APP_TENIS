const test = require('node:test')
const assert = require('node:assert/strict')
const load = () => import('../../scores-app/src/utils/judgeSession.js')
const response = (point = '0') => ({ data: { marcador: { punto_j1: point } } })
const deferred = () => { let resolve; const promise = new Promise(r => { resolve = r }); return { promise, resolve } }

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
