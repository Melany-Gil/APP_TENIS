const clients = new Set()

const writeEvent = (response, event, payload) => {
  response.write(`event: ${event}\n`)
  response.write(`data: ${JSON.stringify(payload)}\n\n`)
}

exports.subscribe = (request, response) => {
  response.status(200)
  response.set({
    'Content-Type': 'text/event-stream; charset=utf-8',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
  })
  response.flushHeaders?.()

  clients.add(response)
  writeEvent(response, 'connected', { connected: true, timestamp: new Date().toISOString() })

  const heartbeat = setInterval(() => {
    try {
      response.write(`: heartbeat ${Date.now()}\n\n`)
    } catch {
      clearInterval(heartbeat)
      clients.delete(response)
    }
  }, 25000)

  request.on('close', () => {
    clearInterval(heartbeat)
    clients.delete(response)
  })
}

const bootId = require('node:crypto').randomUUID()
let revision = 0
let currentVersion = {
  version: `${bootId}:${revision}`,
  matchId: null,
  action: 'init',
  timestamp: new Date().toISOString(),
}

// A polling interval can contain changes to several matches: invalidate all.
exports.getVersion = () => ({ ...currentVersion, matchId: null })

exports.publishMatchChange = ({ matchId = null, action = 'updated' } = {}) => {
  const payload = {
    matchId: matchId === null ? null : Number(matchId),
    action,
    timestamp: new Date().toISOString(),
    version: `${bootId}:${++revision}`,
  }
  currentVersion = payload
  for (const response of clients) {
    try {
      writeEvent(response, 'matches.changed', payload)
    } catch {
      clients.delete(response)
    }
  }
}

exports.clientCount = () => clients.size
