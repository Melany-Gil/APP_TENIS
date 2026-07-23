const db = require('../../config/db')

// ── Listar todos ────────────────────────────────────────────────────────────────
exports.getAll = async ({ deporte, estado }) => {
  let query = `
    SELECT
      t.id,
      t.nombre,
      t.deporte,
      t.formato,
      t.descripcion,
      t.premio,
      t.cupo_max,
      t.fecha_inicio,
      t.fecha_fin,
      t.estado,
      cat.id     AS categoria_id,
      cat.nombre AS categoria_nombre,
      s.id       AS sede_id,
      s.nombre   AS sede_nombre
    FROM torneos t
    LEFT JOIN categorias cat ON cat.id = t.categoria_id
    LEFT JOIN sedes s        ON s.id   = t.sede_id
    WHERE 1 = 1
  `

  const params = []

  if (deporte) {
    query += ' AND t.deporte = ?'
    params.push(deporte)
  }

  if (estado) {
    query += ' AND t.estado = ?'
    params.push(estado)
  }

  query += ' ORDER BY t.fecha_inicio DESC'

  const [rows] = await db.query(query, params)

  return rows.map(formatListItem)
}

// ── Obtener por ID ──────────────────────────────────────────────────────────────
exports.getById = async (id) => {
  const [rows] = await db.query(
    `SELECT
      t.id,
      t.nombre,
      t.deporte,
      t.formato,
      t.descripcion,
      t.premio,
      t.cupo_max,
      t.fecha_inicio,
      t.fecha_fin,
      t.estado,
      cat.id     AS categoria_id,
      cat.nombre AS categoria_nombre,
      s.id       AS sede_id,
      s.nombre   AS sede_nombre
    FROM torneos t
    LEFT JOIN categorias cat ON cat.id = t.categoria_id
    LEFT JOIN sedes s        ON s.id   = t.sede_id
    WHERE t.id = ?
    LIMIT 1`,
    [id]
  )

  if (!rows.length) {
    throw { status: 404, message: 'Torneo no encontrado' }
  }

  // Contar inscripciones confirmadas
  const [countRows] = await db.query(
    `SELECT COUNT(*) AS inscritos FROM inscripciones WHERE torneo_id = ? AND estado = 'confirmado'`,
    [id]
  )

  const inscritos = countRows[0].inscritos || 0

  return formatDetail(rows[0], inscritos)
}

// ── Crear ────────────────────────────────────────────────────────────────────────
exports.create = async (body) => {
  const {
    nombre,
    deporte,
    categoria_id,
    sede_id,
    formato,
    descripcion,
    premio,
    cupo_max,
    fecha_inicio,
    fecha_fin,
    estado,
  } = body

  const [result] = await db.query(
    `INSERT INTO torneos
       (nombre, deporte, categoria_id, sede_id, formato, descripcion, premio, cupo_max, fecha_inicio, fecha_fin, estado)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      nombre,
      deporte,
      categoria_id || null,
      sede_id || null,
      formato || null,
      descripcion || null,
      premio || null,
      cupo_max || null,
      fecha_inicio || null,
      fecha_fin || null,
      estado || 'proximo',
    ]
  )

  return exports.getById(result.insertId)
}

// ── Actualizar ──────────────────────────────────────────────────────────────────
exports.update = async (id, body) => {
  const [existing] = await db.query('SELECT id FROM torneos WHERE id = ?', [id])
  if (!existing.length) {
    throw { status: 404, message: 'Torneo no encontrado' }
  }

  const {
    nombre,
    deporte,
    categoria_id,
    sede_id,
    formato,
    descripcion,
    premio,
    cupo_max,
    fecha_inicio,
    fecha_fin,
    estado,
  } = body

  await db.query(
    `UPDATE torneos
     SET nombre = ?, deporte = ?, categoria_id = ?, sede_id = ?, formato = ?,
         descripcion = ?, premio = ?, cupo_max = ?, fecha_inicio = ?, fecha_fin = ?,
         estado = ?
     WHERE id = ?`,
    [
      nombre,
      deporte,
      categoria_id || null,
      sede_id || null,
      formato || null,
      descripcion || null,
      premio || null,
      cupo_max || null,
      fecha_inicio || null,
      fecha_fin || null,
      estado || 'proximo',
      id,
    ]
  )

  return exports.getById(id)
}

// ── Eliminar ────────────────────────────────────────────────────────────────────
exports.remove = async (id) => {
  const [existing] = await db.query('SELECT id FROM torneos WHERE id = ?', [id])
  if (!existing.length) {
    throw { status: 404, message: 'Torneo no encontrado' }
  }

  await db.query('DELETE FROM torneos WHERE id = ?', [id])

  return { message: 'Torneo eliminado correctamente' }
}

// ── Formateadores ───────────────────────────────────────────────────────────────
function formatListItem(row) {
  return {
    id: row.id,
    nombre: row.nombre,
    deporte: row.deporte,
    formato: row.formato || null,
    descripcion: row.descripcion || null,
    premio: row.premio || null,
    cupo_max: row.cupo_max || null,
    fecha_inicio: row.fecha_inicio || null,
    fecha_fin: row.fecha_fin || null,
    estado: row.estado,
    inscripciones_abiertas: row.estado === 'proximo' || row.estado === 'en_curso',
    categoria: {
      id: row.categoria_id,
      nombre: row.categoria_nombre,
    },
    sede: {
      id: row.sede_id,
      nombre: row.sede_nombre,
    },
  }
}

function formatDetail(row, inscritos) {
  return {
    id: row.id,
    nombre: row.nombre,
    deporte: row.deporte,
    formato: row.formato || null,
    descripcion: row.descripcion || null,
    premio: row.premio || null,
    cupo_max: row.cupo_max || null,
    inscritos: inscritos,
    inscripciones_abiertas: row.estado === 'proximo' || row.estado === 'en_curso',
    fecha_inicio: row.fecha_inicio || null,
    fecha_fin: row.fecha_fin || null,
    estado: row.estado,
    categoria: {
      id: row.categoria_id,
      nombre: row.categoria_nombre,
    },
    sede: {
      id: row.sede_id,
      nombre: row.sede_nombre,
    },
  }
}
