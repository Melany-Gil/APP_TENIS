import { useParams, Link } from 'react-router-dom'
import { ArrowLeft, Star } from 'lucide-react'
import { useState } from 'react'
import Tabs from '../components/ui/Tabs'
import { usePlayer } from '../hooks/usePlayers'
import useFavoritesStore from '../store/useFavoritesStore'
import { cn } from '../utils/cn'

const TABS = [
  { value: 'overview', label: 'Perfil' },
  { value: 'stats', label: 'Estadísticas' },
]

export default function Player() {
  const { id } = useParams()
  const { player, loading } = usePlayer(id)
  const [tab, setTab] = useState('overview')
  const { toggleJugador, isJugadorFavorite } = useFavoritesStore()

  if (loading) return <div className='skeleton h-48 w-full rounded-xl' />
  if (!player)
    return (
      <p className='text-center py-16 text-sm' style={{ color: 'var(--text-muted)' }}>
        Jugador no encontrado
      </p>
    )

  const isFav = isJugadorFavorite(player.id)

  return (
    <div className='space-y-5 animate-fade-up'>
      <div className='flex items-center justify-between'>
        <Link
          to='/tennis'
          className='flex items-center gap-2 text-sm transition-colors'
          style={{ color: 'var(--text-secondary)' }}
        >
          <ArrowLeft className='w-4 h-4' /> Tenis
        </Link>
        <button
          onClick={() => toggleJugador(player)}
          className='btn-ghost flex items-center gap-1.5 px-3 py-1.5 text-sm'
          style={{ color: isFav ? '#facc15' : 'var(--text-muted)' }}
        >
          <Star className={cn('w-4 h-4', isFav && 'fill-current')} />
          {isFav ? 'Guardado' : 'Guardar'}
        </button>
      </div>

      {/* Header */}
      <div className='card p-5'>
        <div className='flex items-center gap-4'>
          <div
            className='w-20 h-20 rounded-full border-2 flex items-center justify-center text-4xl shrink-0'
            style={{ backgroundColor: 'var(--bg-hover)', borderColor: 'var(--border-color)' }}
          >
            {player.country?.flag || '👤'}
          </div>
          <div className='flex-1 min-w-0'>
            <h1 className='text-xl font-bold' style={{ color: 'var(--text-primary)' }}>
              {player.nombre} {player.apellido}
            </h1>
            {player.apodo && (
              <p className='text-sm' style={{ color: 'var(--text-muted)' }}>
                "{player.apodo}"
              </p>
            )}
            <div className='flex items-center gap-2 mt-1'>
              <span className={player.deporte === 'tenis' ? 'badge-atp' : 'badge-padel'}>
                {player.deporte}
              </span>
              {player.categoria && <span className='badge-brand'>{player.categoria.nombre}</span>}
              <span className='text-sm' style={{ color: 'var(--text-muted)' }}>
                {player.country?.name}
              </span>
            </div>
            {player.stats && (
              <div className='flex items-center gap-4 mt-3'>
                <div>
                  <p className='text-2xl font-bold' style={{ color: 'var(--color-brand)' }}>
                    #{player.stats.ranking}
                  </p>
                  <p className='text-xs' style={{ color: 'var(--text-muted)' }}>
                    Ranking
                  </p>
                </div>
                <div className='w-px h-8' style={{ backgroundColor: 'var(--border-color)' }} />
                <div>
                  <p className='text-lg font-semibold' style={{ color: 'var(--text-primary)' }}>
                    {player.stats.puntos?.toLocaleString()}
                  </p>
                  <p className='text-xs' style={{ color: 'var(--text-muted)' }}>
                    Puntos
                  </p>
                </div>
                <div className='w-px h-8' style={{ backgroundColor: 'var(--border-color)' }} />
                <div>
                  <p className='text-lg font-semibold' style={{ color: 'var(--text-primary)' }}>
                    <span style={{ color: '#22c55e' }}>{player.stats.victorias}V</span>
                    {' / '}
                    <span style={{ color: '#ef4444' }}>{player.stats.derrotas}D</span>
                  </p>
                  <p className='text-xs' style={{ color: 'var(--text-muted)' }}>
                    Balance
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <Tabs tabs={TABS} activeTab={tab} onChange={setTab} />

      {tab === 'overview' && (
        <div className='grid grid-cols-2 sm:grid-cols-3 gap-3'>
          {[
            { label: 'Altura', value: player.altura_cm ? `${player.altura_cm} cm` : '—' },
            { label: 'Peso', value: player.peso_kg ? `${player.peso_kg} kg` : '—' },
            { label: 'Mano', value: player.mano || '—' },
            { label: 'Teléfono', value: player.telefono || '—' },
            { label: 'País', value: player.country?.name || '—' },
            { label: 'Categoría', value: player.categoria?.nombre || '—' },
          ].map((item) => (
            <div key={item.label} className='card p-3'>
              <p className='text-xs mb-1' style={{ color: 'var(--text-muted)' }}>
                {item.label}
              </p>
              <p className='text-sm font-semibold' style={{ color: 'var(--text-primary)' }}>
                {item.value}
              </p>
            </div>
          ))}
        </div>
      )}

      {tab === 'stats' && player.stats && (
        <div className='card overflow-hidden'>
          {[
            { label: 'Victorias', value: player.stats.victorias },
            { label: 'Derrotas', value: player.stats.derrotas },
            { label: 'Puntos', value: player.stats.puntos?.toLocaleString() },
            { label: 'Ranking', value: `#${player.stats.ranking}` },
          ].map((s, i, arr) => (
            <div
              key={s.label}
              className='flex items-center justify-between px-4 py-3'
              style={{
                borderBottom: i < arr.length - 1 ? '1px solid var(--border-color)' : 'none',
              }}
            >
              <span className='text-sm' style={{ color: 'var(--text-muted)' }}>
                {s.label}
              </span>
              <span className='text-sm font-semibold' style={{ color: 'var(--text-primary)' }}>
                {s.value ?? '—'}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
