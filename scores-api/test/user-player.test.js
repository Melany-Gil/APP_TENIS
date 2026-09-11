const test = require('node:test')
const assert = require('node:assert/strict')
const { preparePlayer } = require('../src/modules/users/userPlayer')
const account = { nombre: 'Ana', apellido: 'García' }
test('vincula solo un jugador real, activo y sin cuenta, bajo bloqueo', async () => {
  const calls = []
  const conn = { async query(sql, params) {
    calls.push({ sql, params })
    if (sql.startsWith('SELECT')) return [[{ id: 7, activo: 1, user_id: null }]]
    return [{ affectedRows: 1 }]
  } }
  const link = await preparePlayer(conn, { modo: 'existente', id: 7 }, account)
  assert.match(calls[0].sql, /FOR UPDATE/)
  await link(20)
  assert.match(calls[1].sql, /AND user_id IS NULL/)
  assert.deepEqual(calls[1].params, [20, 7])
})
test('rechaza jugador inexistente, inactivo, vinculado y IDs inválidos', async () => {
  for (const row of [null, { id: 7, activo: 0 }, { id: 7, activo: 1, user_id: 99 }]) {
    const conn = { query: async () => [row ? [row] : []] }
    await assert.rejects(preparePlayer(conn, { modo: 'existente', id: 7 }, account))
  }
  await assert.rejects(preparePlayer({}, { modo: 'existente', id: '1 OR 1' }, account), { status: 400 })
})
test('jugador nuevo comparte nombres con cuenta, categoría opcional y vínculo único', async () => {
  const calls = []
  const conn = { async query(sql, params) { calls.push({ sql, params }); return sql.startsWith('SELECT') ? [[]] : [{ insertId: 7 }] } }
  await (await preparePlayer(conn, { modo: 'nuevo', deporte: 'tenis' }, account))(20)
  assert.deepEqual(calls.at(-1).params, [20, 'Ana', 'García', 'tenis', null])
})
test('avisa de duplicados y rechaza categorías incompatibles sin crear nada', async () => {
  await assert.rejects(preparePlayer({ query: async () => [[{ id: 7 }]] }, { modo: 'nuevo', deporte: 'tenis' }, account), { status: 409 })
  await assert.rejects(preparePlayer({ query: async () => [[{ deporte: 'padel' }]] }, { modo: 'nuevo', deporte: 'tenis', categoria_id: 1 }, account), { status: 400 })
})

test('cuenta y jugador se confirman juntos y se revierten juntos cuando falla el vínculo', async () => {
  const dbPath = require.resolve('../src/config/db'), servicePath = require.resolve('../src/modules/users/users.service')
  for (const failLink of [false, true]) {
    const calls = []
    const conn = {
      async beginTransaction() { calls.push('begin') }, async commit() { calls.push('commit') },
      async rollback() { calls.push('rollback') }, release() { calls.push('release') },
      async query(sql) {
        calls.push(sql)
        if (sql.includes('FROM jugadores WHERE id')) return [[{ id: 7, activo: 1, user_id: null }]]
        if (sql.startsWith('INSERT INTO users')) return [{ insertId: 20 }]
        if (sql.startsWith('UPDATE jugadores')) { if (failLink) throw new Error('simulated link failure'); return [{ affectedRows: 1 }] }
        if (sql.startsWith('SELECT')) return [[]]
        throw new Error('Unexpected query')
      },
    }
    require.cache[dbPath] = { id: dbPath, filename: dbPath, loaded: true, exports: {
      getConnection: async () => conn,
      async query(sql) {
        if (sql.includes('information_schema')) return [[{ total: 1 }]]
        assert.ok(calls.includes('commit'), 'No leer cuenta con conexión externa antes de confirmar')
        return [[{ id: 20, activo: 1, rol: 'miembro', jugador_id: 7 }]]
      },
    } }
    delete require.cache[servicePath]
    const service = require(servicePath)
    const operation = service.create({ ...account, usuario: 'ana.garcia', password: 'Secret123', rol: 'miembro', jugador: { modo: 'existente', id: 7 } })
    if (failLink) { await assert.rejects(operation); assert.ok(calls.includes('rollback')); assert.equal(calls.includes('commit'), false) }
    else { const result = await operation; assert.equal(result.jugador.id, 7); assert.ok(calls.includes('commit')) }
    assert.equal(calls.at(-1), 'release')
  }
})
