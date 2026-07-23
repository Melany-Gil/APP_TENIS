import { Sun, Moon } from 'lucide-react'
import useUIStore from '../../store/useUIStore'
import { cn } from '../../utils/cn'

export default function ThemeToggle({ showLabel = false, className = '' }) {
  const { darkMode, toggleDarkMode } = useUIStore()

  return (
    <button
      onClick={toggleDarkMode}
      title={darkMode ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
      className={cn('btn-ghost flex items-center gap-2 p-2', className)}
    >
      <div className='relative w-5 h-5'>
        <Sun
          className='w-5 h-5 absolute inset-0 transition-all duration-300'
          style={{
            color: 'var(--color-brand)',
            opacity: darkMode ? 1 : 0,
            transform: darkMode ? 'rotate(0deg) scale(1)' : 'rotate(90deg) scale(0)',
          }}
        />
        <Moon
          className='w-5 h-5 absolute inset-0 transition-all duration-300'
          style={{
            color: 'var(--color-brand)',
            opacity: darkMode ? 0 : 1,
            transform: darkMode ? 'rotate(-90deg) scale(0)' : 'rotate(0deg) scale(1)',
          }}
        />
      </div>
      {showLabel && (
        <span className='text-sm font-medium' style={{ color: 'var(--text-secondary)' }}>
          {darkMode ? 'Modo claro' : 'Modo oscuro'}
        </span>
      )}
    </button>
  )
}
