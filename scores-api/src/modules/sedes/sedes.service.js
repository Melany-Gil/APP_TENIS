const db = require('../../config/db')

const DEPORTES = ['tenis', 'padel', 'ambos']
const SUPERFICIES = ['Cemento', 'Arcilla', 'Cesped Artificial', 'Madera', 'Sintetico']

exports.getAll = async () => {
  const [rows] = await db.query(
    'SELECT id, nombre, direccion, ciudad FROM sedes WHERE activa = TRUE ORDER BY nombre ASC'
  )
  return rows
}

exports.getCanchasBySede = async (sedeId) => {
  const [sede] = await db.query('SELECT id FROM sedes WHERE id = ? AND activa = TRUE', [sedeId])
  if (!sede.length) throw { status: 404, message: 'Sede no encontrada' }

  const [rows] = await db.query(
    `SELECT id, nombre, deporte, superficie
     FROM canchas
     WHERE sede_id = ? AND activa = TRUE
     ORDER BY nombre ASC`,
    [sedeId]
  )
  return rows
}

exports.create = async ({ nombre, direccion, ciudad }) => {
  if (!nombre) throw { status: 400, message: 'El nombre de la sede es requerido' }

  const [result] = await db.query(
    'INSERT INTO sedes (nombre, direccion, ciudad, activa) VALUES (?, ?, ?, TRUE)',
    [nombre, direccion || null, ciudad || 'Bucaramanga']
  )

  const [rows] = await db.query('SELECT id, nombre, direccion, ciudad FROM sedes WHERE id = ?', [
    result.insertId,
  ])
  return rows[0]
}

exports.remove = async (id) => {
  const [existing] = await db.query('SELECT id FROM sedes WHERE id = ?', [id])
  if (!existing.length) throw { status: 404, message: 'Sede no encontrada' }

  // Soft delete: desactiva la sede y sus canchas para no romper partidos/torneos históricos
  await db.query('UPDATE sedes SET activa = FALSE WHERE id = ?', [id])
  await db.query('UPDATE canchas SET activa = FALSE WHERE sede_id = ?', [id])

  return { message: 'Sede eliminada correctamente' }
}

exports.createCancha = async (sedeId, { nombre, deporte, superficie }) => {
  const [sede] = await db.query('SELECT id FROM sedes WHERE id = ? AND activa = TRUE', [sedeId])
  if (!sede.length) throw { status: 404, message: 'Sede no encontrada' }
  const cancha = validateCancha({ nombre, deporte, superficie })

  const [result] = await db.query(
    `INSERT INTO canchas (sede_id, nombre, deporte, superficie, activa)
     VALUES (?, ?, ?, ?, TRUE)`,
    [sedeId, cancha.nombre, cancha.deporte, cancha.superficie]
  )

  const [rows] = await db.query(
    'SELECT id, nombre, deporte, superficie FROM canchas WHERE id = ?',
    [result.insertId]
  )
  return rows[0]
}

exports.updateCancha = async (canchaId, body) => {
  const [existing] = await db.query(
    `SELECT c.id, c.deporte
     FROM canchas c
     INNER JOIN sedes s ON s.id = c.sede_id
     WHERE c.id = ? AND c.activa = TRUE AND s.activa = TRUE`,
    [canchaId]
  )
  if (!existing.length) throw { status: 404, message: 'Cancha no encontrada' }

  const cancha = validateCancha(body)
  if (existing[0].deporte !== cancha.deporte) {
    const [[usage]] = await db.query(
      'SELECT COUNT(*) AS total FROM partidos WHERE cancha_id = ?',
      [canchaId]
    )
    if (Number(usage.total) > 0) {
      throw {
        status: 409,
        message: 'No puedes cambiar el deporte porque la cancha ya tiene partidos asociados',
      }
    }
  }

  await db.query(
    `UPDATE canchas
     SET nombre = ?, deporte = ?, superficie = ?
     WHERE id = ?`,
    [cancha.nombre, cancha.deporte, cancha.superficie, canchaId]
  )
  const [rows] = await db.query(
    'SELECT id, nombre, deporte, superficie FROM canchas WHERE id = ?',
    [canchaId]
  )
  return rows[0]
}

exports.removeCancha = async (canchaId) => {
  const [existing] = await db.query('SELECT id FROM canchas WHERE id = ? AND activa = TRUE', [
    canchaId,
  ])
  if (!existing.length) throw { status: 404, message: 'Cancha no encontrada' }

  await db.query('UPDATE canchas SET activa = FALSE WHERE id = ?', [canchaId])
  return { message: 'Cancha eliminada correctamente' }
}

function validateCancha({ nombre, deporte, superficie }) {
  const normalizedName = String(nombre || '').trim()
  const normalizedSport = deporte || 'ambos'
  const normalizedSurface = superficie || 'Cemento'

  if (!normalizedName) throw { status: 400, message: 'El nombre de la cancha es requerido' }
  if (!DEPORTES.includes(normalizedSport)) {
    throw { status: 400, message: 'Selecciona un deporte válido' }
  }
  if (!SUPERFICIES.includes(normalizedSurface)) {
    throw { status: 400, message: 'Selecciona una superficie válida' }
  }

  return {
    nombre: normalizedName,
    deporte: normalizedSport,
    superficie: normalizedSurface,
  }
}
