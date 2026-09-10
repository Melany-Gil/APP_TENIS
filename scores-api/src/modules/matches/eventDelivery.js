const { normalizeConfig } = require('./score.engine')
exports.configurationOf = (match) => JSON.stringify({
  rules: normalizeConfig(match),
  participants: [match.jugador1_id || null, match.jugador2_id || null, match.equipo1_id || null, match.equipo2_id || null],
  ...(Number(match.control_version) > 0 ? { controlVersion: Number(match.control_version) } : {}),
})

exports.validateDelivery = (event) => {
  if (!event.client_action_id) return
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(event.client_action_id)) {
    throw { status: 400, message: 'Identificador de acción inválido' }
  }
  if (!/^\d+:\d+$/.test(event.expected_revision || '')) {
    throw { status: 400, message: 'Sincroniza el marcador antes de registrar la acción' }
  }
}

exports.revisionOf = (row) => `${Number(row?.sequence || 0)}:${Number(row?.active || 0)}`
exports.assertSameDelivery = (saved, event, user, matchId) => {
  if (Number(saved.partido_id) !== Number(matchId) || Number(saved.created_by) !== Number(user.id) || saved.tipo !== event.tipo || (saved.ganador || null) !== (event.ganador || null) || (saved.motivo || null) !== (event.motivo || null)) {
    throw { status: 409, message: 'Esta acción ya se utilizó con otros datos. Revisa el marcador.' }
  }
}
