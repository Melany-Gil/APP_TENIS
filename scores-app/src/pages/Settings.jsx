import { Link } from 'react-router-dom'
import { useState } from 'react'
import ChangePassword from '../components/profile/ChangePassword'
import { Moon, Bell, Shield, ChevronRight, User, KeyRound } from 'lucide-react'
import useUIStore from '../store/useUIStore'
import useAuthStore from '../store/useAuthStore'
import { cn } from '../utils/cn'

function ToggleSwitch({ value, onChange }) {
  return (
    <button
      onClick={() => onChange(!value)}
      className='relative w-11 h-6 rounded-full transition-all duration-300 shrink-0'
      style={{ backgroundColor: value ? 'var(--color-brand)' : 'var(--border-hover)' }}
    >
      <span
        className='absolute top-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-all duration-300'
        style={{ left: value ? '22px' : '2px' }}
      />
    </button>
  )
}

function SettingRow({ icon: Icon, label, description, children, last }) {
  return (
    <div
      className='flex items-center gap-3 px-4 py-3.5'
      style={{ borderBottom: last ? 'none' : '1px solid var(--border-color)' }}
    >
      <div
        className='w-8 h-8 rounded-lg flex items-center justify-center shrink-0'
        style={{ backgroundColor: 'var(--bg-hover)' }}
      >
        <Icon className='w-4 h-4' style={{ color: 'var(--text-secondary)' }} />
      </div>
      <div className='flex-1 min-w-0'>
        <p className='text-sm font-medium' style={{ color: 'var(--text-primary)' }}>
          {label}
        </p>
        {description && (
          <p className='text-xs mt-0.5' style={{ color: 'var(--text-muted)' }}>
            {description}
          </p>
        )}
      </div>
      {children}
    </div>
  )
}

export default function Settings() {
  const [passwordOpen, setPasswordOpen] = useState(false)
  const { darkMode, toggleDarkMode, notifications, setNotification } =
    useUIStore()

  const { user } = useAuthStore()

  return (
    <div className='space-y-6 animate-fade-up pb-24'>
      {passwordOpen && <ChangePassword onClose={() => setPasswordOpen(false)} />}
      <h1 className='text-xl font-bold' style={{ color: 'var(--text-primary)' }}>
        Configuración
      </h1>

      {/* ── Cuenta ──────────────────────────────────────── */}
      <div>
        <p
          className='text-xs font-semibold uppercase tracking-wider mb-2 px-1'
          style={{ color: 'var(--text-muted)' }}
        >
          Cuenta
        </p>
        <div className='card overflow-hidden'>
          <Link to='/profile'>
            <SettingRow
              icon={User}
              label='Editar perfil'
              description={user ? `${user.nombre} ${user.apellido}` : 'Ver mi perfil'}
            >
              <ChevronRight className='w-4 h-4 shrink-0' style={{ color: 'var(--text-muted)' }} />
            </SettingRow>
          </Link>
          <button className='w-full text-left' onClick={() => setPasswordOpen(true)}>
            <SettingRow
              icon={KeyRound}
              label='Cambiar contraseña'
              description='Actualiza tu contraseña'
              last
            >
              <ChevronRight className='w-4 h-4 shrink-0' style={{ color: 'var(--text-muted)' }} />
            </SettingRow>
          </button>
        </div>
      </div>

      {/* ── Apariencia ──────────────────────────────────── */}
      <div>
        <p
          className='text-xs font-semibold uppercase tracking-wider mb-2 px-1'
          style={{ color: 'var(--text-muted)' }}
        >
          Apariencia
        </p>
        <div className='card overflow-hidden'>
          <SettingRow
            icon={Moon}
            label='Modo oscuro'
            description={darkMode ? 'Activo — fondo negro OLED' : 'Inactivo — fondo claro'}
            last
          >
            <ToggleSwitch value={darkMode} onChange={toggleDarkMode} />
          </SettingRow>
        </div>
      </div>

      {/* ── Notificaciones ──────────────────────────────── */}
      <div>
        <p
          className='text-xs font-semibold uppercase tracking-wider mb-2 px-1'
          style={{ color: 'var(--text-muted)' }}
        >
          Notificaciones
        </p>
        <div className='card overflow-hidden'>
          <SettingRow icon={Bell} label='Notificaciones push' description='Recibir avisos del club'>
            <ToggleSwitch value={notifications.push} onChange={(v) => setNotification('push', v)} />
          </SettingRow>
          <SettingRow
            icon={Bell}
            label='Partidos en vivo'
            description='Alertas cuando inicie un partido'
          >
            <ToggleSwitch
              value={notifications.enVivo}
              onChange={(v) => setNotification('enVivo', v)}
            />
          </SettingRow>
          <SettingRow icon={Bell} label='Resultados' description='Al finalizar un partido' last>
            <ToggleSwitch
              value={notifications.resultados}
              onChange={(v) => setNotification('resultados', v)}
            />
          </SettingRow>
        </div>
        <p className='text-xs mt-1.5 px-1' style={{ color: 'var(--text-muted)' }}>
          Las preferencias se guardan localmente en tu dispositivo
        </p>
      </div>

      {/* ── Seguridad y privacidad ───────────────────────── */}
      <div>
        <p
          className='text-xs font-semibold uppercase tracking-wider mb-2 px-1'
          style={{ color: 'var(--text-muted)' }}
        >
          Privacidad y seguridad
        </p>
        <div className='card overflow-hidden'>
          <SettingRow
            icon={Shield}
            label='Seguridad'
            description='Autenticación y sesiones activas'
            last
          >
            <ChevronRight className='w-4 h-4 shrink-0' style={{ color: 'var(--text-muted)' }} />
          </SettingRow>
        </div>
      </div>

      <p className='text-center text-xs' style={{ color: 'var(--text-muted)' }}>
        ScoreApp v0.1.0 — Hecho en Bucaramanga/Colombia.
      </p>
    </div>
  )
}
