import { Link, useParams, useSearchParams } from 'react-router-dom'
import { ArrowLeft, Star, Trophy } from 'lucide-react'
import { usePlayer } from '../hooks/usePlayers'
import useFavoritesStore from '../store/useFavoritesStore'
import { cn } from '../utils/cn'
import { useLoginRequired } from '../hooks/useLoginRequired'

export default function Player() {
  const { id } = useParams()
  const [searchParams, setSearchParams] = useSearchParams()
  const { player, loading } = usePlayer(id)
  const { toggleJugador, isJugadorFavorite } = useFavoritesStore()
  const requireLogin = useLoginRequired()

  if (loading) return <div className='skeleton h-48 w-full rounded-xl' />
  if (!player) {
    return (
      <p className='text-center py-16 text-sm' style={{ color: 'var(--text-muted)' }}>
        Jugador no encontrado
      </p>
    )
  }

  const statsByCategory = player.estadisticas || []
  const requestedCategoryId = searchParams.get('categoria_id')
  const selectedStats =
    statsByCategory.find((stats) => String(stats.categoria.id) === requestedCategoryId) ||
    statsByCategory[0] ||
    null
  const isFav = isJugadorFavorite(player.id)
  const initials = `${player.nombre?.[0] || ''}${player.apellido?.[0] || ''}`.toUpperCase()

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
          type='button'
          onClick={() => {
            if (requireLogin('Para guardar jugadores en favoritos debes iniciar sesión.')) {
              toggleJugador(player)
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
        <div className='flex items-center gap-4'>
          <div
            className='w-16 h-16 rounded-2xl border flex items-center justify-center text-lg font-bold shrink-0'
            style={{
              backgroundColor: 'var(--bg-hover)',
              borderColor: 'var(--border-color)',
              color: 'var(--color-brand)',
            }}
          >
            {initials || 'JG'}
          </div>
          <div className='flex-1 min-w-0'>
            <p
              className='text-xs font-semibold uppercase tracking-wider mb-1'
              style={{ color: 'var(--color-brand)' }}
            >
              Estadísticas del jugador
            </p>
            <h1 className='text-xl font-bold' style={{ color: 'var(--text-primary)' }}>
              {player.nombre} {player.apellido}
            </h1>
            <span className='badge-atp mt-2 inline-block'>{player.deporte}</span>
          </div>
        </div>
      </div>

      {statsByCategory.length > 0 ? (
        <>
          <div className='card p-4'>
            <label className='form-label' htmlFor='player-category'>
              Categoría
            </label>
            <select
              id='player-category'
              className='form-input'
              value={String(selectedStats.categoria.id)}
              onChange={(event) =>
                setSearchParams({ categoria_id: event.target.value }, { replace: true })
              }
            >
              {statsByCategory.map((stats) => (
                <option key={stats.categoria.id} value={stats.categoria.id}>
                  {stats.categoria.nombre}
                </option>
              ))}
            </select>
            <p className='text-xs mt-2' style={{ color: 'var(--text-muted)' }}>
              Puntos de clasificación: 3 para el ganador y 0 para el perdedor si no cede sets; 2 y
              1, respectivamente, si el perdedor gana al menos un set.
            </p>
          </div>

          <div className='grid grid-cols-2 sm:grid-cols-4 gap-3'>
            <StatCard label='Ranking' value={`#${selectedStats.ranking}`} accent />
            <StatCard label='Puntos' value={selectedStats.puntos} accent />
            <StatCard label='Partidos' value={selectedStats.partidos_jugados} />
            <StatCard
              label='Balance'
              value={`${selectedStats.victorias}V / ${selectedStats.derrotas}D`}
            />
            <StatCard
              label='Sets'
              value={`${selectedStats.sets_ganados}–${selectedStats.sets_perdidos}`}
            />
            <StatCard
              label='Games'
              value={`${selectedStats.games_ganados}–${selectedStats.games_perdidos}`}
            />
            <StatCard label='% de sets' value={formatPercentage(selectedStats.porcentaje_sets)} />
            <StatCard label='% de games' value={formatPercentage(selectedStats.porcentaje_games)} />
          </div>
        </>
      ) : (
        <div className='card p-10 text-center'>
          <Trophy className='w-10 h-10 mx-auto mb-3' style={{ color: 'var(--text-muted)' }} />
          <p className='text-sm font-semibold' style={{ color: 'var(--text-primary)' }}>
            Sin estadísticas todavía
          </p>
          <p className='text-xs mt-1' style={{ color: 'var(--text-muted)' }}>
            Se mostrarán cuando el jugador tenga partidos finalizados.
          </p>
        </div>
      )}
    </div>
  )
}

function StatCard({ label, value, accent = false }) {
  return (
    <div className='card p-4'>
      <p className='text-xs mb-1' style={{ color: 'var(--text-muted)' }}>
        {label}
      </p>
      <p
        className='text-lg font-bold'
        style={{ color: accent ? 'var(--color-brand)' : 'var(--text-primary)' }}
      >
        {value}
      </p>
    </div>
  )
}

function formatPercentage(value) {
  return `${Math.round((Number(value) || 0) * 100)}%`
}
