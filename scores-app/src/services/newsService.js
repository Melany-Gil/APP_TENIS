import api from './api'

export const newsService = {
  getAll: (params = {}) => api.get('/anuncios', { params }),
  getById: (id) => api.get(`/anuncios/${id}`),
  create: (data) =>
    api.post(
      '/anuncios',
      data,
      data instanceof FormData ? { headers: { 'Content-Type': undefined } } : undefined
    ),
  update: (id, data) =>
    api.put(
      `/anuncios/${id}`,
      data,
      data instanceof FormData ? { headers: { 'Content-Type': undefined } } : undefined
    ),
  togglePublicado: (id, publicado) => api.patch(`/anuncios/${id}/toggle-publicado`, { publicado }),
  remove: (id) => api.delete(`/anuncios/${id}`),
}
