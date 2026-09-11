// Excludes the same account when editing; inactive accounts also reserve identifiers.
// También evita que documento/usuario choquen con un celular de acceso general,
// porque el login general busca en las 4 columnas con LIMIT 2 y una colisión
// cruzada deja a ambas cuentas sin poder entrar por ese identificador.
exports.validateIdentifierCrossing = async (db, { documento, usuario, telefono_acceso, id = 0 }) => {
  if (usuario) {
    const [rows] = await db.query('SELECT id FROM users WHERE numero_documento = ? AND id != ? LIMIT 1', [usuario.trim(), id])
    if (rows.length) throw { status: 409, message: 'El usuario coincide con el documento de otra cuenta. Elige otro usuario.' }
  }
  if (documento) {
    const [rows] = await db.query('SELECT id FROM users WHERE usuario = ? AND id != ? LIMIT 1', [documento.trim(), id])
    if (rows.length) throw { status: 409, message: 'El documento coincide con el usuario de otra cuenta. Solicita al administrador revisar ese alias.' }
  }
  const phoneKey = String(telefono_acceso ?? '').trim() || null
  if (phoneKey) {
    try {
      const [rows] = await db.query(
        "SELECT id FROM users WHERE id != ? AND telefono_acceso = ? LIMIT 1",
        [id, phoneKey]
      )
      if (rows.length) throw { status: 409, message: 'Ese identificador ya está en uso como celular de acceso en otra cuenta.' }
    } catch (err) {
      if (err.status === 409) throw err
      if (err.code !== 'ER_BAD_FIELD_ERROR') throw err
    }
  }
  for (const value of [documento, usuario]) {
    const text = String(value ?? '').trim()
    if (!text) continue
    try {
      const [rows] = await db.query(
        "SELECT id FROM users WHERE id != ? AND telefono_acceso = ? LIMIT 1",
        [id, text]
      )
      if (rows.length) throw { status: 409, message: 'Ese documento o usuario coincide con el celular de acceso de otra cuenta. Usa otro valor o corrige ese celular.' }
    } catch (err) {
      if (err.status === 409) throw err
      if (err.code !== 'ER_BAD_FIELD_ERROR') throw err
    }
  }
}
