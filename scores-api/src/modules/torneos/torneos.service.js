const db = require('../../config/db')

const MODALIDADES = ['individual', 'dobles']
const SISTEMAS = ['por_definir', 'eliminacion_directa', 'todos_contra_todos', 'grupos_eliminacion']
const ESTADOS = ['proximo', 'en_curso', 'finalizado', 'cancelado']

const SELECT = `
  SELECT
    t.id, t.nombre, t.deporte, t.categoria_id, t.modalidad, t.sistema,
    t.fecha_inicio, t.fecha_fin, t.estado,
    c.nombre AS categoria_nombre,
    (SELECT COUNT(*) FROM partidos p WHERE p.torneo_id = t.id) AS partidos_count
  FROM torneos t
  LEFT JOIN categorias c ON c.id = t.categoria_id
`

exports.getAll = async ({ deporte, estado, modalidad }) => {
  let query = `${SELECT} WHERE 1 = 1`
  const params = []

  if (deporte) {
    query += ' AND t.deporte = ?'
    params.push(deporte)
  }
  if (estado) {
    query += ' AND t.estado = ?'
    params.push(estado)
  }
  if (modalidad) {
    query += ' AND t.modalidad = ?'
    params.push(modalidad)
  }

  query += ' ORDER BY t.fecha_inicio IS NULL, t.fecha_inicio DESC, t.id DESC'
  const [rows] = await db.query(query, params)
  return rows.map(formatTournament)
}

exports.getById = async (id) => {
  const [rows] = await db.query(`${SELECT} WHERE t.id = ? LIMIT 1`, [id])
  if (!rows.length) throw { status: 404, message: 'Torneo no encontrado' }
  return formatTournament(rows[0])
}

exports.create = async (body) => {
  const tournament = await validateTournament(body)
  const [result] = await db.query(
    `INSERT INTO torneos
       (nombre, deporte, categoria_id, modalidad, sistema, fecha_inicio, fecha_fin, estado)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      tournament.nombre,
      tournament.deporte,
      tournament.categoria_id,
      tournament.modalidad,
      tournament.sistema,
      tournament.fecha_inicio,
      tournament.fecha_fin,
      tournament.estado,
    ]
  )
  return exports.getById(result.insertId)
}

exports.update = async (id, body) => {
  const [existing] = await db.query(
    'SELECT id, deporte, categoria_id, modalidad FROM torneos WHERE id = ?',
    [id]
  )
  if (!existing.length) throw { status: 404, message: 'Torneo no encontrado' }

  const tournament = await validateTournament(body)
  const structureChanged =
    existing[0].deporte !== tournament.deporte ||
    (existing[0].categoria_id ? Number(existing[0].categoria_id) : null) !==
      tournament.categoria_id ||
    existing[0].modalidad !== tournament.modalidad

  if (structureChanged) {
    const [[usage]] = await db.query('SELECT COUNT(*) AS total FROM partidos WHERE torneo_id = ?', [
      id,
    ])
    if (Number(usage.total) > 0) {
      throw {
        status: 409,
        message:
          'No puedes cambiar deporte, categoría o modalidad porque el torneo ya tiene partidos',
      }
    }
  }

  await db.query(
    `UPDATE torneos
     SET nombre = ?, deporte = ?, categoria_id = ?, modalidad = ?, sistema = ?,
         fecha_inicio = ?, fecha_fin = ?, estado = ?
     WHERE id = ?`,
    [
      tournament.nombre,
      tournament.deporte,
      tournament.categoria_id,
      tournament.modalidad,
      tournament.sistema,
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

  const [[usage]] = await db.query('SELECT COUNT(*) AS total FROM partidos WHERE torneo_id = ?', [
    id,
  ])
  if (Number(usage.total) > 0) {
    throw {
      status: 409,
      message: 'El torneo tiene partidos. Elimínalos o reasígnalos antes de borrar el torneo',
    }
  }

  await db.query('DELETE FROM torneos WHERE id = ?', [id])
  return { message: 'Torneo eliminado correctamente' }
}

async function validateTournament({
  nombre,
  deporte,
  categoria_id,
  modalidad,
  sistema,
  fecha_inicio,
  fecha_fin,
  estado,
}) {
  const normalizedName = String(nombre || '').trim()
  const categoryId = categoria_id ? Number(categoria_id) : null
  const normalizedStatus = estado || 'proximo'
  const normalizedModality = modalidad || 'individual'
  const normalizedSystem = sistema || 'por_definir'
  const normalizedStart = normalizeOptionalDate(fecha_inicio, 'inicial')
  const normalizedEnd = normalizeOptionalDate(fecha_fin, 'final')

  if (!normalizedName) throw { status: 400, message: 'El nombre es obligatorio' }
  if (!['tenis', 'padel'].includes(deporte)) {
    throw { status: 400, message: 'Selecciona un deporte válido' }
  }
  if (categoryId !== null && (!Number.isInteger(categoryId) || categoryId < 1)) {
    throw { status: 400, message: 'La categoría seleccionada no es válida' }
  }
  if (!MODALIDADES.includes(normalizedModality)) {
    throw { status: 400, message: 'Selecciona una modalidad válida' }
  }
  if (!SISTEMAS.includes(normalizedSystem)) {
    throw { status: 400, message: 'Selecciona un sistema de competencia válido' }
  }
  if (!ESTADOS.includes(normalizedStatus)) {
    throw { status: 400, message: 'Selecciona un estado válido' }
  }
  if (normalizedStart && normalizedEnd && normalizedEnd < normalizedStart) {
    throw { status: 400, message: 'La fecha final no puede ser anterior a la inicial' }
  }

  if (categoryId !== null) {
    const [categories] = await db.query('SELECT deporte FROM categorias WHERE id = ? LIMIT 1', [
      categoryId,
    ])
    if (!categories.length) throw { status: 400, message: 'La categoría seleccionada no existe' }
    if (![deporte, 'ambos'].includes(categories[0].deporte)) {
      throw { status: 400, message: 'La categoría no corresponde al deporte del torneo' }
    }
  }

  return {
    nombre: normalizedName,
    deporte,
    categoria_id: categoryId,
    modalidad: normalizedModality,
    sistema: normalizedSystem,
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
    modalidad: row.modalidad || (row.deporte === 'padel' ? 'dobles' : 'individual'),
    sistema: row.sistema || 'por_definir',
    categoria: row.categoria_id ? { id: row.categoria_id, nombre: row.categoria_nombre } : null,
    fecha_inicio: row.fecha_inicio || null,
    fecha_fin: row.fecha_fin || null,
    estado: row.estado,
    partidos_count: Number(row.partidos_count || 0),
  }
}
