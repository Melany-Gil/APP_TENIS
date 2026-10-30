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
test('pádel: sorteo con número impar de parejas, sin repetir rival', () => {
  const wideEvent = { ...defaults, inicio: 480, pausa_inicio: 1200, pausa_fin: 1230, cierre: 1439 }
  for (let k = 0; k < 50; k++) {
    const ids = Array.from({ length: 15 }, (_, i) => i + 1)
    const matches = D.generateFixture(ids, wideEvent)
    assert.equal(matches.length, 15)
    assert.equal(
      new Set(matches.map((m) => [m.pareja1, m.pareja2].sort((a, b) => a - b).join(':'))).size,
      15
    )
    for (const id of ids)
      assert.equal(matches.filter((m) => m.pareja1 === id || m.pareja2 === id).length, 2)
    const turns = [...new Set(matches.map((m) => m.turno))]
    assert.equal(turns.length, 8)
    for (const t of turns) {
      const turn = matches.filter((m) => m.turno === t)
      assert.equal(new Set(turn.flatMap((m) => [m.pareja1, m.pareja2])).size, turn.length * 2)
      assert.equal(new Set(turn.map((m) => m.cancha)).size, turn.length)
    }
    assert.equal(turns.filter((t) => matches.filter((m) => m.turno === t).length === 1).length, 1)
  }
})
test('pádel: sorteo con el mínimo de parejas permitido', () => {
  const matches = D.generateFixture([1, 2, 3, 4], defaults)
  assert.equal(matches.length, 4)
  assert.equal(new Set(matches.map((m) => m.turno)).size, 2)
})
test('pádel: evento sin pausa, horario corrido y sorteo sin hueco', () => {
  const sinPausa = D.eventInput({ ...defaults, pausa_inicio: '', pausa_fin: '' })
  assert.equal(sinPausa.pausa_inicio, null)
  assert.equal(sinPausa.pausa_fin, null)
  const event = { ...defaults, pausa_inicio: null, pausa_fin: null, cierre: 1255 }
  const matches = D.generateFixture(Array.from({ length: 14 }, (_, i) => i + 1), event)
  assert.equal(matches.length, 14)
  assert.equal(new Set(matches.map((m) => m.minuto)).size, 7)
  assert.throws(() => D.eventInput({ ...defaults, pausa_inicio: 1200, pausa_fin: '' }), /inválido/)
  assert.throws(
    () => D.generateFixture(Array.from({ length: 14 }, (_, i) => i + 1), { ...event, cierre: 1249 }),
    /^(?!.*pausa).*turnos.*$/s
  )
})
test('pádel: circleRounds reparte todos contra todos con un descanso por ronda', () => {
  for (const size of [3, 4, 5]) {
    const items = Array.from({ length: size }, (_, i) => i + 1)
    const rounds = D.circleRounds(items)
    assert.equal(rounds.length, size % 2 === 1 ? size : size - 1)
    const seen = new Set()
    const restCount = new Map(items.map((id) => [id, 0]))
    for (const round of rounds) {
      const real = round.filter((pair) => !pair.includes(null))
      const resting = round.find((pair) => pair.includes(null))
      for (const [a, b] of real) {
        const key = [a, b].sort((x, y) => x - y).join(':')
        assert.ok(!seen.has(key), 'no debe repetirse un cruce')
        seen.add(key)
      }
      if (resting) {
        const restId = resting.find((x) => x !== null)
        restCount.set(restId, restCount.get(restId) + 1)
      }
    }
    assert.equal(seen.size, (size * (size - 1)) / 2)
    if (size % 2 === 1) for (const id of items) assert.equal(restCount.get(id), 1)
  }
})
test('pádel: sorteo por grupos, todos contra todos y restricción de horario por pareja', () => {
  const event = {
    inicio: 360,
    pausa_inicio: 525,
    pausa_fin: 540,
    cierre: 600,
    formato: 'grupos',
    duracion_partido: 15,
    tamano_grupo: 5,
  }
  for (let k = 0; k < 50; k++) {
    const pairs = Array.from({ length: 15 }, (_, i) => ({
      id: i + 1,
      no_antes: i + 1 === 13 ? 390 : null,
    }))
    const { fixture, groupOf } = D.generateGroupFixture(pairs, event)
    assert.equal(fixture.length, 30)
    assert.equal(new Set(fixture.map((m) => m.turno)).size, 15)
    assert.equal(groupOf.size, 15)
    const byGroup = new Map()
    for (const p of pairs) {
      const g = groupOf.get(p.id)
      if (!byGroup.has(g)) byGroup.set(g, [])
      byGroup.get(g).push(p.id)
    }
    assert.equal(byGroup.size, 3)
    for (const ids of byGroup.values()) {
      assert.equal(ids.length, 5)
      const matches = fixture.filter((m) => ids.includes(m.pareja1) && ids.includes(m.pareja2))
      assert.equal(matches.length, 10)
      assert.equal(
        new Set(matches.map((m) => [m.pareja1, m.pareja2].sort((a, b) => a - b).join(':'))).size,
        10
      )
      for (const id of ids)
        assert.equal(matches.filter((m) => m.pareja1 === id || m.pareja2 === id).length, 4)
    }
    for (const t of new Set(fixture.map((m) => m.turno))) {
      const turn = fixture.filter((m) => m.turno === t)
      assert.equal(new Set(turn.map((m) => m.cancha)).size, turn.length)
      assert.equal(new Set(turn.flatMap((m) => [m.pareja1, m.pareja2])).size, turn.length * 2)
    }
    const first13 = Math.min(
      ...fixture.filter((m) => m.pareja1 === 13 || m.pareja2 === 13).map((m) => m.minuto)
    )
    assert.ok(first13 >= 390, 'la pareja con restricción no juega antes de las 6:30')
  }
})
test('pádel: validaciones de configuración y marcadores por tiempo', () => {
  const withoutCourts = D.eventInput({ ...defaults, cancha1: '', cancha2: undefined })
  assert.equal(withoutCourts.cancha1, 'Pádel 1')
  assert.equal(withoutCourts.cancha2, 'Pádel 2')
  assert.throws(() => D.generateFixture([1, 2], defaults), /entre 4 y 60 parejas/)
  assert.throws(
    () => D.generateFixture(Array.from({ length: 61 }, (_, i) => i + 1), defaults),
    /entre 4 y 60 parejas/
  )
  assert.throws(() => D.eventInput({ ...defaults, fecha: '2026-02-30' }), /Fecha/)
  assert.throws(() => D.eventInput({ ...defaults, cancha2: 'Pádel 1' }), /distintas/)
  assert.throws(
    () => D.generateFixture(Array.from({ length: 14 }, (_, i) => i + 1), { ...defaults, cierre: 1231 }),
    /turnos/
  )
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

function store() {
  const event = {
    id: 1,
    version: 0,
    publicado: 0,
    votacion: 'pendiente',
    desempate_pareja: null,
    desempate_motivo: null,
    created_by: 1,
    ...defaults,
    formato: 'individual',
    inicio: 480,
    cierre: 1439,
  }
  let pairs = [],
    fixture = []
  let nextPairId = 1,
    nextFixtureId = 1
  const query = async (sql, args = []) => {
    if (
      sql === 'SELECT * FROM padel_events WHERE id=?' ||
      sql === 'SELECT * FROM padel_events WHERE id=? FOR UPDATE'
    )
      return [[{ ...event }]]
    if (sql === 'UPDATE padel_events SET version=version+1 WHERE id=?') {
      event.version++
      return [{ affectedRows: 1 }]
    }
    if (sql === 'UPDATE padel_events SET publicado=1,version=version+1 WHERE id=?') {
      event.publicado = 1
      event.version++
      return [{ affectedRows: 1 }]
    }
    if (sql === 'UPDATE padel_events SET votacion=?,version=version+1 WHERE id=?') {
      event.votacion = args[0]
      event.version++
      return [{ affectedRows: 1 }]
    }
    if (sql === 'INSERT INTO padel_audit (event_id,user_id,accion,detalle) VALUES (?,?,?,?)')
      return [{}]
    if (sql === 'SELECT id FROM padel_fixture WHERE event_id=? LIMIT 1')
      return [fixture.map(({ id }) => ({ id }))]
    if (sql === 'SELECT id,jugador1,jugador2 FROM padel_pairs WHERE event_id=?')
      return [pairs.map(({ id, jugador1, jugador2 }) => ({ id, jugador1, jugador2 }))]
    if (
      sql ===
      'INSERT INTO padel_pairs (numero,jugador1,jugador2,disfraz,no_antes,event_id) VALUES (?,?,?,?,?,?)'
    ) {
      const [numero, jugador1, jugador2, disfraz, no_antes] = args
      if (pairs.some((p) => p.numero === numero)) throw { code: 'ER_DUP_ENTRY' }
      const row = {
        id: nextPairId++,
        numero,
        jugador1,
        jugador2,
        disfraz,
        no_antes: no_antes ?? null,
        grupo: null,
        foto_url: null,
      }
      pairs.push(row)
      return [{ insertId: row.id }]
    }
    if (sql === 'UPDATE padel_pairs SET grupo=? WHERE id=? AND event_id=?') {
      const p = pairs.find((x) => x.id === args[1])
      if (p) p.grupo = args[0]
      return [{ affectedRows: p ? 1 : 0 }]
    }
    if (sql === 'SELECT id,no_antes FROM padel_pairs WHERE event_id=? ORDER BY numero')
      return [
        [...pairs]
          .sort((a, b) => a.numero - b.numero)
          .map(({ id, no_antes }) => ({ id, no_antes })),
      ]
    if (sql === 'SELECT id FROM padel_pairs WHERE event_id=?') return [pairs.map(({ id }) => ({ id }))]
    if (sql === 'SELECT id,foto_url FROM padel_pairs WHERE event_id=?')
      return [pairs.map(({ id, foto_url }) => ({ id, foto_url }))]
    if (sql === 'SELECT * FROM padel_fixture WHERE event_id=?') return [fixture.map((m) => ({ ...m }))]
    if (sql === 'DELETE FROM padel_fixture WHERE event_id=?') {
      fixture = []
      return [{}]
    }
    if (
      sql ===
      'INSERT INTO padel_fixture (event_id,turno,cancha,minuto,pareja1,pareja2) VALUES (?,?,?,?,?,?)'
    ) {
      const [event_id, turno, cancha, minuto, pareja1, pareja2] = args
      fixture.push({ id: nextFixtureId++, event_id, turno, cancha, minuto, pareja1, pareja2, version: 0 })
      return [{ insertId: fixture.length }]
    }
    if (sql === 'SELECT pareja1,pareja2 FROM padel_fixture WHERE event_id=?')
      return [fixture.map(({ pareja1, pareja2 }) => ({ pareja1, pareja2 }))]
    throw Error(`Unexpected query: ${sql}`)
  }
  const db = {
    query,
    getConnection: async () => ({
      query,
      beginTransaction: async () => {},
      commit: async () => {},
      rollback: async () => {},
      release: () => {},
    }),
  }
  return {
    service: createPadelService(db),
    event,
    pairs: () => pairs,
    fixtureRows: () => fixture,
  }
}
test('pádel: inscripción, sorteo y votación con más de 14 parejas', async () => {
  const f = store()
  for (let i = 1; i <= 15; i++)
    await f.service.pair(
      1,
      null,
      { version: f.event.version, numero: i, jugador1: `Uno ${i}`, jugador2: `Dos ${i}` },
      admin
    )
  assert.equal(f.pairs().length, 15)
  await assert.rejects(
    f.service.voting(1, { version: f.event.version, estado: 'abierta' }, admin),
    /sorteo/
  )
  await f.service.draw(1, { version: f.event.version }, admin)
  assert.equal(f.fixtureRows().length, 15)
  for (const id of f.pairs().map((p) => p.id))
    assert.equal(f.fixtureRows().filter((m) => m.pareja1 === id || m.pareja2 === id).length, 2)
  await f.service.publish(1, { version: f.event.version }, admin)
  assert.equal(f.event.publicado, 1)
  await assert.rejects(
    f.service.voting(1, { version: f.event.version, estado: 'abierta' }, admin),
    /fotos/
  )
  for (const p of f.pairs()) p.foto_url = `/uploads/${p.id}.webp`
  await f.service.voting(1, { version: f.event.version, estado: 'abierta' }, admin)
  assert.equal(f.event.votacion, 'abierta')
})
test('pádel: sorteo por grupos desde el servicio asigna grupo a cada pareja', async () => {
  const f = store()
  Object.assign(f.event, {
    formato: 'grupos',
    duracion_partido: 15,
    tamano_grupo: 5,
    pausa_inicio: 525,
    pausa_fin: 540,
  })
  for (let i = 1; i <= 15; i++)
    await f.service.pair(
      1,
      null,
      { version: f.event.version, numero: i, jugador1: `Uno ${i}`, jugador2: `Dos ${i}` },
      admin
    )
  await f.service.draw(1, { version: f.event.version }, admin)
  assert.equal(f.fixtureRows().length, 30)
  const groups = new Map()
  for (const p of f.pairs()) {
    assert.ok([1, 2, 3].includes(p.grupo))
    if (!groups.has(p.grupo)) groups.set(p.grupo, [])
    groups.get(p.grupo).push(p.id)
  }
  assert.equal(groups.size, 3)
  for (const ids of groups.values()) {
    assert.equal(ids.length, 5)
    const matches = f
      .fixtureRows()
      .filter((m) => ids.includes(m.pareja1) && ids.includes(m.pareja2))
    assert.equal(matches.length, 10)
  }
  await f.service.publish(1, { version: f.event.version }, admin)
  assert.equal(f.event.publicado, 1)
})
