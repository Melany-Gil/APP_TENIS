import api from './api'

export const newsService = {
  getAll: (params = {}) => api.get('/anuncios', { params }),
  getById: (id) => api.get(`/anuncios/${id}`),
  create: (data) => api.post('/anuncios', data, data instanceof FormData ? { headers: { 'Content-Type': 'multipart/form-data' } } : undefined),
  update: (id, data) => api.put(`/anuncios/${id}`, data, data instanceof FormData ? { headers: { 'Content-Type': 'multipart/form-data' } } : undefined),
  remove: (id) => api.delete(`/anuncios/${id}`),
}
