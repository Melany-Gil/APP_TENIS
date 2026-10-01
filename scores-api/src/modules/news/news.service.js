const db = require('../../config/db')
const { deleteUpload } = require('../../middlewares/upload.middleware')

const cleanImage = (value) => {
  if (/^\/uploads\/anuncios\/[\w.-]+$/.test(value || '')) deleteUpload(value)
}

const validate = ({ titulo, contenido, tipo = 'noticia' }) => {
  if (
    typeof titulo !== 'string' ||
    !titulo.trim() ||
    titulo.length > 255 ||
    typeof contenido !== 'string' ||
    !contenido.trim() ||
    contenido.length > 15000 ||
    !['noticia', 'evento', 'resultado', 'aviso'].includes(tipo)
  ) {
    const err = new Error('Revisa el título (máximo 255), contenido (máximo 15000) y tipo del aviso.')
    err.status = 400
    throw err
  }
  return [titulo.trim(), contenido.trim(), tipo]
}

exports.getAll = async ({ tipo, includeAll = false } = {}) => {
  let sql = `
    SELECT
      a.id,
      a.titulo,
      a.contenido,
      a.imagen_url,
      a.tipo,
      a.publicado,
      a.created_at,
      a.created_by,
      TRIM(CONCAT(COALESCE(u.nombre, ''), ' ', COALESCE(u.apellido, ''))) AS autor_nombre
    FROM anuncios a
    LEFT JOIN users u ON u.id = a.created_by
    WHERE 1=1
  `
  const params = []
  if (!includeAll) {
    sql += ' AND a.publicado = TRUE'
  }
  if (tipo && ['noticia', 'evento', 'resultado', 'aviso'].includes(tipo)) {
    sql += ' AND a.tipo = ?'
    params.push(tipo)
  }
  sql += ' ORDER BY a.created_at DESC'
  const [rows] = await db.query(sql, params)
  return rows
}

exports.getById = async (id, { includeAll = false } = {}) => {
  let sql = `
    SELECT
      a.id,
      a.titulo,
      a.contenido,
      a.imagen_url,
      a.tipo,
      a.publicado,
      a.created_at,
      a.created_by,
      TRIM(CONCAT(COALESCE(u.nombre, ''), ' ', COALESCE(u.apellido, ''))) AS autor_nombre
    FROM anuncios a
    LEFT JOIN users u ON u.id = a.created_by
    WHERE a.id = ?
  `
  const params = [id]
  if (!includeAll) {
    sql += ' AND a.publicado = TRUE'
  }
  sql += ' LIMIT 1'
  const [rows] = await db.query(sql, params)
  if (!rows.length) {
    const err = new Error('Anuncio no encontrado')
    err.status = 404
    throw err
  }
  return rows[0]
}

exports.create = async (data, created_by) => {
  const values = validate(data)
  const publicado = data.publicado !== undefined ? Boolean(data.publicado) : true
  const [result] = await db.query(
    'INSERT INTO anuncios (titulo, contenido, tipo, imagen_url, publicado, created_by) VALUES (?, ?, ?, ?, ?, ?)',
    [...values, data.imagen_url || null, publicado, created_by]
  )
  return { id: result.insertId, publicado }
}

exports.update = async (id, data) => {
  const values = validate(data)
  const conn = await db.getConnection()
  let oldImage, newImage, updatedPublicado
  try {
    await conn.beginTransaction()
    const [rows] = await conn.query('SELECT imagen_url, publicado FROM anuncios WHERE id = ? FOR UPDATE', [id])
    if (!rows.length) {
      const err = new Error('Anuncio no encontrado')
      err.status = 404
      throw err
    }
    oldImage = rows[0].imagen_url
    newImage = data.imagen_url === undefined ? oldImage : data.imagen_url
    updatedPublicado = data.publicado !== undefined ? Boolean(data.publicado) : rows[0].publicado

    await conn.query(
      'UPDATE anuncios SET titulo = ?, contenido = ?, tipo = ?, imagen_url = ?, publicado = ? WHERE id = ?',
      [...values, newImage, updatedPublicado, id]
    )
    await conn.commit()
  } catch (err) {
    await conn.rollback()
    throw err
  } finally {
    conn.release()
  }
  if (oldImage !== newImage) cleanImage(oldImage)
  return { id: Number(id), publicado: updatedPublicado }
}

exports.togglePublicado = async (id, publicado) => {
  const conn = await db.getConnection()
  let nuevoEstado
  try {
    await conn.beginTransaction()
    const [rows] = await conn.query('SELECT id, publicado FROM anuncios WHERE id = ? FOR UPDATE', [id])
    if (!rows.length) {
      const err = new Error('Anuncio no encontrado')
      err.status = 404
      throw err
    }
    nuevoEstado = typeof publicado === 'boolean' ? publicado : !rows[0].publicado
    await conn.query('UPDATE anuncios SET publicado = ? WHERE id = ?', [nuevoEstado, id])
    await conn.commit()
  } catch (err) {
    await conn.rollback()
    throw err
  } finally {
    conn.release()
  }
  return { id: Number(id), publicado: Boolean(nuevoEstado) }
}

exports.remove = async (id) => {
  const conn = await db.getConnection()
  let image
  try {
    await conn.beginTransaction()
    const [rows] = await conn.query('SELECT imagen_url FROM anuncios WHERE id = ? FOR UPDATE', [id])
    if (!rows.length) {
      const err = new Error('Anuncio no encontrado')
      err.status = 404
      throw err
    }
    image = rows[0].imagen_url
    await conn.query('DELETE FROM anuncios WHERE id = ?', [id])
    await conn.commit()
  } catch (err) {
    await conn.rollback()
    throw err
  } finally {
    conn.release()
  }
  cleanImage(image)
  return { message: 'Anuncio eliminado' }
}
