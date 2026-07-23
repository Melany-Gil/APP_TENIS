import { NavLink, useNavigate } from 'react-router-dom'
import { Home, Radio, Trophy, Star, User, Settings, LogOut, ShieldCheck } from 'lucide-react'
import { useEffect } from 'react'
import useUIStore from '../../store/useUIStore'
import useAuthStore from '../../store/useAuthStore'
import { authService } from '../../services/authService'
import { cn } from '../../utils/cn'

const NAV = [
  { to: '/', icon: Home, label: 'Inicio', exact: true },
  { to: '/live', icon: Radio, label: 'En Vivo', dot: true },
  { to: '/tennis', icon: Trophy, label: 'Tenis' },
  { to: '/favorites', icon: Star, label: 'Favoritos' },
  { divider: true },
  { to: '/profile', icon: User, label: 'Mi Perfil' },
  { to: '/settings', icon: Settings, label: 'Configuración' },
]

export default function Sidebar() {
  const { sidebarCollapsed, setSidebarCollapsed } = useUIStore()
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()
  const isAdmin = user?.rol === 'admin'

  // Solo se ejecuta una vez al montar (ya no se remonta al navegar
  // gracias al Suspense local en cada layout) — inicia cerrado.
  useEffect(() => {
    setSidebarCollapsed(true)
  }, [])

  const close = () => setSidebarCollapsed(true)

  return (
    <>
      {!sidebarCollapsed && (
        <div
          className='fixed inset-0 z-40'
          style={{ backgroundColor: 'rgba(18, 38, 26, 0.32)', backdropFilter: 'blur(3px)' }}
          onClick={close}
        />
      )}

      <aside
        className={cn(
          'app-sidebar fixed top-0 left-0 h-full z-50 w-[272px] flex flex-col',
          'transition-transform duration-300 ease-in-out',
          sidebarCollapsed ? '-translate-x-full' : 'translate-x-0'
        )}
        style={{ boxShadow: sidebarCollapsed ? 'none' : undefined }}
      >
        {/* Header del sidebar */}
        <div
          className='flex items-center justify-between h-16 px-4 shrink-0'
          style={{ borderBottom: '1px solid var(--border-color)' }}
        >
          <div className='flex items-center gap-3'>
            <div
              className='brand-mark w-9 h-9 rounded-xl flex items-center justify-center text-white font-extrabold text-xs shrink-0'
              style={{ backgroundColor: 'var(--color-brand)', boxShadow: 'var(--shadow-brand)' }}
            >
              CU
            </div>
            <span className='font-bold text-sm' style={{ color: 'var(--text-primary)' }}>
              Club Unión
            </span>
          </div>
          {/* Botón cerrar explícito */}
          <button
            onClick={close}
            className='btn-ghost p-1.5 text-xs font-bold'
            style={{ color: 'var(--text-muted)' }}
          >
            ✕
          </button>
        </div>

        {/* Navegación — YA NO se cierra automáticamente al hacer clic */}
        <nav className='flex-1 py-4 px-3 space-y-1 overflow-y-auto'>
          {NAV.map((item, i) => {
            if (item.divider)
              return (
                <div
                  key={i}
                  className='my-2'
                  style={{ borderTop: '1px solid var(--border-color)' }}
                />
              )
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.exact}
                className={({ isActive }) => cn('nav-item', isActive && 'active')}
              >
                {({ isActive }) => (
                  <>
                    {isActive && (
                      <span
                        className='absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 rounded-r-full'
                        style={{ backgroundColor: 'var(--color-brand)' }}
                      />
                    )}
                    <item.icon className='w-[18px] h-[18px] shrink-0' />
                    <span className='flex-1 text-sm'>{item.label}</span>
                    {item.dot && (
                      <span
                        className='w-1.5 h-1.5 rounded-full shrink-0'
                        style={{ backgroundColor: 'var(--color-live)' }}
                      />
                    )}
                  </>
                )}
              </NavLink>
            )
          })}

          {/* Acceso al panel admin — solo visible si rol === 'admin' */}
          {isAdmin && (
            <>
              <div className='my-2' style={{ borderTop: '1px solid var(--border-color)' }} />
              <NavLink
                to='/admin'
                className={({ isActive }) => cn('nav-item', isActive && 'active')}
                style={{ color: 'var(--color-brand)' }}
              >
                <ShieldCheck className='w-[18px] h-[18px] shrink-0' />
                <span className='flex-1 text-sm font-semibold'>Panel Admin</span>
              </NavLink>
            </>
          )}
        </nav>

        {/* Footer usuario */}
        <div className='p-2 shrink-0' style={{ borderTop: '1px solid var(--border-color)' }}>
          {user && (
            <div className='flex items-center gap-2 px-2 py-2 mb-1'>
              <div
                className='w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0'
                style={{
                  backgroundColor: 'var(--color-brand-dim)',
                  color: 'var(--color-brand)',
                  border: '1px solid var(--border-focus)',
                }}
              >
                {user.nombre?.charAt(0)?.toUpperCase()}
              </div>
              <div className='flex-1 min-w-0'>
                <div className='flex items-center gap-1.5'>
                  <p
                    className='text-xs font-semibold truncate'
                    style={{ color: 'var(--text-primary)' }}
                  >
                    {user.nombre} {user.apellido}
                  </p>
                  {isAdmin && (
                    <span
                      className='text-[9px] font-bold px-1.5 py-0.5 rounded shrink-0'
                      style={{
                        backgroundColor: 'var(--color-brand-dim)',
                        color: 'var(--color-brand)',
                      }}
                    >
                      ADMIN
                    </span>
                  )}
                </div>
                <p className='text-[10px] truncate' style={{ color: 'var(--text-muted)' }}>
                  {user.email}
                </p>
              </div>
            </div>
          )}
          <button
            onClick={async () => {
              await authService.logout().catch(() => {})
              logout()
              navigate('/login')
            }}
            className='nav-item w-full'
            style={{ color: '#ef4444' }}
          >
            <LogOut className='w-[18px] h-[18px] shrink-0' />
            <span className='text-sm'>Cerrar sesión</span>
          </button>
        </div>
      </aside>
    </>
  )
}
