import api from './api'

const toJudgeState = (control) => {
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

const judgeResponse = (response) => ({ ...response, data: toJudgeState(response.data) })

const pointReason = (result) => ({
  winner: 'tiro_ganador',
  ace: 'ace',
  error_no_forzado: 'error_no_forzado',
  doble_falta: 'doble_falta',
}[result] || 'punto_sin_detalle')

export const matchService = {
  getAll: (params = {}) => api.get('/partidos', { params }),
  getById: (id) => api.get(`/partidos/${id}`),
  getMyMatches: () => api.get('/partidos/mios'),
  getLive: () => api.get('/partidos', { params: { estado: 'en_vivo' } }),
  getUpcoming: () => api.get('/partidos', { params: { estado: 'programado' } }),
  getFinished: () => api.get('/partidos', { params: { estado: 'finalizado' } }),
  create: (data) => api.post('/partidos', data),
  update: (id, data) => api.put(`/partidos/${id}`, data),
  updateParticipants: (id, data) => api.put(`/partidos/${id}/participantes`, data),
  updateMarcador: (id, data) => api.put(`/partidos/${id}/marcador`, data),
  getManaged: () => api.get('/partidos/gestion/mis-partidos'),
  getControl: (id) => api.get(`/partidos/${id}/control`),
  getStats: (id, set = null) => api.get(`/partidos/${id}/estadisticas`, { params: set ? { set } : {} }),
  start: (id) => api.post(`/partidos/${id}/iniciar`),
  setPaused: (id, pausado) => api.put(`/partidos/${id}/pausa`, { pausado }),
  changeServer: (id, servidor) => api.put(`/partidos/${id}/saque`, { servidor }),
  addEvent: (id, data) => api.post(`/partidos/${id}/eventos`, data),
  undoEvent: (id) => api.post(`/partidos/${id}/deshacer`),
  // Adaptadores para la mesa unificada incluida en el diseño del equipo.
  getAssignments: () => api.get('/partidos/gestion/mis-partidos'),
  getLiveState: async (id) => judgeResponse(await api.get(`/partidos/${id}/control`)),
  addJudgeEvent: async (id, data) => judgeResponse(await api.post(`/partidos/${id}/eventos`, data)),
  startLive: async (id) => judgeResponse(await api.post(`/partidos/${id}/iniciar`)),
  pauseLive: async (id, pausado) => judgeResponse(await api.put(`/partidos/${id}/pausa`, { pausado })),
  setServer: async (id, servidor) => judgeResponse(await api.put(`/partidos/${id}/saque`, { servidor })),
  recordPoint: async (id, ganador, metadata = {}, serviceAttempt = 1) => {
    const needsFirstFault =
      Number(serviceAttempt) === 1 &&
      (metadata.tipo_saque === 'segundo_saque' || metadata.resultado === 'doble_falta')
    if (needsFirstFault) {
      await api.post(`/partidos/${id}/eventos`, { tipo: 'primera_falta' })
    }
    const response = await api.post(`/partidos/${id}/eventos`, {
      tipo: 'punto',
      ganador,
      motivo: pointReason(metadata.resultado),
    })
    return judgeResponse(response)
  },
  undoPoint: async (id) => judgeResponse(await api.post(`/partidos/${id}/deshacer`)),
  finishLive: async (id) => judgeResponse(await api.get(`/partidos/${id}/control`)),
  remove: (id) => api.delete(`/partidos/${id}`),
}
