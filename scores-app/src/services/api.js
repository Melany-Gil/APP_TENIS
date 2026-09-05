import axios from 'axios'
import { showAlert } from '../utils/confirm'

// Elimina el almacenamiento usado por la versión anterior, que guardaba el JWT.
localStorage.removeItem('auth-storage')

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3001/api',
  timeout: 10000,
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
})

api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('auth-storage-v2')
      if (window.location.pathname !== '/login') window.location.href = '/login'
    }
    const payload = error.response?.data || error
    if (payload && typeof payload === 'object' && error.response?.status) {
      payload.status = error.response.status
    }
    if (
      error.config?.method?.toLowerCase() === 'delete' &&
      Number(error.response?.status) >= 400
    ) {
      void showAlert({
        title: 'No se puede eliminar',
        message: payload?.message || 'El registro tiene relaciones que impiden eliminarlo.',
        danger: true,
      })
    }
    return Promise.reject(payload)
  }
)

export default api
