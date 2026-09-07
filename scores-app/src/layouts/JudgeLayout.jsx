import { Suspense } from 'react'
import { LogOut } from 'lucide-react'
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom'
import ContentLoader from '../components/ui/ContentLoader'
import ToastContainer from '../components/ui/Toast'
import ThemeToggle from '../components/common/ThemeToggle'
import useAuthStore from '../store/useAuthStore'
import { authService } from '../services/authService'

export default function JudgeLayout() {
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()
  // A temporary courtside network loss must not log the judge out. The scoring
  // session handles reconnection; real 401 responses still expire the session.

  const signOut = async () => {
    await authService.logout().catch(() => {})
    logout()
    navigate('/login')
  }

  return (
    <div className='min-h-screen flex flex-col' style={{ backgroundColor: 'var(--bg-primary)' }}>
      <header
        className='app-header sticky top-0 z-40 h-14 px-3 sm:px-5 flex items-center gap-2'
        style={{ backgroundColor: 'var(--bg-sidebar)' }}
      >
        <Link to='/juez' className='flex items-center gap-2 min-w-0'>
          <img src='/branding/subcomite-tenis-club-union.png' alt='Subcomité de Tenis Club Unión' className='w-10 h-10 object-contain shrink-0' />
          <span className='min-w-0 hidden sm:block'>
            <strong className='block text-sm leading-tight' style={{ color: 'var(--text-primary)' }}>
              Control de cancha
            </strong>
            <span className='block text-[11px] truncate' style={{ color: 'var(--text-muted)' }}>
              {user?.nombre} {user?.apellido}
            </span>
          </span>
        </Link>
        <div className='ml-auto flex items-center gap-1'>
          <nav aria-label='Navegación del juez' className='flex items-center gap-1'>
            <NavLink to='/juez' end className={({ isActive }) => `btn-ghost text-xs px-3 py-3 ${isActive ? 'font-bold underline' : ''}`}>Mesa de juez</NavLink>
            <NavLink to='/juez/perfil' className={({ isActive }) => `btn-ghost text-xs px-3 py-3 ${isActive ? 'font-bold underline' : ''}`}>Mi perfil</NavLink>
          </nav>
          {user?.rol === 'admin' && (
            <Link to='/admin' className='btn-ghost text-xs px-3 py-2 hidden sm:flex'>
              Administración
            </Link>
          )}
          <ThemeToggle />
          <button onClick={signOut} className='btn-ghost p-2' aria-label='Cerrar sesión'>
            <LogOut className='w-5 h-5' />
          </button>
        </div>
      </header>

      <main className='flex-1 w-full max-w-5xl mx-auto px-3 sm:px-6 py-2 sm:py-4'>
        <Suspense fallback={<ContentLoader />}>
          <Outlet />
        </Suspense>
      </main>
      <ToastContainer />
    </div>
  )
}
