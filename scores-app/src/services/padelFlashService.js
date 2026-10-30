import api from './api'
const base = '/padel-flash'
export const padelFlashService = {
  list: () => api.get(base),
  detail: (id) => api.get(`${base}/${id}`),
  create: (data) => api.post(base, data),
  update: (id, data) => api.put(`${base}/${id}`, data),
  remove: (id, data) => api.delete(`${base}/${id}`, { data, suppressDeleteAlert: true }),
  pair: (id, pair, data) =>
    pair ? api.put(`${base}/${id}/pairs/${pair}`, data) : api.post(`${base}/${id}/pairs`, data),
  removePair: (id, pair, data) =>
    api.delete(`${base}/${id}/pairs/${pair}`, { data, suppressDeleteAlert: true }),
  draw: (id, data) => api.post(`${base}/${id}/draw`, data),
  publish: (id, data) => api.post(`${base}/${id}/publish`, data),
  result: (id, match, data) => api.put(`${base}/${id}/matches/${match}`, data),
  start: (id, match, data) => api.post(`${base}/${id}/matches/${match}/start`, data),
  voting: (id, data) => api.post(`${base}/${id}/voting`, data),
  vote: (id, data) => api.post(`${base}/${id}/votes`, data),
  report: (id, after = 0) => api.get(`${base}/${id}/report`, { params: { after } }),
  photo: (id, pair, file, version) => {
    const form = new FormData()
    form.append('foto', file)
    form.append('version', version)
    return api.post(`${base}/${id}/pairs/${pair}/photo`, form, {
      headers: { 'Content-Type': undefined },
      timeout: 60000,
    })
  },
  photoUrl: (path) =>
    path ? new URL(api.defaults.baseURL, window.location.origin).origin + path : '',
}
