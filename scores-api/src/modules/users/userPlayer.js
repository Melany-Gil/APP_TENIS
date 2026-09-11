const fail = (message, status = 400) => { throw { status, message } }

// Runs on the account-creation transaction: neither record survives a failure.
exports.preparePlayer = async (conn, selection, account) => {
  if (selection.modo === 'existente') {
    const id = Number(selection.id)
    if (!Number.isSafeInteger(id) || id <= 0) fail('Selecciona un jugador válido')
    const [rows] = await conn.query('SELECT id, activo, user_id FROM jugadores WHERE id = ? FOR UPDATE', [id])
    if (!rows.length || !rows[0].activo) fail('El jugador no existe o está inactivo', 404)
    if (rows[0].user_id) fail('Este jugador ya tiene una cuenta vinculada. Selecciona otro o revisa su cuenta existente.', 409)
    return async (userId) => {
      const [result] = await conn.query('UPDATE jugadores SET user_id = ? WHERE id = ? AND user_id IS NULL', [userId, id])
      if (result.affectedRows !== 1) fail('El jugador ya fue vinculado a otra cuenta. Actualiza la lista.', 409)
    }
  }
  const nombre = String(account.nombre || '').trim(), apellido = String(account.apellido || '').trim()
  if ([nombre, apellido].some((v) => v.length < 2 || v.length > 100)) fail('Completa los nombres y apellidos del jugador')
  const sport = selection.deporte || 'tenis'
  if (!['tenis', 'padel', 'ambos'].includes(sport)) fail('Deporte inválido')
  const catId = selection.categoria_id === '' || selection.categoria_id == null ? null : Number(selection.categoria_id)
  if (catId !== null) {
    if (!Number.isSafeInteger(catId) || catId <= 0) fail('Categoría inválida')
    const [categories] = await conn.query('SELECT deporte FROM categorias WHERE id = ? LIMIT 1', [catId])
    if (!categories.length || (sport !== 'ambos' && ![sport, 'ambos'].includes(categories[0].deporte))) fail('La categoría no corresponde al deporte')
  }
  const [duplicates] = await conn.query('SELECT id FROM jugadores WHERE nombre = ? AND apellido = ? LIMIT 1 FOR UPDATE', [nombre, apellido])
  if (duplicates.length) fail('Ya existe un jugador con estos nombres y apellidos. Revísalo en «Seleccionar jugador existente» antes de crear otro. Si son personas distintas, créalo desde Jugadores y luego selecciónalo.', 409)
  return async (userId) => {
    await conn.query('INSERT INTO jugadores (user_id, nombre, apellido, country_id, deporte, categoria_id, activo) VALUES (?, ?, ?, 1, ?, ?, TRUE)', [userId, nombre, apellido, sport, catId])
  }
}
