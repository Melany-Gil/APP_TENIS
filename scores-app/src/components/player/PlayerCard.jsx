import { Link } from 'react-router-dom'
import { Star } from 'lucide-react'
import useFavoritesStore from '../../store/useFavoritesStore'
import { cn } from '../../utils/cn'

export default function PlayerCard({ player }) {
  const { toggleJugador, isJugadorFavorite } = useFavoritesStore()
  const isFav = isJugadorFavorite(player.id)

  return (
    <Link to={`/player/${player.id}`}>
      <div className='card-hover p-4'>
        <div className='flex items-center gap-3'>
          <span
            className='text-lg font-bold w-8 text-center'
            style={{
              color: player.stats?.ranking <= 3 ? 'var(--color-brand)' : 'var(--text-muted)',
            }}
          >
            #{player.stats?.ranking ?? '—'}
          </span>

          <div
            className='w-11 h-11 rounded-full flex items-center justify-center text-xl shrink-0 border'
            style={{ backgroundColor: 'var(--bg-hover)', borderColor: 'var(--border-color)' }}
          >
            {player.country?.flag || '👤'}
          </div>

          <div className='flex-1 min-w-0'>
            <p className='font-semibold text-sm truncate' style={{ color: 'var(--text-primary)' }}>
              {player.nombre} {player.apellido}
            </p>
            <div className='flex items-center gap-2 mt-0.5'>
              <span className={player.deporte === 'tenis' ? 'badge-atp' : 'badge-padel'}>
                {player.deporte}
              </span>
              {player.categoria && (
                <span className='text-xs' style={{ color: 'var(--text-muted)' }}>
                  {player.categoria.nombre}
                </span>
              )}
              {player.stats && (
                <span className='text-xs' style={{ color: 'var(--text-muted)' }}>
                  {player.stats.puntos?.toLocaleString()} pts
                </span>
              )}
            </div>
          </div>

          <button
            onClick={(e) => {
              e.preventDefault()
              toggleJugador(player)
            }}
            className='transition-colors shrink-0'
            style={{ color: isFav ? '#facc15' : 'var(--text-muted)' }}
          >
            <Star className={cn('w-4 h-4', isFav && 'fill-current')} />
          </button>
        </div>
      </div>
    </Link>
  )
}
