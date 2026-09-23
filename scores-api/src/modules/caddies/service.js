const db = require('../../config/db')
const fail = (message, status = 400) => {
  throw Object.assign(new Error(message), { status })
}
const id = (value) => {
  const n = Number(value)
  if (!Number.isSafeInteger(n) || n <= 0) fail('Identificador inválido')
  return n
}
const manager = (user) => ['admin', 'juez_director'].includes(user.rol)
const canAssign = (user, match) =>
  manager(user) || (user.rol === 'juez' && Number(match.juez_id) === Number(user.id))
exports.assertAssigned = async (conn, m) => {
  const [rows] = await conn.query(
    `SELECT a.caddie_id FROM caddie_asignaciones a
    JOIN users u ON u.id = a.caddie_id JOIN caddie_roles c ON c.user_id = u.id
    WHERE a.partido_id = ? AND u.activo = TRUE AND c.activo = TRUE`,
    [m.id]
  )
  if (!rows.length) fail('Selecciona y guarda un caddie activo antes de iniciar el partido.', 409)
  const caddie = Number(rows[0].caddie_id)
  if (caddie === Number(m.juez_id) || (await participants(conn, m)).includes(caddie))
    fail(
      'El caddie asignado también figura como juez o jugador. Corrige la asignación antes de iniciar.',
      409
    )
}
exports.context = async (user) => {
  const [rows] = await db.query(
    `SELECT
    EXISTS(SELECT 1 FROM caddie_roles WHERE user_id = ?) AS caddie,
    EXISTS(SELECT 1 FROM jugadores WHERE user_id = ?) AS jugador`,
    [user.id, user.id]
  )
  return {
    caddie: !!Number(rows[0]?.caddie),
    jugador: !!Number(rows[0]?.jugador),
    gestion: manager(user) || user.rol === 'juez',
  }
}
async function resolveView(user, requested) {
  const roles = await exports.context(user)
  const view = requested || (roles.gestion ? 'gestion' : roles.caddie ? 'caddie' : 'jugador')
  if (!['gestion', 'caddie', 'jugador'].includes(view) || !roles[view])
    fail('No tienes acceso a esta vista.', 403)
  return view
}
async function transaction(action) {
  const conn = await db.getConnection()
  try {
    await conn.beginTransaction()
    const result = await action(conn)
    await conn.commit()
    return result
  } catch (e) {
    await conn.rollback()
    if (e.code === 'ER_DUP_ENTRY') fail('Ya registraste una evaluación para este partido.', 409)
    throw e
  } finally {
    conn.release()
  }
}
async function match(conn, matchId, lock = false) {
  const [rows] = await conn.query(
    `SELECT * FROM partidos WHERE id = ?${lock ? ' FOR UPDATE' : ''}`,
    [id(matchId)]
  )
  if (!rows.length) fail('Partido no encontrado', 404)
  return rows[0]
}
async function participants(conn, m) {
  const [rows] = await conn.query(
    `SELECT DISTINCT j.user_id FROM jugadores j WHERE j.user_id IS NOT NULL AND
    (j.id IN (?, ?) OR j.id IN (SELECT jugador1_id FROM equipos_padel WHERE id IN (?, ?))
    OR j.id IN (SELECT jugador2_id FROM equipos_padel WHERE id IN (?, ?)))`,
    [m.jugador1_id, m.jugador2_id, m.equipo1_id, m.equipo2_id, m.equipo1_id, m.equipo2_id].map(
      (v) => v || null
    )
  )
  return rows.map((r) => Number(r.user_id))
}
exports.list = async () => {
  const [rows] = await db.query(
    `SELECT u.id, u.nombre, u.apellido FROM users u JOIN caddie_roles c ON c.user_id = u.id WHERE c.activo = TRUE AND u.activo = TRUE ORDER BY u.nombre, u.apellido`
  )
  return rows
}
exports.setRole = async (userId, body) => {
  if (typeof body.activo !== 'boolean') fail('Estado de caddie inválido')
  return transaction(async (conn) => {
    const [rows] = await conn.query(
      'SELECT id FROM users WHERE id = ? AND activo = TRUE FOR UPDATE',
      [id(userId)]
    )
    if (!rows.length) fail('Usuario no disponible', 404)
    await conn.query(
      'INSERT INTO caddie_roles (user_id, activo) VALUES (?, ?) ON DUPLICATE KEY UPDATE activo = VALUES(activo)',
      [id(userId), body.activo]
    )
    return { activo: body.activo }
  })
}
exports.linkPlayer = async (userId, body) =>
  transaction(async (conn) => {
    const [users] = await conn.query(
      'SELECT id FROM users WHERE id = ? AND activo = TRUE FOR UPDATE',
      [id(userId)]
    )
    if (!users.length) fail('Usuario no encontrado', 404)
    const [existing] = await conn.query('SELECT id FROM jugadores WHERE user_id = ? FOR UPDATE', [
      id(userId),
    ])
    if (existing.length) fail('Esta cuenta ya tiene jugador vinculado.', 409)
    const link = await require('../users/userPlayer').preparePlayer(
      conn,
      { modo: 'existente', id: id(body.jugador_id) },
      {}
    )
    await link(id(userId))
    return { message: 'Jugador vinculado sin cambiar los roles.' }
  })
