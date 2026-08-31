import { Suspense } from 'react'
import { ArrowLeft, ClipboardCheck, LogOut } from 'lucide-react'
import { Link, Outlet, useNavigate } from 'react-router-dom'
import ContentLoader from '../components/ui/ContentLoader'
import SponsorDock from '../components/sponsors/SponsorDock'
import ThemeToggle from '../components/common/ThemeToggle'
import useAuthStore from '../store/useAuthStore'
import { authService } from '../services/authService'
import { useHealthCheck } from '../hooks/useHealthCheck'

export default function JudgeLayout() {
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()
  useHealthCheck()

  const signOut = async () => {
    await authService.logout().catch(() => {})
    logout()
    navigate('/login')
  }

  return (
    <div className='min-h-screen flex flex-col' style={{ backgroundColor: 'var(--bg-primary)' }}>
      <header
        className='app-header sticky top-0 z-40 h-16 px-3 sm:px-5 flex items-center gap-3'
        style={{ backgroundColor: 'var(--bg-sidebar)' }}
      >
        <Link to='/' className='btn-ghost p-2' aria-label='Volver a marcadores'>
          <ArrowLeft className='w-5 h-5' />
        </Link>
        <Link to='/juez' className='flex items-center gap-2 min-w-0'>
          <span
            className='w-9 h-9 rounded-xl grid place-items-center shrink-0'
            style={{ backgroundColor: 'var(--color-brand)', color: 'white' }}
          >
            <ClipboardCheck className='w-5 h-5' />
          </span>
          <span className='min-w-0'>
            <strong className='block text-sm leading-tight' style={{ color: 'var(--text-primary)' }}>
              Control de cancha
            </strong>
            <span className='block text-[11px] truncate' style={{ color: 'var(--text-muted)' }}>
              {user?.nombre} {user?.apellido}
            </span>
          </span>
        </Link>
        <div className='ml-auto flex items-center gap-1'>
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

      <main className='flex-1 w-full max-w-5xl mx-auto px-3 sm:px-6 py-5 sm:py-8 pb-28'>
        <Suspense fallback={<ContentLoader />}>
          <Outlet />
        </Suspense>
      </main>
      <SponsorDock defaultMinimized />
    </div>
  )
}
