import api from './api'

export const tournamentService = {
  getStandings: id => api.get(`/torneos/${id}/posiciones`),
  getInscripciones: id => api.get(`/torneos/${id}/inscripciones`),
  inscribirEquiposBulk: (id,equipoIds) => api.post(`/torneos/${id}/inscripciones`,{equipo_ids:equipoIds}),
  removeInscripcion: (id,equipoId) => api.delete(`/torneos/${id}/inscripciones/${equipoId}`),
  getAll: (params = {}) => api.get('/torneos', { params }),
  getById: (id) => api.get(`/torneos/${id}`),
  create: (data) => api.post('/torneos', data),
  update: (id, data) => api.put(`/torneos/${id}`, data),
  remove: (id) => api.delete(`/torneos/${id}`),
}
