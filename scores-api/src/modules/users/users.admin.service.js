const db = require('../../config/db')
const bcrypt = require('bcryptjs')
const { validateIdentifierCrossing } = require('../../utils/loginIdentifiers')

const fail = (message, status = 400) => { throw Object.assign(new Error(message), { status }) }
const roles = ['admin', 'juez_director', 'juez', 'miembro']

// Serialize privileged changes and recheck the actor after acquiring locks.
async function mutate(id, actorId, action) {
  if (!Number.isSafeInteger(Number(id)) || Number(id) <= 0) fail('Usuario inválido')
  const conn = await db.getConnection()
  try {
    await conn.beginTransaction()
    const [admins] = await conn.query("SELECT id FROM users WHERE rol = 'admin' AND activo = TRUE ORDER BY id FOR UPDATE")
    if (!admins.some((u) => Number(u.id) === Number(actorId))) fail('Ya no tienes permisos de administrador', 403)
    const [rows] = await conn.query('SELECT id, rol, activo FROM users WHERE id = ? FOR UPDATE', [id])
    if (!rows.length) fail('Usuario no encontrado', 404)
    const protectAccess = () => {
      if (Number(id) === Number(actorId)) fail('No puedes eliminar, desactivar ni cambiar el rol de tu propia cuenta')
      if (rows[0].rol === 'admin' && rows[0].activo && admins.length <= 1) fail('Debe permanecer al menos un administrador activo', 409)
    }
    await action(conn, rows[0], protectAccess)
    await conn.commit()
    return { message: 'Usuario actualizado correctamente' }
  } catch (err) {
    await conn.rollback()
    if (err.code === 'ER_DUP_ENTRY') fail('El documento, correo o usuario de acceso ya pertenece a otra cuenta', 409)
    if (err.code === 'ER_ROW_IS_REFERENCED_2') fail('La cuenta tiene registros vinculados. Desactívala para conservar su historial.', 409)
    throw err
  } finally { conn.release() }
}

exports.update = (id, actorId, data) => mutate(id, actorId, async (conn) => {
  const fields = Object.fromEntries(['nombre', 'apellido', 'numero_documento', 'email', 'telefono', 'usuario'].map((key) => [key, String(data[key] ?? '').trim()]))
  if ([fields.nombre, fields.apellido].some((v) => v.length < 2 || v.length > 100)) fail('Nombres y apellidos deben tener entre 2 y 100 caracteres')
  if (!/^\d{5,20}$/.test(fields.numero_documento)) fail('El documento debe tener entre 5 y 20 dígitos')
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fields.email) || fields.email.length > 150) fail('Correo inválido (máximo 150 caracteres)')
  if (fields.telefono.length > 20) fail('El teléfono admite hasta 20 caracteres')
  if (fields.usuario && !/^[a-zA-Z0-9._-]{3,50}$/.test(fields.usuario)) fail('Usuario inválido: usa de 3 a 50 letras, números, puntos o guiones')
  await validateIdentifierCrossing(conn, { documento: fields.numero_documento, usuario: fields.usuario, id })
  await conn.query('UPDATE users SET nombre = ?, apellido = ?, numero_documento = ?, email = ?, telefono = ?, usuario = ? WHERE id = ?', [fields.nombre, fields.apellido, fields.numero_documento, fields.email, fields.telefono || null, fields.usuario || null, id])
})

exports.updateRole = (id, actorId, rol) => mutate(id, actorId, async (conn, user, protect) => {
  if (!roles.includes(rol)) fail('Rol inválido')
  if (rol === user.rol) return
  protect()
  await conn.query('UPDATE users SET rol = ?, session_version = session_version + 1 WHERE id = ?', [rol, id])
})

exports.setActive = (id, actorId, activo) => mutate(id, actorId, async (conn, user, protect) => {
  if (typeof activo !== 'boolean') fail('El estado debe ser activo o inactivo')
  if (!activo) protect()
  if (Boolean(user.activo) === activo) return
  await conn.query('UPDATE users SET activo = ?, session_version = session_version + 1 WHERE id = ?', [activo, id])
})

exports.resetPassword = async (id, actorId, password) => {
  if (Number(id) === Number(actorId)) fail('Para cambiar tu propia contraseña usa Mi perfil')
  if (typeof password !== 'string' || password.length < 8 || Buffer.byteLength(password) > 72 || !/[A-Z]/.test(password) || !/[0-9]/.test(password)) fail('La contraseña debe tener al menos 8 caracteres, una mayúscula y un número, y no superar 72 bytes')
  const hash = await bcrypt.hash(password, 12)
  return mutate(id, actorId, async (conn) => {
    await conn.query('UPDATE users SET password = ?, session_version = session_version + 1 WHERE id = ?', [hash, id])
    await conn.query('UPDATE password_resets SET used = TRUE WHERE user_id = ? AND used = FALSE', [id])
  })
}

exports.remove = (id, actorId) => mutate(id, actorId, async (conn, user, protect) => {
  protect()
  const [refs] = await conn.query(`SELECT TABLE_NAME AS tabla, COLUMN_NAME AS columna FROM information_schema.KEY_COLUMN_USAGE WHERE REFERENCED_TABLE_SCHEMA = DATABASE() AND REFERENCED_TABLE_NAME = 'users'`)
  // Photos retain author IDs without a user FK; protect that history too.
  const links = [...refs, { tabla: 'fotos_partido', columna: 'created_by' }]
  const labels = { jugadores: 'jugadores vinculados', partidos: 'partidos asignados', eventos_partido: 'acciones de marcador', auditoria_control_partido: 'registros de auditoría', fotos_partido: 'fotografías registradas', torneos: 'torneos creados', anuncios: 'anuncios creados' }
  const reasons = []
  for (const { tabla, columna } of links) {
    // These are personal preferences/recovery codes, not sporting history.
    if (columna === 'user_id' && ['favoritos', 'password_resets'].includes(tabla)) continue
    if (!/^[a-zA-Z0-9_]+$/.test(tabla) || !/^[a-zA-Z0-9_]+$/.test(columna)) fail('No se pudo comprobar el historial de la cuenta', 500)
    const [[row]] = await conn.query(`SELECT COUNT(*) AS total FROM \`${tabla}\` WHERE \`${columna}\` = ?`, [id])
    const label = tabla === 'partidos' && columna === 'created_by' ? 'partidos creados' : labels[tabla] || 'registros relacionados'
    if (Number(row.total)) reasons.push(`${row.total} ${label}`)
  }
  if (reasons.length) fail(`No se puede eliminar esta cuenta: tiene ${reasons.join(', ')}. Puedes desactivarla para impedir el acceso sin perder el historial.`, 409)
  await conn.query('DELETE FROM favoritos WHERE user_id = ?', [id])
  await conn.query('DELETE FROM password_resets WHERE user_id = ?', [id])
  await conn.query('DELETE FROM users WHERE id = ?', [id])
})
