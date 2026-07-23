import { Navigate } from 'react-router-dom'
import useAuthStore from '../store/useAuthStore'

export default function AdminRoute({ children }) {
  const { user } = useAuthStore()

  if (user?.rol !== 'admin') {
    return <Navigate to='/' replace />
  }

  return children
}
