const db = require('../../config/db')
const bcrypt = require('bcryptjs')
const { validateIdentifierCrossing } = require('../../utils/loginIdentifiers')

const BASE_FIELDS =
  'u.id, u.numero_documento, u.nombre, u.apellido, u.email, u.telefono, u.avatar, u.rol, u.activo, u.created_at'

const normalizeUsuario = (value) => {
  const text = String(value ?? '').trim()
  return text ? text.slice(0, 50) : null
}

// Tolerancia mientras la columna `users.usuario` termina de migrarse tras un
// despliegue: se detecta una vez y, si aún no existe, se opera sin ella.
let usuarioColumnReady = false
const hasUsuarioColumn = async () => {
  if (usuarioColumnReady) return true
  try {
    const [rows] = await db.query(
      `SELECT COUNT(*) AS total
       FROM information_schema.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE()
         AND TABLE_NAME = 'users'
         AND COLUMN_NAME = 'usuario'`
    )
    usuarioColumnReady = Number(rows[0].total) > 0
  } catch {
    usuarioColumnReady = false
  }
  return usuarioColumnReady
}

const userWithPlayer = (withUsuario) => `
  SELECT ${withUsuario ? `${BASE_FIELDS}, u.usuario` : BASE_FIELDS},
         j.id AS jugador_id,
         j.nombre AS jugador_nombre,
         j.apellido AS jugador_apellido,
         j.foto AS jugador_foto
  FROM users u
  LEFT JOIN jugadores j ON j.user_id = u.id
`

exports.getAll = async ({ estado = 'activos' } = {}) => {
  if (!['activos', 'inactivos', 'todos'].includes(estado)) throw { status: 400, message: 'Filtro de estado inválido' }
  const [rows] = await db.query(
    `${userWithPlayer(await hasUsuarioColumn())} ${estado === 'todos' ? '' : `WHERE u.activo = ${estado === 'activos' ? 'TRUE' : 'FALSE'}`} ORDER BY u.created_at DESC`
  )
  return rows.map(formatUser)
}

exports.getById = async (id) => {
  const [rows] = await db.query(`${userWithPlayer(await hasUsuarioColumn())} WHERE u.id = ? LIMIT 1`, [
    id,
  ])
  if (!rows.length) throw { status: 404, message: 'Usuario no encontrado' }
  return formatUser(rows[0])
}

exports.create = async ({
  numero_documento,
  usuario,
  nombre,
  apellido,
  email,
  password,
  telefono,
  rol = 'miembro',
}) => {
  if (!['admin', 'juez_director', 'juez', 'miembro'].includes(rol)) {
    throw { status: 400, message: 'Rol inválido' }
  }

  const aliasSupported = await hasUsuarioColumn()
  const alias = aliasSupported ? normalizeUsuario(usuario) : null
  if (aliasSupported) await validateIdentifierCrossing(db, { documento: numero_documento, usuario: alias })

  const [existing] = await db.query(
    'SELECT id FROM users WHERE numero_documento = ? OR email = ? LIMIT 1',
    [numero_documento, email.toLowerCase()]
  )
  if (existing.length) {
    throw { status: 409, message: 'El documento o correo ya está registrado' }
  }
  if (alias) {
    const [dupAlias] = await db.query('SELECT id FROM users WHERE usuario = ? LIMIT 1', [alias])
    if (dupAlias.length) {
      throw { status: 409, message: 'Ese usuario ya está en uso por otra cuenta' }
    }
  }

  const hashedPassword = await bcrypt.hash(password, 12)
  const columns = ['numero_documento', 'nombre', 'apellido', 'email', 'password', 'telefono', 'rol']
  const values = [
    numero_documento.trim(),
    nombre.trim(),
    apellido.trim(),
    email.trim().toLowerCase(),
    hashedPassword,
    telefono?.trim() || null,
    rol,
  ]
  if (aliasSupported) {
    columns.splice(1, 0, 'usuario')
    values.splice(1, 0, alias)
  }

  const [result] = await db.query(
    `INSERT INTO users (${columns.join(', ')}, activo)
     VALUES (${columns.map(() => '?').join(', ')}, TRUE)`,
    values
  )

  return exports.getById(result.insertId)
}

exports.updateUsuario = async (id, usuario) => {
  if (!(await hasUsuarioColumn())) {
    throw {
      status: 503,
      message: 'La función de usuario de acceso aún no está disponible. Reinténtalo en unos minutos.',
    }
  }

  const [existing] = await db.query('SELECT id FROM users WHERE id = ?', [id])
  if (!existing.length) throw { status: 404, message: 'Usuario no encontrado' }

  const alias = normalizeUsuario(usuario)
  await validateIdentifierCrossing(db, { usuario: alias, id })
  if (alias) {
    const [dup] = await db.query('SELECT id FROM users WHERE usuario = ? AND id != ? LIMIT 1', [
      alias,
      id,
    ])
    if (dup.length) {
      throw { status: 409, message: 'Ese usuario ya está en uso por otra cuenta' }
    }
  }

  await db.query('UPDATE users SET usuario = ?, updated_at = NOW() WHERE id = ?', [alias, id])
  return exports.getById(id)
}

exports.getJudges = async () => {
  const [rows] = await db.query(
    `SELECT u.id, u.nombre, u.apellido, u.rol, u.usuario
     FROM users u
     WHERE u.activo = TRUE AND u.rol IN ('juez', 'juez_director', 'admin')
     ORDER BY u.nombre ASC, u.apellido ASC`
  )
  return rows
}

exports.updateRole = async (id, rol, requesterId) => {
  await require('./users.admin.service').updateRole(id, requesterId, rol)
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
  if (!match) throw { status: 400, message: 'La contraseña actual es incorrecta' }

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
    usuario: row.usuario || null,
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
