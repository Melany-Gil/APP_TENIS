import { useParams, Link } from 'react-router-dom'
import { ArrowLeft, Star, CalendarDays, MessageSquareText } from 'lucide-react'
import LiveBadge from '../components/match/LiveBadge'
import { MatchCardSkeleton } from '../components/ui/Skeleton'
import useFavoritesStore from '../store/useFavoritesStore'
import { useMatch } from '../hooks/useMatches'
import { formatClockTime, formatDate } from '../utils/formatDate'
import { cn } from '../utils/cn'
import { useLoginRequired } from '../hooks/useLoginRequired'

export default function Match() {
  const { id } = useParams()
  const { match, loading } = useMatch(id)
  const { togglePartido, isPartidoFavorite } = useFavoritesStore()
  const requireLogin = useLoginRequired()

  if (loading)
    return (
      <div className='space-y-4'>
        <MatchCardSkeleton />
        <MatchCardSkeleton />
      </div>
    )
  if (!match)
    return (
      <p className='text-center py-16 text-sm' style={{ color: 'var(--text-muted)' }}>
        Partido no encontrado
      </p>
    )

  const isLive = match.estado === 'en_vivo'
  const statusLabel =
    {
      programado: 'PROGRAMADO',
      finalizado: 'FIN',
      cancelado: 'CANCELADO',
    }[match.estado] || match.estado
  const winner = match.ganador
  const isPadel = match.deporte === 'padel'
  const isFav = isPartidoFavorite(match.id)

  const p1 = isPadel
    ? { name: match.equipo1?.nombre }
    : {
        name: `${match.jugador1?.nombre || ''} ${match.jugador1?.apellido || ''}`.trim(),
        ranking: match.jugador1?.ranking,
      }
  const p2 = isPadel
    ? { name: match.equipo2?.nombre }
    : {
        name: `${match.jugador2?.nombre || ''} ${match.jugador2?.apellido || ''}`.trim(),
        ranking: match.jugador2?.ranking,
      }

  const p1Scores = match.sets?.map((set) => set.games_j1) ?? []
  const p2Scores = match.sets?.map((set) => set.games_j2) ?? []
  const setCount = Math.max(3, p1Scores.length, p2Scores.length)
  const p1Sets = Array.from({ length: setCount }, (_, index) => p1Scores[index] ?? '/')
  const p2Sets = Array.from({ length: setCount }, (_, index) => p2Scores[index] ?? '/')

  return (
    <div className='space-y-5 animate-fade-up'>
      <div className='flex items-center justify-between'>
        <Link
          to='/'
          className='flex items-center gap-2 text-sm transition-colors'
          style={{ color: 'var(--text-secondary)' }}
        >
          <ArrowLeft className='w-4 h-4' /> Volver
        </Link>
        <button
          onClick={() => {
            if (requireLogin('Para guardar partidos en favoritos debes iniciar sesión.')) {
              togglePartido(match)
            }
          }}
          className={cn(
            'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-all btn-ghost'
          )}
          style={{ color: isFav ? '#facc15' : 'var(--text-muted)' }}
        >
          <Star className={cn('w-4 h-4', isFav && 'fill-current')} />
          {isFav ? 'Guardado' : 'Guardar'}
        </button>
      </div>

      {/* Scoreboard */}
      <div className='card p-5'>
        <div
          className='flex items-center justify-center gap-2 mb-5 text-sm'
          style={{ color: 'var(--text-muted)' }}
        >
          {match.categoria?.nombre && <span className='badge-brand'>{match.categoria.nombre}</span>}
        </div>

        <div className='space-y-4'>
          <ScoreRow player={p1} sets={p1Sets} isWinner={winner === 'jugador1'} isLive={isLive} />
          <div className='flex items-center gap-3'>
            <div className='flex-1 h-px' style={{ backgroundColor: 'var(--border-color)' }} />
            {isLive ? (
              <LiveBadge />
            ) : (
              <span className='text-xs px-2' style={{ color: 'var(--text-muted)' }}>
                {statusLabel}
              </span>
            )}
            <div className='flex-1 h-px' style={{ backgroundColor: 'var(--border-color)' }} />
          </div>
          <ScoreRow player={p2} sets={p2Sets} isWinner={winner === 'jugador2'} isLive={isLive} />
        </div>

        <div
          className='flex items-center justify-center gap-4 mt-5 text-xs'
          style={{ color: 'var(--text-muted)' }}
        >
          {(match.fecha_inicio || match.hora_inicio) && (
            <span className='flex items-center gap-1'>
              <CalendarDays className='w-3 h-3' />
              {[
                match.fecha_inicio && formatDate(match.fecha_inicio),
                formatClockTime(match.hora_inicio),
              ]
                .filter(Boolean)
                .join(' · ')}
            </span>
          )}
        </div>
      </div>

      {match.notas && (
        <div
          className='card p-4 flex items-start gap-3'
          style={{ borderColor: 'var(--club-clay)' }}
        >
          <MessageSquareText
            className='w-4 h-4 mt-0.5 shrink-0'
            style={{ color: 'var(--club-clay)' }}
          />
          <div>
            <p className='text-xs font-semibold mb-1' style={{ color: 'var(--text-primary)' }}>
              Observación del partido
            </p>
            <p className='text-sm leading-relaxed' style={{ color: 'var(--text-secondary)' }}>
              {match.notas}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

function ScoreRow({ player, sets, isWinner, isLive }) {
  return (
    <div className='flex items-center gap-3'>
      <div className='flex items-center gap-2 flex-1 min-w-0'>
        <div>
          <p
            className='font-semibold'
            style={{ color: isWinner ? 'var(--text-primary)' : 'var(--text-secondary)' }}
          >
            {player.name || '—'}
          </p>
          {player.ranking && (
            <p className='text-xs' style={{ color: 'var(--text-muted)' }}>
              Ranking #{player.ranking}
            </p>
          )}
        </div>
      </div>
      <div className='flex items-center gap-3 max-w-[55%] overflow-x-auto pb-1'>
        {sets.map((s, i) => (
          <span
            key={i}
            className='score-number text-2xl min-w-[1.75rem] text-center'
            style={{ color: isWinner ? 'var(--text-primary)' : 'var(--text-secondary)' }}
          >
            {s}
          </span>
        ))}
      </div>
    </div>
  )
}
