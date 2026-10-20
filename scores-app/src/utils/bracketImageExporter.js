import { getParticipantName } from './matchParticipants'
import { sourceId } from './tournamentBracket'

const PREFIX = { Dieciseisavos: '16F', 'Octavos de final': '8F', 'Cuartos de final': 'CF', Semifinales: 'SF', Final: 'FIN' }

function loadLogo(url) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const timer = setTimeout(() => reject(new Error('No se pudieron cargar los logos. Intenta descargar de nuevo.')), 10000)
    img.onload = () => { clearTimeout(timer); resolve(img) }
    img.onerror = () => { clearTimeout(timer); reject(new Error('No se pudo cargar un logo del cuadro. Intenta de nuevo.')) }
    img.src = url
  })
}

function rounded(ctx, x, y, w, h, r = 12) {
  ctx.beginPath()
  ctx.roundRect(x, y, w, h, r)
}

function fitText(ctx, value, width) {
  let text = String(value ?? '')
  if (ctx.measureText(text).width <= width) return text
  while (text.length && ctx.measureText(`${text}…`).width > width) text = text.slice(0, -1)
  return `${text}…`
}

function drawLogo(ctx, img, x, y, w, h) {
  const scale = Math.min(w / img.naturalWidth, h / img.naturalHeight)
  const dw = img.naturalWidth * scale, dh = img.naturalHeight * scale
  ctx.drawImage(img, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh)
}

// Independent of the viewport: exports never inherit the phone's scroll position or scale.
export function bracketPosterLayout(rounds, thirdPlaceMatches = []) {
  const active = rounds.filter(r => r.matches?.length)
  const cardWidth = 360, cardHeight = 142, gap = 44, rowGap = 24, margin = 38
  const count = Math.max(1, ...active.map(r => r.matches.length))
  const treeHeight = count * cardHeight + (count - 1) * rowGap
  const treeWidth = active.length * cardWidth + Math.max(0, active.length - 1) * gap
  const thirdRows = Math.ceil(thirdPlaceMatches.length / Math.max(active.length, 1))
  const thirdHeight = thirdRows ? 40 + thirdRows * (cardHeight + rowGap) : 0
  const size = Math.max(660, treeWidth + margin * 2, 240 + treeHeight + thirdHeight + 80)
  const left = (size - treeWidth) / 2
  const top = 240 + Math.max(0, (size - 320 - treeHeight - thirdHeight) / 2)
  const positions = active.flatMap((round, col) => round.matches.map((match, row) => ({
    match, round, col, row, x: left + col * (cardWidth + gap),
    y: top + treeHeight / round.matches.length * (row + .5) - cardHeight / 2,
    w: cardWidth, h: cardHeight,
  })))
  return { active, positions, size, left, top, treeHeight, thirdHeight, cardWidth, cardHeight, gap, margin }
}

