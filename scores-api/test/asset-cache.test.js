const test = require('node:test')
const assert = require('node:assert/strict')
const { setAssetCacheHeaders } = require('../src/utils/assetCache')
test('solo archivos con hash son inmutables, logos e index no', () => {
  const headers = {}, res = { setHeader: (k,v) => { headers[k] = v } }
  setAssetCacheHeaders(res, '/app/dist/assets/index-aBcD1234.js')
  assert.match(headers['Cache-Control'], /immutable/)
  setAssetCacheHeaders(res, '/app/dist/sponsors/6.webp')
  assert.doesNotMatch(headers['Cache-Control'], /immutable/)
  setAssetCacheHeaders(res, '/app/dist/index.html')
  assert.equal(headers['Cache-Control'], 'no-store')
})

test('actualización de esquema no vuelve a ejecutar limpieza histórica de partidos', () => {
  const source = require('node:fs').readFileSync(require('node:path').join(__dirname, '../src/config/schema.js'), 'utf8')
  assert.doesNotMatch(source, /DELETE FROM partidos|runOneTimeMatchCleanup/)
})
