import api from './api'

export const playerService = {
  getAll: (params = {}) => api.get('/jugadores', { params }),
  getById: (id) => api.get(`/jugadores/${id}`),
  create: (data) => api.post('/jugadores', data),
  update: (id, data) => api.put(`/jugadores/${id}`, data),
  remove: (id) => api.delete(`/jugadores/${id}`),
}
