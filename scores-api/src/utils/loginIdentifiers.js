// Excludes the same account when editing; inactive accounts also reserve identifiers.
exports.validateIdentifierCrossing = async (db, { documento, usuario, id = 0 }) => {
  if (usuario) {
    const [rows] = await db.query('SELECT id FROM users WHERE numero_documento = ? AND id != ? LIMIT 1', [usuario.trim(), id])
    if (rows.length) throw { status: 409, message: 'El usuario coincide con el documento de otra cuenta. Elige otro usuario.' }
  }
  if (documento) {
    const [rows] = await db.query('SELECT id FROM users WHERE usuario = ? AND id != ? LIMIT 1', [documento.trim(), id])
    if (rows.length) throw { status: 409, message: 'El documento coincide con el usuario de otra cuenta. Solicita al administrador revisar ese alias.' }
  }
}
