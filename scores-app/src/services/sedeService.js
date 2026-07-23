import api from './api'

export const sedeService = {
  getAll: () => api.get('/sedes'),
  getCanchasBySede: (id) => api.get(`/sedes/${id}/canchas`),
  create: (data) => api.post('/sedes', data),
  remove: (id) => api.delete(`/sedes/${id}`),
  createCancha: (sedeId, data) => api.post(`/sedes/${sedeId}/canchas`, data),
}
