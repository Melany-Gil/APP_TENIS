const { randomInt } = require('node:crypto')
const fail = (message, status = 400) => {
  const e = new Error(message)
  e.status = status
  throw e
}
const integer = (value, min, max, label) => {
  if (
    value === '' ||
    value == null ||
    !Number.isInteger(Number(value)) ||
    Number(value) < min ||
    Number(value) > max
  )
    fail(`${label} inválido`)
  return Number(value)
}
const name = (value, label, max = 100) => {
  const s = typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : ''
  if (s.length < 2 || s.length > max || /[<>\x00-\x1f]/.test(s))
    fail(`${label}: escribe entre 2 y ${max} caracteres`)
  return s
}
function phone(value) {
  const raw = String(value || '').trim()
  if (!/^[+\d\s().-]+$/.test(raw)) fail('Escribe un teléfono válido')
  let digits = raw.replace(/\D/g, '')
  if (digits.length === 10 && !raw.startsWith('+')) digits = `57${digits}`
  if (!/^[1-9]\d{7,14}$/.test(digits))
    fail('Incluye el indicativo del país y el número de teléfono')
  if (digits.startsWith('57') && digits.length !== 12)
    fail('El número de Colombia debe tener 10 dígitos')
  return `+${digits}`
}
function eventInput(b) {
  const fecha = String(b.fecha || '')
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(fecha) ||
    !Number.isFinite(Date.parse(fecha)) ||
    new Date(fecha).toISOString().slice(0, 10) !== fecha
  )
    fail('Fecha inválida')
  const out = {
    nombre: name(b.nombre, 'Nombre del evento', 120),
    fecha,
    cancha1: name(b.cancha1 == null || b.cancha1 === '' ? 'Pádel 1' : b.cancha1, 'Cancha 1', 80),
    cancha2: name(b.cancha2 == null || b.cancha2 === '' ? 'Pádel 2' : b.cancha2, 'Cancha 2', 80),
  }
  if (out.cancha1.toLowerCase() === out.cancha2.toLowerCase())
    fail('Selecciona dos canchas distintas')
  for (const key of ['inicio', 'pausa_inicio', 'pausa_fin', 'cierre'])
    out[key] = integer(b[key], 0, 1439, 'Horario')
  if (!(
    out.inicio < out.pausa_inicio &&
    out.pausa_inicio < out.pausa_fin &&
    out.pausa_fin < out.cierre
  ))
    fail('Revisa el orden de los horarios')
  slots(out)
  return out
}
function slots(e) {
  const turns = []
  let t = Number(e.inicio)
  while (turns.length < 7 && t + 20 <= Number(e.cierre)) {
    if (t < e.pausa_fin && t + 25 > e.pausa_inicio) {
      t = Number(e.pausa_fin)
      continue
    }
    turns.push(t)
    t += 25
  }
  if (turns.length < 7)
    fail('No caben los siete turnos de 20 minutos y sus rotaciones en este horario')
  return turns
}
function shuffle(values, rng = randomInt) {
  const a = [...values]
  for (let i = a.length - 1; i > 0; i--) {
    const j = rng(i + 1)
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}
function drawFixture(ids, event, rng = randomInt) {
  if (ids.length !== 14 || new Set(ids).size !== 14)
    fail('El sorteo requiere 14 parejas diferentes')
  const times = slots(event)
  const a = shuffle(ids, rng)
  // Two alternating matchings of a shuffled cycle give each pair two distinct rivals.
  const edges = [0, 1].flatMap((offset) =>
    Array.from({ length: 7 }, (_, k) => [a[k * 2 + offset], a[(k * 2 + offset + 1) % 14]])
  )
  const used = new Set(),
    last = new Map(),
    output = []
  for (let turn = 0; turn < 7; turn++) {
    let best = null,
      score = -Infinity
    for (let i = 0; i < edges.length; i++)
      for (let j = i + 1; j < edges.length; j++) {
        if (used.has(i) || used.has(j) || new Set([...edges[i], ...edges[j]]).size !== 4) continue
        const rest = [...edges[i], ...edges[j]].reduce(
          (n, id) => n + (last.has(id) ? turn - last.get(id) : 5),
          0
        )
        if (rest > score) {
          score = rest
          best = [i, j]
        }
      }
    // A different shuffle resolves a rare final-slot conflict; bounded by the caller below.
    if (!best) return null
    best.forEach((idx, court) => {
      used.add(idx)
      edges[idx].forEach((id) => last.set(id, turn))
      output.push({
        turno: turn + 1,
        cancha: court + 1,
        minuto: times[turn],
        pareja1: edges[idx][0],
        pareja2: edges[idx][1],
      })
    })
  }
  return output
}
function generateFixture(ids, event, rng) {
  for (let i = 0; i < 100; i++) {
    const result = drawFixture(ids, event, rng)
    if (result) return result
  }
  fail('No se pudo completar el sorteo. Intenta de nuevo.', 503)
}
function resultInput(b) {
  const out = {
    s1a: integer(b.s1a, 0, 20, 'Juegos del set 1'),
    s1b: integer(b.s1b, 0, 20, 'Juegos del set 1'),
    s2a: null,
    s2b: null,
  }
  if ((b.s2a != null && b.s2a !== '') || (b.s2b != null && b.s2b !== '')) {
    out.s2a = integer(b.s2a, 0, 20, 'Juegos del set 2')
    out.s2b = integer(b.s2b, 0, 20, 'Juegos del set 2')
  }
  if (!['tiempo', 'dos_sets'].includes(b.motivo)) fail('Selecciona el motivo de cierre')
  const completed = (a, b) =>
    (Math.max(a, b) === 6 && Math.min(a, b) <= 4) ||
    (Math.max(a, b) === 7 && [5, 6].includes(Math.min(a, b)))
  if (out.s2a != null && !completed(out.s1a, out.s1b))
    fail('El primer set debe estar completo para registrar el segundo')
  if (b.motivo === 'dos_sets' && (out.s2a == null || !completed(out.s2a, out.s2b)))
    fail('Registra los dos sets completos o selecciona cierre por tiempo')
  return { ...out, motivo: b.motivo }
}
module.exports = {
  fail,
  integer,
  name,
  phone,
  eventInput,
  slots,
  shuffle,
  generateFixture,
  resultInput,
}
