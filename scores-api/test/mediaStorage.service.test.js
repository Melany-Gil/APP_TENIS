const test = require('node:test')
const assert = require('node:assert/strict')

const dbPath = require.resolve('../src/config/db')
const servicePath = require.resolve('../src/modules/media/mediaStorage.service')

test('fallback real limita rutas, sirve GET/HEAD y distingue caída de BD de un 404', async () => {
  let fail = false, reads = 0
  const service = loadService({ async query() { reads++; if (fail) throw Error('offline'); return [[{ data: Buffer.from('photo'), mime_type: 'image/webp', size: 5 }]] } })
  const fallbackPath = require.resolve('../src/modules/media/mediaFallback')
  delete require.cache[fallbackPath]
  const fallback = require(fallbackPath)
  const run = async (path, method = 'GET') => {
    const response = { headers: {}, code: 200, setHeader(k, v) { this.headers[k] = v }, status(code) { this.code = code; return this }, sendStatus(code) { this.code = code }, send(body) { this.body = body }, end() { this.ended = true } }
    await fallback({ path, method }, response, () => { response.next = true })
    return response
  }
  assert.equal((await run('/avatars/a.webp')).body.toString(), 'photo')
  assert.equal((await run('/avatars/a.webp', 'HEAD')).ended, true)
  const before = reads
  assert.equal((await run('/../secret')).code, 404)
  assert.equal(reads, before)
  fail = true
  const unavailable = await run('/avatars/a.webp')
  assert.equal(unavailable.code, 503)
  assert.equal(unavailable.headers['Cache-Control'], 'no-store')
})

const loadService = (fakeDb) => {
  delete require.cache[servicePath]
  require.cache[dbPath] = {
    id: dbPath,
    filename: dbPath,
    loaded: true,
    exports: fakeDb,
  }
  return require(servicePath)
}

test('mediaStorage: save almacena el buffer, mimetype y tamaño en media_storage', async () => {
  let executedQuery = null
  let executedParams = null

  const fakeDb = {
    async query(sql, params) {
      executedQuery = sql
      executedParams = params
      return [{ affectedRows: 1 }]
    },
  }

  const service = loadService(fakeDb)
  const testBuffer = Buffer.from('fake-image-bytes')
  await service.save('/uploads/avatars/user-1.webp', testBuffer, 'image/webp')

  assert.ok(executedQuery.includes('INSERT INTO media_storage'))
  assert.equal(executedParams[0], '/uploads/avatars/user-1.webp')
  assert.equal(executedParams[1], 'image/webp')
  assert.deepEqual(executedParams[2], testBuffer)
  assert.equal(executedParams[3], testBuffer.length)
})

test('mediaStorage: get devuelve buffer y mimetype si existe el archivo', async () => {
  const fakeDb = {
    async query(sql, params) {
      if (params[0] === '/uploads/avatars/found.webp') {
        return [[{
          mime_type: 'image/webp',
          data: Buffer.from('found-image-content'),
          size: 19,
        }]]
      }
      return [[]]
    },
  }

  const service = loadService(fakeDb)
  const result = await service.get('/uploads/avatars/found.webp')
  assert.ok(result)
  assert.equal(result.mimeType, 'image/webp')
  assert.equal(result.data.toString(), 'found-image-content')
  assert.equal(result.size, 19)

  const notFound = await service.get('/uploads/avatars/missing.webp')
  assert.equal(notFound, null)
})

test('mediaStorage: delete ejecuta DELETE en la tabla media_storage', async () => {
  let deletedPath = null
  const fakeDb = {
    async query(sql, params) {
      if (sql.includes('DELETE FROM media_storage')) {
        deletedPath = params[0]
      }
      return [{ affectedRows: 1 }]
    },
  }

  const service = loadService(fakeDb)
  await service.delete('/uploads/avatars/old.webp')
  assert.equal(deletedPath, '/uploads/avatars/old.webp')
})
