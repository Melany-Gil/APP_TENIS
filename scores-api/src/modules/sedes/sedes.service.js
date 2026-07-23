const db = require('../../config/db')

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
  if (!nombre) throw { status: 400, message: 'El nombre de la cancha es requerido' }

  const [result] = await db.query(
    `INSERT INTO canchas (sede_id, nombre, deporte, superficie, activa)
     VALUES (?, ?, ?, ?, TRUE)`,
    [sedeId, nombre, deporte || 'ambos', superficie || 'Cemento']
  )

  const [rows] = await db.query(
    'SELECT id, nombre, deporte, superficie FROM canchas WHERE id = ?',
    [result.insertId]
  )
  return rows[0]
}

exports.removeCancha = async (canchaId) => {
  const [existing] = await db.query('SELECT id FROM canchas WHERE id = ?', [canchaId])
  if (!existing.length) throw { status: 404, message: 'Cancha no encontrada' }

  await db.query('UPDATE canchas SET activa = FALSE WHERE id = ?', [canchaId])
  return { message: 'Cancha eliminada correctamente' }
}
