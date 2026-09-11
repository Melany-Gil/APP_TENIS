import { useEffect, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { ChevronDown, LogOut, Settings, UserRound, LayoutDashboard } from 'lucide-react'
import Avatar from '../ui/Avatar'
import useAuthStore from '../../store/useAuthStore'
import { authService } from '../../services/authService'

const ROLES = { miembro: 'Jugador / miembro', admin: 'Administrador', juez: 'Juez', juez_director: 'Juez director' }

export default function ProfileMenu() {
  const { user, logout } = useAuthStore()
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const root = useRef(null)
  const trigger = useRef(null)
  const location = useLocation()
  const navigate = useNavigate()
  useEffect(() => setOpen(false), [location.pathname])
  useEffect(() => {
    if (!open) return
    root.current?.querySelector('a')?.focus()
    const outside = e => { if (!root.current?.contains(e.target)) setOpen(false) }
    const escape = e => { if (e.key === 'Escape') { setOpen(false); trigger.current?.focus() } }
    document.addEventListener('pointerdown', outside)
    document.addEventListener('keydown', escape)
    return () => { document.removeEventListener('pointerdown', outside); document.removeEventListener('keydown', escape) }
  }, [open])
  if (!user) return null
  const official = ['juez', 'juez_director'].includes(user.rol)
  const profile = official ? '/juez/perfil' : '/profile'
  const panel = { admin: '/admin', juez: '/juez', juez_director: '/director' }[user.rol] || '/'
  const name = `${user.nombre || ''} ${user.apellido || ''}`.trim()
  const closeSession = async () => {
    setBusy(true); setError('')
    try { await authService.logout(); logout(); navigate('/login', { replace: true }) }
    catch { setError('No se pudo cerrar la sesión. Reintenta cuando tengas conexión.') }
    finally { setBusy(false) }
  }
  return <div className='relative' ref={root} onBlur={e => { if (!e.currentTarget.contains(e.relatedTarget)) setOpen(false) }}>
    <button ref={trigger} type='button' aria-label={`Abrir menú de ${name}`} aria-expanded={open} aria-controls='profile-menu' onClick={() => setOpen(v => !v)} className='flex items-center gap-2 rounded-xl p-1 hover:bg-[var(--bg-hover)]'>
      <Avatar src={user.avatar} name={name} size='sm' />
      <span className='hidden lg:block text-left max-w-40'><strong className='block truncate text-sm'>{name}</strong><span className='text-xs' style={{ color: 'var(--text-muted)' }}>{ROLES[user.rol]}</span></span>
      <ChevronDown size={16} aria-hidden='true' />
    </button>
    {open && <div id='profile-menu' className='card absolute right-0 top-full mt-3 w-72 max-w-[calc(100vw-2rem)] p-2 shadow-xl z-[70]'>
      <div className='flex gap-3 items-center rounded-xl p-3 mb-2' style={{ backgroundColor: 'var(--bg-hover)' }}>
        <Avatar src={user.avatar} name={name} size='md' />
        <div className='min-w-0'><strong className='block text-sm truncate'>{name}</strong><p className='text-xs truncate' style={{ color: 'var(--text-muted)' }}>{user.email || user.usuario || user.telefono || ROLES[user.rol]}</p></div>
      </div>
      {[[profile, UserRound, 'Mi perfil'], [panel, LayoutDashboard, 'Mi panel'], ...(!official ? [['/settings', Settings, 'Configuración']] : [])].map(([to, Icon, label]) => <Link key={to} to={to} className='flex gap-3 items-center rounded-lg p-3 text-sm hover:bg-[var(--bg-hover)]'><Icon size={18} />{label}</Link>)}
      <button disabled={busy} onClick={closeSession} className='w-full text-left flex gap-3 items-center text-red-600 rounded-lg p-3 text-sm border-t border-[var(--border-color)] disabled:opacity-50'><LogOut size={18} />{busy ? 'Cerrando sesión…' : 'Cerrar sesión'}</button>
      {error && <p role='alert' className='p-2 text-sm text-red-600'>{error}</p>}
    </div>}
  </div>
}
