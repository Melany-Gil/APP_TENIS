const db = require('../../config/db')

exports.getAll = async ({ tipo } = {}) => {
  let sql =
    'SELECT id, titulo, contenido, tipo, publicado, created_at FROM anuncios WHERE publicado = TRUE'
  const params = []
  if (tipo) {
    sql += ' AND tipo = ?'
    params.push(tipo)
  }
  sql += ' ORDER BY created_at DESC'
  const [rows] = await db.query(sql, params)
  return rows
}

exports.getById = async (id) => {
  const [rows] = await db.query(
    'SELECT id, titulo, contenido, tipo, publicado, created_at FROM anuncios WHERE id = ? LIMIT 1',
    [id]
  )
  if (!rows.length) throw { status: 404, message: 'Anuncio no encontrado' }
  return rows[0]
}

exports.create = async ({ titulo, contenido, tipo }, created_by) => {
  const [result] = await db.query(
    'INSERT INTO anuncios (titulo, contenido, tipo, publicado, created_by) VALUES (?, ?, ?, TRUE, ?)',
    [titulo, contenido, tipo || 'noticia', created_by]
  )
  return exports.getById(result.insertId)
}

exports.remove = async (id) => {
  const [ex] = await db.query('SELECT id FROM anuncios WHERE id = ?', [id])
  if (!ex.length) throw { status: 404, message: 'Anuncio no encontrado' }
  await db.query('DELETE FROM anuncios WHERE id = ?', [id])
  return { message: 'Anuncio eliminado' }
}
