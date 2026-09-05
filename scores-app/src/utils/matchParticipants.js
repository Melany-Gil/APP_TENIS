export function getParticipantName(match, position) {
  if (!match) return `Participante ${position}`

  const perPlayerOverride = match[`nombre_override_j${position}`]
  if (perPlayerOverride) return perPlayerOverride
  if (match.nombre_override) return match.nombre_override

  const participant =
    match.modalidad === 'dobles' || match.torneo?.modalidad === 'dobles'
      ? match[`equipo${position}`]?.nombre
      : [match[`jugador${position}`]?.nombre, match[`jugador${position}`]?.apellido]
          .filter(Boolean)
          .join(' ')

  if (participant) return participant

  const source = match[`origen_partido${position}`]
  if (source) return getWinnerSourceLabel(source)

  return match.modalidad === 'dobles' || match.torneo?.modalidad === 'dobles'
    ? `Pareja ${position} por definir`
    : `Jugador ${position} por definir`
}

export function getWinnerSourceLabel(source) {
  const participant1 = source?.participante1 || 'por definir'
  const participant2 = source?.participante2 || 'por definir'
  return `Gdor: ${participant1} / ${participant2}`
}

export function getMatchupLabel(match) {
  return `${getParticipantName(match, 1)} / ${getParticipantName(match, 2)}`
}
