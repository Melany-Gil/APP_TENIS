const test = require('node:test')
const assert = require('node:assert/strict')
const realtime = require('../src/modules/matches/match-realtime')

test('versiones no colisionan y polling invalida todos los partidos modificados', () => {
  const versions = new Set([realtime.getVersion().version])
  for (let i = 0; i < 100; i++) {
    realtime.publishMatchChange({ matchId: i % 2 + 1 })
    const next = realtime.getVersion()
    assert.equal(next.matchId, null)
    assert.ok(!versions.has(next.version))
    versions.add(next.version)
  }
})
