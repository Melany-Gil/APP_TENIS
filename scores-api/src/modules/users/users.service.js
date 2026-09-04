const db = require('../../config/db')
const bcrypt = require('bcryptjs')

const SAFE_FIELDS =
  'u.id, u.numero_documento, u.nombre, u.apellido, u.email, u.telefono, u.avatar, u.rol, u.activo, u.created_at'

const USER_WITH_PLAYER = `
  SELECT ${SAFE_FIELDS},
         j.id AS jugador_id,
         j.nombre AS jugador_nombre,
         j.apellido AS jugador_apellido,
         j.foto AS jugador_foto
  FROM users u
  LEFT JOIN jugadores j ON j.user_id = u.id
`

exports.getAll = async () => {
  const [rows] = await db.query(`${USER_WITH_PLAYER} WHERE u.activo = TRUE ORDER BY u.created_at DESC`)
  return rows.map(formatUser)
}

exports.getById = async (id) => {
  const [rows] = await db.query(`${USER_WITH_PLAYER} WHERE u.id = ? LIMIT 1`, [id])
  if (!rows.length) throw { status: 404, message: 'Usuario no encontrado' }
  return formatUser(rows[0])
}

exports.create = async ({
  numero_documento,
  nombre,
  apellido,
  email,
  password,
  telefono,
  rol = 'miembro',
}) => {
  if (!['admin', 'juez', 'miembro'].includes(rol)) {
    throw { status: 400, message: 'Rol inválido' }
  }

  const [existing] = await db.query(
    'SELECT id FROM users WHERE numero_documento = ? OR email = ? LIMIT 1',
    [numero_documento, email.toLowerCase()]
  )
  if (existing.length) {
    throw { status: 409, message: 'El documento o correo ya está registrado' }
  }

  const hashedPassword = await bcrypt.hash(password, 12)
  const [result] = await db.query(
    `INSERT INTO users
       (numero_documento, nombre, apellido, email, password, telefono, rol, activo)
     VALUES (?, ?, ?, ?, ?, ?, ?, TRUE)`,
    [
      numero_documento.trim(),
      nombre.trim(),
      apellido.trim(),
      email.trim().toLowerCase(),
      hashedPassword,
      telefono?.trim() || null,
      rol,
    ]
  )

  return exports.getById(result.insertId)
}

exports.updateRole = async (id, rol, requesterId) => {
  if (!['admin', 'juez', 'miembro'].includes(rol)) {
    throw { status: 400, message: 'Rol inválido. Debe ser "admin", "juez" o "miembro"' }
  }
  if (Number(id) === Number(requesterId)) {
    throw { status: 400, message: 'No puedes cambiar tu propio rol' }
  }

  const [existing] = await db.query('SELECT id FROM users WHERE id = ?', [id])
  if (!existing.length) throw { status: 404, message: 'Usuario no encontrado' }

  await db.query('UPDATE users SET rol = ?, updated_at = NOW() WHERE id = ?', [rol, id])
  return exports.getById(id)
}

exports.updateMe = async (id, { nombre, apellido, telefono, email }) => {
  const [existing] = await db.query('SELECT id FROM users WHERE id = ?', [id])
  if (!existing.length) throw { status: 404, message: 'Usuario no encontrado' }

  if (email) {
    const [dup] = await db.query('SELECT id FROM users WHERE email = ? AND id != ?', [email, id])
    if (dup.length) throw { status: 409, message: 'Ese correo ya está en uso por otra cuenta' }
  }

  await db.query(
    `UPDATE users
     SET nombre = COALESCE(?, nombre),
         apellido = COALESCE(?, apellido),
         telefono = ?,
         email = COALESCE(?, email),
         updated_at = NOW()
     WHERE id = ?`,
    [nombre || null, apellido || null, telefono || null, email || null, id]
  )

  return exports.getById(id)
}

exports.changePassword = async (id, currentPassword, newPassword) => {
  const [rows] = await db.query('SELECT password FROM users WHERE id = ?', [id])
  if (!rows.length) throw { status: 404, message: 'Usuario no encontrado' }

  const match = await bcrypt.compare(currentPassword, rows[0].password)
  if (!match) throw { status: 401, message: 'La contraseña actual es incorrecta' }

  const hashed = await bcrypt.hash(newPassword, 12)
  await db.query('UPDATE users SET password = ?, updated_at = NOW() WHERE id = ?', [hashed, id])

  return { message: 'Contraseña actualizada correctamente' }
}

exports.updateAvatar = async (id, avatarPath) => {
  const [existing] = await db.query('SELECT id FROM users WHERE id = ?', [id])
  if (!existing.length) throw { status: 404, message: 'Usuario no encontrado' }

  await db.query('UPDATE users SET avatar = ?, updated_at = NOW() WHERE id = ?', [avatarPath, id])
  return exports.getById(id)
}

function formatUser(row) {
  return {
    id: row.id,
    numero_documento: row.numero_documento,
    nombre: row.nombre,
    apellido: row.apellido,
    email: row.email,
    telefono: row.telefono || null,
    avatar: row.avatar || null,
    rol: row.rol,
    activo: Boolean(row.activo),
    created_at: row.created_at,
    jugador: row.jugador_id
      ? {
          id: row.jugador_id,
          nombre: row.jugador_nombre,
          apellido: row.jugador_apellido,
          foto: row.jugador_foto || null,
        }
      : null,
  }
}
