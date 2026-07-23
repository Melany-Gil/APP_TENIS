const db = require('../../config/db')

exports.getAll = async ({ deporte } = {}) => {
  let sql = 'SELECT id, nombre, deporte, orden FROM categorias WHERE 1 = 1'
  const params = []
  if (deporte) {
    sql += ' AND (deporte = ? OR deporte = "ambos")'
    params.push(deporte)
  }
  sql += ' ORDER BY orden ASC, nombre ASC'
  const [rows] = await db.query(sql, params)
  return rows
}

exports.getById = async (id) => {
  const [rows] = await db.query(
    'SELECT id, nombre, deporte, orden FROM categorias WHERE id = ? LIMIT 1',
    [id]
  )
  if (!rows.length) throw { status: 404, message: 'Categoría no encontrada' }
  return rows[0]
}

exports.create = async ({ nombre, deporte, orden }) => {
  if (!nombre) throw { status: 400, message: 'El nombre de la categoría es requerido' }

  const [result] = await db.query(
    'INSERT INTO categorias (nombre, deporte, orden) VALUES (?, ?, ?)',
    [nombre, deporte || 'ambos', orden || 1]
  )

  return exports.getById(result.insertId)
}

exports.update = async (id, { nombre, deporte, orden }) => {
  const [existing] = await db.query('SELECT id FROM categorias WHERE id = ?', [id])
  if (!existing.length) throw { status: 404, message: 'Categoría no encontrada' }
  if (!nombre) throw { status: 400, message: 'El nombre de la categoría es requerido' }

  await db.query('UPDATE categorias SET nombre = ?, deporte = ?, orden = ? WHERE id = ?', [
    nombre,
    deporte || 'ambos',
    orden || 1,
    id,
  ])

  return exports.getById(id)
}

exports.remove = async (id) => {
  const [existing] = await db.query('SELECT id FROM categorias WHERE id = ?', [id])
  if (!existing.length) throw { status: 404, message: 'Categoría no encontrada' }

  await db.query('DELETE FROM categorias WHERE id = ?', [id])
  return { message: 'Categoría eliminada correctamente' }
}
