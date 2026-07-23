import { Link } from 'react-router-dom'
import { Moon, Bell, Globe, Shield, ChevronRight, User, KeyRound } from 'lucide-react'
import useUIStore from '../store/useUIStore'
import useAuthStore from '../store/useAuthStore'
import { cn } from '../utils/cn'

const LANGUAGES = [
  { code: 'es', label: 'Español', flag: '🇨🇴' },
  { code: 'en', label: 'English', flag: '🇺🇸' },
]

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
  const { darkMode, toggleDarkMode, language, setLanguage, notifications, setNotification } =
    useUIStore()

  const { user } = useAuthStore()

  return (
    <div className='space-y-6 animate-fade-up pb-24'>
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
          <Link to='/forgot-password'>
            <SettingRow
              icon={KeyRound}
              label='Cambiar contraseña'
              description='Actualiza tu contraseña'
              last
            >
              <ChevronRight className='w-4 h-4 shrink-0' style={{ color: 'var(--text-muted)' }} />
            </SettingRow>
          </Link>
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

      {/* ── Idioma ──────────────────────────────────────── */}
      <div>
        <p
          className='text-xs font-semibold uppercase tracking-wider mb-2 px-1'
          style={{ color: 'var(--text-muted)' }}
        >
          Idioma
        </p>
        <div className='card overflow-hidden'>
          {LANGUAGES.map((lang, i) => (
            <button
              key={lang.code}
              onClick={() => setLanguage(lang.code)}
              className='w-full flex items-center gap-3 px-4 py-3.5 transition-all'
              style={{
                borderBottom: i < LANGUAGES.length - 1 ? '1px solid var(--border-color)' : 'none',
                backgroundColor: language === lang.code ? 'var(--color-brand-dim)' : 'transparent',
              }}
            >
              <div
                className='w-8 h-8 rounded-lg flex items-center justify-center shrink-0 text-base'
                style={{ backgroundColor: 'var(--bg-hover)' }}
              >
                {lang.flag}
              </div>
              <span
                className='flex-1 text-sm font-medium text-left'
                style={{ color: 'var(--text-primary)' }}
              >
                {lang.label}
              </span>
              {language === lang.code && (
                <div
                  className='w-4 h-4 rounded-full flex items-center justify-center'
                  style={{ backgroundColor: 'var(--color-brand)' }}
                >
                  <span className='text-white text-[10px] font-bold'>✓</span>
                </div>
              )}
            </button>
          ))}
        </div>
        <p className='text-xs mt-1.5 px-1' style={{ color: 'var(--text-muted)' }}>
          Traducción completa disponible en próxima versión
        </p>
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
