import api from './api'

export const newsService = {
  getAll: (params = {}) => api.get('/anuncios', { params }),
  getById: (id) => api.get(`/anuncios/${id}`),
  create: (data) => api.post('/anuncios', data),
  remove: (id) => api.delete(`/anuncios/${id}`),
}
