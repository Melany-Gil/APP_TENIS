// Reject double taps and stale reads. Never automatically retry a write.
export function createJudgeSession(service, publish) {
  let current = { match: null, control: null, busy: false, syncing: false, error: '', needsSync: false }
  let revision = 0
  let disposed = false
  const update = (patch) => {
    current = { ...current, ...patch }
    if (!disposed) publish(current)
  }
  const sync = async () => {
    if (!current.match || current.busy || disposed) return
    const token = ++revision
    const id = current.match.id
    update({ syncing: true })
    try {
      const response = await service.getLiveState(id)
      if (token !== revision || disposed) return
      update({ control: response.data, syncing: false, needsSync: false, error: '' })
    } catch (error) {
      if (token !== revision || disposed) return
      update({ syncing: false, needsSync: true, error: error.message || 'No hay conexión con el marcador. Sincroniza antes de continuar.' })
    }
  }
  return {
    sync,
    async select(match) {
      if (current.busy) return
      ++revision
      update({ match, control: null, error: '', needsSync: false, syncing: false })
      if (match) await sync()
    },
    async write(operation) {
      if (!current.match || !current.control || current.busy || current.needsSync || disposed) return false
      ++revision
      update({ busy: true, syncing: false, error: '' })
      try {
        const response = await operation(current.match.id)
        if (!response?.data?.marcador) throw new Error('Respuesta incompleta del servidor')
        update({ control: response.data, busy: false })
        return true
      } catch (error) {
        update({ busy: false, needsSync: true, error: `${error.message || 'No se pudo confirmar la acción.'} Sincroniza y revisa el último registro antes de volver a marcar.` })
        return false
      }
    },
    dispose() { disposed = true; ++revision },
  }
}
