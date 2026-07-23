import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../services/api'
import useAuthStore from '../store/useAuthStore'
import useUIStore from '../store/useUIStore'

const CHECK_INTERVAL = 5000 // cada 5s
const MAX_FAILURES = 3 // 3 tics fallidos seguidos → logout

/**
 * Verifica periódicamente que el backend siga respondiendo.
 * Si el servidor no responde 3 veces seguidas, cierra la sesión
 * automáticamente y redirige a /login.
 *
 * Debe usarse dentro de un layout protegido (AppLayout, AdminLayout)
 * ya que depende de react-router y solo corre si hay sesión activa.
 */
export function useHealthCheck() {
  const { isAuthenticated, logout } = useAuthStore()
  const { addToast } = useUIStore()
  const navigate = useNavigate()

  const failCount = useRef(0)
  const hasLoggedOut = useRef(false)
  const warnedOnce = useRef(false)

  useEffect(() => {
    if (!isAuthenticated) return

    let intervalId

    const isServerDown = (err) => {
      // Si el backend respondió (aunque sea con error 404/500),
      // la respuesta del interceptor trae { ok: false, ... }.
      // Si NO hay esa estructura, es porque la petición nunca llegó
      // al servidor (ECONNREFUSED, timeout, red caída, etc).
      return !err || typeof err.ok !== 'boolean'
    }

    const check = async () => {
      try {
        await api.get('/health')
        failCount.current = 0
        warnedOnce.current = false
      } catch (err) {
        if (!isServerDown(err)) {
          // El servidor respondió algo — no se cuenta como caída
          failCount.current = 0
          return
        }

        failCount.current += 1

        // Aviso intermedio para que el usuario sepa qué pasa
        if (failCount.current === 2 && !warnedOnce.current) {
          warnedOnce.current = true
          addToast({
            type: 'error',
            title: 'Problemas de conexión',
            message: 'No se puede contactar al servidor. Reintentando...',
          })
        }

        if (failCount.current >= MAX_FAILURES && !hasLoggedOut.current) {
          hasLoggedOut.current = true
          clearInterval(intervalId)
          logout()
          addToast({
            type: 'error',
            title: 'Sesión cerrada',
            message:
              'Se perdió la conexión con el servidor. Inicia sesión de nuevo cuando esté disponible.',
          })
          navigate('/login')
        }
      }
    }

    // Primer chequeo inmediato + luego cada CHECK_INTERVAL
    check()
    intervalId = setInterval(check, CHECK_INTERVAL)

    return () => clearInterval(intervalId)
  }, [isAuthenticated])
}
