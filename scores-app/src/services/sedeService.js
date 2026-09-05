import api from './api'

export const sedeService = {
  getAll: () => api.get('/sedes'),
  getCanchasBySede: (id) => api.get(`/sedes/${id}/canchas`),
  create: (data) => api.post('/sedes', data),
  remove: (id) => api.delete(`/sedes/${id}`),
  createCancha: (sedeId, data) => api.post(`/sedes/${sedeId}/canchas`, data),
  updateCancha: (canchaId, data) => api.put(`/sedes/canchas/${canchaId}`, data),
  removeCancha: (canchaId) => api.delete(`/sedes/canchas/${canchaId}`),
}
