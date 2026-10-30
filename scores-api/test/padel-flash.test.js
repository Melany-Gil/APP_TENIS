const test = require('node:test')
const assert = require('node:assert/strict')
const D = require('../src/modules/padel-flash/domain')
process.env.PADEL_VOTE_SECRET = 'test-only-padel-secret-with-at-least-32-characters'
const S = require('../src/modules/padel-flash/security')
const { createPadelService } = require('../src/modules/padel-flash/service')
const admin = { id: 1, rol: 'admin' },
  judge = { id: 2, rol: 'juez' },
  guest = { rol: 'miembro' }
const defaults = {
  nombre: 'Flash de Pádel',
  fecha: '2026-10-30',
  cancha1: 'Pádel 1',
  cancha2: 'Pádel 2',
  inicio: 1080,
  pausa_inicio: 1200,
  pausa_fin: 1230,
  cierre: 1320,
}

test('pádel: 500 sorteos, 14 partidos, dos por pareja, sin repetidos ni colisiones', () => {
  for (let k = 0; k < 500; k++) {
    const matches = D.generateFixture(
      Array.from({ length: 14 }, (_, i) => i + 1),
      defaults
    )
    assert.equal(matches.length, 14)
    assert.equal(
      new Set(matches.map((m) => [m.pareja1, m.pareja2].sort((a, b) => a - b).join(':'))).size,
      14
    )
    for (let id = 1; id <= 14; id++)
      assert.equal(matches.filter((m) => m.pareja1 === id || m.pareja2 === id).length, 2)
    for (let t = 1; t <= 7; t++) {
      const turn = matches.filter((m) => m.turno === t)
      assert.equal(new Set(turn.flatMap((m) => [m.pareja1, m.pareja2])).size, 4)
      assert.equal(new Set(turn.map((m) => m.cancha)).size, 2)
      assert.ok(
        turn.every((m) => m.minuto + 20 <= defaults.pausa_inicio || m.minuto >= defaults.pausa_fin)
      )
    }
    assert.equal(matches.filter((m) => m.minuto < 1200).length, 8)
  }
})
test('pádel: validaciones de configuración y marcadores por tiempo', () => {
  const withoutCourts = D.eventInput({ ...defaults, cancha1: '', cancha2: undefined })
  assert.equal(withoutCourts.cancha1, 'Pádel 1')
  assert.equal(withoutCourts.cancha2, 'Pádel 2')
  assert.throws(() => D.generateFixture([1, 2], defaults), /14 parejas/)
  assert.throws(() => D.eventInput({ ...defaults, fecha: '2026-02-30' }), /Fecha/)
  assert.throws(() => D.eventInput({ ...defaults, cancha2: 'Pádel 1' }), /distintas/)
  assert.throws(() => D.eventInput({ ...defaults, cierre: 1250 }), /siete turnos/)
  assert.deepEqual(D.resultInput({ s1a: 3, s1b: 3, motivo: 'tiempo' }), {
    s1a: 3,
    s1b: 3,
    s2a: null,
    s2b: null,
    motivo: 'tiempo',
  })
  assert.equal(D.resultInput({ s1a: 6, s1b: 4, s2a: 1, s2b: 2, motivo: 'tiempo' }).s2b, 2)
  assert.throws(
    () => D.resultInput({ s1a: 3, s1b: 3, s2a: 1, s2b: 0, motivo: 'tiempo' }),
    /primer set/
  )
  assert.throws(() => D.resultInput({ s1a: 6, s1b: 2, motivo: 'dos_sets' }), /dos sets/)
  assert.throws(() => D.resultInput({ s1a: -1, s1b: 0, motivo: 'tiempo' }), /inválido/)
  assert.throws(() => D.resultInput({ s1a: 1.5, s1b: 0, motivo: 'tiempo' }), /inválido/)
})
test('pádel: normalización de teléfonos y cifrado autenticado', () => {
  for (const input of ['3001234567', '+57 300 123 4567', '57(300)123-4567'])
    assert.equal(D.phone(input), '+573001234567')
  assert.equal(D.phone('+1 202 555 0123'), '+12025550123')
  assert.throws(() => D.phone('hola'), /válido/)
  assert.throws(() => D.phone('123'), /indicativo/)
  const secret = { nombre: 'Ana Pérez', telefono: '+573001234567' },
    cipher = S.encrypt(secret)
  assert.ok(!cipher.includes(secret.nombre))
  assert.deepEqual(S.decrypt(cipher), secret)
  const raw = Buffer.from(cipher, 'base64')
  raw[raw.length - 1] ^= 1
  assert.throws(() => S.decrypt(raw.toString('base64')))
  let cookie
  const id = S.browser(
    { headers: {} },
    {
      cookie: (name, value) => {
        cookie = `${name}=${value}`
      },
    }
  )
  assert.equal(S.readBrowser({ headers: { cookie } }), id)
  assert.equal(S.readBrowser({ headers: { cookie: cookie.slice(0, -2) + 'ab' } }), null)
})

