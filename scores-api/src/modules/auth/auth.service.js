const crypto = require('crypto')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const db = require('../../config/db')
const mailer = require('../../config/mailer')
const { generateOTP } = require('../../utils/otp')

const signToken = (user) =>
  jwt.sign({ id: user.id, rol: user.rol || 'miembro' }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '8h',
  })

const publicUser = (user) => ({
  id: user.id,
  nombre: user.nombre,
  apellido: user.apellido,
  email: user.email,
  numero_documento: user.numero_documento,
  rol: user.rol || 'miembro',
  telefono: user.telefono || null,
  avatar: user.avatar || null,
})

const hashOTP = (otp) =>
  crypto
    .createHmac('sha256', process.env.OTP_SECRET || process.env.JWT_SECRET)
    .update(String(otp))
    .digest('hex')

const escapeHtml = (value) =>
  String(value).replace(
    /[&<>"']/g,
    (character) =>
      ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;',
      })[character]
  )

exports.login = async ({ numero_documento, password }) => {
  const [rows] = await db.query(
    'SELECT * FROM users WHERE numero_documento = ? AND activo = TRUE LIMIT 1',
    [numero_documento]
  )

  if (!rows.length || !(await bcrypt.compare(password, rows[0].password))) {
    throw { status: 401, message: 'Documento o contraseña incorrectos' }
  }

  return { token: signToken(rows[0]), user: publicUser(rows[0]) }
}

// Este endpoint solo inicializa el primer administrador. Después, los usuarios
// se crean desde el panel de administración.
exports.register = async ({ numero_documento, nombre, apellido, email, password, telefono }) => {
  const connection = await db.getConnection()
  let hasLock = false
  try {
    await connection.beginTransaction()
    const [[lockResult]] = await connection.query(
      "SELECT GET_LOCK('scoresapp:first-admin', 5) AS acquired"
    )
    hasLock = lockResult.acquired === 1
    if (!hasLock) {
      throw { status: 503, message: 'No fue posible iniciar la configuración. Intenta nuevamente.' }
    }

    const [[{ total }]] = await connection.query('SELECT COUNT(*) AS total FROM users')
    if (total > 0) {
      throw {
        status: 403,
        message: 'El registro público está cerrado. Solicita tu cuenta a un administrador.',
      }
    }

    const hashedPassword = await bcrypt.hash(password, 12)
    const [result] = await connection.query(
      `INSERT INTO users
       (numero_documento, nombre, apellido, email, password, telefono, rol, activo)
       VALUES (?, ?, ?, ?, ?, ?, 'admin', TRUE)`,
      [
        numero_documento.trim(),
        nombre.trim(),
        apellido.trim(),
        email.trim().toLowerCase(),
        hashedPassword,
        telefono?.trim() || null,
      ]
    )
    const [newUser] = await connection.query('SELECT * FROM users WHERE id = ?', [result.insertId])
    await connection.commit()

    return { token: signToken(newUser[0]), user: publicUser(newUser[0]) }
  } catch (error) {
    await connection.rollback()
    throw error
  } finally {
    try {
      if (hasLock) {
        await connection.query("SELECT RELEASE_LOCK('scoresapp:first-admin')")
      }
    } finally {
      connection.release()
    }
  }
}

exports.forgotPassword = async ({ email }) => {
  const normalizedEmail = email.trim().toLowerCase()
  const [rows] = await db.query(
    'SELECT id, nombre FROM users WHERE email = ? AND activo = TRUE LIMIT 1',
    [normalizedEmail]
  )

  // La respuesta pública es idéntica aunque la cuenta no exista.
  if (!rows.length) return

  const user = rows[0]
  const otp = generateOTP()
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000)
  const otpHash = hashOTP(otp)

  const connection = await db.getConnection()
  try {
    await connection.beginTransaction()
    await connection.query(
      'UPDATE password_resets SET used = TRUE WHERE user_id = ? AND used = FALSE',
      [user.id]
    )
    await connection.query(
      `INSERT INTO password_resets (user_id, otp_code, expires_at, used)
       VALUES (?, ?, ?, FALSE)`,
      [user.id, otpHash, expiresAt]
    )
    await connection.commit()
  } catch (error) {
    await connection.rollback()
    throw error
  } finally {
    connection.release()
  }

  await mailer.sendMail({
    from: `"Subcomité de Tenis · Club Unión" <${process.env.MAIL_FROM || process.env.MAIL_USER}>`,
    to: normalizedEmail,
    subject: 'Código para recuperar tu contraseña',
    html: `
      <div style="font-family:Arial,sans-serif;max-width:480px;margin:auto;color:#17231c">
        <h2 style="color:#176b3a">Club Unión · Tenis</h2>
        <p>Hola <strong>${escapeHtml(user.nombre)}</strong>,</p>
        <p>Tu código de verificación es:</p>
        <div style="font-size:36px;font-weight:bold;letter-spacing:8px;color:#176b3a;margin:24px 0">
          ${otp}
        </div>
        <p>Este código vence en <strong>15 minutos</strong>.</p>
        <p style="color:#647067;font-size:13px">Si no hiciste esta solicitud, ignora este mensaje.</p>
      </div>
    `,
  })
}

const findValidReset = async (email, otpCode, connection = db) => {
  const [rows] = await connection.query(
    `SELECT pr.id, pr.user_id
     FROM password_resets pr
     INNER JOIN users u ON u.id = pr.user_id
     WHERE u.email = ?
       AND pr.otp_code = ?
       AND pr.used = FALSE
       AND pr.expires_at > NOW()
     ORDER BY pr.created_at DESC
     LIMIT 1`,
    [email.trim().toLowerCase(), hashOTP(otpCode)]
  )

  if (!rows.length) {
    throw { status: 400, message: 'Código inválido o expirado' }
  }
  return rows[0]
}

exports.verifyOTP = async ({ email, otp_code }) => {
  await findValidReset(email, otp_code)
}

exports.resetPassword = async ({ email, otp_code, password }) => {
  const connection = await db.getConnection()
  try {
    await connection.beginTransaction()
    const reset = await findValidReset(email, otp_code, connection)
    const hashedPassword = await bcrypt.hash(password, 12)

    await connection.query('UPDATE users SET password = ?, updated_at = NOW() WHERE id = ?', [
      hashedPassword,
      reset.user_id,
    ])
    await connection.query(
      'UPDATE password_resets SET used = TRUE WHERE user_id = ? AND used = FALSE',
      [reset.user_id]
    )
    await connection.commit()
  } catch (error) {
    await connection.rollback()
    throw error
  } finally {
    connection.release()
  }
}
