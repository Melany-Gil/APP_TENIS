import api from './api'

export const authService = {
  login: ({ numero_documento, password }) =>
    api.post('/auth/login', { numero_documento, password }),

  register: ({ numero_documento, nombre, apellido, email, password }) =>
    api.post('/auth/register', { numero_documento, nombre, apellido, email, password }),

  forgotPassword: (email) => api.post('/auth/forgot-password', { email }),

  verifyOtp: ({ email, otp_code }) => api.post('/auth/verify-otp', { email, otp_code }),

  resetPassword: ({ email, otp_code, password }) =>
    api.post('/auth/reset-password', { email, otp_code, password }),

  logout: () => api.post('/auth/logout'),
}
