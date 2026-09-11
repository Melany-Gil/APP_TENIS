const test = require('node:test')
const assert = require('node:assert/strict')
async function fixture(options = {}) {
  const { createHealthMonitor } = await import('../../scores-app/src/utils/healthMonitor.js')
  const events = [], delays = []
  const monitor = createHealthMonitor({ request: async () => {}, isOnline: () => true, isVisible: () => true, onUnavailable: () => events.push('unavailable'), onRecovered: () => events.push('recovered'), schedule: (_, ms) => { delays.push(ms); return 1 }, cancel: () => {}, ...options })
  return { monitor, events, delays }
}
test('fallos repetidos solo avisan una vez y la recuperación conserva la sesión', async () => {
  let fail = true
  const { monitor, events, delays } = await fixture({ request: async () => { if (fail) throw new Error('503') } })
  for (let i = 0; i < 6; i++) await monitor.check()
  assert.deepEqual(events, ['unavailable'])
  assert.equal(delays.at(-1), 60000)
  fail = false
  await monitor.check(); await monitor.check()
  assert.deepEqual(events, ['unavailable', 'recovered'])
  assert.equal(delays.at(-1), 30000)
  monitor.stop()
})
test('sin internet o con pestaña oculta no envía solicitudes', async () => {
  let online = false, visible = true, calls = 0
  const { monitor, events } = await fixture({ isOnline: () => online, isVisible: () => visible, request: async () => calls++ })
  await monitor.check(); await monitor.check()
  assert.equal(calls, 0)
  assert.deepEqual(events, ['unavailable'])
  online = true; visible = false
  await monitor.check()
  assert.equal(calls, 0)
  visible = true; await monitor.check()
  assert.equal(calls, 1)
  monitor.stop()
})
test('evita solicitudes simultáneas y aborta al desmontarse sin avisos tardíos', async () => {
  let finish, signal, calls = 0
  const { monitor, events, delays } = await fixture({ request: (s) => { signal = s; calls++; return new Promise((resolve) => { finish = resolve }) } })
  const pending = monitor.check()
  await monitor.check()
  assert.equal(calls, 1)
  monitor.stop(); finish(); await pending
  assert.equal(signal.aborted, true)
  assert.deepEqual(events, [])
  assert.deepEqual(delays, [])
})
