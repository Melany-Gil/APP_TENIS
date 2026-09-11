const db = require('../../config/db')
const bcrypt = require('bcryptjs')
const { validateIdentifierCrossing } = require('../../utils/loginIdentifiers')
const { identity, assertPhoneAvailable } = require('../../utils/memberIdentity')

const BASE_FIELDS =
  'u.id, u.numero_documento, u.nombre, u.apellido, u.email, u.telefono, u.telefono_acceso, u.avatar, u.rol, u.activo, u.created_at'

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

const createAccount = async ({
  numero_documento,
  usuario,
  nombre,
  apellido,
  email,
  password,
  telefono,
  rol = 'miembro',
}, executor = db, aliasReady) => {
  if (!['admin', 'juez_director', 'juez', 'miembro'].includes(rol)) {
    throw { status: 400, message: 'Rol inválido' }
  }
  const details = identity({ numero_documento, email, telefono, usuario }, rol)
  numero_documento = details.document
  email = details.email
  await assertPhoneAvailable(executor, details.phoneKey)

  const aliasSupported = aliasReady ?? await hasUsuarioColumn()
  const alias = aliasSupported ? normalizeUsuario(usuario) : null
  if (!aliasSupported && usuario) throw { status: 503, message: 'El acceso por usuario se está preparando. Reintenta en unos minutos.' }
  if (aliasSupported) await validateIdentifierCrossing(executor, { documento: numero_documento, usuario: alias })

  const [existing] = await executor.query(
    'SELECT id FROM users WHERE numero_documento = ? OR email = ? LIMIT 1',
    [numero_documento, email]
  )
  if (existing.length) {
    throw { status: 409, message: 'El documento o correo ya está registrado' }
  }
  if (alias) {
    const [dupAlias] = await executor.query('SELECT id FROM users WHERE usuario = ? LIMIT 1', [alias])
    if (dupAlias.length) {
      throw { status: 409, message: 'Ese usuario ya está en uso por otra cuenta' }
    }
  }

  const hashedPassword = await bcrypt.hash(password, 12)
  const columns = ['numero_documento', 'nombre', 'apellido', 'email', 'password', 'telefono', 'rol', 'telefono_acceso']
  const values = [
    numero_documento,
    nombre.trim(),
    apellido.trim(),
    email,
    hashedPassword,
    telefono?.trim() || null,
    rol,
    details.phoneKey,
  ]
  if (aliasSupported) {
    columns.splice(1, 0, 'usuario')
    values.splice(1, 0, alias)
  }

  let result
  try { [result] = await executor.query(
    `INSERT INTO users (${columns.join(', ')}, activo)
     VALUES (${columns.map(() => '?').join(', ')}, TRUE)`,
    values
  ) } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') throw { status: 409, message: 'El celular de acceso, documento, correo o usuario ya está registrado en otra cuenta' }
    throw err
  }

  return result.insertId
}

exports.create = async (data) => {
  const player = data.jugador
  if (!player || player.modo === 'ninguno') return exports.getById(await createAccount(data))
  if ((data.rol || 'miembro') !== 'miembro') throw { status: 400, message: 'La vinculación de jugador en este formulario es para miembros' }
  if (!['existente', 'nuevo'].includes(player.modo)) throw { status: 400, message: 'Selecciona cómo vincular el jugador' }
  const aliasReady = await hasUsuarioColumn()
  const conn = await db.getConnection()
  let userId
  try {
    await conn.beginTransaction()
    const link = await require('./userPlayer').preparePlayer(conn, player, data)
    userId = await createAccount(data, conn, aliasReady)
    await link(userId)
    await conn.commit()
  } catch (err) {
    await conn.rollback()
    if (err.code === 'ER_DUP_ENTRY') throw { status: 409, message: 'El usuario o jugador ya está vinculado. Actualiza la lista y revisa los datos.' }
    throw err
  } finally { conn.release() }
  return exports.getById(userId)
}

exports.updateUsuario = async (id, usuario) => {
  if (!(await hasUsuarioColumn())) {
    throw {
      status: 503,
      message: 'La función de usuario de acceso aún no está disponible. Reinténtalo en unos minutos.',
    }
  }

  const [existing] = await db.query('SELECT id, rol, numero_documento, email, telefono, usuario FROM users WHERE id = ?', [id])
  if (!existing.length) throw { status: 404, message: 'Usuario no encontrado' }

  const alias = normalizeUsuario(usuario)
  if (existing[0].rol === 'miembro' && !alias && !existing[0].numero_documento) {
    identity({ ...existing[0], usuario: alias }, 'miembro')
  }
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
  const [existing] = await db.query('SELECT id, rol, numero_documento, email, telefono, usuario FROM users WHERE id = ?', [id])
  if (!existing.length) throw { status: 404, message: 'Usuario no encontrado' }
  const current = existing[0]
  const details = identity({ ...current, email: email === undefined ? current.email : email, telefono: telefono === undefined ? current.telefono : telefono }, current.rol)
  await assertPhoneAvailable(db, details.phoneKey, id)

  if (email) {
    const [dup] = await db.query('SELECT id FROM users WHERE email = ? AND id != ?', [email, id])
    if (dup.length) throw { status: 409, message: 'Ese correo ya está en uso por otra cuenta' }
  }

  await db.query(
    `UPDATE users
     SET nombre = COALESCE(?, nombre),
         apellido = COALESCE(?, apellido),
         telefono = ?,
         email = ?,
         telefono_acceso = ?,
         updated_at = NOW()
     WHERE id = ?`,
    [nombre || null, apellido || null, details.phone, details.email, details.phoneKey, id]
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
    acceso_celular: Boolean(row.telefono_acceso),
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
