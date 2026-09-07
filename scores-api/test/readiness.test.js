const test = require('node:test')
const assert = require('node:assert/strict')
const createReadiness = require('../src/config/readiness')

function probe(gate) {
  const result = { next: false }
  const res = {
    set() {},
    status(code) { result.code = code; return this },
    json(body) { result.body = body },
  }
  gate.middleware({}, res, () => { result.next = true })
  return result
}

test('no atiende solicitudes hasta completar el esquema y solo inicializa una vez', async () => {
  let finish
  let calls = 0
  const gate = createReadiness(() => { calls++; return new Promise((resolve) => { finish = resolve }) })
  assert.equal(probe(gate).code, 503)
  const pending = gate.start()
  assert.equal(gate.start(), pending)
  await Promise.resolve()
  assert.equal(probe(gate).code, 503)
  finish()
  await pending
  assert.equal(probe(gate).next, true)
  assert.equal(calls, 1)
})

test('mantiene 503 si falla el esquema sin exponer errores privados', async () => {
  const gate = createReadiness(() => { throw new Error('private-db-details') })
  await assert.rejects(gate.start())
  const result = probe(gate)
  assert.equal(result.code, 503)
  assert.equal(result.next, false)
  assert.equal(JSON.stringify(result).includes('private-db-details'), false)
})
