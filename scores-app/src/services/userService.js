import api from './api'

export const userService = {
  getAll: (params = {}) => api.get('/users', { params }),
  getJudges: () => api.get('/users/jueces'),
  create: (data) => api.post('/users', data),
  update: (id, data) => api.put(`/users/${id}`, data),
  setActive: (id, activo) => api.put(`/users/${id}/estado`, { activo }),
  resetPassword: (id, password) => api.put(`/users/${id}/password`, { password }),
  remove: (id) => api.delete(`/users/${id}`),
  getById: (id) => api.get(`/users/${id}`),
  updateRole: (id, rol) => api.put(`/users/${id}/rol`, { rol }),
  updateUsuario: (id, usuario) => api.put(`/users/${id}/usuario`, { usuario }),
  updateMe: (data) => api.put('/users/me', data),
  getMe: () => api.get('/users/me'),
  uploadAvatar: (file) => {
    const data = new FormData()
    data.append('avatar', file)
    return api.put('/users/me/avatar', data, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },
  deleteAvatar: () => api.delete('/users/me/avatar'),
}