exports.assign = async (matchId, body, user) =>
  transaction(async (conn) => {
    const m = await match(conn, matchId, true)
    if (!canAssign(user, m))
      fail('Solo el juez asignado o un director puede asignar el caddie.', 403)
    if (!['programado', 'en_vivo'].includes(m.estado))
      fail('No se puede cambiar el caddie de un partido cerrado.', 409)
    const [rows] = await conn.query('SELECT * FROM caddie_asignaciones WHERE partido_id = ?', [
      m.id,
    ])
    const current = rows[0]
    if (!Number.isInteger(body.version) || body.version !== (current?.version || 0))
      fail('La asignación cambió. Actualiza y revisa antes de guardar.', 409)
    const caddieId = body.caddie_id == null ? null : id(body.caddie_id)
    if (!caddieId && m.estado === 'en_vivo')
      fail('Un partido iniciado debe mantener un caddie. Selecciona su reemplazo.', 409)
    if (caddieId) {
      const [available] = await conn.query(
        'SELECT u.id FROM users u JOIN caddie_roles c ON c.user_id = u.id WHERE u.id = ? AND u.activo = TRUE AND c.activo = TRUE FOR UPDATE',
        [caddieId]
      )
      if (!available.length) fail('El caddie no está activo.', 409)
      if (Number(m.juez_id) === caddieId || (await participants(conn, m)).includes(caddieId))
        fail('El caddie no puede ser juez ni jugador de este mismo partido.')
    }
    const [reviews] = await conn.query(
      'SELECT id FROM caddie_evaluaciones WHERE partido_id = ? LIMIT 1',
      [m.id]
    )
    if (reviews.length) fail('Ya hay evaluaciones; no se puede sustituir al caddie.', 409)
    const reason = typeof body.motivo === 'string' ? body.motivo.trim() : ''
    if (reason.length > 500 || (current?.caddie_id && reason.length < 5))
      fail('Describe el motivo del cambio (5 a 500 caracteres).')
    await conn.query(
      'INSERT INTO caddie_asignaciones (partido_id, caddie_id, version) VALUES (?, ?, 1) ON DUPLICATE KEY UPDATE caddie_id = VALUES(caddie_id), version = version + 1',
      [m.id, caddieId]
    )
    await conn.query(
      'INSERT INTO caddie_auditoria (partido_id, anterior_id, nuevo_id, actor_id, motivo) VALUES (?, ?, ?, ?, ?)',
      [m.id, current?.caddie_id || null, caddieId, user.id, reason || 'Asignación inicial']
    )
    return { message: 'Asignación guardada' }
  })
exports.review = async (matchId, body, user) =>
  transaction(async (conn) => {
    const m = await match(conn, matchId, true)
    if (m.estado !== 'finalizado') fail('Podrás evaluar cuando termine el partido.', 409)
    if (!(await participants(conn, m)).includes(Number(user.id)))
      fail('Solo pueden evaluar los jugadores de este partido.', 403)
    const [rows] = await conn.query('SELECT * FROM caddie_asignaciones WHERE partido_id = ?', [
      m.id,
    ])
    const assignment = rows[0]
    if (!assignment?.caddie_id || assignment.version !== body.version)
      fail('La asignación cambió. Actualiza el formulario.', 409)
    if (Number(assignment.caddie_id) === Number(user.id))
      fail('No puedes evaluarte a ti mismo.', 403)
    const scores = ['atencion', 'colaboracion', 'trato'].map((k) => body[k])
    if (scores.some((n) => !Number.isInteger(n) || n < 1 || n > 5))
      fail('Completa cada valoración con un número de 1 a 5.')
    if (body.comentario != null && typeof body.comentario !== 'string') fail('Comentario inválido')
    const comment = (body.comentario || '').trim()
    if (comment.length > 1000) fail('El comentario admite hasta 1000 caracteres.')
    await conn.query(
      'INSERT INTO caddie_evaluaciones (partido_id, caddie_id, autor_id, atencion, colaboracion, trato, comentario) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [m.id, assignment.caddie_id, user.id, ...scores, comment]
    )
    return { message: 'Gracias. Tu evaluación quedó registrada.' }
  })
