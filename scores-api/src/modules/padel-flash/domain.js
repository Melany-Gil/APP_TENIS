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
const MIN_PAREJAS = 4
const MAX_PAREJAS = 60
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
  return out
}
const clock = (m) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`
function slots(e, turnsNeeded) {
  const turns = []
  let t = Number(e.inicio)
  while (turns.length < turnsNeeded && t + 20 <= Number(e.cierre)) {
    if (t < e.pausa_fin && t + 25 > e.pausa_inicio) {
      t = Number(e.pausa_fin)
      continue
    }
    turns.push(t)
    t += 25
  }
  if (turns.length < turnsNeeded) {
    while (turns.length < turnsNeeded) {
      if (t < e.pausa_fin && t + 25 > e.pausa_inicio) {
        t = Number(e.pausa_fin)
        continue
      }
      turns.push(t)
      t += 25
    }
    const minCierre = turns[turns.length - 1] + 20
    fail(
      `No caben los ${turnsNeeded} turnos de 20 minutos y sus rotaciones en este horario. Amplía el cierre del evento hasta al menos las ${clock(minCierre)}, o reduce la pausa.`
    )
  }
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
  const n = ids.length
  if (n < MIN_PAREJAS || n > MAX_PAREJAS || new Set(ids).size !== n)
    fail(`El sorteo requiere entre ${MIN_PAREJAS} y ${MAX_PAREJAS} parejas diferentes`)
  const turnsNeeded = Math.ceil(n / 2)
  const times = slots(event, turnsNeeded)
  const a = shuffle(ids, rng)
  // A shuffled cycle gives every pair exactly two distinct rivals, for any N.
  const edges = Array.from({ length: n }, (_, k) => [a[k], a[(k + 1) % n]])
  const used = new Set(),
    last = new Map(),
    output = []
  for (let turn = 0; turn < turnsNeeded; turn++) {
    const free = []
    for (let i = 0; i < edges.length; i++) if (!used.has(i)) free.push(i)
    let best
    if (free.length === 1) {
      best = [free[0]]
    } else {
      best = null
      let score = -Infinity
      for (let x = 0; x < free.length; x++)
        for (let y = x + 1; y < free.length; y++) {
          const i = free[x],
            j = free[y]
          if (new Set([...edges[i], ...edges[j]]).size !== 4) continue
          const rest = [...edges[i], ...edges[j]].reduce(
            (sum, id) => sum + (last.has(id) ? turn - last.get(id) : 5),
            0
          )
          if (rest > score) {
            score = rest
            best = [i, j]
          }
        }
      // A different shuffle resolves a rare conflict; bounded by the caller below.
      if (!best) return null
    }
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
  MIN_PAREJAS,
  MAX_PAREJAS,
}
