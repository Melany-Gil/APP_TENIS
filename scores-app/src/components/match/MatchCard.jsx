import { Link } from 'react-router-dom'
import { Clock3, MapPin, Star } from 'lucide-react'
import LiveBadge from './LiveBadge'
import ScoreDisplay from './ScoreDisplay'
import useFavoritesStore from '../../store/useFavoritesStore'
import { formatClockTime, formatDate } from '../../utils/formatDate'
import { cn } from '../../utils/cn'
import { useLoginRequired } from '../../hooks/useLoginRequired'
import { getParticipantName } from '../../utils/matchParticipants'
import { useMatchTimer } from '../../hooks/useMatchTimer'

export default function MatchCard({ match }) {
  const { togglePartido, isPartidoFavorite } = useFavoritesStore()
  const requireLogin = useLoginRequired()
  const isFav = isPartidoFavorite(match.id)
  const isLive = match.estado === 'en_vivo'
  const isFinished = match.estado === 'finalizado'
  const winner = match.ganador
  const timer = useMatchTimer(match.en_vivo, match.estado)

  const p1Sets = match.sets?.map((s) => s.games_j1) ?? []
  const p2Sets = match.sets?.map((s) => s.games_j2) ?? []

  const p1Name = getParticipantName(match, 1)
  const p2Name = getParticipantName(match, 2)
  return (
    <Link to={`/match/${match.id}`}>
      <div className={cn('card-hover group', isLive && 'match-card-live')}>
        {/* Header */}
        <div
          className='flex items-center justify-between px-4 py-2'
          style={{ borderBottom: '1px solid var(--border-color)' }}
        >
          <div className='flex items-center gap-2 min-w-0'>
            <span className='badge-brand shrink-0'>
              {match.categoria?.nombre || 'Sin categoría'}
            </span>
          </div>
          <div className='flex items-center gap-2 shrink-0 ml-2'>
            {isLive && (
              <span className='flex items-center gap-1.5'>
                <LiveBadge />
                {match.en_vivo?.iniciado_at && (
                  <span className='flex items-center gap-1 text-[10px] tabular-nums' style={{ color: 'var(--text-muted)' }}>
                    <Clock3 className='h-3 w-3' /> {timer.formatted}
                  </span>
                )}
              </span>
            )}
            {isFinished && (
              <span className='text-[10px] font-medium' style={{ color: 'var(--text-muted)' }}>
                FIN
              </span>
            )}
            {!isLive && !isFinished && (match.fecha_inicio || match.hora_inicio) && (
              <span className='text-[10px]' style={{ color: 'var(--text-muted)' }}>
                {[
                  match.fecha_inicio && formatDate(match.fecha_inicio),
                  formatClockTime(match.hora_inicio),
                ]
                  .filter(Boolean)
                  .join(' · ')}
              </span>
            )}
            <button
              onClick={(e) => {
                e.preventDefault()
                if (requireLogin('Para guardar partidos en favoritos debes iniciar sesión.')) {
                  togglePartido(match)
                }
              }}
              className='p-1 transition-colors'
              style={{ color: isFav ? '#facc15' : 'var(--text-muted)' }}
            >
              <Star className={cn('w-3 h-3', isFav && 'fill-current')} />
            </button>
          </div>
        </div>

        {/* Jugadores + Scores */}
        <div className='px-4 py-3 space-y-2.5'>
          <PlayerRow
            name={p1Name}
            sets={p1Sets}
            points={match.marcador_actual?.displayPoints?.[0]}
            isServing={match.marcador_actual?.server === 'jugador1'}
            isWinner={winner === 'jugador1'}
            isLive={isLive}
          />
          <PlayerRow
            name={p2Name}
            sets={p2Sets}
            points={match.marcador_actual?.displayPoints?.[1]}
            isServing={match.marcador_actual?.server === 'jugador2'}
            isWinner={winner === 'jugador2'}
            isLive={isLive}
          />
        </div>

        {match.cancha && (
          <div className='px-4 py-2 text-[11px] flex items-center gap-1.5' style={{ color: 'var(--text-muted)', borderTop: '1px solid var(--border-color)' }}>
            <MapPin className='w-3 h-3' /> {match.cancha.nombre}
            {match.cancha.superficie ? ` · ${match.cancha.superficie}` : ''}
          </div>
        )}

        {match.notas && (
          <div
            className='px-4 py-2 text-xs line-clamp-2'
            style={{
              color: 'var(--text-secondary)',
              borderTop: '1px solid var(--border-color)',
              backgroundColor: 'var(--bg-hover)',
            }}
          >
            <span className='font-semibold'>Observación:</span> {match.notas}
          </div>
        )}
      </div>
    </Link>
  )
}

function PlayerRow({ name, sets, points, isServing, isWinner, isLive }) {
  return (
    <div className='flex items-center gap-2'>
      {isServing && isLive && (
        <span className='w-2 h-2 rounded-full shrink-0' style={{ backgroundColor: 'var(--club-clay)' }} />
      )}
      <span
        className={cn('flex-1 text-sm truncate')}
        style={{
          color: isWinner ? 'var(--text-primary)' : 'var(--text-secondary)',
          fontWeight: isWinner ? 600 : 400,
        }}
      >
        {name || '—'}
      </span>
      <ScoreDisplay sets={sets} isWinner={isWinner} isLive={isLive} />
      {isLive && points != null && (
        <strong
          className='min-w-9 text-center rounded-md py-1 text-sm'
          style={{ backgroundColor: 'var(--bg-hover)', color: 'var(--text-primary)' }}
        >
          {points}
        </strong>
      )}
    </div>
  )
}
