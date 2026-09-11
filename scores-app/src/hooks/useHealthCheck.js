import { useEffect } from 'react'
import axios from 'axios'
import api from '../services/api'
import useAuthStore from '../store/useAuthStore'
import useUIStore from '../store/useUIStore'
import { createHealthMonitor } from '../utils/healthMonitor'

// Availability is not authentication: network failures never close sessions.
export function useHealthCheck() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)
  const addToast = useUIStore((state) => state.addToast)
  useEffect(() => {
    if (!isAuthenticated) return
    const monitor = createHealthMonitor({
      request: (signal) => axios.get(`${api.defaults.baseURL.replace(/\/$/, '')}/health`, { timeout: 5000, signal, withCredentials: false }),
      isOnline: () => navigator.onLine,
      isVisible: () => document.visibilityState === 'visible',
      onUnavailable: () => addToast({ type: 'error', title: 'Conexión interrumpida', message: 'Tu sesión sigue abierta. Reintentaremos automáticamente; no cierres la página si tienes cambios pendientes.' }),
      onRecovered: () => addToast({ type: 'success', title: 'Conexión restablecida' }),
    })
    monitor.check()
    window.addEventListener('online', monitor.check)
    window.addEventListener('offline', monitor.check)
    document.addEventListener('visibilitychange', monitor.check)
    return () => {
      monitor.stop()
      window.removeEventListener('online', monitor.check)
      window.removeEventListener('offline', monitor.check)
      document.removeEventListener('visibilitychange', monitor.check)
    }
  }, [isAuthenticated, addToast])
}
