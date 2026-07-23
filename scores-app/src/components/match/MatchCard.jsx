import { Link } from 'react-router-dom'
import { Star } from 'lucide-react'
import LiveBadge from './LiveBadge'
import ScoreDisplay from './ScoreDisplay'
import useFavoritesStore from '../../store/useFavoritesStore'
import { formatTime } from '../../utils/formatDate'
import { cn } from '../../utils/cn'

export default function MatchCard({ match }) {
  const { togglePartido, isPartidoFavorite } = useFavoritesStore()
  const isFav = isPartidoFavorite(match.id)
  const isLive = match.estado === 'en_vivo'
  const isFinished = match.estado === 'finalizado'
  const winner = match.ganador
  const isPadel = match.deporte === 'padel'

  const p1Sets = match.sets?.map((s) => s.games_j1) ?? []
  const p2Sets = match.sets?.map((s) => s.games_j2) ?? []

  const p1Name = isPadel
    ? match.equipo1?.nombre
    : `${match.jugador1?.nombre || ''} ${match.jugador1?.apellido || ''}`.trim()
  const p2Name = isPadel
    ? match.equipo2?.nombre
    : `${match.jugador2?.nombre || ''} ${match.jugador2?.apellido || ''}`.trim()
  const p1Flag = isPadel ? null : match.jugador1?.flag
  const p2Flag = isPadel ? null : match.jugador2?.flag

  return (
    <Link to={`/match/${match.id}`}>
      <div className={cn('card-hover group', isLive && 'match-card-live')}>
        {/* Header */}
        <div
          className='flex items-center justify-between px-4 py-2'
          style={{ borderBottom: '1px solid var(--border-color)' }}
        >
          <div className='flex items-center gap-2 min-w-0'>
            <span
              className='text-xs font-semibold truncate'
              style={{ color: 'var(--text-secondary)' }}
            >
              {match.torneo?.nombre || 'Partido amistoso'}
            </span>
            {match.ronda && (
              <>
                <span style={{ color: 'var(--text-muted)' }}>·</span>
                <span className='text-xs truncate' style={{ color: 'var(--text-muted)' }}>
                  {match.ronda}
                </span>
              </>
            )}
            {match.categoria?.nombre && (
              <span className='badge-brand shrink-0'>{match.categoria.nombre}</span>
            )}
          </div>
          <div className='flex items-center gap-2 shrink-0 ml-2'>
            {isLive && <LiveBadge />}
            {isFinished && (
              <span className='text-[10px] font-medium' style={{ color: 'var(--text-muted)' }}>
                FIN
              </span>
            )}
            {!isLive && !isFinished && match.fecha_inicio && (
              <span className='text-[10px]' style={{ color: 'var(--text-muted)' }}>
                {formatTime(match.fecha_inicio)}
              </span>
            )}
            <button
              onClick={(e) => {
                e.preventDefault()
                togglePartido(match)
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
            flag={p1Flag}
            name={p1Name}
            sets={p1Sets}
            isWinner={winner === 'jugador1'}
            isLive={isLive}
          />
          <PlayerRow
            flag={p2Flag}
            name={p2Name}
            sets={p2Sets}
            isWinner={winner === 'jugador2'}
            isLive={isLive}
          />
        </div>

        {/* Cancha */}
        {match.cancha?.nombre && (
          <div className='px-4 pb-2'>
            <span className='text-[10px]' style={{ color: 'var(--text-muted)' }}>
              {match.cancha.nombre}
              {match.cancha.sede && ` — ${match.cancha.sede}`}
            </span>
          </div>
        )}
      </div>
    </Link>
  )
}

function PlayerRow({ flag, name, sets, isWinner, isLive }) {
  return (
    <div className='flex items-center gap-2'>
      {flag && <span className='text-base leading-none'>{flag}</span>}
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
    </div>
  )
}