exports.detail = async (matchId, user, requested) => {
  const view = await resolveView(user, requested)
  const m = await match(db, matchId)
  const [rows] = await db.query(
    'SELECT a.*, u.nombre, u.apellido FROM caddie_asignaciones a LEFT JOIN users u ON u.id = a.caddie_id WHERE partido_id = ?',
    [m.id]
  )
  const a = rows[0]
  const player = (await participants(db, m)).includes(Number(user.id))
  const ownCaddie = Number(a?.caddie_id) === Number(user.id)
  if (view === 'caddie' ? !ownCaddie : view === 'jugador' ? !player : !canAssign(user, m))
    fail('No tienes acceso a este partido.', 403)
  // The caddie only receives anonymous values, never author IDs or timestamps.
  const allReviews = view === 'caddie' || (view === 'gestion' && manager(user))
  const [reviews] = await db.query(
    `SELECT atencion, colaboracion, trato, comentario FROM caddie_evaluaciones WHERE partido_id = ?${allReviews ? '' : ' AND autor_id = ?'}`,
    allReviews ? [m.id] : [m.id, user.id]
  )
  const [own] = await db.query(
    'SELECT id FROM caddie_evaluaciones WHERE partido_id = ? AND autor_id = ?',
    [m.id, user.id]
  )
  return {
    partido_id: m.id,
    estado: m.estado,
    version: a?.version || 0,
    caddie: a?.caddie_id ? { id: a.caddie_id, nombre: `${a.nombre} ${a.apellido}` } : null,
    puede_asignar:
      view === 'gestion' && canAssign(user, m) && ['programado', 'en_vivo'].includes(m.estado),
    puede_evaluar:
      view === 'jugador' &&
      player &&
      !ownCaddie &&
      m.estado === 'finalizado' &&
      !!a?.caddie_id &&
      !own.length,
    evaluaciones: reviews,
    respondida: !!own.length,
  }
}
exports.inbox = async (user, before, requested) => {
  const view = await resolveView(user, requested)
  const cursor = before == null ? 2147483647 : id(before)
  const [rows] = await db.query(
    `SELECT DISTINCT p.id, p.estado, p.fecha_inicio, t.nombre AS torneo,
    COALESCE(e1.nombre, CONCAT(j1.nombre, ' ', j1.apellido), 'Por definir') AS participante1,
    COALESCE(e2.nombre, CONCAT(j2.nombre, ' ', j2.apellido), 'Por definir') AS participante2,
    (SELECT COUNT(*) FROM caddie_evaluaciones ce WHERE ce.partido_id = p.id) AS respuestas,
    EXISTS(SELECT 1 FROM caddie_evaluaciones ce WHERE ce.partido_id = p.id AND ce.autor_id = ?) AS respondida,
    a.caddie_id
    FROM partidos p LEFT JOIN torneos t ON t.id = p.torneo_id
    LEFT JOIN equipos_padel e1 ON e1.id = p.equipo1_id LEFT JOIN equipos_padel e2 ON e2.id = p.equipo2_id
    LEFT JOIN jugadores j1 ON j1.id = p.jugador1_id LEFT JOIN jugadores j2 ON j2.id = p.jugador2_id
    LEFT JOIN caddie_asignaciones a ON a.partido_id = p.id
    WHERE p.id < ? AND (? = TRUE OR a.caddie_id = ? OR p.juez_id = ? OR (? = TRUE AND EXISTS (
      SELECT 1 FROM jugadores j WHERE j.user_id = ? AND
      (j.id IN (p.jugador1_id, p.jugador2_id) OR j.id IN (SELECT jugador1_id FROM equipos_padel WHERE id IN (p.equipo1_id,p.equipo2_id))
      OR j.id IN (SELECT jugador2_id FROM equipos_padel WHERE id IN (p.equipo1_id,p.equipo2_id))))))
    ORDER BY p.id DESC LIMIT 100`,
    [
      user.id,
      cursor,
      view === 'gestion' && manager(user),
      view === 'caddie' ? user.id : null,
      view === 'gestion' && user.rol === 'juez' ? user.id : null,
      view === 'jugador',
      user.id,
    ]
  )
  return rows
}
