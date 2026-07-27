const db = require('../../config/db')
const { getPlayerStats } = require('../../utils/playerStats')

// Las categorías pertenecen a los partidos, no al perfil del jugador.
// Por eso las estadísticas se calculan desde los resultados finalizados.
exports.getAll = async ({ deporte, categoria_id, activo }) => {
  let query = `
    SELECT
      j.id,
      j.nombre,
      j.apellido,
      j.deporte,
      j.activo
    FROM jugadores j
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
    .map((row) => formatListItem(row, statsByPlayer.get(row.id)))
    .filter((player) => !categoryId || player.stats)
}

exports.getById = async (id) => {
  const [rows] = await db.query(
    `SELECT id, nombre, apellido, deporte, activo
     FROM jugadores
     WHERE id = ?
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
  const { nombre, apellido, deporte } = body

  const [result] = await db.query(
    `INSERT INTO jugadores
       (nombre, apellido, country_id, deporte)
     VALUES (?, ?, 1, ?)`,
    [nombre.trim(), apellido.trim(), deporte]
  )

  return exports.getById(result.insertId)
}

exports.update = async (id, body) => {
  const [existing] = await db.query('SELECT id FROM jugadores WHERE id = ?', [id])
  if (!existing.length) {
    throw { status: 404, message: 'Jugador no encontrado' }
  }

  const { nombre, apellido, deporte } = body
  await db.query(
    `UPDATE jugadores
     SET nombre = ?, apellido = ?, deporte = ?
     WHERE id = ?`,
    [nombre.trim(), apellido.trim(), deporte, id]
  )

  return exports.getById(id)
}

exports.remove = async (id) => {
  const [existing] = await db.query('SELECT id FROM jugadores WHERE id = ?', [id])
  if (!existing.length) {
    throw { status: 404, message: 'Jugador no encontrado' }
  }

  await db.query('DELETE FROM jugador_stats WHERE jugador_id = ?', [id])
  await db.query('DELETE FROM jugadores WHERE id = ?', [id])

  return { message: 'Jugador eliminado correctamente' }
}

function formatListItem(row, stats) {
  return {
    id: row.id,
    nombre: row.nombre,
    apellido: row.apellido,
    deporte: row.deporte,
    activo: !!row.activo,
    stats: stats || null,
  }
}

function positiveId(value) {
  const parsed = Number(value)
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null
}
