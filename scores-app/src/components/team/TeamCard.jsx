import { Link } from 'react-router-dom'
import { Star } from 'lucide-react'
import useFavoritesStore from '../../store/useFavoritesStore'
import { cn } from '../../utils/cn'
import { useLoginRequired } from '../../hooks/useLoginRequired'

export default function TeamCard({ team }) {
  const { toggleEquipo, isEquipoFavorite } = useFavoritesStore()
  const requireLogin = useLoginRequired()
  const isFav = isEquipoFavorite(team.id)

  return (
    <Link to={`/team/${team.id}`}>
      <div className='card-hover p-4'>
        <div className='flex items-center gap-3'>
          <span
            className='text-lg font-bold w-8 text-center'
            style={{ color: team.stats?.ranking <= 3 ? 'var(--color-brand)' : 'var(--text-muted)' }}
          >
            #{team.stats?.ranking ?? '—'}
          </span>

          <div className='flex -space-x-2 shrink-0'>
            {[team.jugador1, team.jugador2].map((j, i) => (
              <div
                key={i}
                className='w-10 h-10 rounded-full flex items-center justify-center text-base border-2'
                style={{ backgroundColor: 'var(--bg-hover)', borderColor: 'var(--bg-card)' }}
              >
                {j?.country?.flag || '👤'}
              </div>
            ))}
          </div>

          <div className='flex-1 min-w-0'>
            <p className='font-semibold text-sm truncate' style={{ color: 'var(--text-primary)' }}>
              {team.nombre}
            </p>
            <div className='flex items-center gap-2 mt-0.5'>
              <span className='badge-padel'>Pádel</span>
              {team.categoria && (
                <span className='text-xs' style={{ color: 'var(--text-muted)' }}>
                  {team.categoria.nombre}
                </span>
              )}
              {team.stats && (
                <span className='text-xs' style={{ color: 'var(--text-muted)' }}>
                  {team.stats.puntos?.toLocaleString()} pts
                </span>
              )}
            </div>
          </div>

          <button
            onClick={(e) => {
              e.preventDefault()
              if (requireLogin('Para guardar parejas en favoritos debes iniciar sesión.')) {
                toggleEquipo(team)
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
