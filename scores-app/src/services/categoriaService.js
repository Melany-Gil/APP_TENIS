import api from './api'

export const categoriaService = {
  getAll: (params = {}) => api.get('/categorias', { params }),
  create: (data) => api.post('/categorias', data),
  update: (id, data) => api.put(`/categorias/${id}`, data),
  remove: (id) => api.delete(`/categorias/${id}`),
}
