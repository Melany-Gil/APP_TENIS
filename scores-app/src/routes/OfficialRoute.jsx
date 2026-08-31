import { Navigate } from 'react-router-dom'
import useAuthStore from '../store/useAuthStore'

export default function OfficialRoute({ children }) {
  const { user } = useAuthStore()
  return ['admin', 'juez'].includes(user?.rol) ? children : <Navigate to='/' replace />
}
