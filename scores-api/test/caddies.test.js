const test = require('node:test')
const assert = require('node:assert/strict')
let match, assignment, participants, reviews, writes, committed, rolledBack, active
const conn = {
  async beginTransaction() {},
  async commit() {
    committed++
  },
  async rollback() {
    rolledBack++
  },
  release() {},
  async query(sql, params = []) {
    if (sql.includes('AS caddie') && sql.includes('AS jugador'))
      return [
        [{ caddie: params[0] === 7 ? 1 : 0, jugador: participants.includes(params[0]) ? 1 : 0 }],
      ]
    if (sql.startsWith('SELECT a.caddie_id'))
      return [assignment && active ? [{ caddie_id: assignment.caddie_id }] : []]
    if (sql.startsWith('SELECT * FROM partidos')) return [[match]]
    if (sql.includes('SELECT DISTINCT j.user_id'))
      return [participants.map((user_id) => ({ user_id }))]
    if (sql.startsWith('SELECT * FROM caddie_asignaciones') || sql.startsWith('SELECT a.*'))
      return [assignment ? [{ ...assignment, nombre: 'Caddie', apellido: 'QA' }] : []]
    if (sql.startsWith('SELECT u.id FROM users u JOIN caddie_roles'))
      return [active ? [{ id: params[0] }] : []]
    if (sql.startsWith('SELECT atencion'))
      return [
        reviews
          .filter((r) => params.length < 2 || r.autor_id === params[1])
          .map(({ atencion, colaboracion, trato, comentario }) => ({
            atencion,
            colaboracion,
            trato,
            comentario,
          })),
      ]
    if (sql.startsWith('SELECT id FROM caddie_evaluaciones'))
      return [reviews.filter((r) => params.length < 2 || r.autor_id === params[1])]
    if (sql.startsWith('INSERT INTO caddie_evaluaciones')) {
      if (reviews.some((r) => r.autor_id === params[2])) throw { code: 'ER_DUP_ENTRY' }
      reviews.push({
        autor_id: params[2],
        atencion: params[3],
        colaboracion: params[4],
        trato: params[5],
        comentario: params[6],
      })
    }
    if (sql.startsWith('INSERT') || sql.startsWith('UPDATE')) writes.push({ sql, params })
    return [{ affectedRows: 1 }]
  },
}
const dbPath = require.resolve('../src/config/db')
require.cache[dbPath] = {
  id: dbPath,
  filename: dbPath,
  loaded: true,
  exports: { query: conn.query, getConnection: async () => conn },
}
const service = require('../src/modules/caddies/service')
test.beforeEach(() => {
  match = { id: 10, estado: 'programado', juez_id: 5 }
  assignment = { caddie_id: 7, version: 2 }
  participants = [11, 12, 13, 14]
  reviews = []
  writes = []
  committed = 0
  rolledBack = 0
  active = true
})
const judge = { id: 5, rol: 'juez' },
  member = { id: 11, rol: 'miembro' }
