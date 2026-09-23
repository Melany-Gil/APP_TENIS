import { useCallback, useEffect, useRef, useState } from 'react'
import ChangePassword from '../components/profile/ChangePassword'
import { Link, useNavigate } from 'react-router-dom'
import {
  Bell,
  Camera,
  ChevronRight,
  LogOut,
  Mail,
  Shield,
  Trash2,
  Trophy,
  User,
  Users,
} from 'lucide-react'
import useAuthStore from '../store/useAuthStore'
import { authService } from '../services/authService'
import { matchService } from '../services/matchService'
import { userService } from '../services/userService'
import useUIStore from '../store/useUIStore'
import Button from '../components/ui/Button'
import Input from '../components/ui/Input'
import Avatar from '../components/ui/Avatar'
import ScoreDisplay from '../components/match/ScoreDisplay'
import { useMatchRealtime } from '../hooks/useMatchRealtime'
import { cn } from '../utils/cn'
import { formatClockTime, formatDate } from '../utils/formatDate'
import { getParticipantName } from '../utils/matchParticipants'

const EMPTY_MATCHES = { jugador: null, en_vivo: [], proximos: [], historial: [] }
const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp']

export default function Profile() {
  const { user, updateUser, logout } = useAuthStore()
  const { addToast } = useUIStore()
  const navigate = useNavigate()
  const fileInputRef = useRef(null)
  const [editing, setEditing] = useState(false)
  const [passwordOpen, setPasswordOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [matches, setMatches] = useState(EMPTY_MATCHES)
  const [matchesLoading, setMatchesLoading] = useState(true)
  const [modalityFilter, setModalityFilter] = useState('todas')
  const [isLinkedPlayer, setIsLinkedPlayer] = useState(Boolean(user?.jugador))
  const [form, setForm] = useState({
    nombre: user?.nombre || '',
    apellido: user?.apellido || '',
    email: user?.email || '',
    telefono: user?.telefono || '',
  })

  const loadProfile = useCallback(async () => {
    try {
      const response = await userService.getMe()
      updateUser(response.data)
      setIsLinkedPlayer(Boolean(response.data?.jugador))
      setForm({
        nombre: response.data?.nombre || '',
        apellido: response.data?.apellido || '',
        email: response.data?.email || '',
        telefono: response.data?.telefono || '',
      })
    } catch {
      // El interceptor se encarga de una sesión vencida.
    }
  }, [updateUser])

  const loadMatches = useCallback(async () => {
    if (user?.rol === 'juez') { setMatchesLoading(false); return }
    try {
      const response = await matchService.getMyMatches()
      setMatches(response.data || EMPTY_MATCHES)
      setIsLinkedPlayer(true)
    } catch (error) {
      if (error.status === 404) {
        setMatches(EMPTY_MATCHES)
        setIsLinkedPlayer(false)
      } else {
        addToast({ type: 'error', title: 'No se pudieron cargar tus partidos' })
      }
    } finally {
      setMatchesLoading(false)
    }
  }, [addToast, user?.rol])

  useEffect(() => {
    loadProfile()
    loadMatches()
  }, [loadMatches, loadProfile])

  useMatchRealtime(useCallback(() => loadMatches(), [loadMatches]))

  const saveProfile = async (event) => {
    event.preventDefault()
    setSaving(true)
    try {
      const response = await userService.updateMe(form)
      updateUser(response.data)
      setEditing(false)
      addToast({ type: 'success', title: 'Perfil actualizado' })
    } catch (error) {
      addToast({ type: 'error', title: 'No se pudo actualizar', message: error.message })
    } finally {
      setSaving(false)
    }
  }

  const uploadAvatar = async (event) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    if (!ACCEPTED_IMAGE_TYPES.includes(file.type) || file.size > 2 * 1024 * 1024) {
      addToast({
        type: 'error',
        title: 'Imagen no válida',
        message: 'Usa JPG, PNG o WebP de máximo 2 MB.',
      })
      return
    }

    setUploading(true)
    try {
      const response = await userService.uploadAvatar(file)
      updateUser(response.data)
      addToast({ type: 'success', title: 'Foto de perfil actualizada' })
    } catch (error) {
      addToast({ type: 'error', title: 'No se pudo subir la foto', message: error.message })
    } finally {
      setUploading(false)
    }
  }

  const deleteAvatar = async () => {
    setUploading(true)
    try {
      const response = await userService.deleteAvatar()
      updateUser(response.data)
      addToast({ type: 'success', title: 'Foto eliminada' })
    } catch (error) {
      addToast({ type: 'error', title: 'No se pudo eliminar la foto', message: error.message })
    } finally {
      setUploading(false)
    }
  }

  const menu = [
    { icon: Shield, label: 'Cambiar contraseña' },
    { icon: Bell, label: 'Notificaciones' },
  ]

  const fullName = `${user?.nombre || ''} ${user?.apellido || ''}`.trim()

  const userAllMatches = [
    ...(matches.en_vivo || []),
    ...(matches.proximos || []),
    ...(matches.historial || []),
  ]
  const userDoublesMatches = userAllMatches.filter(
    (m) => m.modalidad === 'dobles' || m.torneo?.modalidad === 'dobles'
  )
  const userSinglesMatches = userAllMatches.filter(
    (m) => m.modalidad !== 'dobles' && m.torneo?.modalidad !== 'dobles'
  )

  const filterByModality = (list = []) => {
    if (modalityFilter === 'todas') return list
    return list.filter((m) => {
      const isDoubles = m.modalidad === 'dobles' || m.torneo?.modalidad === 'dobles'
      return modalityFilter === 'dobles' ? isDoubles : !isDoubles
    })
  }

  return (
    <div className='space-y-5 animate-fade-up'>
      <h1 className='text-xl font-bold text-text-primary'>Mi perfil</h1>

      <div className='card p-5 flex flex-col gap-4 sm:flex-row sm:items-center'>
        <div className='relative self-start'>
          <Avatar src={user?.avatar || user?.jugador?.foto} name={fullName} size='lg' />
          <button
            type='button'
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className='absolute -bottom-1 -right-1 w-8 h-8 rounded-full inline-flex items-center justify-center text-white disabled:opacity-50'
            style={{ backgroundColor: 'var(--color-brand)', boxShadow: 'var(--shadow-sm)' }}
            aria-label='Cambiar foto de perfil'
          >
            <Camera className='w-4 h-4' />
          </button>
          <input
            ref={fileInputRef}
            type='file'
            accept='image/jpeg,image/png,image/webp'
            onChange={uploadAvatar}
            className='hidden'
          />
        </div>
        <div className='flex-1 min-w-0'>
          <h2 className='text-base font-bold text-text-primary'>{fullName}</h2>
          <p className='text-sm text-text-secondary'>{user?.email}</p>
          <p className='text-xs text-text-muted mt-0.5'>{user?.numero_documento ? `CC: ${user.numero_documento}` : 'Sin documento registrado'}</p>
          {user?.jugador && (
            <p className='text-xs font-medium mt-1' style={{ color: 'var(--color-brand)' }}>
              Perfil de jugador: {user.jugador.nombre} {user.jugador.apellido}
            </p>
          )}
        </div>
        <div className='flex gap-2 self-start'>
          {(user?.avatar || user?.jugador?.foto) && (
            <Button
              variant='ghost'
              size='icon'
              onClick={deleteAvatar}
              disabled={uploading}
              aria-label='Eliminar foto de perfil'
            >
              <Trash2 className='w-4 h-4 text-red-500' />
            </Button>
          )}
          <Button variant='outline' size='sm' onClick={() => setEditing((value) => !value)}>
            Editar
          </Button>
        </div>
      </div>

      {editing && (
        <form onSubmit={saveProfile} className='card p-5 space-y-4 animate-fade-up'>
          <Input
            label='Nombre'
            value={form.nombre}
            onChange={(event) => setForm((current) => ({ ...current, nombre: event.target.value }))}
            required
            leftIcon={<User className='w-4 h-4' />}
          />
          <Input
            label='Apellidos'
            value={form.apellido}
            onChange={(event) => setForm((current) => ({ ...current, apellido: event.target.value }))}
            required
          />
          <Input
            label={user?.rol === 'miembro' ? 'Email (opcional)' : 'Email'}
            type='email'
            value={form.email}
            onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
            required={user?.rol !== 'miembro'}
            leftIcon={<Mail className='w-4 h-4' />}
          />
          <Input
            label={user?.rol === 'miembro' ? 'Celular de acceso' : 'Teléfono'}
            value={form.telefono}
            onChange={(event) => setForm((current) => ({ ...current, telefono: event.target.value }))}
          />
          <div className='flex gap-3'>
            <Button type='submit' fullWidth loading={saving}>Guardar</Button>
            <Button type='button' variant='secondary' onClick={() => setEditing(false)}>Cancelar</Button>
          </div>
        </form>
      )}

      {user?.rol !== 'juez' && (
        <section className='space-y-4'>
          <div className='flex items-center justify-between flex-wrap gap-2'>
            <div>
              <h2 className='font-bold flex items-center gap-2' style={{ color: 'var(--text-primary)' }}>
                <Trophy className='w-4 h-4' style={{ color: 'var(--color-brand)' }} /> Mis partidos
              </h2>
              <p className='text-xs mt-1' style={{ color: 'var(--text-muted)' }}>
                Agenda, marcadores en vivo e historial asociados a tu perfil de jugador.
              </p>
            </div>

            {isLinkedPlayer && !matchesLoading && userAllMatches.length > 0 && (
              <div className='flex items-center gap-1.5 flex-wrap'>
                <button
                  type='button'
                  onClick={() => setModalityFilter('todas')}
                  className={cn(
                    'px-2.5 py-1 text-xs rounded-full font-medium transition-colors',
                    modalityFilter === 'todas'
                      ? 'bg-[var(--color-brand)] text-white'
                      : 'hover:bg-[var(--bg-hover)]'
                  )}
                  style={
                    modalityFilter !== 'todas'
                      ? {
                          backgroundColor: 'var(--bg-card)',
                          color: 'var(--text-secondary)',
                          border: '1px solid var(--border-color)',
                        }
                      : {}
                  }
                >
                  Todas ({userAllMatches.length})
                </button>
                <button
                  type='button'
                  onClick={() => setModalityFilter('dobles')}
                  className={cn(
                    'px-2.5 py-1 text-xs rounded-full font-medium transition-colors flex items-center gap-1.5',
                    modalityFilter === 'dobles'
                      ? 'bg-[var(--color-brand)] text-white'
                      : 'hover:bg-[var(--bg-hover)]'
                  )}
                  style={
                    modalityFilter !== 'dobles'
                      ? {
                          backgroundColor: 'var(--bg-card)',
                          color: 'var(--text-secondary)',
                          border: '1px solid var(--border-color)',
                        }
                      : {}
                  }
                >
                  <Users className='w-3 h-3' /> En pareja ({userDoublesMatches.length})
                </button>
                <button
                  type='button'
                  onClick={() => setModalityFilter('individual')}
                  className={cn(
                    'px-2.5 py-1 text-xs rounded-full font-medium transition-colors flex items-center gap-1.5',
                    modalityFilter === 'individual'
                      ? 'bg-[var(--color-brand)] text-white'
                      : 'hover:bg-[var(--bg-hover)]'
                  )}
                  style={
                    modalityFilter !== 'individual'
                      ? {
                          backgroundColor: 'var(--bg-card)',
                          color: 'var(--text-secondary)',
                          border: '1px solid var(--border-color)',
                        }
                      : {}
                  }
                >
                  <User className='w-3 h-3' /> En solitario ({userSinglesMatches.length})
                </button>
              </div>
            )}
          </div>

          {matchesLoading ? (
            <div className='skeleton h-32 rounded-xl' />
          ) : !isLinkedPlayer ? (
            <div className='card p-6 text-center'>
              <p className='font-semibold' style={{ color: 'var(--text-primary)' }}>Cuenta sin jugador vinculado</p>
              <p className='text-xs mt-1' style={{ color: 'var(--text-muted)' }}>
                Un administrador puede asociar esta cuenta con tu ficha de jugador.
              </p>
            </div>
          ) : (
            <div className='space-y-5'>
              <MatchSection title='En vivo' matches={filterByModality(matches.en_vivo)} live empty='No tienes partidos en vivo.' />
              <MatchSection title='Próximos' matches={filterByModality(matches.proximos)} empty='No tienes próximos partidos.' />
              <MatchSection title='Historial' matches={filterByModality(matches.historial)} history empty='Aún no tienes resultados.' />
            </div>
          )}
        </section>
      )}

      <div className='card overflow-hidden'>
        {passwordOpen && <ChangePassword onClose={() => setPasswordOpen(false)} />}
        {menu.map((item, index) => (
          <button
            key={item.label}
            onClick={() => item.label === 'Cambiar contraseña' ? setPasswordOpen(true) : navigate('/settings')}
            className={cn(
              'w-full flex items-center gap-3 px-4 py-3.5 hover:bg-border-light transition-colors text-left',
              index < menu.length - 1 && 'border-b border-border-light'
            )}
          >
            <item.icon className='w-4 h-4 text-text-secondary shrink-0' />
            <span className='flex-1 text-sm text-text-secondary'>{item.label}</span>
            {item.value && <span className='text-xs text-text-muted mr-2'>{item.value}</span>}
            <ChevronRight className='w-4 h-4 text-text-muted' />
          </button>
        ))}
      </div>

      <Button
        variant='danger'
        fullWidth
        onClick={async () => {
          await authService.logout().catch(() => {})
          logout()
          navigate('/login')
        }}
        leftIcon={<LogOut className='w-4 h-4' />}
      >
        Cerrar sesión
      </Button>
    </div>
  )
}

