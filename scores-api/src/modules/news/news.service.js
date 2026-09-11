const db = require('../../config/db')
const { deleteUpload } = require('../../middlewares/upload.middleware')
const cleanImage = value => { if (/^\/uploads\/anuncios\/[\w.-]+$/.test(value || '')) deleteUpload(value) }
const validate = ({ titulo, contenido, tipo = 'noticia' }) => {
  if (typeof titulo !== 'string' || !titulo.trim() || titulo.length > 255 || typeof contenido !== 'string' || !contenido.trim() || contenido.length > 15000 || !['noticia', 'evento', 'resultado', 'aviso'].includes(tipo)) throw { status: 400, message: 'Revisa el título (máximo 255), contenido (máximo 15000) y tipo del aviso.' }
  return [titulo.trim(), contenido.trim(), tipo]
}

exports.getAll = async ({ tipo } = {}) => {
  let sql =
    'SELECT id, titulo, contenido, imagen_url, tipo, publicado, created_at FROM anuncios WHERE publicado = TRUE'
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
    'SELECT id, titulo, contenido, imagen_url, tipo, publicado, created_at FROM anuncios WHERE id = ? AND publicado = TRUE LIMIT 1',
    [id]
  )
  if (!rows.length) throw { status: 404, message: 'Anuncio no encontrado' }
  return rows[0]
}

exports.create = async (data, created_by) => {
  const values = validate(data)
  const [result] = await db.query(
    'INSERT INTO anuncios (titulo, contenido, tipo, imagen_url, publicado, created_by) VALUES (?, ?, ?, ?, TRUE, ?)',
    [...values, data.imagen_url || null, created_by]
  )
  return { id: result.insertId }
}

exports.update = async (id, data) => {
  const values = validate(data)
  const conn = await db.getConnection()
  let oldImage, newImage
  try {
    await conn.beginTransaction()
    const [rows] = await conn.query('SELECT imagen_url FROM anuncios WHERE id = ? FOR UPDATE', [id])
    if (!rows.length) throw { status: 404, message: 'Anuncio no encontrado' }
    oldImage = rows[0].imagen_url
    newImage = data.imagen_url === undefined ? oldImage : data.imagen_url
    await conn.query('UPDATE anuncios SET titulo = ?, contenido = ?, tipo = ?, imagen_url = ? WHERE id = ?', [...values, newImage, id])
    await conn.commit()
  } catch (err) { await conn.rollback(); throw err }
  finally { conn.release() }
  if (oldImage !== newImage) cleanImage(oldImage)
  return { id: Number(id) }
}

exports.remove = async (id) => {
  const conn = await db.getConnection()
  let image
  try {
    await conn.beginTransaction()
    const [rows] = await conn.query('SELECT imagen_url FROM anuncios WHERE id = ? FOR UPDATE', [id])
    if (!rows.length) throw { status: 404, message: 'Anuncio no encontrado' }
    image = rows[0].imagen_url
    await conn.query('DELETE FROM anuncios WHERE id = ?', [id])
    await conn.commit()
  } catch (err) { await conn.rollback(); throw err }
  finally { conn.release() }
  cleanImage(image)
  return { message: 'Anuncio eliminado' }
}
