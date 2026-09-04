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
    response.write(`: heartbeat ${Date.now()}\n\n`)
  }, 25000)

  request.on('close', () => {
    clearInterval(heartbeat)
    clients.delete(response)
  })
}

exports.publishMatchChange = ({ matchId = null, action = 'updated' } = {}) => {
  const payload = {
    matchId: matchId === null ? null : Number(matchId),
    action,
    timestamp: new Date().toISOString(),
  }
  for (const response of clients) {
    try {
      writeEvent(response, 'matches.changed', payload)
    } catch {
      clients.delete(response)
    }
  }
}

exports.clientCount = () => clients.size
