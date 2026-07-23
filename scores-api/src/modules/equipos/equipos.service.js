const db = require('../../config/db')

// ── Listar todos ────────────────────────────────────────────────────────────────
exports.getAll = async ({ categoria_id, activo }) => {
  let query = `
    SELECT
      e.id,
      e.nombre,
      e.activo,
      j1.id       AS j1_id,
      j1.nombre   AS j1_nombre,
      j1.apellido AS j1_apellido,
      c1.code     AS j1_country_code,
      c1.name     AS j1_country_name,
      c1.flag     AS j1_country_flag,
      j2.id       AS j2_id,
      j2.nombre   AS j2_nombre,
      j2.apellido AS j2_apellido,
      c2.code     AS j2_country_code,
      c2.name     AS j2_country_name,
      c2.flag     AS j2_country_flag,
      cat.id      AS categoria_id,
      cat.nombre  AS categoria_nombre
    FROM equipos_padel e
    LEFT JOIN jugadores j1  ON j1.id = e.jugador1_id
    LEFT JOIN countries c1  ON c1.id = j1.country_id
    LEFT JOIN jugadores j2  ON j2.id = e.jugador2_id
    LEFT JOIN countries c2  ON c2.id = j2.country_id
    LEFT JOIN categorias cat ON cat.id = e.categoria_id
    WHERE 1 = 1
  `

  const params = []

  if (categoria_id) {
    query += ' AND e.categoria_id = ?'
    params.push(categoria_id)
  }

  if (activo !== undefined) {
    query += ' AND e.activo = ?'
    params.push(activo === 'true' || activo === '1' ? 1 : 0)
  }

  query += ' ORDER BY e.nombre ASC'

  const [rows] = await db.query(query, params)

  return rows.map(formatEquipo)
}

// ── Obtener por ID ──────────────────────────────────────────────────────────────
exports.getById = async (id) => {
  const [rows] = await db.query(
    `SELECT
      e.id,
      e.nombre,
      e.activo,
      j1.id       AS j1_id,
      j1.nombre   AS j1_nombre,
      j1.apellido AS j1_apellido,
      c1.code     AS j1_country_code,
      c1.name     AS j1_country_name,
      c1.flag     AS j1_country_flag,
      j2.id       AS j2_id,
      j2.nombre   AS j2_nombre,
      j2.apellido AS j2_apellido,
      c2.code     AS j2_country_code,
      c2.name     AS j2_country_name,
      c2.flag     AS j2_country_flag,
      cat.id      AS categoria_id,
      cat.nombre  AS categoria_nombre
    FROM equipos_padel e
    LEFT JOIN jugadores j1  ON j1.id = e.jugador1_id
    LEFT JOIN countries c1  ON c1.id = j1.country_id
    LEFT JOIN jugadores j2  ON j2.id = e.jugador2_id
    LEFT JOIN countries c2  ON c2.id = j2.country_id
    LEFT JOIN categorias cat ON cat.id = e.categoria_id
    WHERE e.id = ?
    LIMIT 1`,
    [id]
  )

  if (!rows.length) {
    throw { status: 404, message: 'Equipo no encontrado' }
  }

  return formatEquipo(rows[0])
}

// ── Crear ────────────────────────────────────────────────────────────────────────
exports.create = async (body) => {
  const { nombre, jugador1_id, jugador2_id, categoria_id } = body

  const [result] = await db.query(
    `INSERT INTO equipos_padel (nombre, jugador1_id, jugador2_id, categoria_id)
     VALUES (?, ?, ?, ?)`,
    [nombre, jugador1_id, jugador2_id, categoria_id]
  )

  return exports.getById(result.insertId)
}

// ── Actualizar ──────────────────────────────────────────────────────────────────
exports.update = async (id, body) => {
  const [existing] = await db.query('SELECT id FROM equipos_padel WHERE id = ?', [id])
  if (!existing.length) {
    throw { status: 404, message: 'Equipo no encontrado' }
  }

  const { nombre, jugador1_id, jugador2_id, categoria_id } = body

  await db.query(
    `UPDATE equipos_padel
     SET nombre = ?, jugador1_id = ?, jugador2_id = ?, categoria_id = ?
     WHERE id = ?`,
    [nombre, jugador1_id, jugador2_id, categoria_id, id]
  )

  return exports.getById(id)
}

// ── Eliminar ────────────────────────────────────────────────────────────────────
exports.remove = async (id) => {
  const [existing] = await db.query('SELECT id FROM equipos_padel WHERE id = ?', [id])
  if (!existing.length) {
    throw { status: 404, message: 'Equipo no encontrado' }
  }

  await db.query('DELETE FROM equipos_padel WHERE id = ?', [id])

  return { message: 'Equipo eliminado correctamente' }
}

// ── Formateador ─────────────────────────────────────────────────────────────────
function formatEquipo(row) {
  return {
    id: row.id,
    nombre: row.nombre,
    jugador1: {
      id: row.j1_id,
      nombre: row.j1_nombre,
      apellido: row.j1_apellido,
      country: {
        code: row.j1_country_code,
        name: row.j1_country_name,
        flag: row.j1_country_flag,
      },
    },
    jugador2: {
      id: row.j2_id,
      nombre: row.j2_nombre,
      apellido: row.j2_apellido,
      country: {
        code: row.j2_country_code,
        name: row.j2_country_name,
        flag: row.j2_country_flag,
      },
    },
    categoria: {
      id: row.categoria_id,
      nombre: row.categoria_nombre,
    },
    activo: !!row.activo,
  }
}
