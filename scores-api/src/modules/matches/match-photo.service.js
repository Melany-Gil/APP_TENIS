const fs = require('node:fs/promises')
const path = require('node:path')
const sharp = require('sharp')

const fail = (status, message) => Object.assign(new Error(message), { status })
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function authorize(match, user) {
  if (!match) throw fail(404, 'Partido no encontrado')
  if (user.rol !== 'admin' && !(user.rol === 'juez' && Number(match.juez_id) === Number(user.id))) {
    throw fail(403, 'Solo el juez asignado o un administrador puede guardar la foto de este partido')
  }
}

function validate(input) {
  if (!uuid.test(input.version || '') || (input.expected && !uuid.test(input.expected))) throw fail(400, 'Identificador de fotografía inválido')
  if (!['inicio', 'final'].includes(input.momento)) throw fail(400, 'Selecciona si la foto es del inicio o del final')
  if (input.consentimiento !== 'true') throw fail(400, 'Confirma la autorización para publicar la fotografía')
}

async function normalize(buffer) {
  try {
    const image = sharp(buffer, { limitInputPixels: 24000000, animated: false, failOn: 'warning' })
    const metadata = await image.metadata()
    if (!['jpeg', 'png', 'webp'].includes(metadata.format) || (metadata.pages || 1) > 1) throw new Error('format')
    // Re-encoding without withMetadata strips EXIF, including GPS.
    const full = await image.rotate().resize({ width: 1600, height: 1600, fit: 'inside', withoutEnlargement: true }).webp({ quality: 78 }).toBuffer()
    const thumb = await sharp(full).resize({ width: 480, height: 480, fit: 'inside', withoutEnlargement: true }).webp({ quality: 70 }).toBuffer()
    return { full, thumb }
  } catch { throw fail(400, 'Imagen inválida. Usa una foto JPEG, PNG o WebP de hasta 24 megapíxeles.') }
}

function createPhotoService(db, directory = process.env.MATCH_PHOTOS_DIR) {
  function root() {
    if (!directory || !path.isAbsolute(directory)) throw fail(503, 'Las fotos de partidos aún no están configuradas en el servidor')
    return path.resolve(directory)
  }
  function file(version, thumb = false) {
    if (!uuid.test(version)) throw fail(400, 'Identificador inválido')
    return path.join(root(), `${version}${thumb ? '-thumb' : ''}.webp`)
  }
  const metadata = row => row ? { version: row.version, momento: row.momento, updated_at: row.updated_at } : null
  async function get(id) {
    const [matches] = await db.query('SELECT id FROM partidos WHERE id = ?', [id])
    if (!matches.length) throw fail(404, 'Partido no encontrado')
    const [rows] = await db.query('SELECT version, momento, updated_at FROM fotos_partido WHERE partido_id = ?', [id])
    return metadata(rows[0])
  }
  async function check(id, user) {
    root()
    const [rows] = await db.query('SELECT id, juez_id FROM partidos WHERE id = ?', [id])
    authorize(rows[0], user)
  }
  async function save(id, user, input, buffer) {
    validate(input)
    if (!buffer) throw fail(400, 'Selecciona una fotografía')
    await check(id, user)
    const images = await normalize(buffer)
    const conn = await db.getConnection()
    let written = false, committed = false, commitAttempted = false, previous
    try {
      await conn.beginTransaction()
      const [matches] = await conn.query('SELECT id, juez_id FROM partidos WHERE id = ? FOR UPDATE', [id])
      authorize(matches[0], user)
      const [rows] = await conn.query('SELECT * FROM fotos_partido WHERE partido_id = ? FOR UPDATE', [id])
      previous = rows[0]
      if (previous?.version === input.version) {
        if (Number(previous.created_by) !== Number(user.id) || previous.momento !== input.momento) throw fail(409, 'La fotografía fue modificada por otro usuario')
        await conn.commit(); committed = true
        return metadata(previous)
      }
      if ((previous?.version || '') !== (input.expected || '')) throw fail(409, 'Ya existe una foto diferente. Revisa la foto actual antes de reemplazarla.')
      await fs.mkdir(root(), { recursive: true, mode: 0o700 })
      await fs.writeFile(file(input.version), images.full, { flag: 'wx', mode: 0o600 })
      written = true
      await fs.writeFile(file(input.version, true), images.thumb, { flag: 'wx', mode: 0o600 })
      await conn.query(`INSERT INTO fotos_partido (partido_id, version, momento, created_by, bytes, updated_at)
        VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
        ON DUPLICATE KEY UPDATE version = VALUES(version), momento = VALUES(momento), created_by = VALUES(created_by), bytes = VALUES(bytes), updated_at = CURRENT_TIMESTAMP`,
      [id, input.version, input.momento, user.id, images.full.length])
      commitAttempted = true
      await conn.commit(); committed = true
    } catch (error) {
      await conn.rollback().catch(() => {})
      // A lost COMMIT response is ambiguous. Keep the files for a safe retry.
      if (written && !committed && !commitAttempted) {
        await fs.unlink(file(input.version)).catch(() => {})
        await fs.unlink(file(input.version, true)).catch(() => {})
      }
      if (error.code === 'EEXIST') throw fail(409, 'Una carga anterior quedó interrumpida. Descarta la pendiente y vuelve a seleccionar la foto.')
      throw error
    } finally { conn.release() }
    // Replacement is explicit; old files can also remain in provider backups.
    if (previous) {
      await fs.unlink(file(previous.version)).catch(() => {})
      await fs.unlink(file(previous.version, true)).catch(() => {})
    }
    return get(id)
  }
  return { get, check, save, file }
}

module.exports = { createPhotoService, authorize, validate, normalize }
