const db = require('../../config/db')
const push = require('./push.service')
const fail = (status, message) => {
  throw { status, message }
}
const number = (value) => {
  const n = Number(value)
  if (!Number.isSafeInteger(n) || n < 1) fail(400, 'Identificador inválido')
  return n
}
const text = (value, max) => {
  if (typeof value !== 'string' || !value.trim() || value.length > max)
    fail(400, `Revisa los campos de texto (máximo ${max} caracteres).`)
  return value.trim()
}
const choice = (value, allowed) => {
  if (!allowed.includes(value)) fail(400, 'Opción inválida')
  return value
}
exports.list = async (user) => {
  const [rows] = await db.query(
    `SELECT t.*, CONCAT(u.nombre, ' ', COALESCE(u.apellido,'')) AS autor
    FROM tickets_soporte t JOIN users u ON u.id=t.user_id
    ${user.rol === 'admin' ? '' : 'WHERE t.user_id = ?'} ORDER BY t.updated_at DESC, t.id DESC LIMIT 100`,
    user.rol === 'admin' ? [] : [user.id]
  )
  return rows
}
exports.detail = async (id, user) => {
  const [rows] = await db.query(
    `SELECT * FROM tickets_soporte WHERE id=? ${user.rol === 'admin' ? '' : 'AND user_id=?'}`,
    user.rol === 'admin' ? [number(id)] : [number(id), user.id]
  )
  if (!rows.length) fail(404, 'Solicitud no encontrada')
  const [responses] = await db.query(
    `SELECT r.id,r.mensaje,r.created_at,CONCAT(u.nombre,' ',COALESCE(u.apellido,'')) AS autor
    FROM ticket_respuestas r JOIN users u ON u.id=r.user_id WHERE r.ticket_id=? ORDER BY r.id ASC`,
    [id]
  )
  return { ...rows[0], respuestas: responses }
}
exports.create = async (body, user) => {
  const asunto = text(body.asunto, 160),
    mensaje = text(body.mensaje, 4000)
  const categoria = choice(body.categoria, [
    'marcador',
    'cancha',
    'pelotas',
    'jugador',
    'tecnico',
    'otro',
  ])
  const prioridad = choice(body.prioridad, ['baja', 'media', 'alta', 'urgente'])
  const request = text(body.request_id, 64)
  if (!/^[a-zA-Z0-9-]{16,64}$/.test(request)) fail(400, 'Identificador de envío inválido')
  const partido = body.partido_id ? number(body.partido_id) : null
  const conn = await db.getConnection()
  try {
    await conn.beginTransaction()
    const [existing] = await conn.query(
      'SELECT id FROM tickets_soporte WHERE user_id=? AND request_id=?',
      [user.id, request]
    )
    if (existing.length) {
      await conn.commit()
      return { id: existing[0].id }
    }
    if (partido) {
      const [matches] = await conn.query('SELECT juez_id FROM partidos WHERE id=? FOR UPDATE', [
        partido,
      ])
      if (
        !matches.length ||
        (user.rol === 'juez' && Number(matches[0].juez_id) !== Number(user.id))
      )
        fail(403, 'Solo puedes reportar partidos que tienes asignados.')
    }
    const [result] = await conn.query(
      'INSERT INTO tickets_soporte (user_id,partido_id,request_id,asunto,categoria,prioridad,mensaje) VALUES (?,?,?,?,?,?,?)',
      [user.id, partido, request, asunto, categoria, prioridad, mensaje]
    )
    await conn.query(
      `INSERT IGNORE INTO notificaciones (user_id,clave,titulo,mensaje,link)
      SELECT id, ?, ?, ?, '/admin/tickets' FROM users WHERE rol='admin' AND activo=TRUE`,
      [
        `ticket:${result.insertId}`,
        'Nueva solicitud de soporte',
        `${prioridad.toUpperCase()} · ${asunto}`,
      ]
    )
    await push.enqueue(conn, `ticket:${result.insertId}`)
    await conn.commit()
    return { id: result.insertId }
  } catch (err) {
    await conn.rollback()
    if (err.code === 'ER_DUP_ENTRY') fail(409, 'El envío ya fue registrado. Actualiza la lista.')
    throw err
  } finally {
    conn.release()
  }
}
exports.reply = async (id, body, user) => {
  id = number(id)
  const mensaje = text(body.mensaje, 4000),
    estado = choice(body.estado, ['abierto', 'en_revision', 'resuelto'])
  if (!Number.isSafeInteger(body.version) || body.version < 0) fail(400, 'Versión inválida')
  const conn = await db.getConnection()
  try {
    await conn.beginTransaction()
    const [rows] = await conn.query(
      'SELECT user_id,version FROM tickets_soporte WHERE id=? FOR UPDATE',
      [id]
    )
    if (!rows.length) fail(404, 'Solicitud no encontrada')
    if (rows[0].version !== body.version)
      fail(409, 'Otra persona actualizó esta solicitud. Ábrela de nuevo antes de responder.')
    await conn.query('UPDATE tickets_soporte SET estado=?,version=version+1 WHERE id=?', [
      estado,
      id,
    ])
    await conn.query('INSERT INTO ticket_respuestas (ticket_id,user_id,mensaje) VALUES (?,?,?)', [
      id,
      user.id,
      mensaje,
    ])
    await conn.query(
      `INSERT IGNORE INTO notificaciones (user_id,clave,titulo,mensaje,link) VALUES (?,?,?,?,?)`,
      [
        rows[0].user_id,
        `ticket:${id}:reply:${body.version + 1}`,
        'Respuesta de soporte',
        `Tu solicitud #${id} fue actualizada: ${estado.replace('_', ' ')}.`,
        '/soporte',
      ]
    )
    await push.enqueue(conn, `ticket:${id}:reply:${body.version + 1}`)
    await conn.commit()
    return { id }
  } catch (err) {
    await conn.rollback()
    throw err
  } finally {
    conn.release()
  }
}
