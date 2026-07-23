import { NavLink } from 'react-router-dom'
import { Home, Radio, Trophy, Star, User } from 'lucide-react'
import { cn } from '../../utils/cn'

const TABS = [
  { to: '/', icon: Home, label: 'Inicio', exact: true },
  { to: '/live', icon: Radio, label: 'En Vivo', dot: true },
  { to: '/tennis', icon: Trophy, label: 'Tenis' },
  { to: '/favorites', icon: Star, label: 'Favoritos' },
  { to: '/profile', icon: User, label: 'Perfil' },
]

export default function BottomNavigation() {
  return (
    <nav
      className='bottom-nav fixed bottom-0 left-0 right-0 z-40 lg:hidden'
    >
      <div className='flex items-center justify-around h-[68px] px-2'>
        {TABS.map((tab) => (
          <NavLink
            key={tab.to}
            to={tab.to}
            end={tab.exact}
            className={({ isActive }) =>
              cn(
                'flex flex-col items-center gap-1 flex-1 py-2 rounded-2xl transition-all duration-200 text-[11px] font-semibold'
              )
            }
            style={({ isActive }) => ({
              color: isActive ? 'var(--color-brand)' : 'var(--text-muted)',
            })}
          >
            {({ isActive }) => (
              <>
                <div className='relative'>
                  <tab.icon className='w-5 h-5' strokeWidth={isActive ? 2.5 : 1.8} />
                  {tab.dot && (
                    <span
                      className='absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full'
                      style={{ backgroundColor: 'var(--color-live)' }}
                    />
                  )}
                </div>
                <span>{tab.label}</span>
              </>
            )}
          </NavLink>
        ))}
      </div>
      <div className='pb-safe' />
    </nav>
  )
}
