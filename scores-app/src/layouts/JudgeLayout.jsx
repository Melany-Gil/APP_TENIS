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
        className='app-header sticky top-0 z-40 min-h-14 px-2 sm:px-5 py-1 flex flex-wrap items-center gap-1'
        style={{ backgroundColor: 'var(--bg-sidebar)' }}
      >
        <Link to={['admin', 'juez_director'].includes(user?.rol) ? '/director' : '/juez'} className='flex items-center gap-2 min-w-0'>
          <img src='/branding/subcomite-tenis-club-union.png' alt='Subcomité de Tenis Club Unión' className='w-10 h-10 object-contain shrink-0' />
          <span className='min-w-0 hidden sm:block'>
            <span className='flex items-center gap-1.5'>
              <strong className='block text-sm leading-tight' style={{ color: 'var(--text-primary)' }}>
                {user?.rol === 'juez_director' ? 'Juez Director' : 'Control de cancha'}
              </strong>
              {user?.rol === 'juez_director' && (
                <span className='text-[10px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider' style={{ backgroundColor: 'rgba(234, 179, 8, 0.2)', color: 'var(--color-brand)' }}>
                  Director
                </span>
              )}
            </span>
            <span className='block text-[11px] truncate' style={{ color: 'var(--text-muted)' }}>
              {user?.nombre} {user?.apellido}
            </span>
          </span>
        </Link>
        <div className='ml-auto flex items-center gap-1'>
          <nav aria-label='Navegación oficial' className='flex items-center gap-1'>
            {['admin', 'juez_director'].includes(user?.rol) && (
              <NavLink to='/director' className={({ isActive }) => `btn-ghost text-xs px-2 py-2 ${isActive ? 'font-bold underline' : ''}`}>
                Director
              </NavLink>
            )}
            <NavLink to='/juez' end className={({ isActive }) => `btn-ghost text-xs px-2 py-2 ${isActive ? 'font-bold underline' : ''}`}>
              Mesa de juez
            </NavLink>
            <NavLink to='/juez/perfil' className={({ isActive }) => `btn-ghost text-xs px-2 py-2 ${isActive ? 'font-bold underline' : ''}`}>
              Mi perfil
            </NavLink>
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
