// El celular de acceso aplica al ingreso general (miembro + admin).
// Jueces usan el modo juez por alias; no se les habilita acceso por celular.
const invalid = (message) => { throw { status: 400, message } }
const GENERAL_ACCESS_ROLES = new Set(['miembro', 'admin'])
exports.GENERAL_ACCESS_ROLES = GENERAL_ACCESS_ROLES

// Colombian mobile numbers: accept local, +57 and 0057 notation.
exports.normalizePhone = (value) => {
  const raw = String(value ?? '').trim()
  if (!raw) return null
  if (!/^[+\d\s().-]+$/.test(raw)) invalid('Celular inválido')
  let digits = raw.replace(/\D/g, '')
  if (digits.startsWith('0057')) digits = digits.slice(4)
  else if (digits.length === 12 && digits.startsWith('57')) digits = digits.slice(2)
  if (!/^3\d{9}$/.test(digits)) invalid('Ingresa un celular colombiano de 10 dígitos (también puedes usar +57)')
  return digits
}

exports.identity = (data, role) => {
  const document = String(data.numero_documento ?? '').trim() || null
  const email = String(data.email ?? '').trim().toLowerCase() || null
  const phone = String(data.telefono ?? '').trim() || null
  const username = String(data.usuario ?? '').trim() || null
  if (username && !/^[a-zA-Z0-9._-]{3,50}$/.test(username)) invalid('El usuario debe tener entre 3 y 50 letras, números, puntos o guiones')
  if (role !== 'miembro' && (!document || !email)) invalid('El documento y correo son obligatorios para administradores y jueces')
  if (document && !/^\d{5,20}$/.test(document)) invalid('El documento debe tener entre 5 y 20 dígitos')
  if (email && (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 150)) invalid('Correo inválido (máximo 150 caracteres)')
  if (phone && phone.length > 20) invalid('El teléfono admite hasta 20 caracteres')
  const phoneKey = GENERAL_ACCESS_ROLES.has(role) ? exports.normalizePhone(phone) : null
  if (role === 'miembro' && !document && !phoneKey && !username) invalid('Asigna un usuario de acceso al miembro; no necesita cédula, correo ni celular')
  return { document, email, phone, phoneKey }
}

exports.assertPhoneAvailable = async (db, key, id = 0) => {
  if (!key) return
  // El ingreso general comparte espacio de identificadores (miembro + admin):
  // un celular no puede repetirse ni coincidir con documento/usuario de otro.
  const [members] = await db.query("SELECT id, telefono FROM users WHERE rol IN ('miembro', 'admin') AND id != ?", [id])
  for (const member of members) {
    let other
    try { other = exports.normalizePhone(member.telefono) } catch { continue }
    if (other === key) throw { status: 409, message: 'Ese celular pertenece a otra cuenta de acceso general. Usa un celular diferente; no se pueden compartir credenciales de acceso.' }
  }
  try {
    const [cross] = await db.query(
      "SELECT id FROM users WHERE id != ? AND (numero_documento = ? OR usuario = ?) LIMIT 1",
      [id, key, key]
    )
    if (cross.length) throw { status: 409, message: 'Ese celular coincide con el documento o usuario de otra cuenta. Usa otro número o pide al administrador revisar ese identificador.' }
  } catch (err) {
    if (err.status === 409) throw err
    // Si la columna `usuario` aún no existe, se omite ese chequeo cruzado.
    if (err.code !== 'ER_BAD_FIELD_ERROR') throw err
  }
}
