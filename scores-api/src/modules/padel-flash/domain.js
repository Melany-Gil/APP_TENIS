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
const MIN_GRUPO = 3
const MAX_GRUPO = 5
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
  out.inicio = integer(b.inicio, 0, 1439, 'Horario')
  const conPausa = [b.pausa_inicio, b.pausa_fin].some((v) => v !== '' && v != null)
  out.pausa_inicio = conPausa ? integer(b.pausa_inicio, 0, 1439, 'Horario') : null
  out.pausa_fin = conPausa ? integer(b.pausa_fin, 0, 1439, 'Horario') : null
  out.cierre = integer(b.cierre, 0, 1439, 'Horario')
  out.formato = b.formato === 'grupos' ? 'grupos' : 'individual'
  out.duracion_partido = integer(
    b.duracion_partido === '' || b.duracion_partido == null ? 20 : b.duracion_partido,
    10,
    60,
    'Duración del partido'
  )
  out.tamano_grupo =
    out.formato === 'grupos'
      ? integer(
          b.tamano_grupo === '' || b.tamano_grupo == null ? 5 : b.tamano_grupo,
          MIN_GRUPO,
          MAX_GRUPO,
          'Tamaño de grupo'
        )
      : null
  if (
    conPausa
      ? !(
          out.inicio < out.pausa_inicio &&
          out.pausa_inicio < out.pausa_fin &&
          out.pausa_fin < out.cierre
        )
      : !(out.inicio < out.cierre)
  )
    fail('Revisa el orden de los horarios')
  return out
}
const clock = (m) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`
function slots(e, turnsNeeded, duration = 20, spacing = duration + 5) {
  const conPausa = e.pausa_inicio != null && e.pausa_fin != null
  const turns = []
  let t = Number(e.inicio)
  while (turns.length < turnsNeeded && t + duration <= Number(e.cierre)) {
    if (conPausa && t < e.pausa_fin && t + spacing > e.pausa_inicio) {
      t = Number(e.pausa_fin)
      continue
    }
    turns.push(t)
    t += spacing
  }
  if (turns.length < turnsNeeded) {
    while (turns.length < turnsNeeded) {
      if (conPausa && t < e.pausa_fin && t + spacing > e.pausa_inicio) {
        t = Number(e.pausa_fin)
        continue
      }
      turns.push(t)
      t += spacing
    }
    const minCierre = turns[turns.length - 1] + duration
    fail(
      conPausa
        ? `No caben los ${turnsNeeded} turnos de ${duration} minutos y sus rotaciones en este horario. Amplía el cierre del evento hasta al menos las ${clock(minCierre)}, o reduce la pausa.`
        : `No caben los ${turnsNeeded} turnos de ${duration} minutos y sus rotaciones en este horario. Amplía el cierre del evento hasta al menos las ${clock(minCierre)}.`
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
// Circle method: everyone plays everyone in their group. An odd group gets a null
// "bye" slot each round; item[0] always rests in round 0, which lets the caller
// honor a pair's earliest-start time by placing it first.
function circleRounds(items) {
  const hasBye = items.length % 2 === 1
  let arr = hasBye ? [...items, null] : [...items]
  const m = arr.length
  const rounds = []
  for (let r = 0; r < m - 1; r++) {
    const pairs = []
    for (let i = 0; i < m / 2; i++) pairs.push([arr[i], arr[m - 1 - i]])
    rounds.push(pairs)
    arr = [arr[0], arr[m - 1], ...arr.slice(1, m - 1)]
  }
  return rounds
}
function drawGroupFixture(pairs, event, rng = randomInt) {
  const n = pairs.length
  if (n < MIN_PAREJAS || n > MAX_PAREJAS || new Set(pairs.map((p) => p.id)).size !== n)
    fail(`El sorteo requiere entre ${MIN_PAREJAS} y ${MAX_PAREJAS} parejas diferentes`)
  const size = integer(event.tamano_grupo, MIN_GRUPO, MAX_GRUPO, 'Tamaño de grupo')
  const numGroups = Math.ceil(n / size)
  const shuffled = shuffle(
    pairs.map((p) => p.id),
    rng
  )
  const base = Math.floor(n / numGroups),
    extra = n % numGroups
  const groups = []
  let idx = 0
  for (let g = 0; g < numGroups; g++) {
    const groupSize = base + (g < extra ? 1 : 0)
    groups.push(shuffled.slice(idx, idx + groupSize))
    idx += groupSize
  }
  const roundsOf = groups.map((g) => (g.length % 2 === 1 ? g.length : g.length - 1))
  const maxRounds = Math.max(...roundsOf)
  // Groups take turns on the shared courts: every group plays its round r before
  // any group starts round r + 1.
  const slotPlan = []
  for (let r = 0; r < maxRounds; r++)
    for (let g = 0; g < numGroups; g++) if (r < roundsOf[g]) slotPlan.push({ group: g, round: r })
  const duration = integer(event.duracion_partido, 10, 60, 'Duración del partido')
  const times = slots(event, slotPlan.length, duration, duration)
  const byId = new Map(pairs.map((p) => [p.id, p]))
  const orderedGroups = groups.map((ids, g) => {
    const firstTime = times[slotPlan.findIndex((s) => s.group === g && s.round === 0)]
    const early = ids.filter((id) => {
      const limit = byId.get(id)?.no_antes
      return limit != null && firstTime < limit
    })
    if (early.length > 1) return null
    if (!early.length || ids.length % 2 === 0) return shuffle(ids, rng)
    return [early[0], ...shuffle(ids.filter((id) => id !== early[0]), rng)]
  })
  if (orderedGroups.some((g) => g === null)) return null
  const roundsByGroup = orderedGroups.map((ids) => circleRounds(ids))
  const output = []
  slotPlan.forEach((slot, i) => {
    const matches = roundsByGroup[slot.group][slot.round].filter((pair) => !pair.includes(null))
    matches.forEach((pair, court) => {
      output.push({
        turno: i + 1,
        cancha: court + 1,
        minuto: times[i],
        pareja1: pair[0],
        pareja2: pair[1],
      })
    })
  })
  for (const p of pairs) {
    if (p.no_antes == null) continue
    const first = output
      .filter((m) => m.pareja1 === p.id || m.pareja2 === p.id)
      .reduce((min, m) => Math.min(min, m.minuto), Infinity)
    if (first < p.no_antes) return null
  }
  const groupOf = new Map()
  groups.forEach((ids, g) => ids.forEach((id) => groupOf.set(id, g + 1)))
  return { fixture: output, groupOf }
}
function generateGroupFixture(pairs, event, rng) {
  for (let i = 0; i < 100; i++) {
    const result = drawGroupFixture(pairs, event, rng)
    if (result) return result
  }
  fail(
    'No se pudo armar un sorteo por grupos que respete las restricciones de horario. Ajusta el tamaño de grupo o las restricciones e intenta de nuevo.',
    503
  )
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
  circleRounds,
  generateFixture,
  generateGroupFixture,
  resultInput,
  MIN_PAREJAS,
  MAX_PAREJAS,
  MIN_GRUPO,
  MAX_GRUPO,
}
