import api from './api'
import { disablePush } from './pushService'
import useAuthStore from '../store/useAuthStore'
import { confirm } from '../utils/confirm'

export const authService = {
  logoutSafely: async () => {
    const { getPendingJudgeCount } = await import('../utils/judgeSession')
    const count = getPendingJudgeCount(localStorage, useAuthStore.getState().user?.id)
    if (count && !await confirm({
      title: 'Hay marcaciones sin sincronizar',
      message: `Tienes ${count} acciones pendientes. Si sales, se conservarán únicamente en este navegador para la misma cuenta. Puedes cancelar y sincronizarlas desde la mesa antes de salir. No borres los datos del navegador.`,
      confirmLabel: 'Salir conservando pendientes',
      cancelLabel: 'Volver a la mesa',
      danger: true,
    })) return false
    await authService.logout()
    return true
  },
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
