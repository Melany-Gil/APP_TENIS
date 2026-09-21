// Render the visible card geometry directly to canvas (no SVG foreignObject,
// so the export also works in Safari). Never upload the composed image.
export async function exportMatchPhoto(card, originalPhotoUrl) {
  const clone = card.cloneNode(true)
  clone.setAttribute('aria-hidden', 'true')
  clone.inert = true
  Object.assign(clone.style, { position: 'fixed', left: '-10000px', top: '0', width: '360px', maxWidth: 'none', margin: '0', pointerEvents: 'none' })
  clone.querySelectorAll('.photocall-actions, .photocall-expand').forEach(el => el.remove())
  const photo = clone.querySelector('.photocall-photo-img')
  if (photo) photo.style.maxHeight = '280px'
  const grid = clone.querySelector('.photocall-sponsors')
  grid.style.gridTemplateColumns = 'repeat(4, minmax(0, 1fr))'
  document.body.appendChild(clone)
  try {
    await Promise.all([...clone.querySelectorAll('img')].map(image => image.decode()))
    return await renderCard(clone, originalPhotoUrl)
  } finally { clone.remove() }
}

async function renderCard(card, originalPhotoUrl) {
  await document.fonts.ready
  const bounds = card.getBoundingClientRect()
  const sponsors = card.querySelector('.photocall-sponsors').getBoundingClientRect()
  const height = sponsors.bottom - bounds.top + 12
  const canvas = document.createElement('canvas')
  const scale = Math.min(1080 / bounds.width, 1920 / height)
  canvas.width = 1080
  canvas.height = 1920
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('No se pudo crear la imagen.')
  ctx.fillStyle = getComputedStyle(card).backgroundColor
  ctx.fillRect(0, 0, 1080, 1920)
  ctx.translate((1080 - bounds.width * scale) / 2, (1920 - height * scale) / 2)
  ctx.scale(scale, scale)
  const relative = rect => ({ x: rect.left - bounds.left, y: rect.top - bounds.top, w: rect.width, h: rect.height })
  const rounded = (r, radius) => { ctx.beginPath(); ctx.roundRect(r.x, r.y, r.w, r.h, radius) }
  const boxes = [card, ...card.querySelectorAll('.photocall-photo-wrapper, .photocall-score, .photocall-logo')].map(el => {
    const style = getComputedStyle(el)
    return { rect: el === card ? { x: 0, y: 0, w: bounds.width, h: height } : relative(el.getBoundingClientRect()), color: style.backgroundColor, radius: parseFloat(style.borderRadius) || 0 }
  })
  const images = [...card.querySelectorAll('img')].map(el => ({
    url: el.classList.contains('photocall-photo-img') ? originalPhotoUrl : el.currentSrc || el.src,
    rect: relative(el.getBoundingClientRect()),
    clip: relative(el.closest('.photocall-logo, .photocall-photo-wrapper').getBoundingClientRect()),
  }))
  // Snapshot text before awaiting network requests; a live score may update.
  const letters = []
  const walker = document.createTreeWalker(card, NodeFilter.SHOW_TEXT)
  while (walker.nextNode()) {
    const node = walker.currentNode
    if (!node.textContent.trim() || node.parentElement.closest('.photocall-actions, .photocall-expand')) continue
    const style = getComputedStyle(node.parentElement)
    for (let i = 0; i < node.length; i++) {
      const range = document.createRange()
      range.setStart(node, i); range.setEnd(node, i + 1)
      const rect = range.getBoundingClientRect()
      letters.push({ text: node.textContent[i], rect: relative(rect), color: style.color, font: `${style.fontWeight} ${style.fontSize} ${style.fontFamily}` })
    }
  }
  const loaded = await Promise.all(images.map(async item => {
    const response = await fetch(item.url, { signal: AbortSignal.timeout(20000) })
    if (!response.ok) throw new Error('No se pudieron cargar todas las imágenes. Intenta nuevamente.')
    const url = URL.createObjectURL(await response.blob())
    try {
      const image = new Image()
      image.src = url
      await image.decode()
      return { ...item, image }
    } finally { URL.revokeObjectURL(url) }
  }))
  for (const box of boxes) { rounded(box.rect, box.radius); ctx.fillStyle = box.color; ctx.fill() }
  for (const { image, rect, clip } of loaded) {
    ctx.save()
    rounded(clip, 7)
    ctx.clip()
    const ratio = Math.min(rect.w / image.naturalWidth, rect.h / image.naturalHeight)
    const w = image.naturalWidth * ratio, h = image.naturalHeight * ratio
    ctx.drawImage(image, rect.x + (rect.w - w) / 2, rect.y + (rect.h - h) / 2, w, h)
    ctx.restore()
  }
  ctx.textBaseline = 'middle'
  for (const letter of letters) {
    ctx.font = letter.font; ctx.fillStyle = letter.color
    ctx.fillText(letter.text, letter.rect.x, letter.rect.y + letter.rect.h / 2)
  }
  const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'))
  if (!blob) throw new Error('No se pudo generar la imagen. Intenta nuevamente.')
  return blob
}
