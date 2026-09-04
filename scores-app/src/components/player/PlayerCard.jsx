import { Link } from 'react-router-dom'
import { Star } from 'lucide-react'
import useFavoritesStore from '../../store/useFavoritesStore'
import { cn } from '../../utils/cn'
import { useLoginRequired } from '../../hooks/useLoginRequired'
import Avatar from '../ui/Avatar'

export default function PlayerCard({ player, categoryId }) {
  const { toggleJugador, isJugadorFavorite } = useFavoritesStore()
  const requireLogin = useLoginRequired()
  const isFav = isJugadorFavorite(player.id)
  const playerUrl = `/player/${player.id}${categoryId ? `?categoria_id=${categoryId}` : ''}`

  return (
    <Link to={playerUrl}>
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

          <Avatar
            src={player.foto}
            name={`${player.nombre || ''} ${player.apellido || ''}`}
          />

          <div className='flex-1 min-w-0'>
            <p className='font-semibold text-sm truncate' style={{ color: 'var(--text-primary)' }}>
              {player.nombre} {player.apellido}
            </p>
            <div className='flex items-center gap-2 mt-0.5'>
              {player.stats?.categoria?.nombre && (
                <span className='text-xs' style={{ color: 'var(--text-muted)' }}>
                  {player.stats.categoria.nombre}
                </span>
              )}
              {player.stats && (
                <span className='text-xs' style={{ color: 'var(--text-muted)' }}>
                  {player.stats.puntos} pts · {player.stats.victorias}V/{player.stats.derrotas}D
                </span>
              )}
            </div>
          </div>

          <button
            onClick={(e) => {
              e.preventDefault()
              if (requireLogin('Para guardar jugadores en favoritos debes iniciar sesión.')) {
                toggleJugador(player)
              }
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
