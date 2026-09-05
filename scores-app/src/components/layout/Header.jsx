import { useEffect, useRef, useState } from 'react'
import { Link, NavLink } from 'react-router-dom'
import {
  Bell,
  CheckCheck,
  Gavel,
  Handshake,
  Home,
  LogIn,
  Radio,
  Settings,
  ShieldCheck,
  Star,
  Trophy,
  User,
} from 'lucide-react'
import useAuthStore from '../../store/useAuthStore'
import { cn } from '../../utils/cn'
import ThemeToggle from '../common/ThemeToggle'
import Avatar from '../ui/Avatar'

const MOCK_NOTIFS = []

const NAV_ITEMS = [
  { to: '/', icon: Home, label: 'Inicio', exact: true },
  { to: '/live', icon: Radio, label: 'En vivo', dot: true },
  { to: '/tennis', icon: Trophy, label: 'Tenis' },
  { to: '/sponsors', icon: Handshake, label: 'Patrocinadores' },
  { to: '/favorites', icon: Star, label: 'Favoritos' },
  { to: '/profile', icon: User, label: 'Mi perfil' },
  { to: '/settings', icon: Settings, label: 'Configuración' },
]

export default function Header() {
  const { user } = useAuthStore()
  const [showNotifs, setShowNotifs] = useState(false)
  const notifRef = useRef(null)
  const isAdmin = user?.rol === 'admin'
  const isOfficial = user?.rol === 'admin' || user?.rol === 'juez'

  useEffect(() => {
    if (!showNotifs) return undefined

    const handler = (event) => {
      if (notifRef.current && !notifRef.current.contains(event.target)) {
        setShowNotifs(false)
      }
    }

    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [showNotifs])

  const unread = MOCK_NOTIFS.filter((notification) => !notification.read).length

  return (
    <header className='app-header top-navigation fixed inset-x-0 top-0 z-50'>
      <div className='top-navigation-primary'>
        <div className='top-navigation-brands'>
          <Link to='/' aria-label='Ir al inicio del Club Unión'>
            <img
              src='/branding/subcomite-tenis-club-union.png'
              alt='Subcomité de Tenis del Club Unión'
              className='top-navigation-club-logo'
            />
          </Link>
          <span className='top-navigation-brand-divider' aria-hidden='true' />
          <a
            href='https://www.instagram.com/legal.branding'
            target='_blank'
            rel='noreferrer'
            aria-label='Abrir Instagram de Legal Branding'
          >
            <img
              src='/branding/legal-branding.png'
              alt='Legal Branding'
              className='top-navigation-partner-logo'
            />
          </a>
        </div>

        <nav
          className='top-navigation-links top-navigation-links-desktop'
          aria-label='Navegación principal'
        >
        <NavigationLinks isAdmin={isAdmin} isOfficial={isOfficial} />
        </nav>

        <div className='top-navigation-actions'>
          <ThemeToggle />

          <div ref={notifRef} className='relative'>
            <button
              type='button'
              onClick={() => setShowNotifs((current) => !current)}
              className='btn-ghost relative p-2'
              aria-label='Ver notificaciones'
              aria-expanded={showNotifs}
            >
              <Bell className='w-5 h-5' style={{ color: 'var(--text-secondary)' }} />
              {unread > 0 && (
                <span
                  className='absolute top-1.5 right-1.5 w-2 h-2 rounded-full'
                  style={{ backgroundColor: 'var(--color-brand)' }}
                />
              )}
            </button>

            {showNotifs && (
              <div className='top-navigation-notifications animate-fade-up'>
                <div
                  className='flex items-center justify-between px-4 py-3'
                  style={{ borderBottom: '1px solid var(--border-color)' }}
                >
                  <span className='text-sm font-semibold' style={{ color: 'var(--text-primary)' }}>
                    Notificaciones
                  </span>
                  {unread > 0 && (
                    <button
                      type='button'
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

          {user ? (
            <Link
              to='/profile'
              className='top-navigation-avatar'
              aria-label={`Abrir perfil de ${user.nombre}`}
            >
              <Avatar
                src={user.avatar}
                name={`${user.nombre || ''} ${user.apellido || ''}`}
                size='sm'
                className='w-full h-full border-0'
              />
            </Link>
          ) : (
            <Link to='/login' className='top-navigation-login'>
              <LogIn className='w-4 h-4' />
              <span>Ingresar</span>
            </Link>
          )}
        </div>
      </div>

      <nav
        className='top-navigation-links top-navigation-links-mobile'
        aria-label='Navegación principal móvil'
      >
            <NavigationLinks isAdmin={isAdmin} isOfficial={isOfficial} />
      </nav>
    </header>
  )
}

function NavigationLinks({ isAdmin, isOfficial }) {
  const items = isOfficial
    ? [...NAV_ITEMS, { to: '/juez', icon: Gavel, label: 'Juez' }, ...(isAdmin ? [{ to: '/admin', icon: ShieldCheck, label: 'Administración' }] : [])]
    : NAV_ITEMS

  return items.map((item) => (
    <NavLink
      key={item.to}
      to={item.to}
      end={item.exact}
      className={({ isActive }) => cn('top-navigation-link', isActive && 'active')}
    >
      {({ isActive }) => (
        <>
          <span className='top-navigation-link-icon'>
            <item.icon strokeWidth={isActive ? 2.4 : 1.9} aria-hidden='true' />
            {item.dot && <span className='top-navigation-live-dot' />}
          </span>
          <span>{item.label}</span>
        </>
      )}
    </NavLink>
  ))
}
