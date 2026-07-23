import axios from 'axios'

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
    return Promise.reject(error.response?.data || error)
  }
)

export default api
