const db = require('../../config/db')
const { getPlayerStats } = require('../../utils/playerStats')
const { describeDependencies, rethrowDeleteConflict } = require('../../utils/deleteConflict')

// La categoría del perfil es opcional. Las estadísticas siguen usando
// la categoría histórica de cada partido finalizado.
exports.getAll = async ({ deporte, categoria_id, activo, includeAccount = false }) => {
  let query = `
    SELECT
      j.id,
      j.nombre,
      j.apellido,
      j.deporte,
      j.categoria_id,
      j.activo,
      j.foto,
      j.user_id,
      c.nombre AS categoria_nombre
      ${includeAccount ? ', u.nombre AS usuario_nombre, u.apellido AS usuario_apellido, u.email AS usuario_email' : ''}
    FROM jugadores j
      LEFT JOIN categorias c ON c.id = j.categoria_id
    ${includeAccount ? 'LEFT JOIN users u ON u.id = j.user_id' : ''}
    WHERE 1 = 1
  `
  const params = []

  if (deporte) {
    query += deporte === 'tenis' ? " AND j.deporte IN ('tenis', 'ambos')" : ' AND j.deporte = ?'
    if (deporte !== 'tenis') params.push(deporte)
  }

  if (activo !== undefined) {
    query += ' AND j.activo = ?'
    params.push(activo === 'true' || activo === '1' ? 1 : 0)
  }

  query += ' ORDER BY j.apellido ASC, j.nombre ASC'
  const [rows] = await db.query(query, params)

  const categoryId = positiveId(categoria_id)
  const stats = await getPlayerStats(db, { categoriaId: categoryId })
  const statsByPlayer = new Map(stats.map((entry) => [entry.jugador_id, entry]))

  return rows
    .map((row) => formatListItem(row, statsByPlayer.get(row.id), includeAccount))
    .filter((player) => !categoryId || player.stats)
}

exports.getById = async (id) => {
  const [rows] = await db.query(
    `SELECT j.id, j.nombre, j.apellido, j.deporte, j.categoria_id, j.activo, j.foto,
            c.nombre AS categoria_nombre
     FROM jugadores j
       LEFT JOIN categorias c ON c.id = j.categoria_id
     WHERE j.id = ?
     LIMIT 1`,
    [id]
  )

  if (!rows.length) {
    throw { status: 404, message: 'Jugador no encontrado' }
  }

  const allStats = await getPlayerStats(db)
  const playerStats = allStats.filter((entry) => entry.jugador_id === Number(id))

  return {
    ...formatListItem(rows[0]),
    estadisticas: playerStats,
  }
}

exports.create = async (body) => {
  const { nombre, apellido, deporte, categoria_id } = body
  const catId = await validateCategory(categoria_id, deporte)

  const [result] = await db.query(
    `INSERT INTO jugadores
       (nombre, apellido, country_id, deporte, categoria_id)
     VALUES (?, ?, 1, ?, ?)`,
    [nombre.trim(), apellido.trim(), deporte, catId]
  )

  return exports.getById(result.insertId)
}

exports.update = async (id, body) => {
  const [existing] = await db.query('SELECT id FROM jugadores WHERE id = ?', [id])
  if (!existing.length) {
    throw { status: 404, message: 'Jugador no encontrado' }
  }

  const { nombre, apellido, deporte, categoria_id } = body
  const catId = await validateCategory(categoria_id, deporte)
  await db.query(
    `UPDATE jugadores
     SET nombre = ?, apellido = ?, deporte = ?, categoria_id = ?
     WHERE id = ?`,
    [nombre.trim(), apellido.trim(), deporte, catId, id]
  )

  return exports.getById(id)
}

