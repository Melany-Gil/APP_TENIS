import { Navigate } from 'react-router-dom'
import useAuthStore from '../store/useAuthStore'

export default function DirectorRoute({ children }) {
  const { user } = useAuthStore()
  return ['admin', 'juez_director'].includes(user?.rol) ? children : <Navigate to='/juez' replace />
}
