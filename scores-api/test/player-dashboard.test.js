const test = require('node:test')
const assert = require('node:assert/strict')
const dbPath = require.resolve('../src/config/db')
const servicePath = require.resolve('../src/modules/matches/matches.service')

function serviceWith(query) {
  require.cache[dbPath] = { id: dbPath, filename: dbPath, loaded: true, exports: { query } }
  delete require.cache[servicePath]
  return require(servicePath)
}

test('el panel requiere una vinculación real y no busca jugadores por nombre', async () => {
  const service = serviceWith(async (sql, values) => {
    assert.match(sql, /WHERE user_id = \?/)
    assert.deepEqual(values, [90])
    return [[]]
  })
  await assert.rejects(service.getMyMatches(90), e => e.status === 404)
})

test('el panel incluye individuales y los dos puestos de ambas parejas con el resultado correcto', async () => {
  const service = serviceWith(async (sql, values) => {
    if (sql.includes('WHERE user_id =')) return [[{ id: 8, nombre: 'Ana', apellido: 'Prueba' }]]
    if (sql.includes('FROM sets_partido')) return [[]]
    for (const column of ['p.jugador1_id', 'p.jugador2_id', 'e1.jugador1_id', 'e1.jugador2_id', 'e2.jugador1_id', 'e2.jugador2_id']) {
      assert.ok(sql.includes(`${column} = ?`))
    }
    assert.deepEqual(values, Array(6).fill(8))
    return [[
      { id: 1, estado: 'finalizado', ganador: 'jugador1', j1_id: 8 },
      { id: 2, estado: 'finalizado', ganador: 'jugador1', e1_id: 1, e2_id: 2, e1_jugador2_id: 8 },
      { id: 3, estado: 'finalizado', ganador: 'jugador1', e1_id: 1, e2_id: 2, e1_jugador2_id: 9 },
      { id: 4, estado: 'finalizado', ganador: null, j2_id: 8 },
      { id: 5, estado: 'cancelado', j1_id: 8 },
    ]]
  })
  const result = await service.getMyMatches(90)
  assert.deepEqual(result.historial.map(m => m.resultado), ['victoria', 'victoria', 'derrota', 'sin_resultado'])
  assert.deepEqual(result.historial.map(m => m.mi_lado), ['jugador1', 'jugador1', 'jugador2', 'jugador2'])
})
