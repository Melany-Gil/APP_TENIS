const test = require('node:test'),
  assert = require('node:assert/strict')
function load(fake) {
  const p = require.resolve('../src/config/db')
  require.cache[p] = { id: p, filename: p, loaded: true, exports: fake }
  for (const module of [
    '../src/modules/torneos/grupos.service',
    '../src/modules/posiciones/posiciones.service',
  ])
    delete require.cache[require.resolve(module)]
  return require('../src/modules/torneos/grupos.service')
}
const memberships = [
  { equipo_id: 1, categoria_id: 3, grupo: 'Grupo 1' },
  { equipo_id: 2, categoria_id: 3, grupo: 'Grupo 1' },
  { equipo_id: 3, categoria_id: 3, grupo: 'Grupo 2' },
]
const match = {
  id: 5,
  torneo_id: 8,
  categoria_id: 3,
  grupo: 'Grupo 1',
  fase: 'grupos',
  equipo1_id: 1,
  equipo2_id: 2,
}
const fake = (duplicate = false) => ({
  query: async (sql) => {
    if (sql.includes('SELECT sistema')) return [[{ sistema: 'grupos_eliminacion' }]]
    if (sql.includes('FROM torneo_grupo_parejas')) return [memberships]
    if (sql.includes('FROM equipos_padel'))
      return [
        [
          { jugador1_id: 11, jugador2_id: 12 },
          { jugador1_id: 13, jugador2_id: 14 },
        ],
      ]
    if (sql.includes('FROM partidos')) return [duplicate ? [{ id: 6 }] : []]
    throw Error(sql)
  },
})
test('grupos: acepta solo cruces del mismo grupo y categoría', async () => {
  const db = fake(),
    svc = load(db)
  assert.equal(await svc.validateMatch(match, db), true)
  for (const wrong of [
    { equipo2_id: 3 },
    { categoria_id: 4 },
    { grupo: 'Grupo 2' },
    { equipo2_id: 99 },
    { origen_partido1_id: 12 },
  ])
    await assert.rejects(svc.validateMatch({ ...match, ...wrong }, db), (e) => e.status === 409)
})
test('grupos: rechaza cruce duplicado y jugador en ambos lados', async () => {
  let db = fake(true),
    svc = load(db)
  await assert.rejects(svc.validateMatch(match, db), (e) => /ya existe/.test(e.message))
  db = {
    query: async (sql) =>
      sql.includes('FROM equipos_padel')
        ? [
            [
              { jugador1_id: 11, jugador2_id: 12 },
              { jugador1_id: 12, jugador2_id: 13 },
            ],
          ]
        : fake().query(sql),
  }
  await assert.rejects(svc.validateMatch(match, db), (e) => /ambos lados/.test(e.message))
})
test('grupos: eliminatoria puede cruzar grupos pero nunca categorías', async () => {
  const db = fake(),
    svc = load(db)
  assert.equal(await svc.validateMatch({ ...match, fase: 'eliminacion', equipo2_id: 3 }, db), true)
  await assert.rejects(
    svc.validateMatch({ ...match, fase: 'eliminacion', categoria_id: 1 }, db),
    (e) => e.status === 409
  )
})
test('grupos: duplicados y nombres inválidos se rechazan antes de abrir transacción', async () => {
  const svc = load({
    getConnection: () => {
      throw Error('No debe conectar')
    },
  })
  for (const groups of [
    [{ categoria_id: 3, nombre: 'A', equipo_ids: [1, 1] }],
    [
      { categoria_id: 3, nombre: 'A', equipo_ids: [] },
      { categoria_id: 3, nombre: 'a', equipo_ids: [] },
    ],
    [{ categoria_id: 3, nombre: ' ', equipo_ids: [] }],
  ])
    await assert.rejects(svc.save(8, groups), (e) => e.status === 400)
})
test('grupos: conserva resultados y bloquea redistribuir un partido válido', async () => {
  let rollback = false,
    writes = 0
  const conn = {
    beginTransaction: async () => {},
    commit: async () => {},
    rollback: async () => {
      rollback = true
    },
    release: () => {},
    query: async (sql) => {
      if (sql.includes('FROM torneos'))
        return [
          [
            {
              id: 8,
              deporte: 'tenis',
              modalidad: 'dobles',
              sistema: 'grupos_eliminacion',
              estado: 'en_curso',
            },
          ],
        ]
      if (sql.includes('FROM categorias')) return [[{ id: 3 }]]
      if (sql.includes('FROM inscripciones')) return [[{ equipo_id: 1 }, { equipo_id: 2 }]]
      if (sql.includes('FROM torneo_grupo_parejas')) return [memberships]
      if (sql.includes('FROM torneo_grupos')) return [[{ categoria_id: 3, nombre: 'Grupo 1' }]]
      if (sql.includes('FROM partidos')) return [[match]]
      writes++
      return [{}]
    },
  }
  const svc = load({ getConnection: async () => conn })
  await assert.rejects(
    svc.save(
      8,
      [{ categoria_id: 3, nombre: 'Otro grupo', equipo_ids: [1, 2] }],
      svc.revision([{ categoria_id: 3, nombre: 'Grupo 1' }], memberships)
    ),
    (e) => e.status === 409 && /alteraría/.test(e.message)
  )
  assert.equal(writes, 0)
  assert.equal(rollback, true)
})
test('posiciones: incluye inscritos sin partidos y separa pendientes e incidencias', async () => {
  const db = {
    query: async (sql) => {
      if (sql.includes('FROM torneos'))
        return [[{ id: 8, deporte: 'tenis', modalidad: 'dobles', sistema: 'grupos_eliminacion' }]]
      if (sql.includes('FROM torneo_grupos'))
        return [
          [
            { categoria_id: 3, nombre: 'Grupo 1' },
            { categoria_id: 3, nombre: 'Grupo 2' },
          ],
        ]
      if (sql.includes('FROM torneo_grupo_parejas')) return [memberships]
      if (sql.includes('FROM partidos p'))
        return [
          [
            {
              id: 5,
              p1_id: 1,
              p2_id: 3,
              categoria_id: 3,
              categoria_nombre: '4ta',
              fase: 'grupos',
              grupo: 'Grupo 1',
              estado: 'finalizado',
              ganador: 'jugador1',
            },
          ],
        ]
      if (sql.includes('FROM partidos')) return [[{ ...match, equipo2_id: 3 }]]
      if (sql.includes('FROM categorias')) return [[{ id: 3, nombre: '4ta' }]]
      if (sql.includes('FROM inscripciones'))
        return [[1, 2, 3, 4].map((equipo_id) => ({ equipo_id }))]
      if (sql.includes('FROM equipos_padel'))
        return [[1, 2, 3, 4].map((id) => ({ id, nombre: 'Pareja ' + id }))]
      throw Error(sql)
    },
  }
  load(db)
  const r = await require('../src/modules/posiciones/posiciones.service').getByTorneo(8)
  assert.equal(r.grupos['4ta · Grupo 1'].length, 2)
  assert.equal(r.grupos['4ta · Grupo 2'].length, 1)
  assert.equal(r.grupos['4ta · Grupo 1'][0].pj, 0)
  assert.deepEqual(
    r.sin_grupo.map((p) => p.id),
    [4]
  )
  assert.equal(r.incidencias.length, 1)
})
test('grupos: revisión antigua no sobrescribe distribución y guardado confirmado es atómico', async () => {
  let storedGroups = [],
    storedPairs = [],
    commits = 0,
    rollbacks = 0
  const writes = []
  const conn = {
    beginTransaction: async () => {},
    commit: async () => {
      commits++
    },
    rollback: async () => {
      rollbacks++
    },
    release: () => {},
    query: async (sql, args) => {
      if (sql.includes('FROM torneos'))
        return [
          [
            {
              id: 8,
              deporte: 'tenis',
              modalidad: 'dobles',
              sistema: 'grupos_eliminacion',
              estado: 'proximo',
            },
          ],
        ]
      if (sql.includes('FROM categorias')) return [[{ id: 3 }]]
      if (sql.startsWith('SELECT') && sql.includes('FROM torneo_grupo_parejas'))
        return [storedPairs]
      if (sql.startsWith('SELECT') && sql.includes('FROM torneo_grupos')) return [storedGroups]
      if (sql.includes('FROM inscripciones')) return [[{ equipo_id: 1 }, { equipo_id: 2 }]]
      if (sql.includes('FROM partidos')) return [[]]
      writes.push(sql)
      if (sql.startsWith('DELETE FROM torneo_grupo_parejas')) storedPairs = []
      if (sql.startsWith('DELETE FROM torneo_grupos')) storedGroups = []
      if (sql.startsWith('INSERT INTO torneo_grupos '))
        storedGroups.push({ categoria_id: args[1], nombre: args[2] })
      if (sql.startsWith('INSERT INTO torneo_grupo_parejas'))
        storedPairs.push({ equipo_id: args[1], categoria_id: args[2], grupo: args[3] })
      return [{}]
    },
  }
  const svc = load({ getConnection: async () => conn, query: conn.query })
  const proposed = [{ categoria_id: 3, nombre: 'Grupo 1', equipo_ids: [1, 2] }]
  await assert.rejects(
    svc.save(8, proposed, 'old'),
    (e) => e.status === 409 && /cambió/.test(e.message)
  )
  assert.equal(writes.length, 0)
  const r = await svc.save(8, proposed, svc.revision([], []))
  assert.equal(commits, 1)
  assert.equal(rollbacks, 1)
  assert.deepEqual(r.grupos[0].equipo_ids, [1, 2])
  assert.equal(
    writes.some((q) => /partidos|jugadores/.test(q)),
    false
  )
})
test('partidos de dobles devuelven las cuatro fotos sin documentos ni correos', async () => {
  const row = {
    id: 1,
    deporte: 'tenis',
    estado: 'programado',
    torneo_modalidad: 'dobles',
    e1_id: 1,
    e1_nombre: 'A / B',
    e2_id: 2,
    e2_nombre: 'C / D',
  }
  for (const side of [1, 2])
    for (const p of [1, 2]) {
      const k = `tp${side}${p}`
      Object.assign(row, {
        [k + '_id']: side * 10 + p,
        [k + '_nombre']: 'Nombre',
        [k + '_apellido']: 'Apellido',
        [k + '_foto']: `/foto-${side}${p}.jpg`,
      })
    }
  load({
    query: async (sql) => {
      if (sql.includes('FROM partidos p')) return [[row]]
      if (sql.includes('FROM sets_partido')) return [[]]
      throw Error(sql)
    },
  })
  const path = require.resolve('../src/modules/matches/matches.service')
  delete require.cache[path]
  const [r] = await require(path).getAll({})
  for (const side of [1, 2])
    for (const p of [1, 2])
      assert.equal(r['equipo' + side]['jugador' + p].foto, `/foto-${side}${p}.jpg`)
  assert.equal(JSON.stringify(r).includes('numero_documento'), false)
  assert.equal(JSON.stringify(r).includes('email'), false)
})