function fixture(options = {}) {
  const event = {
    id: 1,
    version: 0,
    publicado: 1,
    votacion: 'abierta',
    ...defaults,
    ...options.event,
  }
  const pairs = Array.from({ length: 14 }, (_, i) => ({
    id: i + 1,
    numero: i + 1,
    event_id: 1,
    jugador1: `Uno ${i}`,
    jugador2: `Dos ${i}`,
    disfraz: 'Disfraz',
    foto_url: `/uploads/${i}.webp`,
  }))
  const votes = [],
    audit = [],
    matches = options.matches || []
  let last = Promise.resolve()
  const query = async (sql, args = []) => {
    if (sql.startsWith('SELECT * FROM padel_events')) return [[{ ...event }]]
    if (sql.startsWith('SELECT id FROM padel_pairs WHERE id'))
      return [pairs.filter((p) => p.id === args[0] && p.event_id === args[1])]
    if (sql.startsWith('SELECT id FROM padel_votes'))
      return [
        votes.filter(
          (v) => v.event_id === args[0] && (v.browser_hash === args[1] || v.phone_hash === args[2])
        ),
      ]
    if (sql.startsWith('INSERT INTO padel_votes')) {
      if (votes.some((v) => v.browser_hash === args[2] || v.phone_hash === args[3]))
        throw { code: 'ER_DUP_ENTRY' }
      votes.push({
        id: votes.length + 1,
        event_id: args[0],
        pareja_id: args[1],
        browser_hash: args[2],
        phone_hash: args[3],
        datos_privados: args[4],
      })
      return [{ insertId: votes.length }]
    }
    if (sql.startsWith('SELECT id,numero')) return [[...pairs]]
    if (sql.startsWith('SELECT * FROM padel_fixture WHERE id'))
      return [matches.filter((m) => m.id === args[0])]
    if (sql.startsWith('SELECT * FROM padel_fixture')) return [matches]
    if (sql.startsWith('SELECT pareja_id FROM padel_votes'))
      return [
        votes.filter((v) => v.browser_hash === args[1]).map((v) => ({ pareja_id: v.pareja_id })),
      ]
    if (sql.startsWith('SELECT p.id,p.numero'))
      return [
        pairs
          .map((p) => ({ ...p, votos: votes.filter((v) => v.pareja_id === p.id).length }))
          .sort((a, b) => b.votos - a.votos),
      ]
    if (sql.startsWith('SELECT id,pareja_id,datos_privados'))
      return [votes.map(({ id, pareja_id, datos_privados }) => ({ id, pareja_id, datos_privados }))]
    if (sql.startsWith('SELECT id,user_id,accion')) return [audit]
    if (sql.startsWith('SELECT id,foto_url')) return [pairs]
    if (sql.startsWith('SELECT id FROM padel_fixture')) return [matches]
    if (sql.startsWith('UPDATE padel_events SET votacion')) {
      event.votacion = args[0]
      event.version++
      return [{ affectedRows: 1 }]
    }
    if (sql.startsWith('UPDATE padel_events SET desempate')) {
      event.desempate_pareja = args[0]
      event.desempate_motivo = args[1]
      return [{ affectedRows: 1 }]
    }
    if (sql.startsWith('UPDATE padel_fixture SET s1a')) {
      Object.assign(matches[0], {
        s1a: args[0],
        s1b: args[1],
        s2a: args[2],
        s2b: args[3],
        motivo: args[4],
        version: matches[0].version + 1,
      })
      return [{ affectedRows: 1 }]
    }
    if (sql.startsWith('INSERT INTO padel_audit')) {
      audit.push({ id: audit.length + 1, user_id: args[1], accion: args[2], detalle: args[3] })
      return [{}]
    }
    throw Error(`Unexpected query: ${sql}`)
  }
  const db = {
    query,
    getConnection: async () => {
      let release
      return {
        query,
        beginTransaction: async () => {
          const prev = last
          last = new Promise((r) => (release = r))
          await prev
        },
        commit: async () => {},
        rollback: async () => {},
        release: () => release(),
      }
    },
  }
  return { service: createPadelService(db), event, pairs, votes, audit, matches }
}
const ballot = { pareja_id: 1, nombre: 'Ana Pérez', telefono: '3001234567', consentimiento: true }
test('pádel: votos simultáneos, una sola inserción por navegador/teléfono', async () => {
  const f = fixture()
  const results = await Promise.allSettled(
    Array.from({ length: 10 }, () => f.service.vote(1, ballot, 'browser-a'))
  )
  assert.equal(results.filter((r) => r.status === 'fulfilled').length, 1)
  assert.equal(f.votes.length, 1)
  await assert.rejects(
    f.service.vote(1, { ...ballot, telefono: '3001234568' }, 'browser-a'),
    (e) => e.status === 409
  )
  await assert.rejects(
    f.service.vote(1, { ...ballot, telefono: '+57 300 123 4567' }, 'browser-b'),
    (e) => e.status === 409
  )
  await f.service.vote(1, { ...ballot, telefono: '3001234568' }, 'browser-b')
  assert.equal(f.votes.length, 2)
})
test('pádel: voto con datos incompletos, sin cookie, cerrado o de otra pareja', async () => {
  const f = fixture()
  await assert.rejects(f.service.vote(1, ballot, null), (e) => e.status === 400)
  await assert.rejects(
    f.service.vote(1, { ...ballot, consentimiento: false }, 'b'),
    (e) => e.status === 400
  )
  await assert.rejects(
    f.service.vote(1, { ...ballot, pareja_id: 99 }, 'b'),
    (e) => e.status === 404
  )
  f.event.votacion = 'cerrada'
  await assert.rejects(f.service.vote(1, ballot, 'b'), (e) => e.status === 409)
  assert.equal(f.votes.length, 0)
})
test('pádel: ningún dato de votantes ni conteos llega al endpoint público antes de revelar', async () => {
  const f = fixture()
  await f.service.vote(1, ballot, 'b')
  const data = await f.service.detail(1, guest, 'b')
  assert.equal(data.voted, true)
  assert.equal(data.ranking, null)
  assert.doesNotMatch(
    JSON.stringify(data),
    /Ana Pérez|3001234567|browser_hash|phone_hash|datos_privados/
  )
  await assert.rejects(f.service.report(1, judge), (e) => e.status === 403)
  const privateData = await f.service.report(1, admin)
  assert.equal(privateData.votes[0].nombre, 'Ana Pérez')
  assert.equal(privateData.ranking, null)
  f.event.votacion = 'revelada'
  const revealed = await f.service.detail(1, guest, 'b')
  assert.equal(revealed.ranking[0].votos, 1)
})
test('pádel: resultados por juez, conflicto de versión y corrección auditada', async () => {
  const f = fixture({ matches: [{ id: 1, version: 0, motivo: null }] })
  const result = { version: 0, s1a: 2, s1b: 3, motivo: 'tiempo' }
  await assert.rejects(f.service.result(1, 1, result, guest), (e) => e.status === 403)
  await f.service.result(1, 1, result, judge)
  await assert.rejects(f.service.result(1, 1, result, judge), (e) => e.status === 409)
  await assert.rejects(f.service.result(1, 1, { ...result, version: 1 }, judge), /corrección/)
  await f.service.result(
    1,
    1,
    { ...result, version: 1, correccion: 'Ajuste informado por las parejas', s1b: 4 },
    admin
  )
  assert.equal(f.matches[0].s1b, 4)
  assert.equal(f.audit.length, 2)
})
test('pádel: apertura/cierre/revelación, empate y permisos', async () => {
  const f = fixture()
  await f.service.vote(1, ballot, 'a')
  await f.service.vote(1, { ...ballot, pareja_id: 2, telefono: '3001234568' }, 'b')
  await assert.rejects(
    f.service.voting(1, { version: 0, estado: 'cerrada' }, judge),
    (e) => e.status === 403
  )
  await f.service.voting(1, { version: 0, estado: 'cerrada' }, admin)
  await assert.rejects(
    f.service.voting(1, { version: 0, estado: 'revelada' }, admin),
    (e) => e.status === 409
  )
  await assert.rejects(f.service.voting(1, { version: 1, estado: 'revelada' }, admin), /empatadas/)
  await f.service.voting(
    1,
    {
      version: 1,
      estado: 'revelada',
      desempate_pareja: 2,
      desempate_motivo: 'Aplausómetro presencial',
    },
    admin
  )
  assert.equal(f.event.votacion, 'revelada')
  assert.equal(f.event.desempate_pareja, 2)
})
