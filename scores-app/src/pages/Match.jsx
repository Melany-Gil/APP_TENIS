import { useParams, Link } from 'react-router-dom'
import { ArrowLeft, Star, Clock, MapPin } from 'lucide-react'
import { useState } from 'react'
import LiveBadge from '../components/match/LiveBadge'
import Tabs from '../components/ui/Tabs'
import { MatchCardSkeleton } from '../components/ui/Skeleton'
import useFavoritesStore from '../store/useFavoritesStore'
import { useMatch } from '../hooks/useMatches'
import { formatTime } from '../utils/formatDate'
import { cn } from '../utils/cn'
import { useLoginRequired } from '../hooks/useLoginRequired'

const TABS = [
  { value: 'summary', label: 'Resumen' },
  { value: 'stats', label: 'Estadísticas' },
  { value: 'h2h', label: 'H2H' },
]

export default function Match() {
  const { id } = useParams()
  const { match, loading } = useMatch(id)
  const [tab, setTab] = useState('summary')
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
  const statusLabel = match.estado === 'finalizado' ? 'FIN' : 'PROGRAMADO'
  const winner = match.ganador
  const isPadel = match.deporte === 'padel'
  const isFav = isPartidoFavorite(match.id)

  const p1 = isPadel
    ? { name: match.equipo1?.nombre, flag: null }
    : {
        name: `${match.jugador1?.nombre || ''} ${match.jugador1?.apellido || ''}`.trim(),
        flag: match.jugador1?.flag,
        ranking: match.jugador1?.ranking,
      }
  const p2 = isPadel
    ? { name: match.equipo2?.nombre, flag: null }
    : {
        name: `${match.jugador2?.nombre || ''} ${match.jugador2?.apellido || ''}`.trim(),
        flag: match.jugador2?.flag,
        ranking: match.jugador2?.ranking,
      }

  const p1Scores = match.sets?.map((set) => set.games_j1) ?? []
  const p2Scores = match.sets?.map((set) => set.games_j2) ?? []
  const p1Sets = Array.from({ length: 3 }, (_, index) => p1Scores[index] ?? '/')
  const p2Sets = Array.from({ length: 3 }, (_, index) => p2Scores[index] ?? '/')

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
          <span>{match.torneo?.nombre || 'Partido amistoso'}</span>
          {match.categoria?.nombre && <span className='badge-brand'>{match.categoria.nombre}</span>}
          {match.ronda && (
            <>
              <span>·</span>
              <span>{match.ronda}</span>
            </>
          )}
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
          {match.cancha?.nombre && (
            <span className='flex items-center gap-1'>
              <MapPin className='w-3 h-3' />
              {match.cancha.nombre}
            </span>
          )}
          {match.cancha?.sede && <span>{match.cancha.sede}</span>}
          {match.duracion_min && (
            <span className='flex items-center gap-1'>
              <Clock className='w-3 h-3' />
              {match.duracion_min} min
            </span>
          )}
          {match.fecha_inicio && <span>{formatTime(match.fecha_inicio)}</span>}
        </div>
      </div>

      <Tabs tabs={TABS} activeTab={tab} onChange={setTab} />

      {tab === 'summary' && match.sets?.length > 0 && (
        <div className='card p-4 overflow-x-auto'>
          <table className='w-full text-sm'>
            <thead>
              <tr
                style={{
                  borderBottom: '1px solid var(--border-color)',
                  color: 'var(--text-muted)',
                }}
              >
                <th className='text-left py-2 font-medium'>Jugador</th>
                {[1, 2, 3].map((setNumber) => (
                  <th key={setNumber} className='text-center py-2 font-medium'>
                    Set {setNumber}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[
                { player: p1, sets: p1Sets, w: winner === 'jugador1' },
                { player: p2, sets: p2Sets, w: winner === 'jugador2' },
              ].map((row, i) => (
                <tr
                  key={i}
                  style={{ borderBottom: i === 0 ? '1px solid var(--border-color)' : 'none' }}
                >
                  <td className='py-3 flex items-center gap-2'>
                    {row.player.flag && <span>{row.player.flag}</span>}
                    <span
                      style={{
                        color: row.w ? 'var(--text-primary)' : 'var(--text-secondary)',
                        fontWeight: row.w ? 600 : 400,
                      }}
                    >
                      {row.player.name}
                    </span>
                  </td>
                  {row.sets.map((s, j) => (
                    <td
                      key={j}
                      className='text-center py-3 score-number'
                      style={{ color: row.w ? 'var(--text-primary)' : 'var(--text-secondary)' }}
                    >
                      {s}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {(tab === 'stats' || tab === 'h2h') && (
        <div className='card p-6 text-center text-sm' style={{ color: 'var(--text-muted)' }}>
          Disponible próximamente
        </div>
      )}
    </div>
  )
}

function ScoreRow({ player, sets, isWinner, isLive }) {
  return (
    <div className='flex items-center gap-3'>
      <div className='flex items-center gap-2 flex-1 min-w-0'>
        {player.flag && <span className='text-2xl'>{player.flag}</span>}
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
      <div className='flex items-center gap-3 shrink-0'>
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
