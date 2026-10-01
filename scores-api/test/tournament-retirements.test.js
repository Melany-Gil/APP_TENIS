const test = require('node:test')
const assert = require('node:assert/strict')
const dbPath = require.resolve('../src/config/db')
const servicePath = require.resolve('../src/modules/torneos/retiros.service')
function load(db) {
  require.cache[dbPath] = { id: dbPath, filename: dbPath, loaded: true, exports: db }
  delete require.cache[servicePath]
  return require(servicePath)
}

test('retiro es por torneo y no filtra motivos ni actores al público', async () => {
  const svc = load({
    query: async (sql, args) => {
      if (sql.includes('FROM torneo_retiros'))
        return [
          args[0] === 1
            ? [
                {
                  tipo: 'jugador',
                  participante_id: 4,
                  retirado: 1,
                  version: 2,
                  motivo: 'Privado',
                  actor_id: 7,
                },
              ]
            : [],
        ]
      return [[{ id: 12 }]]
    },
  })
  const data = await svc.get(1)
  assert.deepEqual(data.jugadores, [4])
  assert.deepEqual(data.parejas, [12])
  assert.ok(!JSON.stringify(data).includes('Privado'))
  assert.ok(!JSON.stringify(data).includes('actor_id'))
  await assert.rejects(
    svc.assertAvailable({ torneo_id: 1, equipo1_id: 12 }),
    (e) => e.status === 409
  )
  await svc.assertAvailable({ torneo_id: 2, equipo1_id: 12 })
  await svc.assertAvailable({ equipo1_id: 12 })
  assert.equal(await svc.eligibleWinner({ torneo_id: 1 }, 'equipo', 12), null)
  assert.equal(await svc.eligibleWinner({ torneo_id: 2 }, 'equipo', 12), 12)
})

test('retiro conserva edición histórica pero bloquea nuevas asignaciones y cambios de lado', async () => {
  const svc = load({
    query: async () => [[{ tipo: 'pareja', participante_id: 12, retirado: 1, version: 1 }]],
  })
  const previous = { torneo_id: 1, equipo1_id: 12, equipo2_id: 13 }
  await svc.assertAvailable({ ...previous }, undefined, previous)
  await assert.rejects(
    svc.assertAvailable({ ...previous, equipo2_id: 12 }, undefined, previous),
    (e) => e.status === 409
  )
  await assert.rejects(svc.assertAvailable(previous), (e) => e.status === 409)
})

test('solo administración puede retirar y el motivo es obligatorio', async () => {
  const svc = load({
    getConnection: () => {
      throw Error('No debe acceder a la BD')
    },
  })
  const body = { tipo: 'pareja', participante_id: 12, retirado: true, version: 0, motivo: 'Motivo' }
  for (const rol of ['juez', 'juez_director', 'miembro', 'jugador'])
    await assert.rejects(svc.set(1, body, { id: 1, rol }), (e) => e.status === 403)
  await assert.rejects(
    svc.set(1, { ...body, motivo: ' ' }, { id: 1, rol: 'admin' }),
    (e) => e.status === 400
  )
  await assert.rejects(
    svc.set(1, { ...body, version: -1 }, { id: 1, rol: 'admin' }),
    (e) => e.status === 400
  )
})

for (const scenario of ['retiro', 'reactivacion', 'jugador_retirado', 'conflicto', 'ajeno', 'fallo_auditoria']) {
  test(`estado y auditoría son atómicos: ${scenario}`, async () => {
    let commits = 0,
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
        if (sql.includes('FROM torneos')) return [[{ id: 1 }]]
        if (sql.includes('SELECT r.participante_id')) return [scenario === 'jugador_retirado' ? [{ participante_id: 4 }] : []]
        if (sql.includes('FROM equipos_padel'))
          return [
            scenario === 'ajeno'
              ? []
              : [{ id: 12, nombre: 'Equipo', jugador1_id: 4, jugador2_id: 5 }],
          ]
        if (sql.includes('FROM jugadores')) return [[]]
        if (sql.includes('FROM partidos')) return [[]]
        if (sql.includes('FROM auditoria_retiros')) return [[]]
        if (sql.includes('SELECT retirado,version'))
          return [
            scenario === 'reactivacion' || scenario === 'conflicto'
              ? [{ retirado: 1, version: 1 }]
              : [],
          ]
        if (sql.startsWith('INSERT')) {
          writes.push({ sql, args })
          if (scenario === 'fallo_auditoria' && sql.includes('auditoria_retiros'))
            throw Error('DB error')
          return [{}]
        }
        if (sql.startsWith('DELETE FROM torneo_grupo_parejas')) {
          writes.push({ sql, args })
          return [{ affectedRows: 1 }]
        }
        throw Error(`Consulta inesperada: ${sql}`)
      },
    }
    const svc = load({ getConnection: async () => conn })
    const call = svc.set(
      1,
      {
        tipo: 'pareja',
        participante_id: 12,
        retirado: !['reactivacion', 'jugador_retirado'].includes(scenario),
        version: scenario === 'reactivacion' ? 1 : 0,
        motivo: 'Motivo privado',
      },
      { id: 7, rol: 'admin' }
    )
    if (['conflicto', 'ajeno', 'fallo_auditoria', 'jugador_retirado'].includes(scenario)) {
      await assert.rejects(call)
      assert.equal(commits, 0)
      assert.equal(rollbacks, 1)
      if (scenario !== 'fallo_auditoria') assert.equal(writes.length, 0)
    } else {
      await call
      assert.equal(commits, 1)
      assert.equal(rollbacks, 0)
      const expectedWrites = scenario === 'reactivacion' ? 2 : 4
      assert.equal(writes.length, expectedWrites)
      assert.deepEqual(writes[1].args, [
        1,
        'pareja',
        12,
        7,
        scenario !== 'reactivacion',
        'Motivo privado',
      ])
      if (scenario !== 'reactivacion') {
        assert.ok(writes[2].sql.includes('INSERT IGNORE INTO torneo_grupo_historial'))
        assert.deepEqual(writes[2].args, [1, 12])
        assert.ok(writes[3].sql.includes('DELETE FROM torneo_grupo_parejas'))
        assert.deepEqual(writes[3].args, [1, 12])
      }
    }
    assert.ok(writes.every((w) => !/DELETE FROM (partidos|jugadores)|UPDATE (partidos|jugadores)/.test(w.sql)))
  })
}

test('auditoria de retiros incluye nombre del actor y del participante', async () => {
  const svc = load({
    query: async (sql, args) => {
      assert.ok(sql.includes('LEFT JOIN users'))
      assert.ok(sql.includes('participante_nombre'))
      assert.deepEqual(args, [1])
      return [
        [
          {
            id: 5,
            tipo: 'pareja',
            participante_id: 12,
            actor_id: 7,
            retirado: 1,
            motivo: 'Lesión',
            actor_nombre: 'Admin Juan',
            participante_nombre: 'Equipo A',
          },
        ],
      ]
    },
  })
  const rows = await svc.audit(1)
  assert.equal(rows.length, 1)
  assert.equal(rows[0].actor_nombre, 'Admin Juan')
  assert.equal(rows[0].participante_nombre, 'Equipo A')
})
