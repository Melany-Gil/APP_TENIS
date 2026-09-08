export const toJudgeState = (control) => {
  const rawScore = control?.marcador || {}
  const allSets = Array.isArray(rawScore.sets) ? rawScore.sets : []
  const completedSets = allSets.filter((set) => set.completed)
  const currentSet = allSets[Math.max(0, Number(rawScore.currentSet || 1) - 1)] || {
    games: [0, 0],
  }
  const displayPoints = rawScore.displayPoints || ['0', '0']
  const winner = rawScore.winner || null
  const match = control?.partido || {}
  const live = control?.en_vivo || {}

  return {
    ...control,
    raw_marcador: rawScore,
    reglas: {
      mejor_de: match.formato?.mejor_de_sets || 3,
      juegos_por_set: match.formato?.juegos_por_set || 6,
    },
    marcador: {
      sets: completedSets.map((set) => ({
        games_j1: set.games?.[0] ?? 0,
        games_j2: set.games?.[1] ?? 0,
      })),
      currentSet: {
        games_j1: currentSet.games?.[0] ?? 0,
        games_j2: currentSet.games?.[1] ?? 0,
        tiebreak: ['tiebreak', 'match_tiebreak'].includes(rawScore.mode),
      },
      punto_j1: displayPoints[0] ?? '0',
      punto_j2: displayPoints[1] ?? '0',
      numero_servicio: Number(rawScore.serviceAttempt || 1),
      deuce: rawScore.mode === 'game' && displayPoints[0] === '40' && displayPoints[1] === '40',
      mode: rawScore.mode,
      terminado: Boolean(winner),
      ganador: winner,
      breakpoint: control.breakpoint || null,
    },
    en_vivo: {
      ...live,
      estado: match.estado || 'programado',
      saca: rawScore.server || match.formato?.servidor_inicial || 'jugador1',
    },
  }
}
