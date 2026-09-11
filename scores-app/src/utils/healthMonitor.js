export function createHealthMonitor({ request, isOnline, isVisible, onUnavailable, onRecovered, schedule = setTimeout, cancel = clearTimeout }) {
  let timer, controller, running = false, stopped = false, failures = 0, warned = false
  const check = async () => {
    if (stopped || running) return
    cancel(timer)
    if (!isVisible()) { timer = schedule(check, 30000); return }
    running = true
    controller = new AbortController()
    try {
      if (!isOnline()) throw new Error('offline')
      await request(controller.signal)
      if (stopped) return
      failures = 0
      if (warned) onRecovered()
      warned = false
    } catch {
      if (stopped) return
      failures++
      if (failures >= 2 && !warned) { warned = true; onUnavailable() }
    } finally {
      running = false
      if (!stopped) timer = schedule(check, failures ? Math.min(60000, 15000 * failures) : 30000)
    }
  }
  return { check, stop() { stopped = true; cancel(timer); controller?.abort() } }
}