exports.remove = async (id) => {
  const [existing] = await db.query(
    'SELECT id, nombre, apellido FROM jugadores WHERE id = ?',
    [id]
  )
  if (!existing.length) {
    throw { status: 404, message: 'Jugador no encontrado' }
  }

  const [[usage]] = await db.query(
    `SELECT
       (SELECT COUNT(*) FROM equipos_padel
        WHERE jugador1_id = ? OR jugador2_id = ?) AS parejas,
       (SELECT COUNT(*) FROM partidos
        WHERE jugador1_id = ? OR jugador2_id = ?) AS partidos,
       (SELECT COUNT(*) FROM inscripciones WHERE jugador_id = ?) AS inscripciones`,
    [id, id, id, id, id]
  )
  const dependencies = describeDependencies([
    { count: usage.parejas, singular: 'pareja', plural: 'parejas' },
    { count: usage.partidos, singular: 'partido', plural: 'partidos' },
    { count: usage.inscripciones, singular: 'inscripción', plural: 'inscripciones' },
  ])
  if (dependencies.length) {
    throw {
      status: 409,
      message: `${existing[0].nombre} ${existing[0].apellido} no se puede eliminar porque está vinculado a ${dependencies.join(', ')}. Elimina o reasigna primero esos registros.`,
    }
  }

  try {
    await db.query('DELETE FROM jugador_stats WHERE jugador_id = ?', [id])
    await db.query('DELETE FROM jugadores WHERE id = ?', [id])
  } catch (error) {
    rethrowDeleteConflict(error, 'este jugador')
  }

  return { message: 'Jugador eliminado correctamente' }
}

exports.updateFoto = async (id, fotoPath) => {
  const [existing] = await db.query('SELECT id FROM jugadores WHERE id = ?', [id])
  if (!existing.length) throw { status: 404, message: 'Jugador no encontrado' }

  await db.query('UPDATE jugadores SET foto = ? WHERE id = ?', [fotoPath, id])
  return exports.getById(id)
}

exports.linkUser = async (id, userId) => {
  const normalizedUserId = positiveId(userId)
  if (!normalizedUserId) throw { status: 400, message: 'Selecciona una cuenta válida' }

  const [players] = await db.query('SELECT id FROM jugadores WHERE id = ?', [id])
  if (!players.length) throw { status: 404, message: 'Jugador no encontrado' }

  const [users] = await db.query('SELECT id FROM users WHERE id = ? AND activo = TRUE', [normalizedUserId])
  if (!users.length) throw { status: 404, message: 'Usuario no encontrado o inactivo' }

  try {
    await db.query('UPDATE jugadores SET user_id = ? WHERE id = ?', [normalizedUserId, id])
  } catch (linkError) {
    if (linkError.code === 'ER_DUP_ENTRY') {
      throw { status: 409, message: 'Esa cuenta ya está vinculada a otro jugador' }
    }
    throw linkError
  }
  return exports.getAll({ includeAccount: true }).then((playersList) => (
    playersList.find((player) => Number(player.id) === Number(id))
  ))
}

exports.unlinkUser = async (id) => {
  const [result] = await db.query('UPDATE jugadores SET user_id = NULL WHERE id = ?', [id])
  if (!result.affectedRows) throw { status: 404, message: 'Jugador no encontrado' }
  return exports.getById(id)
}

function formatListItem(row, stats, includeAccount = false) {
  const player = {
    id: row.id,
    nombre: row.nombre,
    apellido: row.apellido,
    deporte: row.deporte,
    categoria: row.categoria_id ? { id: row.categoria_id, nombre: row.categoria_nombre } : null,
    activo: !!row.activo,
    foto: row.foto || null,
    stats: stats || null,
  }
  if (includeAccount) {
    player.usuario = row.user_id
      ? {
          id: row.user_id,
          nombre: row.usuario_nombre,
          apellido: row.usuario_apellido,
          email: row.usuario_email,
        }
      : null
  }
  return player
}

function positiveId(value) {
  const parsed = Number(value)
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null
}

async function validateCategory(value, sport) {
  if (value === null || value === undefined || value === '') return null
  const id = positiveId(value)
  if (!id) throw { status: 400, message: 'Selecciona una categoría válida' }
  const [rows] = await db.query('SELECT deporte FROM categorias WHERE id = ? LIMIT 1', [id])
  if (!rows.length || (sport !== 'ambos' && ![sport, 'ambos'].includes(rows[0].deporte))) {
    throw { status: 400, message: 'La categoría no corresponde al deporte del jugador' }
  }
  return id
}
