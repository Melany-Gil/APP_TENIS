import api from './api'
import { disablePush } from './pushService'

export const authService = {
  login: ({ identificador, password, tipo_acceso }) => api.post('/auth/login', { identificador, password, tipo_acceso }),

  register: ({ numero_documento, nombre, apellido, email, password }) =>
    api.post('/auth/register', { numero_documento, nombre, apellido, email, password }),

  forgotPassword: (email) => api.post('/auth/forgot-password', { email }),

  verifyOtp: ({ email, otp_code }) => api.post('/auth/verify-otp', { email, otp_code }),

  resetPassword: ({ email, otp_code, password }) =>
    api.post('/auth/reset-password', { email, otp_code, password }),

  logout: async () => {
    // Local unsubscribe also runs if the server is temporarily offline.
    await disablePush().catch(() => {})
    return api.post('/auth/logout')
  },
}
