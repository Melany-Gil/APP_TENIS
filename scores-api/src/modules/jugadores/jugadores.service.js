const db = require('../../config/db')

// ── Listar todos ────────────────────────────────────────────────────────────────
exports.getAll = async ({ deporte, categoria_id, activo }) => {
  let query = `
    SELECT
      j.id,
      j.nombre,
      j.apellido,
      j.apodo,
      j.deporte,
      j.mano,
      j.activo,
      c.code   AS country_code,
      c.name AS country_name,
      c.flag   AS country_flag,
      cat.id     AS categoria_id,
      cat.nombre AS categoria_nombre
    FROM jugadores j
    LEFT JOIN countries c    ON c.id   = j.country_id
    LEFT JOIN categorias cat ON cat.id = j.categoria_id
    WHERE 1 = 1
  `

  const params = []

  if (deporte) {
    query += ' AND j.deporte = ?'
    params.push(deporte)
  }

  if (categoria_id) {
    query += ' AND j.categoria_id = ?'
    params.push(categoria_id)
  }

  if (activo !== undefined) {
    query += ' AND j.activo = ?'
    params.push(activo === 'true' || activo === '1' ? 1 : 0)
  }

  query += ' ORDER BY j.nombre ASC'

  const [rows] = await db.query(query, params)
  return rows.map(formatListItem)
}

// ── Obtener por ID ──────────────────────────────────────────────────────────────
exports.getById = async (id) => {
  const [rows] = await db.query(
    `SELECT
      j.id,
      j.nombre,
      j.apellido,
      j.apodo,
      j.fecha_nac,
      j.telefono,
      j.mano,
      j.deporte,
      j.foto,
      j.activo,
      c.code   AS country_code,
      c.name AS country_name,
      c.flag   AS country_flag,
      cat.id     AS categoria_id,
      cat.nombre AS categoria_nombre,
      s.victorias,
      s.derrotas,
      s.puntos,
      s.ranking
    FROM jugadores j
    LEFT JOIN countries c    ON c.id   = j.country_id
    LEFT JOIN categorias cat ON cat.id = j.categoria_id
    LEFT JOIN jugador_stats s ON s.jugador_id = j.id
      AND s.temporada = YEAR(CURDATE())
    WHERE j.id = ?
    LIMIT 1`,
    [id]
  )

  if (!rows.length) {
    throw { status: 404, message: 'Jugador no encontrado' }
  }

  return formatDetail(rows[0])
}

// ── Crear ────────────────────────────────────────────────────────────────────────
exports.create = async (body) => {
  const { nombre, apellido, apodo, country_id, fecha_nac, telefono, mano, deporte, categoria_id } =
    body

  const [result] = await db.query(
    `INSERT INTO jugadores
       (nombre, apellido, apodo, country_id, fecha_nac, telefono, mano, deporte, categoria_id)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      nombre,
      apellido,
      apodo || null,
      country_id || 1,
      fecha_nac || null,
      telefono || null,
      mano || null,
      deporte,
      categoria_id,
    ]
  )

  // FIX: temporada es NOT NULL — se debe incluir con el año actual
  await db.query(
    `INSERT INTO jugador_stats (jugador_id, temporada, victorias, derrotas, puntos, ranking)
     VALUES (?, YEAR(CURDATE()), 0, 0, 0, 0)`,
    [result.insertId]
  )

  return exports.getById(result.insertId)
}

// ── Actualizar ──────────────────────────────────────────────────────────────────
exports.update = async (id, body) => {
  const [existing] = await db.query('SELECT id FROM jugadores WHERE id = ?', [id])
  if (!existing.length) {
    throw { status: 404, message: 'Jugador no encontrado' }
  }

  const { nombre, apellido, apodo, country_id, fecha_nac, telefono, mano, deporte, categoria_id } =
    body

  await db.query(
    `UPDATE jugadores
     SET nombre = ?, apellido = ?, apodo = ?, country_id = ?, fecha_nac = ?,
         telefono = ?, mano = ?, deporte = ?, categoria_id = ?
     WHERE id = ?`,
    [
      nombre,
      apellido,
      apodo || null,
      country_id,
      fecha_nac || null,
      telefono || null,
      mano || null,
      deporte,
      categoria_id,
      id,
    ]
  )

  return exports.getById(id)
}

// ── Eliminar ────────────────────────────────────────────────────────────────────
exports.remove = async (id) => {
  const [existing] = await db.query('SELECT id FROM jugadores WHERE id = ?', [id])
  if (!existing.length) {
    throw { status: 404, message: 'Jugador no encontrado' }
  }

  await db.query('DELETE FROM jugador_stats WHERE jugador_id = ?', [id])
  await db.query('DELETE FROM jugadores WHERE id = ?', [id])

  return { message: 'Jugador eliminado correctamente' }
}

// ── Formateadores ───────────────────────────────────────────────────────────────
function formatListItem(row) {
  return {
    id: row.id,
    nombre: row.nombre,
    apellido: row.apellido,
    apodo: row.apodo || null,
    deporte: row.deporte,
    mano: row.mano || null,
    activo: !!row.activo,
    country: {
      code: row.country_code,
      name: row.country_name,
      flag: row.country_flag,
    },
    categoria: {
      id: row.categoria_id,
      nombre: row.categoria_nombre,
    },
  }
}

function formatDetail(row) {
  return {
    id: row.id,
    nombre: row.nombre,
    apellido: row.apellido,
    apodo: row.apodo || null,
    fecha_nac: row.fecha_nac || null,
    telefono: row.telefono || null,
    mano: row.mano || null,
    deporte: row.deporte,
    foto: row.foto || null,
    activo: !!row.activo,
    country: {
      code: row.country_code,
      name: row.country_name,
      flag: row.country_flag,
    },
    categoria: {
      id: row.categoria_id,
      nombre: row.categoria_nombre,
    },
    stats: {
      victorias: row.victorias || 0,
      derrotas: row.derrotas || 0,
      puntos: row.puntos || 0,
      ranking: row.ranking || 0,
    },
  }
}
