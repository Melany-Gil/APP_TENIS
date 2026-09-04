const listeners = new Set()
let source = null

const streamUrl = () => {
  const base = import.meta.env.VITE_API_URL || 'http://localhost:3001/api'
  return `${base.replace(/\/$/, '')}/partidos/stream`
}

const notify = (event) => {
  for (const listener of listeners) listener(event)
}

const connect = () => {
  if (source || typeof window === 'undefined' || !('EventSource' in window)) return
  source = new EventSource(streamUrl(), { withCredentials: true })
  source.addEventListener('matches.changed', (message) => {
    try {
      notify(JSON.parse(message.data))
    } catch {
      notify({ action: 'updated', matchId: null })
    }
  })
}

const disconnect = () => {
  if (listeners.size || !source) return
  source.close()
  source = null
}

export const matchRealtimeService = {
  subscribe(listener) {
    listeners.add(listener)
    connect()
    return () => {
      listeners.delete(listener)
      disconnect()
    }
  },
}
