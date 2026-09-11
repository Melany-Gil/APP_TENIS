const test = require('node:test')
const assert = require('node:assert/strict')
const { normalizePhone, identity, assertPhoneAvailable } = require('../src/utils/memberIdentity')
test('normaliza celulares colombianos sin confundirlos con documentos', () => {
  for (const phone of ['3001234567', '+57 300 123 4567', '0057 (300) 123-4567']) assert.equal(normalizePhone(phone), '3001234567')
  for (const phone of ['abc3001234567', '12345', '1+8005555555']) assert.throws(() => normalizePhone(phone), { status: 400 })
})
test('miembro admite NULL en cédula/correo, no credenciales inventadas', () => {
  assert.deepEqual(identity({ telefono: '3001234567' }, 'miembro'), { document: null, email: null, phone: '3001234567', phoneKey: '3001234567' })
  assert.throws(() => identity({}, 'miembro'), { status: 400 })
  assert.equal(identity({ numero_documento: '12345' }, 'miembro').phoneKey, null)
  assert.throws(() => identity({ telefono: '3001234567' }, 'admin'), { status: 400 })
})
test('celulares históricos compartidos también bloquean nuevas cuentas', async () => {
  const db = { query: async () => [[{ id: 3, telefono: '+57 300 1234567' }]] }
  await assert.rejects(assertPhoneAvailable(db, '3001234567', 2), { status: 409 })
  await assertPhoneAvailable(db, '3011234567', 2)
})
test('miembro con solo usuario de acceso no necesita correo, documento ni celular', () => {
  assert.deepEqual(identity({ usuario: 'ana.garcia' }, 'miembro'), { document: null, email: null, phone: null, phoneKey: null })
  assert.throws(() => identity({ usuario: 'ab' }, 'miembro'), { status: 400 })
  assert.throws(() => identity({ usuario: 'ana garcia' }, 'miembro'), { status: 400 })
})
