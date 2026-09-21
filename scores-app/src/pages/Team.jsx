import { useParams, Link } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { ArrowLeft, ChevronRight, Star } from 'lucide-react'
import useFavoritesStore from '../store/useFavoritesStore'
import { teamService } from '../services/teamService'
import { cn } from '../utils/cn'
import { useLoginRequired } from '../hooks/useLoginRequired'
import Avatar from '../components/ui/Avatar'

export default function Team() {
  const { id } = useParams()
  const [team, setTeam] = useState(null)
  const [loading, setLoading] = useState(true)
  const { toggleEquipo, isEquipoFavorite } = useFavoritesStore()
  const requireLogin = useLoginRequired()

  useEffect(() => {
    teamService
      .getById(id)
      .then((r) => setTeam(r.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [id])

  if (loading) return <div className='skeleton h-48 w-full rounded-xl' />
  if (!team)
    return (
      <p className='text-center py-16 text-sm' style={{ color: 'var(--text-muted)' }}>
        Equipo no encontrado
      </p>
    )

  const isFav = isEquipoFavorite(team.id)

  return (
    <div className='space-y-5 animate-fade-up'>
      <div className='flex items-center justify-between'>
        <Link
          to={team.deporte === 'tenis' ? '/tennis' : '/padel'}
          className='flex items-center gap-2 text-sm transition-colors'
          style={{ color: 'var(--text-secondary)' }}
        >
          <ArrowLeft className='w-4 h-4' /> {team.deporte === 'tenis' ? 'Tenis' : 'Pádel'}
        </Link>
        <button
          onClick={() => {
            if (requireLogin('Para guardar parejas en favoritos debes iniciar sesión.')) {
              toggleEquipo(team)
            }
          }}
          className='btn-ghost flex items-center gap-1.5 px-3 py-1.5 text-sm'
          style={{ color: isFav ? '#facc15' : 'var(--text-muted)' }}
        >
          <Star className={cn('w-4 h-4', isFav && 'fill-current')} />
          {isFav ? 'Guardado' : 'Guardar'}
        </button>
      </div>

      <div className='card p-5'>
        <div className='flex items-center gap-4 mb-5'>
          <div className='flex -space-x-3 shrink-0'>
            {[team.jugador1, team.jugador2].map((j, i) => (
              <div
                key={i}
                className='w-14 h-14 rounded-full flex items-center justify-center text-2xl border-2'
                style={{ backgroundColor: 'var(--bg-hover)', borderColor: 'var(--bg-card)' }}
              >
                {j?.country?.flag || '👤'}
              </div>
            ))}
          </div>
          <div>
            <h1 className='text-xl font-bold' style={{ color: 'var(--text-primary)' }}>
              {team.nombre}
            </h1>
            {team.categoria && (
              <span className='badge-padel mt-1 inline-block'>{team.categoria.nombre}</span>
            )}
            {team.stats && (
              <div className='flex items-center gap-4 mt-3'>
                <div>
                  <p className='text-2xl font-bold' style={{ color: 'var(--color-brand)' }}>
                    #{team.stats.ranking}
                  </p>
                  <p className='text-xs' style={{ color: 'var(--text-muted)' }}>
                    Ranking
                  </p>
                </div>
                <div className='w-px h-8' style={{ backgroundColor: 'var(--border-color)' }} />
                <div>
                  <p className='text-lg font-semibold' style={{ color: 'var(--text-primary)' }}>
                    {team.stats.puntos?.toLocaleString()}
                  </p>
                  <p className='text-xs' style={{ color: 'var(--text-muted)' }}>
                    Puntos
                  </p>
                </div>
                <div className='w-px h-8' style={{ backgroundColor: 'var(--border-color)' }} />
                <div>
                  <p className='text-lg font-semibold' style={{ color: 'var(--text-primary)' }}>
                    <span style={{ color: '#22c55e' }}>{team.stats.victorias}V</span>
                    {' / '}
                    <span style={{ color: '#ef4444' }}>{team.stats.derrotas}D</span>
                  </p>
                  <p className='text-xs' style={{ color: 'var(--text-muted)' }}>
                    Balance
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Jugadores */}
        <div className='space-y-2 pt-4' style={{ borderTop: '1px solid var(--border-color)' }}>
          <p className='text-xs font-semibold uppercase tracking-wider mb-2' style={{ color: 'var(--text-muted)' }}>
            Integrantes de la pareja
          </p>
          {[team.jugador1, team.jugador2].filter(Boolean).map((j) => (
            <Link
              key={j.id}
              to={`/player/${j.id}`}
              className='card-hover p-2.5 rounded-xl flex items-center justify-between gap-3 transition-colors'
            >
              <div className='flex items-center gap-3 min-w-0'>
                <Avatar
                  src={j.foto || j.avatar || j.usuario?.avatar}
                  name={`${j.nombre || ''} ${j.apellido || ''}`}
                  size='sm'
                />
                <div className='min-w-0'>
                  <p className='font-semibold text-sm truncate' style={{ color: 'var(--text-primary)' }}>
                    {j.nombre} {j.apellido}
                  </p>
                  <p className='text-xs truncate' style={{ color: 'var(--text-muted)' }}>
                    {j.country?.name ? `${j.country.name} · ` : ''}Ver perfil e historial
                  </p>
                </div>
              </div>
              <ChevronRight className='w-4 h-4 shrink-0' style={{ color: 'var(--text-muted)' }} />
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
