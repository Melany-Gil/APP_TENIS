const test = require('node:test')
const assert = require('node:assert/strict')
const { EventEmitter } = require('node:events')
const realtime = require('../src/modules/matches/match-realtime')

test('publica cambios de marcador a los clientes SSE conectados', () => {
  const request = new EventEmitter()
  const chunks = []
  const response = {
    status(code) {
      assert.equal(code, 200)
      return this
    },
    set(headers) {
      assert.equal(headers['Content-Type'], 'text/event-stream; charset=utf-8')
      return this
    },
    flushHeaders() {},
    write(chunk) {
      chunks.push(chunk)
    },
  }

  realtime.subscribe(request, response)
  realtime.publishMatchChange({ matchId: 42, action: 'score' })

  const output = chunks.join('')
  assert.match(output, /event: connected/)
  assert.match(output, /event: matches\.changed/)
  assert.match(output, /"matchId":42/)
  assert.match(output, /"action":"score"/)

  request.emit('close')
  assert.equal(realtime.clientCount(), 0)
})