function MatchSection({ title, matches = [], empty, live = false, history = false }) {
  return (
    <section>
      <div className='flex items-center gap-2 mb-2'>
        {live && <span className='w-2 h-2 rounded-full bg-red-500 animate-pulse' />}
        <h3 className='text-sm font-semibold' style={{ color: 'var(--text-secondary)' }}>{title}</h3>
        <span className='text-[10px] rounded-full px-2 py-0.5' style={{ backgroundColor: 'var(--bg-hover)', color: 'var(--text-muted)' }}>
          {matches.length}
        </span>
      </div>
      <div className='card overflow-hidden'>
        {matches.length ? matches.map((match, index) => (
          <ProfileMatchRow
            key={match.id}
            match={match}
            history={history}
            bordered={index < matches.length - 1}
          />
        )) : (
          <p className='px-4 py-5 text-xs text-center' style={{ color: 'var(--text-muted)' }}>{empty}</p>
        )}
      </div>
    </section>
  )
}

function ProfileMatchRow({ match, history, bordered }) {
  const name1 = getParticipantName(match, 1) || 'Por definir'
  const name2 = getParticipantName(match, 2) || 'Por definir'
  const sets1 = match.sets?.map((set) => set.games_j1) || []
  const sets2 = match.sets?.map((set) => set.games_j2) || []

  return (
    <Link
      to={`/match/${match.id}`}
      className='block px-4 py-3 transition-colors hover:bg-[var(--bg-hover)]'
      style={{ borderBottom: bordered ? '1px solid var(--border-color)' : 'none' }}
    >
      <div className='flex items-center justify-between gap-3 mb-2 flex-wrap'>
        <div className='flex items-center gap-2 flex-wrap'>
          <span className='badge-brand'>{match.categoria?.nombre || 'Sin categoría'}</span>
          {match.modalidad === 'dobles' || match.torneo?.modalidad === 'dobles' ? (
            <span
              className='text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full inline-flex items-center gap-1'
              style={{ backgroundColor: 'var(--bg-hover)', color: 'var(--text-secondary)' }}
            >
              <Users className='w-3 h-3 text-[var(--color-brand)]' /> Dobles
            </span>
          ) : (
            <span
              className='text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full inline-flex items-center gap-1'
              style={{ backgroundColor: 'var(--bg-hover)', color: 'var(--text-secondary)' }}
            >
              <User className='w-3 h-3 text-sky-500' /> Individual
            </span>
          )}
        </div>
        <div className='flex items-center gap-2'>
          {history && match.resultado && (
            <span
              className='text-[10px] font-bold uppercase rounded-full px-2 py-0.5'
              style={{
                color: match.resultado === 'victoria' ? '#16a34a' : match.resultado === 'derrota' ? '#dc2626' : 'var(--text-muted)',
                backgroundColor: match.resultado === 'victoria' ? 'rgba(22,163,74,.1)' : match.resultado === 'derrota' ? 'rgba(220,38,38,.1)' : 'var(--bg-hover)',
              }}
            >
              {{ victoria: 'Victoria', derrota: 'Derrota', sin_resultado: 'Sin resultado' }[match.resultado]}
            </span>
          )}
          <span className='text-[10px]' style={{ color: 'var(--text-muted)' }}>
            {[match.fecha_inicio && formatDate(match.fecha_inicio), formatClockTime(match.hora_inicio)].filter(Boolean).join(' · ')}
          </span>
        </div>
      </div>
      <CompactPlayer name={name1} photo={match.jugador1?.foto} sets={sets1} winner={match.ganador === 'jugador1'} />
      <CompactPlayer name={name2} photo={match.jugador2?.foto} sets={sets2} winner={match.ganador === 'jugador2'} />
    </Link>
  )
}

function CompactPlayer({ name, photo, sets, winner }) {
  return (
    <div className='flex items-center gap-2 py-1'>
      <Avatar src={photo} name={name} size='xs' />
      <span className={cn('flex-1 min-w-0 truncate text-sm', winner && 'font-bold')} style={{ color: 'var(--text-primary)' }}>
        {name}
      </span>
      <ScoreDisplay sets={sets} isWinner={winner} />
    </div>
  )
}