export async function generateBracketPngBlob({
  tournamentName = 'Torneo Club Unión', categoryName = 'Categoría',
  rounds = [], thirdPlaceMatches = [], championName = null,
}) {
  const layout = bracketPosterLayout(rounds, thirdPlaceMatches)
  if (!layout.active.length) throw new Error('No hay llaves configuradas en este cuadro para exportar.')
  await document.fonts?.ready
  const [club, legal] = await Promise.all([
    loadLogo('/branding/subcomite-tenis-club-union.png'), loadLogo('/branding/legal-branding.png'),
  ])
  const { size, positions, active, left, top, treeHeight, cardWidth, cardHeight, gap, margin } = layout
  const canvas = document.createElement('canvas')
  // Crisp on social networks; bounded to avoid excessive memory on mobile browsers.
  const pixels = Math.min(4096, Math.max(2160, Math.ceil(size * 1.5)))
  canvas.width = pixels
  canvas.height = pixels
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('El navegador no pudo preparar la imagen. Intenta nuevamente.')
  ctx.scale(pixels / size, pixels / size)
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'
  const c = { bg: '#ffffff', ink: '#193b29', muted: '#607267', line: '#dce6de', soft: '#f5f8f5', green: '#1f6b3a', win: '#eef7e8' }
  ctx.fillStyle = c.bg
  ctx.fillRect(0, 0, size, size)
  const text = (value, x, y, width, font = 14, color = c.ink, weight = 500) => {
    ctx.font = `${weight} ${font}px "Plus Jakarta Sans", Arial, sans-serif`
    ctx.fillStyle = color
    ctx.fillText(fitText(ctx, value, width), x, y)
  }
  const line = (x1, y1, x2, y2) => {
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke()
  }
  drawLogo(ctx, club, margin, 28, 64, 64)
  drawLogo(ctx, legal, size - margin - 170, 34, 170, 58)
  text('CLUB UNIÓN · TENIS', margin, 122, size - margin * 2, 12, c.green, 700)
  text('Cuadro de eliminatorias', margin, 163, size - margin * 2, 30, c.ink, 700)
  text(`${categoryName} · ${tournamentName}`, margin, 193, size - margin * 2, 14, c.muted)
  ctx.strokeStyle = c.line; ctx.lineWidth = 1
  line(margin, 212, size - margin, 212)
  const lookup = new Map(positions.map(p => [Number(p.match.id), p]))
  const tag = p => p.round.label === 'Final' ? 'Final' : `${PREFIX[p.round.label] || p.round.label || 'Llave'} ${p.row + 1}`
  // Only real recorded origins are connected, never guessed advancement by array order.
  positions.forEach(target => {
    for (const side of [1, 2]) {
      const src = lookup.get(Number(sourceId(target.match, side)))
      if (!src || src.col >= target.col) continue
      const x1 = src.x + src.w, y1 = src.y + src.h / 2
      const x2 = target.x, y2 = target.y + target.h / 2, mid = x2 - gap / 2
      ctx.strokeStyle = c.green; ctx.lineWidth = 1
      ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(mid, y1); ctx.lineTo(mid, y2); ctx.lineTo(x2, y2); ctx.stroke()
    }
  })
  active.forEach((r, col) => {
    text(`${r.label} · ${r.matches.length} ${r.matches.length === 1 ? 'partido' : 'partidos'}`,
      left + col * (cardWidth + gap), top - 18, cardWidth, 13, c.muted, 600)
  })
  function drawCard(p, customTag) {
    const { match: m, x, y, w, h } = p
    const isFinal = p.round?.label === 'Final'
    ctx.save()
    rounded(ctx, x, y, w, h)
    ctx.fillStyle = c.bg; ctx.fill()
    ctx.clip()
    ctx.fillStyle = c.soft; ctx.fillRect(x, y, w, 32)
    const status = m.estado === 'finalizado' ? (m.motivo_finalizacion === 'walkover' ? 'W.O.' : 'Finalizado')
      : m.estado === 'en_vivo' ? 'En vivo' : m.estado === 'cancelado' ? 'Cancelado'
        : m.estado === 'suspendido' ? 'Suspendido' : 'Por programar'
    const court = m.cancha?.nombre || m.cancha_nombre
    text(`${customTag || tag(p)}${court ? ` · ${court.replace(/^Cancha de /i, '')}` : ''}`, x + 12, y + 21, w - 124, 11, c.muted)
    text(status, x + w - 102, y + 21, 94, 11, c.muted)
    const sets = Array.isArray(m.sets) ? m.sets : []
    for (const side of [1, 2]) {
      const rowY = y + 32 + (side - 1) * 42
      const winner = m.estado === 'finalizado' && (m.ganador === `jugador${side}` || Number(m.ganador) === side)
      if (winner) { ctx.fillStyle = c.win; ctx.fillRect(x, rowY, w, 42) }
      const entity = m[`equipo${side}`] || m[`jugador${side}`]
      const origin = lookup.get(Number(sourceId(m, side)))
      const name = entity?.id || m[`nombre_override_j${side}`] || m.nombre_override
        ? getParticipantName(m, side) : origin ? `Ganador ${tag(origin)}` : 'Por definir'
      const scoreWidth = Math.max(30, sets.length * 30)
      text(`${winner ? '✓ ' : ''}${name}`, x + 12, rowY + 26, w - scoreWidth - 30, 13, winner ? c.green : c.ink, 600)
      if (!sets.length) text('—', x + w - 28, rowY + 26, 22, 16, c.muted)
      sets.forEach((s, idx) => {
        const val = s[`games_j${side}`] ?? s[`p${side}`] ?? '—'
        const sx = x + w - 12 - (sets.length - idx) * 30
        text(String(val), sx, rowY + 27, 24, 17, winner ? c.green : c.ink, 700)
        const tb = s[`tiebreak_j${side}`]
        if (tb != null && tb !== '') text(String(tb), sx + 17, rowY + 17, 16, 8, c.muted)
      })
      ctx.strokeStyle = c.line; line(x, rowY, x + w, rowY)
    }
    const schedule = [m.fecha_inicio ? String(m.fecha_inicio).slice(0, 10) : '', m.hora_inicio ? String(m.hora_inicio).slice(0, 5) : ''].filter(Boolean).join(' · ')
    text(schedule || (m.estado === 'programado' ? 'Fecha y cancha por confirmar' : ''), x + 12, y + h - 9, w - 24, 10, c.muted)
    ctx.restore()
    rounded(ctx, x, y, w, h); ctx.strokeStyle = c.line; ctx.lineWidth = 1; ctx.stroke()
    if (isFinal) { ctx.strokeStyle = c.green; ctx.lineWidth = 2; line(x + 12, y, x + w - 12, y) }
  }
  positions.forEach(p => drawCard(p))
  thirdPlaceMatches.forEach((match, i) => {
    const col = i % active.length, row = Math.floor(i / active.length)
    drawCard({ match, x: left + col * (cardWidth + gap), y: top + treeHeight + 40 + row * (cardHeight + 24), w: cardWidth, h: cardHeight }, 'Tercer puesto')
  })
  ctx.strokeStyle = c.line; ctx.lineWidth = 1
  line(margin, size - 52, size - margin, size - 52)
  text('LEGAL BRANDING · TENIS', margin, size - 27, size / 2 - margin, 11, c.muted)
  if (championName) text(`Campeón: ${championName}`, size / 2, size - 27, size / 2 - margin, 12, c.green, 600)
  return new Promise((resolve, reject) => canvas.toBlob(blob => {
    if (blob) resolve(blob)
    else reject(new Error('No se pudo generar la imagen PNG del cuadro.'))
  }, 'image/png'))
}

function filename(options) {
  const cat = String(options.categoryName || 'categoria').toLowerCase().normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
  return `cuadro-eliminatorio-${cat || 'torneo'}.png`
}

function saveBlob(blob, fileName) {
  const url = URL.createObjectURL(blob), link = document.createElement('a')
  link.href = url; link.download = fileName
  document.body.appendChild(link); link.click(); link.remove()
  setTimeout(() => URL.revokeObjectURL(url), 5000)
  return { fileName, shared: false }
}

export async function downloadBracketPng(options) {
  return saveBlob(await generateBracketPngBlob(options), filename(options))
}

export async function shareOrDownloadBracketPng(options) {
  const blob = await generateBracketPngBlob(options), fileName = filename(options)
  const file = new File([blob], fileName, { type: 'image/png' })
  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ title: `Cuadro eliminatorio · ${options.categoryName || ''}`, files: [file] })
      return { fileName, shared: true }
    } catch (err) {
      if (err?.name === 'AbortError') return { fileName, shared: false, cancelled: true }
    }
  }
  return saveBlob(blob, fileName)
}