test('caddie: solo juez asignado o dirección; revisiones antiguas y roles incompatibles se rechazan', async () => {
  const body = { caddie_id: 8, version: 2, motivo: 'Cambio de turno' }
  await assert.rejects(service.assign(10, body, member), (e) => e.status === 403)
  await assert.rejects(service.assign(10, body, { id: 6, rol: 'juez' }), (e) => e.status === 403)
  await assert.rejects(service.assign(10, { ...body, version: 1 }, judge), (e) => e.status === 409)
  for (const caddie_id of [5, 11, 12, 13, 14])
    await assert.rejects(service.assign(10, { ...body, caddie_id }, judge), (e) => e.status === 400)
  assert.equal(writes.length, 0)
})
test('caddie: reemplazo auditado y transaccional, sin modificar marcación', async () => {
  await service.assign(10, { caddie_id: 8, version: 2, motivo: 'Cambio de turno' }, judge)
  assert.equal(committed, 1)
  assert.ok(
    writes.some((w) => w.sql.includes('caddie_auditoria') && w.params[1] === 7 && w.params[2] === 8)
  )
  assert.ok(writes.every((w) => w.sql.includes('caddie_')))
})
test('caddie: no se reemplaza sin motivo, inactivo, con evaluación o partido cerrado', async () => {
  const body = { caddie_id: 8, version: 2, motivo: 'Cambio de turno' }
  await assert.rejects(service.assign(10, { ...body, motivo: '' }, judge))
  active = false
  await assert.rejects(service.assign(10, body, judge), (e) => e.status === 409)
  active = true
  reviews = [{ autor_id: 11 }]
  await assert.rejects(service.assign(10, body, judge), (e) => e.status === 409)
  reviews = []
  match.estado = 'finalizado'
  await assert.rejects(service.assign(10, body, judge), (e) => e.status === 409)
  assert.equal(writes.length, 0)
})
test('encuesta: participantes de dobles, cierre, escala y respuesta única', async () => {
  const body = { version: 2, atencion: 5, colaboracion: 4, trato: 5, comentario: 'Gracias' }
  await assert.rejects(service.review(10, body, member), (e) => e.status === 409)
  match.estado = 'finalizado'
  await assert.rejects(service.review(10, body, { id: 99, rol: 'admin' }), (e) => e.status === 403)
  for (const value of [0, 6, 1.5, '5', null])
    await assert.rejects(
      service.review(10, { ...body, atencion: value }, member),
      (e) => e.status === 400
    )
  await assert.rejects(service.review(10, { ...body, version: 1 }, member), (e) => e.status === 409)
  await assert.rejects(
    service.review(10, { ...body, comentario: 'x'.repeat(1001) }, member),
    (e) => e.status === 400
  )
  await service.review(10, body, member)
  await assert.rejects(service.review(10, body, member), (e) => e.status === 409)
  await service.review(10, body, { id: 14, rol: 'juez' })
  assert.equal(reviews.length, 2)
})
test('encuesta: sin autoevaluación ni consultas ajenas; caddie anónimo y jugador solo propia respuesta', async () => {
  match.estado = 'finalizado'
  participants.push(7)
  await assert.rejects(
    service.review(10, { version: 2 }, { id: 7, rol: 'miembro' }),
    (e) => e.status === 403
  )
  reviews = [
    { autor_id: 11, atencion: 5, colaboracion: 4, trato: 5, comentario: 'Bien' },
    { autor_id: 12, atencion: 4, colaboracion: 4, trato: 5, comentario: '' },
  ]
  await assert.rejects(service.detail(10, { id: 99, rol: 'miembro' }), (e) => e.status === 403)
  const caddie = await service.detail(10, { id: 7, rol: 'miembro' })
  assert.equal(caddie.evaluaciones.length, 2)
  assert.ok(caddie.evaluaciones.every((r) => !('autor_id' in r) && !('created_at' in r)))
  const player = await service.detail(10, member)
  assert.equal(player.evaluaciones.length, 1)
  assert.equal(player.respondida, true)
  assert.equal(player.puede_evaluar, false)
  assert.equal((await service.detail(10, { id: 50, rol: 'juez_director' })).evaluaciones.length, 2)
  assert.equal((await service.detail(10, judge)).evaluaciones.length, 0)
})
test('inicio obligatorio: sin caddie, inactivo o participante se bloquea antes de marcar', async () => {
  assignment = null
  await assert.rejects(service.assertAssigned(conn, match), (e) => e.status === 409)
  assignment = { caddie_id: 7 }
  active = false
  await assert.rejects(service.assertAssigned(conn, match), (e) => e.status === 409)
  active = true
  assignment.caddie_id = 11
  await assert.rejects(service.assertAssigned(conn, match), (e) => e.status === 409)
  assignment.caddie_id = 7
  await service.assertAssigned(conn, match)
  assert.equal(writes.length, 0)
})
test('vista caddie no permite partidos ajenos aunque la persona también sea jugador', async () => {
  participants.push(7)
  assignment.caddie_id = 8
  await assert.rejects(
    service.detail(10, { id: 7, rol: 'juez_director' }, 'caddie'),
    (e) => e.status === 403
  )
  const ownPlayer = await service.detail(10, { id: 7, rol: 'miembro' }, 'jugador')
  assert.equal(ownPlayer.puede_asignar, false)
  await assert.rejects(service.detail(10, member, 'gestion'), (e) => e.status === 403)
})
