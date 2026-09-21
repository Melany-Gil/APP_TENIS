import { Link } from 'react-router-dom'
import { ChevronRight, Star } from 'lucide-react'
import useFavoritesStore from '../../store/useFavoritesStore'
import { cn } from '../../utils/cn'
import { useLoginRequired } from '../../hooks/useLoginRequired'
import Avatar from '../ui/Avatar'

export default function PlayerCard({ player, categoryId }) {
  const { toggleJugador, isJugadorFavorite } = useFavoritesStore()
  const requireLogin = useLoginRequired()
  const isFav = isJugadorFavorite(player.id)
  const playerUrl = `/player/${player.id}${categoryId ? `?categoria_id=${categoryId}` : ''}`
  const categoryName =
    player.stats?.categoria?.nombre || player.categoria?.nombre || player.categoria_nombre

  return (
    <Link to={playerUrl}>
      <div className='card-hover p-3.5 sm:p-4'>
        <div className='flex items-center gap-3.5'>
          <Avatar
            src={player.foto || player.avatar || player.usuario?.avatar}
            name={`${player.nombre || ''} ${player.apellido || ''}`}
            size='md'
            className='shrink-0 rounded-xl'
          />

          <div className='flex-1 min-w-0'>
            <p className='font-bold text-sm sm:text-base truncate' style={{ color: 'var(--text-primary)' }}>
              {player.nombre} {player.apellido}
            </p>
            <div className='flex items-center gap-2 mt-0.5 flex-wrap'>
              {categoryName && (
                <span className='badge-brand text-xs'>
                  {categoryName}
                </span>
              )}
              <span className='text-xs' style={{ color: 'var(--text-muted)' }}>
                Ver perfil e historial
              </span>
            </div>
          </div>

          <div className='flex items-center gap-1.5 shrink-0'>
            <button
              onClick={(e) => {
                e.preventDefault()
                if (requireLogin('Para guardar jugadores en favoritos debes iniciar sesión.')) {
                  toggleJugador(player)
                }
              }}
              className='p-1.5 transition-colors hover:bg-[var(--bg-hover)] rounded-lg'
              style={{ color: isFav ? '#facc15' : 'var(--text-muted)' }}
              title={isFav ? 'Guardado en favoritos' : 'Guardar en favoritos'}
            >
              <Star className={cn('w-4 h-4', isFav && 'fill-current')} />
            </button>
            <ChevronRight className='w-4 h-4' style={{ color: 'var(--text-muted)' }} />
          </div>
        </div>
      </div>
    </Link>
  )
}
