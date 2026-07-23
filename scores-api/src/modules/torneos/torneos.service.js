const db = require('../../config/db')

const FIELDS = 'id, nombre, deporte, fecha_inicio, fecha_fin, estado'

exports.getAll = async ({ deporte, estado }) => {
  let query = `SELECT ${FIELDS} FROM torneos WHERE 1 = 1`
  const params = []

  if (deporte) {
    query += ' AND deporte = ?'
    params.push(deporte)
  }
  if (estado) {
    query += ' AND estado = ?'
    params.push(estado)
  }

  query += ' ORDER BY fecha_inicio IS NULL, fecha_inicio DESC, id DESC'
  const [rows] = await db.query(query, params)
  return rows.map(formatTournament)
}

exports.getById = async (id) => {
  const [rows] = await db.query(`SELECT ${FIELDS} FROM torneos WHERE id = ? LIMIT 1`, [id])
  if (!rows.length) throw { status: 404, message: 'Torneo no encontrado' }
  return formatTournament(rows[0])
}

exports.create = async ({ nombre, deporte, fecha_inicio, fecha_fin, estado }) => {
  const tournament = validateTournament({ nombre, deporte, fecha_inicio, fecha_fin, estado })
  const [result] = await db.query(
    `INSERT INTO torneos (nombre, deporte, fecha_inicio, fecha_fin, estado)
     VALUES (?, ?, ?, ?, ?)`,
    [
      tournament.nombre,
      tournament.deporte,
      tournament.fecha_inicio,
      tournament.fecha_fin,
      tournament.estado,
    ]
  )
  return exports.getById(result.insertId)
}

exports.update = async (id, body) => {
  const [existing] = await db.query('SELECT id FROM torneos WHERE id = ?', [id])
  if (!existing.length) throw { status: 404, message: 'Torneo no encontrado' }

  const tournament = validateTournament(body)
  await db.query(
    `UPDATE torneos
     SET nombre = ?, deporte = ?, fecha_inicio = ?, fecha_fin = ?, estado = ?
     WHERE id = ?`,
    [
      tournament.nombre,
      tournament.deporte,
      tournament.fecha_inicio,
      tournament.fecha_fin,
      tournament.estado,
      id,
    ]
  )
  return exports.getById(id)
}

exports.remove = async (id) => {
  const [existing] = await db.query('SELECT id FROM torneos WHERE id = ?', [id])
  if (!existing.length) throw { status: 404, message: 'Torneo no encontrado' }

  const connection = await db.getConnection()
  try {
    await connection.beginTransaction()

    const [columns] = await connection.query(
      `SELECT COUNT(*) AS total
       FROM information_schema.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE()
         AND TABLE_NAME = 'partidos'
         AND COLUMN_NAME = 'torneo_id'`
    )
    if (Number(columns[0].total) > 0) {
      await connection.query('UPDATE partidos SET torneo_id = NULL WHERE torneo_id = ?', [id])
    }

    await connection.query('DELETE FROM torneos WHERE id = ?', [id])
    await connection.commit()
  } catch (error) {
    await connection.rollback()
    throw error
  } finally {
    connection.release()
  }

  return { message: 'Torneo eliminado correctamente' }
}

function validateTournament({ nombre, deporte, fecha_inicio, fecha_fin, estado }) {
  const normalizedName = String(nombre || '').trim()
  const normalizedStatus = estado || 'proximo'
  const normalizedStart = normalizeOptionalDate(fecha_inicio, 'inicial')
  const normalizedEnd = normalizeOptionalDate(fecha_fin, 'final')

  if (!normalizedName) throw { status: 400, message: 'El nombre es obligatorio' }
  if (!['tenis', 'padel', 'ambos'].includes(deporte)) {
    throw { status: 400, message: 'Selecciona un deporte válido' }
  }
  if (normalizedStart && normalizedEnd && normalizedEnd < normalizedStart) {
    throw { status: 400, message: 'La fecha final no puede ser anterior a la inicial' }
  }
  if (!['proximo', 'en_curso', 'finalizado', 'cancelado'].includes(normalizedStatus)) {
    throw { status: 400, message: 'Selecciona un estado válido' }
  }

  return {
    nombre: normalizedName,
    deporte,
    fecha_inicio: normalizedStart,
    fecha_fin: normalizedEnd,
    estado: normalizedStatus,
  }
}

function normalizeOptionalDate(value, label) {
  const date = String(value || '').trim()
  if (!date) return null
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(new Date(`${date}T00:00:00`).getTime())) {
    throw { status: 400, message: `Selecciona una fecha ${label} válida` }
  }
  return date
}

function formatTournament(row) {
  return {
    id: row.id,
    nombre: row.nombre,
    deporte: row.deporte,
    fecha_inicio: row.fecha_inicio || null,
    fecha_fin: row.fecha_fin || null,
    estado: row.estado,
  }
}
