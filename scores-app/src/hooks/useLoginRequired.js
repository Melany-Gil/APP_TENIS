import { useLocation, useNavigate } from 'react-router-dom'
import useAuthStore from '../store/useAuthStore'

export function useLoginRequired() {
  const { isAuthenticated } = useAuthStore()
  const navigate = useNavigate()
  const location = useLocation()

  return (message = 'Para realizar esta acción debes iniciar sesión.') => {
    if (isAuthenticated) return true

    navigate('/login', {
      state: {
        from: `${location.pathname}${location.search}`,
        message,
      },
    })
    return false
  }
}
