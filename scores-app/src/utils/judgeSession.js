// Durable ordered outbox. Only an acknowledged server response removes an
// action. The same UUID is reused after timeout/reload; no blind score overwrite.
export function createJudgeSession(service, publish, {
  storage = null, userId = null, isOnline = () => true,
  makeId = () => crypto.randomUUID(), project = null, canWrite = () => true, now = () => Date.now(),
} = {}) {
  let current = { match: null, control: null, busy: false, syncing: false, error: '', needsSync: false }
  let confirmed = null, queue = [], conflict = false, sending = false, disposed = false
  let revision = 0
  let lastRecord = -Infinity
  const storageKey = `judge-outbox-v2:${userId}`
  const update = (patch = {}) => {
    current = { ...current, ...patch, pending: queue[0] || null, pendingCount: queue.length, canUndoLocal: Boolean(queue.length && !queue.at(-1).attempted), conflict, sending }
    if (!disposed) publish(current)
  }
  const persist = (nextQueue = queue, nextConfirmed = confirmed) => {
    if (!storage || !userId) return
    if (nextQueue.length) storage.setItem(storageKey, JSON.stringify({ match: current.match, confirmed: nextConfirmed, queue: nextQueue }))
    else storage.removeItem(storageKey)
  }
  const projected = () => queue.reduce((state, event) => project(state, event), confirmed)
  const sync = async () => {
    if (!current.match || current.busy || disposed || sending) return
    if (queue.length && !conflict) return flush()
    const token = ++revision
    update({ syncing: true })
    try {
      const response = await service.getLiveState(current.match.id)
      if (token !== revision || disposed) return
      confirmed = response.data
      update({ control: response.data, syncing: false, needsSync: conflict, error: conflict ? 'El servidor tiene otro marcador. Las acciones pendientes se conservan para revisión.' : '' })
    } catch (error) {
      if (token !== revision || disposed) return
      update({ syncing: false, needsSync: !current.control, error: error.message || 'Sin conexión. Las acciones nuevas se guardan en el dispositivo.' })
    }
  }
  const flush = async () => {
    if (!queue.length || sending || disposed || conflict || !canWrite() || !isOnline()) return false
    sending = true; ++revision; update({ syncing: false })
    try {
      while (queue.length && !disposed && canWrite() && isOnline()) {
        const event = queue[0]
        if (!event.attempted) {
          // Once sent, even a timeout may mean committed: it cannot be silently
          // removed locally. Only unsent tail actions may be undone offline.
          event.attempted = true
          persist()
          update()
        }
        const response = await service.addJudgeEvent(current.match.id, event)
        if (!response?.data?.marcador) throw new Error('Respuesta incompleta del servidor')
        if (disposed) return false // persisted UUID will be safely retried on return
        const remaining = queue.slice(1)
        // Persist the acknowledgement before allowing another action to send.
        persist(remaining, response.data)
        confirmed = response.data; queue = remaining
        if (queue.length && queue[0].expected_revision !== confirmed.revision) {
          conflict = true
          update({ control: confirmed, needsSync: true, error: 'El marcador cambió en otro dispositivo. Revisa las acciones pendientes; no se sobrescribirá el resultado.' })
          return false
        }
        update({ control: queue.length ? projected() : confirmed, needsSync: false, error: '' })
      }
      return true
    } catch (error) {
      conflict = Boolean(error.status && error.status >= 400 && error.status < 500 && ![408, 429].includes(error.status))
      update({ needsSync: conflict, error: conflict ? `${error.message} Las acciones pendientes se conservan para revisión.` : 'Sin confirmar todavía. Sigue anotando: se reenviará en orden al recuperar la conexión.' })
      return false
    } finally { sending = false; update() }
  }
  const restore = () => {
    if (sending || current.busy) return
    try {
      const saved = storage && userId && storage.getItem(storageKey)
      queue = []; conflict = false
      if (saved) {
        const parsed = JSON.parse(saved)
        if (!parsed?.match?.id || !parsed?.confirmed?.marcador || !Array.isArray(parsed.queue) || !parsed.queue.every(event => event.client_action_id && event.expected_revision)) throw new Error('Invalid outbox')
        queue = parsed.queue; confirmed = parsed.confirmed
        current = { ...current, match: parsed.match, control: queue.length ? projected() : confirmed }
      }
    } catch { conflict = true; current.needsSync = true; current.error = 'No se pudo leer la cola guardada. No borres los datos del navegador; solicita revisión.' }
    update()
  }
  restore()
  return {
    restore,
    sync,
    async record(event) {
      if (!current.match || !current.control || current.busy || conflict || disposed || !canWrite()) return false
      if (now() - lastRecord < 250) return false
      if (!project || !/^\d+:\d+$/.test(current.control.revision || '')) {
        update({ error: 'Actualiza la aplicación y sincroniza el partido antes de marcar.' }); return false
      }
      try {
        const action = { ...event, client_action_id: makeId(), expected_revision: current.control.revision, expected_configuration: current.control.configuration }
        const preview = project(current.control, action)
        const nextQueue = [...queue, action]
        if (nextQueue.length > 1000) throw new Error('Hay demasiadas acciones pendientes. Recupera la conexión antes de continuar.')
        persist(nextQueue) // never display a point that wasn't saved locally
        lastRecord = now()
        queue = nextQueue; ++revision
        update({ control: preview, error: '', needsSync: false })
        void flush()
        return true
      } catch (error) { update({ error: error.message || 'No se pudo guardar la acción en el dispositivo.' }); return false }
    },
    getPending() { return queue.map(event => ({ ...event })) },
    undoLocal() {
      if (!queue.length || queue.at(-1).attempted || conflict || !canWrite()) return false
      try {
        const remaining = queue.slice(0, -1)
        persist(remaining)
        queue = remaining; ++revision
        update({ control: queue.length ? projected() : confirmed, error: '' })
        return true
      } catch { update({ error: 'No se pudo guardar la corrección local.' }); return false }
    },
    async discardConflict() {
      if (!conflict || sending || current.busy || !canWrite()) return
      persist([])
      queue = []; conflict = false
      update({ needsSync: true, error: '' })
      await sync()
    },
    async select(match) {
      if (current.busy || queue.length || conflict) return
      ++revision; confirmed = null
      update({ match, control: null, error: '', needsSync: false, syncing: false })
      if (match) await sync()
    },
    async write(operation) {
      if (!current.match || !current.control || current.busy || current.needsSync || queue.length || disposed || !canWrite()) return false
      ++revision; update({ busy: true, syncing: false, error: '' })
      try {
        const response = await operation(current.match.id)
        if (!response?.data?.marcador) throw new Error('Respuesta incompleta del servidor')
        confirmed = response.data
        update({ control: response.data, busy: false })
        return true
      } catch (error) {
        update({ busy: false, needsSync: true, error: `${error.message || 'No se pudo confirmar la acción.'} Sincroniza y revisa el último registro antes de repetirla.` })
        return false
      }
    },
    dispose() { disposed = true; ++revision },
  }
}
