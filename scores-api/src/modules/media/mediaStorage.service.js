const db = require('../../config/db')

/**
 * Servicio de almacenamiento persistente en base de datos (MySQL).
 * Permite que los avatares, fotos de jugadores y multimedia sobrevivan a los
 * despliegues en hosting efímero como Hostinger, reconstrucciones de contenedor y reinicios.
 */

/**
 * Guarda o actualiza un archivo multimedia en la base de datos.
 * @param {string} publicPath - Ruta pública del archivo (ej. '/uploads/avatars/xyz.webp')
 * @param {Buffer} buffer - Contenido binario de la imagen
 * @param {string} mimeType - Tipo MIME (ej. 'image/webp', 'image/jpeg')
 */
exports.save = async (publicPath, buffer, mimeType = 'image/webp') => {
  if (!publicPath || !buffer) return
  const normalizedPath = String(publicPath).trim()
  const size = Buffer.byteLength(buffer)

  await db.query(
    `INSERT INTO media_storage (path, mime_type, data, size)
     VALUES (?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       mime_type = VALUES(mime_type),
       data = VALUES(data),
       size = VALUES(size),
       updated_at = NOW()`,
    [normalizedPath, mimeType, buffer, size]
  )
}

/**
 * Recupera un archivo multimedia desde la base de datos.
 * @param {string} publicPath - Ruta pública del archivo
 * @returns {Promise<{ mimeType: string, data: Buffer, size: number } | null>}
 */
exports.get = async (publicPath) => {
  if (!publicPath) return null
  const normalizedPath = String(publicPath).trim()

  const [rows] = await db.query(
    'SELECT mime_type, data, size FROM media_storage WHERE path = ? LIMIT 1',
    [normalizedPath]
  )

  if (!rows.length || !rows[0].data) return null

  return {
    mimeType: rows[0].mime_type || 'image/webp',
    data: rows[0].data,
    size: rows[0].size || rows[0].data.length,
  }
}

/**
 * Elimina un archivo multimedia de la base de datos.
 * @param {string} publicPath - Ruta pública del archivo
 */
exports.delete = async (publicPath) => {
  if (!publicPath) return
  const normalizedPath = String(publicPath).trim()
  try {
    await db.query('DELETE FROM media_storage WHERE path = ?', [normalizedPath])
  } catch (err) {
    console.warn(`[mediaStorage] Error al eliminar ${normalizedPath}:`, err.message)
  }
}
