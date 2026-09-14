// Consulta pública de solo lectura. No importa DB, no usa credenciales y no escribe registros.
const plan = require('../scores-api/data/grupos-abierto-2026.json')
const assert = require('node:assert/strict')
async function run() {
  const response = await fetch('https://legal-branding.com/api/equipos?deporte=tenis')
  if (!response.ok) throw Error('No fue posible consultar parejas: ' + response.status)
  const body = await response.json()
  assert.equal(body.ok, true)
  assert.ok(Array.isArray(body.data))
  const teams = new Map(body.data.map(t => [t.id, t]))
  const expected = [2, 5, 13, 7, 3]
  const used = new Set()
  let slots = 0, matched = 0
  const differences = []
  plan.categorias.forEach((category, i) => {
    assert.equal(category.grupos.length, expected[i])
    category.grupos.forEach((group, g) => {
      assert.ok(group.length >= 2 && group.length <= 4)
      slots += group.length
      group.forEach((id, p) => {
        if (id === null) return
        assert.ok(!used.has(id), 'Pareja repetida: ' + id)
        used.add(id)
        const team = teams.get(id)
        assert.ok(team?.activo, 'Pareja ausente o inactiva: ' + id)
        matched++
        if (team.categoria?.id !== category.categoria_id)
          differences.push({ id, nombre: team.nombre, actual: team.categoria?.nombre, foto: category.nombre })
        console.log(`${category.nombre} ${g + 1}.${p + 1}: #${id} ${team.nombre}`)
      })
    })
  })
  assert.equal(slots, 116)
  assert.equal(matched, 115)
  console.log(JSON.stringify({ grupos: 30, plazasEnFotos: slots, parejasCotejadas: matched, pendientes: plan.pendientes, diferenciasCategoria: differences }, null, 2))
}
run().catch(e => { console.error(e.message); process.exitCode = 1 })
