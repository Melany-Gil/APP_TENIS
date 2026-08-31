import api from './api'

export const matchService = {
  getAll: (params = {}) => api.get('/partidos', { params }),
  getById: (id) => api.get(`/partidos/${id}`),
  getLive: () => api.get('/partidos', { params: { estado: 'en_vivo' } }),
  getUpcoming: () => api.get('/partidos', { params: { estado: 'programado' } }),
  getFinished: () => api.get('/partidos', { params: { estado: 'finalizado' } }),
  create: (data) => api.post('/partidos', data),
  update: (id, data) => api.put(`/partidos/${id}`, data),
  updateMarcador: (id, data) => api.put(`/partidos/${id}/marcador`, data),
  getManaged: () => api.get('/partidos/gestion/mis-partidos'),
  getControl: (id) => api.get(`/partidos/${id}/control`),
  addEvent: (id, data) => api.post(`/partidos/${id}/eventos`, data),
  undoEvent: (id) => api.post(`/partidos/${id}/deshacer`),
  remove: (id) => api.delete(`/partidos/${id}`),
}
