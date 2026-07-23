import { useState, useRef, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Bell, Menu, CheckCheck, LogIn } from 'lucide-react'
import useUIStore from '../../store/useUIStore'
import useAuthStore from '../../store/useAuthStore'
import ThemeToggle from '../common/ThemeToggle'

const MOCK_NOTIFS = []

export default function Header() {
  const { toggleSidebar, sidebarCollapsed } = useUIStore()
  const { user } = useAuthStore()
  const [showNotifs, setShowNotifs] = useState(false)
  const notifRef = useRef(null)

  useEffect(() => {
    if (!showNotifs) return
    const handler = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setShowNotifs(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [showNotifs])

  const unread = MOCK_NOTIFS.filter((n) => !n.read).length

  return (
    <header className='app-header fixed top-0 left-0 right-0 z-50 flex items-center h-16 px-4 sm:px-6 gap-3'>
      {/* Hamburguesa */}
      <button
        onClick={toggleSidebar}
        className='btn-ghost min-h-0 w-10 h-10 p-0 shrink-0'
        aria-label={sidebarCollapsed ? 'Abrir navegación' : 'Cerrar navegación'}
      >
        <Menu className='w-5 h-5' style={{ color: 'var(--text-primary)' }} />
      </button>

      {/* Logo */}
      <Link to='/' className='flex items-center gap-2 font-bold text-sm'>
        <div
          className='brand-mark w-9 h-9 rounded-xl flex items-center justify-center text-white font-extrabold text-xs shrink-0'
          style={{ backgroundColor: 'var(--color-brand)', boxShadow: 'var(--shadow-brand)' }}
        >
          CU
        </div>
        <span className='hidden sm:flex flex-col leading-tight'>
          <span style={{ color: 'var(--text-primary)' }}>Club Unión</span>
          <span className='text-[10px] font-medium' style={{ color: 'var(--text-muted)' }}>
            Subcomité de Tenis
          </span>
        </span>
      </Link>

      <div className='ml-auto flex items-center gap-2'>
        {/* Toggle modo claro/oscuro — visible para todos los roles */}
        <ThemeToggle />

        {/* Notificaciones */}
        <div ref={notifRef} className='relative'>
          <button onClick={() => setShowNotifs((p) => !p)} className='btn-ghost relative p-2'>
            <Bell className='w-5 h-5' style={{ color: 'var(--text-secondary)' }} />
            {unread > 0 && (
              <span
                className='absolute top-1.5 right-1.5 w-2 h-2 rounded-full'
                style={{ backgroundColor: 'var(--color-brand)' }}
              />
            )}
          </button>

          {showNotifs && (
            <div
              className='absolute right-0 top-11 w-72 rounded-xl shadow-xl overflow-hidden z-50 animate-fade-up'
              style={{
                backgroundColor: 'var(--bg-sidebar)',
                border: '1px solid var(--border-color)',
              }}
            >
              <div
                className='flex items-center justify-between px-4 py-3'
                style={{ borderBottom: '1px solid var(--border-color)' }}
              >
                <span className='text-sm font-semibold' style={{ color: 'var(--text-primary)' }}>
                  Notificaciones
                </span>
                {unread > 0 && (
                  <button
                    className='flex items-center gap-1 text-xs'
                    style={{ color: 'var(--color-brand)' }}
                  >
                    <CheckCheck className='w-3.5 h-3.5' /> Marcar leído
                  </button>
                )}
              </div>
              <div className='flex flex-col items-center justify-center py-10 gap-2'>
                <Bell className='w-8 h-8' style={{ color: 'var(--text-muted)' }} />
                <p className='text-sm font-medium' style={{ color: 'var(--text-secondary)' }}>
                  Sin notificaciones
                </p>
                <p className='text-xs' style={{ color: 'var(--text-muted)' }}>
                  Aquí verás los avisos del club
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Cuenta */}
        {user ? (
          <Link
            to='/profile'
            className='w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold transition-all'
            style={{
              backgroundColor: 'var(--color-brand-dim)',
              color: 'var(--color-brand)',
              border: '1px solid var(--border-focus)',
            }}
          >
            {user.nombre?.charAt(0)?.toUpperCase()}
          </Link>
        ) : (
          <Link
            to='/login'
            className='inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold'
            style={{ backgroundColor: 'var(--color-brand)', color: 'white' }}
          >
            <LogIn className='w-4 h-4' />
            <span className='hidden sm:inline'>Iniciar sesión</span>
          </Link>
        )}
      </div>
    </header>
  )
}
