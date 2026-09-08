const test = require('node:test')
const assert = require('node:assert/strict')
const { validateDelivery, revisionOf, assertSameDelivery } = require('../src/modules/matches/eventDelivery')
test('entrega valida UUID y revisión sin romper clientes anteriores', () => {
  validateDelivery({ tipo: 'punto' })
  assert.throws(() => validateDelivery({ client_action_id: 'mal' }), e => e.status === 400)
  const id = require('node:crypto').randomUUID()
  assert.throws(() => validateDelivery({ client_action_id: id }), e => e.status === 400)
  validateDelivery({ client_action_id: id, expected_revision: '12:9' })
  assert.equal(revisionOf({ sequence: 12, active: 9 }), '12:9')
})
test('una entrega no puede reutilizarse en otra cuenta, partido o punto', () => {
  const event = { tipo: 'punto', ganador: 'jugador1', motivo: 'ace' }
  const saved = { ...event, created_by: 12, partido_id: 30 }
  assertSameDelivery(saved, event, { id: 12 }, 30)
  assert.throws(() => assertSameDelivery(saved, event, { id: 13 }, 30), e => e.status === 409)
  assert.throws(() => assertSameDelivery(saved, event, { id: 12 }, 31), e => e.status === 409)
  assert.throws(() => assertSameDelivery(saved, { ...event, ganador: 'jugador2' }, { id: 12 }, 30), e => e.status === 409)
})
