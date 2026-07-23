import api from './api'

export const userService = {
  getAll: (params = {}) => api.get('/users', { params }),
  create: (data) => api.post('/users', data),
  getById: (id) => api.get(`/users/${id}`),
  updateRole: (id, rol) => api.put(`/users/${id}/rol`, { rol }),
  updateMe: (data) => api.put('/users/me', data),
  getMe: () => api.get('/users/me'),
}
