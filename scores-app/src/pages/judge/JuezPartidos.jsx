import { useEffect, useState, useCallback } from 'react'
import { Play, Pause, Undo2, Flag, RefreshCw, MapPin, Timer, Circle, BarChart3, Zap, ClipboardList } from 'lucide-react'
import { matchService } from '../../services/matchService'
import { getParticipantName } from '../../utils/matchParticipants'
import Button from '../../components/ui/Button'
import MatchStats from '../../components/match/MatchStats'
import useUIStore from '../../store/useUIStore'
import { useMatchTimer } from '../../hooks/useMatchTimer'
import { useMatchRealtime } from '../../hooks/useMatchRealtime'
import { cn } from '../../utils/cn'

export default function JuezPartidos() {
  const [matches, setMatches] = useState([])
  const [selected, setSelected] = useState(null)
  const [state, setState] = useState(null)
  const [loading, setLoading] = useState(false)
  const [quickMode, setQuickMode] = useState(true)
  const [pendingPoint, setPendingPoint] = useState(null) // { ganador: 'jugador1'|'jugador2' }
  const [showStats, setShowStats] = useState(false)
  const { addToast } = useUIStore()

  const refreshMatches = useCallback(async () => {
    try {
      const res = await matchService.getAssignments()
      setMatches(res.data || [])
    } catch {
      addToast({ type: 'error', title: 'No se pudieron cargar tus partidos' })
    }
  }, [addToast])

  const loadState = async (match) => {
    setSelected(match)
    setLoading(true)
    setShowStats(false)
    setPendingPoint(null)
    try {
      const res = await matchService.getLiveState(match.id)
      setState(res.data)
    } catch (err) {
      addToast({ type: 'error', title: 'Error', message: err.message })
    } finally {
      setLoading(false)
    }
  }

  const action = useCallback(async (operation) => {
    if (!selected) return
    setLoading(true)
    try {
      const res = await operation()
      setState(res.data)
      await refreshMatches()
    } catch (err) {
      addToast({ type: 'error', title: 'No se pudo actualizar', message: err.message })
    } finally {
      setLoading(false)
    }
  }, [addToast, refreshMatches, selected])

  const handlePointClick = (ganador) => {
    if (quickMode) {
      // Modo rápido: registra directamente sin metadata
      action(() => matchService.recordPoint(selected.id, ganador))
    } else {
      // Modo detallado: abre panel de metadata
      setPendingPoint({ ganador })
    }
  }

  const confirmPoint = (metadata = {}) => {
    if (!pendingPoint) return
    action(() =>
      matchService.recordPoint(selected.id, pendingPoint.ganador, {
        ...metadata,
      }, score?.numero_servicio)
    )
    setPendingPoint(null)
  }

  useEffect(() => {
    refreshMatches()
  }, [refreshMatches])

  useMatchRealtime(useCallback((event) => {
    refreshMatches()
    if (selected && (event.matchId === null || Number(event.matchId) === Number(selected.id))) {
      matchService.getLiveState(selected.id).then((response) => setState(response.data)).catch(() => {})
    }
  }, [refreshMatches, selected]))

  const p1 = selected && getParticipantName(selected, 1)
  const p2 = selected && getParticipantName(selected, 2)
  const score = state?.marcador
  const liveData = state?.en_vivo
  const timerInput = liveData
    ? { ...liveData, estado: liveData.estado === 'en_vivo' && !score?.terminado ? 'en_vivo' : (score?.terminado ? 'finalizado' : liveData.estado) }
    : null
  const { formatted: timerFormatted, isPaused: timerPaused, isStopped: timerStopped } = useMatchTimer(timerInput)

  const isLive = liveData?.estado === 'en_vivo'
  const isPaused = Boolean(liveData?.pausado_at)
  const isFinished = score?.terminado

  return (
    <div className='max-w-5xl mx-auto p-4 sm:p-8 space-y-5'>
      {/* Header */}
      <div className='flex justify-between items-center'>
        <div>
          <h1 className='text-2xl font-bold'>Mesa del juez</h1>
          <p className='text-sm' style={{ color: 'var(--text-muted)' }}>
            Cada punto queda registrado y se puede deshacer.
          </p>
        </div>
        <Button
          variant='secondary'
          onClick={refreshMatches}
          leftIcon={<RefreshCw className='w-4 h-4' />}
        >
          Actualizar
        </Button>
      </div>

      <div className='grid lg:grid-cols-[280px_1fr] gap-5'>
        {/* Match list sidebar */}
        <div className='card overflow-hidden'>
          {matches.length ? (
            matches.map((match) => (
              <button
                key={match.id}
                onClick={() => loadState(match)}
                className={cn(
                  'w-full text-left p-4 border-b last:border-0 transition-colors',
                  selected?.id === match.id
                    ? 'bg-[var(--bg-hover)]'
                    : 'hover:bg-[var(--bg-hover)]'
                )}
              >
                <p className='font-semibold text-sm'>
                  {getParticipantName(match, 1) || 'Por definir'} vs{' '}
                  {getParticipantName(match, 2) || 'Por definir'}
                </p>
                <p className='text-xs mt-1' style={{ color: 'var(--text-muted)' }}>
                  {match.torneo?.nombre || 'Partido libre'} · {{ en_vivo: 'En vivo', finalizado: 'Finalizado', programado: 'Programado', cancelado: 'Cancelado' }[match.estado] || match.estado}
                  {match.cancha && (
                    <span className='inline-flex items-center gap-0.5 ml-1'>
                      <MapPin className='w-3 h-3 inline' />
                      {match.cancha.nombre}
                    </span>
                  )}
                </p>
              </button>
            ))
          ) : (
            <p className='p-6 text-sm text-center'>No tienes partidos asignados.</p>
          )}
        </div>

        {/* Scoring panel */}
        <div className='card p-5 min-h-[320px]'>
          {selected && state ? (
            <>
              {/* Match header */}
              <div className='flex justify-between items-start gap-3 mb-2'>
                <div>
                  <h2 className='font-bold text-lg'>{p1} vs {p2}</h2>
                  <p className='text-xs' style={{ color: 'var(--text-muted)' }}>
                    Al mejor de {state.reglas.mejor_de} · sets a {state.reglas.juegos_por_set}
                    {selected.cancha && ` · ${selected.cancha.nombre}`}
                  </p>
                </div>
                <div className='flex items-center gap-2'>
                  {liveData?.iniciado_at && (
                    <div
                      className={cn(
                        'flex items-center gap-1 text-xs px-2.5 py-1 rounded-full font-mono font-semibold',
                        timerStopped ? 'bg-gray-500/10 text-gray-500'
                        : timerPaused ? 'bg-amber-500/10 text-amber-500'
                        : 'bg-[var(--color-live)]/10 text-[var(--color-live)]'
                      )}
                    >
                      <Timer className='w-3.5 h-3.5' />
                      {timerFormatted}
                    </div>
                  )}
                  <span
                    className={cn(
                      'text-xs px-2.5 py-1 rounded-full font-semibold',
                      isFinished ? 'bg-gray-500/10 text-gray-500'
                      : isLive && !isPaused ? 'bg-[var(--color-live)]/10 text-[var(--color-live)]'
                      : isPaused ? 'bg-amber-500/10 text-amber-500'
                      : 'bg-blue-500/10 text-blue-500'
                    )}
                  >
                    {isFinished ? 'Finalizado' : isPaused ? 'Pausado' : isLive ? 'En vivo' : 'Programado'}
                  </span>
                </div>
              </div>

              {/* Scoreboard */}
              <div className='rounded-xl overflow-hidden mt-4' style={{ border: '1px solid var(--border-color)' }}>
                <div
                  className='grid items-center text-xs font-semibold uppercase tracking-wider py-2 px-4'
                  style={{
                    gridTemplateColumns: `1fr repeat(${Math.max(score.sets.length + (isFinished ? 0 : 1), 3)}, 48px) 56px`,
                    backgroundColor: 'var(--bg-hover)',
                    color: 'var(--text-muted)',
                  }}
                >
                  <span>Jugador</span>
                  {Array.from({ length: Math.max(score.sets.length + (isFinished ? 0 : 1), 3) }, (_, i) => (
                    <span key={i} className='text-center'>S{i + 1}</span>
                  ))}
                  <span className='text-center'>Pts</span>
                </div>
                <PlayerRow name={p1} score={score} playerKey='j1' pointKey='punto_j1'
                  isWinner={score.ganador === 'jugador1'} isServing={liveData?.saca === 'jugador1'}
                  isFinished={isFinished} totalSetsToShow={Math.max(score.sets.length + (isFinished ? 0 : 1), 3)} />
                <div className='h-px' style={{ backgroundColor: 'var(--border-color)' }} />
                <PlayerRow name={p2} score={score} playerKey='j2' pointKey='punto_j2'
                  isWinner={score.ganador === 'jugador2'} isServing={liveData?.saca === 'jugador2'}
                  isFinished={isFinished} totalSetsToShow={Math.max(score.sets.length + (isFinished ? 0 : 1), 3)} />
              </div>

              {/* Status badges */}
              <div className='flex justify-center gap-4 mt-3 text-xs' style={{ color: 'var(--text-muted)' }}>
                {score.deuce && <span className='font-semibold' style={{ color: 'var(--club-clay)' }}>DEUCE</span>}
                {score.currentSet.tiebreak && !isFinished && <span className='font-semibold' style={{ color: 'var(--club-clay)' }}>TIE-BREAK</span>}
                {isFinished && score.ganador && (
                  <span className='font-semibold' style={{ color: 'var(--color-live)' }}>
                    🏆 Ganador: {score.ganador === 'jugador1' ? p1 : p2}
                  </span>
                )}
              </div>

              {/* Mode toggle + Stats button */}
              {isLive && !isFinished && (
                <div className='rounded-xl p-3 mt-5 mb-3' style={{ backgroundColor: 'var(--bg-hover)', border: '1px solid var(--border-color)' }}>
                <div className='flex items-center justify-between'>
                  <div className='flex items-center gap-3'>
                    <button
                      onClick={() => { setQuickMode(!quickMode); setPendingPoint(null) }}
                      className='relative w-14 h-7 rounded-full transition-colors'
                      style={{ backgroundColor: quickMode ? 'var(--color-live)' : '#6366f1' }}
                    >
                      <span
                        className='absolute top-0.5 w-6 h-6 rounded-full bg-white shadow transition-transform'
                        style={{ left: quickMode ? '2px' : 'calc(100% - 26px)' }}
                      />
                    </button>
                    <div>
                      <span className='text-sm font-semibold flex items-center gap-1.5' style={{ color: quickMode ? 'var(--color-live)' : '#6366f1' }}>
                        {quickMode ? <><Zap className='w-4 h-4' /> Modo rápido</> : <><ClipboardList className='w-4 h-4' /> Modo detallado</>}
                      </span>
                      <p className='text-xs mt-0.5' style={{ color: 'var(--text-muted)' }}>
                        {quickMode
                          ? '1 click = punto registrado. Sin detalles de saque ni golpe.'
                          : 'Cada punto abre un panel para marcar tipo de saque, ace, winner, etc.'}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowStats(!showStats)}
                    className='flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors shrink-0'
                    style={{
                      backgroundColor: showStats ? 'var(--bg-primary)' : 'transparent',
                      color: 'var(--text-muted)',
                      border: '1px solid var(--border-color)',
                    }}
                  >
                    <BarChart3 className='w-3.5 h-3.5' />
                    📊
                  </button>
                </div>
              </div>
              )}

              {/* Stats panel (visible also when finished) */}
              {isFinished && (
                <div className='flex justify-end mt-4 mb-3'>
                  <button
                    onClick={() => setShowStats(!showStats)}
                    className='flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors'
                    style={{
                      backgroundColor: showStats ? 'var(--bg-hover)' : 'transparent',
                      color: 'var(--text-muted)',
                      border: '1px solid var(--border-color)',
                    }}
                  >
                    <BarChart3 className='w-3.5 h-3.5' />
                    {showStats ? 'Ocultar estadísticas' : 'Ver estadísticas'}
                  </button>
                </div>
              )}

              {showStats && (
                <div className='card p-4 mt-3 mb-4' style={{ border: '1px solid var(--border-color)' }}>
                  <MatchStats matchId={selected.id} player1={p1} player2={p2} />
                </div>
              )}

              {/* Point detail panel */}
              {pendingPoint && !quickMode && (
                <PointDetailPanel
                  ganador={pendingPoint.ganador}
                  p1={p1}
                  p2={p2}
                  isServing={liveData?.saca === pendingPoint.ganador}
                  onConfirm={confirmPoint}
                  onCancel={() => setPendingPoint(null)}
                  loading={loading}
                />
              )}

              {/* Controls */}
              <div className='grid sm:grid-cols-2 gap-3 mt-4'>
                {!isLive && !isFinished && (
                  <Button
                    className='sm:col-span-2'
                    disabled={loading}
                    onClick={() => action(() => matchService.startLive(selected.id))}
                    leftIcon={<Play className='w-4 h-4' />}
                  >
                    Iniciar partido
                  </Button>
                )}

                {isLive && !isFinished && (
                  <Button
                    variant={isPaused ? 'primary' : 'secondary'}
                    disabled={loading}
                    onClick={() => action(() => matchService.pauseLive(selected.id, !isPaused))}
                    leftIcon={isPaused ? <Play className='w-4 h-4' /> : <Pause className='w-4 h-4' />}
                  >
                    {isPaused ? 'Reanudar' : 'Pausar'}
                  </Button>
                )}

                {isLive && !isFinished && (
                  <Button
                    variant='secondary'
                    disabled={loading}
                    onClick={() =>
                      action(() =>
                        matchService.setServer(selected.id, liveData.saca === 'jugador1' ? 'jugador2' : 'jugador1')
                      )
                    }
                  >
                    Cambiar saque → {liveData?.saca === 'jugador1' ? p2 : p1}
                  </Button>
                )}

                {isLive && !isPaused && !isFinished && !pendingPoint && (
                  <>
                    <button
                      disabled={loading}
                      onClick={() => handlePointClick('jugador1')}
                      className='rounded-xl p-4 text-center font-bold text-lg transition-all active:scale-95 disabled:opacity-50'
                      style={{
                        backgroundColor: 'var(--bg-hover)',
                        border: quickMode ? '2px solid var(--border-color)' : '2px solid #6366f1',
                        color: 'var(--text-primary)',
                      }}
                    >
                      <span className='text-sm font-normal block' style={{ color: 'var(--text-muted)' }}>
                        {liveData?.saca === 'jugador1' && '🟢 Sacando · '}Punto para
                      </span>
                      {p1}
                      {!quickMode && (
                        <span className='text-xs font-normal block mt-1' style={{ color: '#6366f1' }}>
                          📋 Toca para agregar detalle
                        </span>
                      )}
                    </button>
                    <button
                      disabled={loading}
                      onClick={() => handlePointClick('jugador2')}
                      className='rounded-xl p-4 text-center font-bold text-lg transition-all active:scale-95 disabled:opacity-50'
                      style={{
                        backgroundColor: 'var(--bg-hover)',
                        border: quickMode ? '2px solid var(--border-color)' : '2px solid #6366f1',
                        color: 'var(--text-primary)',
                      }}
                    >
                      <span className='text-sm font-normal block' style={{ color: 'var(--text-muted)' }}>
                        {liveData?.saca === 'jugador2' && '🟢 Sacando · '}Punto para
                      </span>
                      {p2}
                      {!quickMode && (
                        <span className='text-xs font-normal block mt-1' style={{ color: '#6366f1' }}>
                          📋 Toca para agregar detalle
                        </span>
                      )}
                    </button>
                  </>
                )}

                {isLive && !isFinished && (
                  <Button
                    variant='secondary'
                    disabled={loading}
                    onClick={() => action(() => matchService.undoPoint(selected.id))}
                    leftIcon={<Undo2 className='w-4 h-4' />}
                  >
                    Deshacer último punto
                  </Button>
                )}

                {isFinished && liveData?.estado !== 'finalizado' && (
                  <Button
                    className='sm:col-span-2'
                    disabled={loading}
                    onClick={() => action(() => matchService.finishLive(selected.id))}
                    leftIcon={<Flag className='w-4 h-4' />}
                  >
                    Finalizar partido
                  </Button>
                )}
              </div>
            </>
          ) : (
            <p className='text-center py-20 text-sm' style={{ color: 'var(--text-muted)' }}>
              Selecciona un partido para operar el marcador.
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

/* ── Point Detail Panel ── */
function PointDetailPanel({ ganador, p1, p2, isServing, onConfirm, onCancel, loading }) {
  const [tipoSaque, setTipoSaque] = useState(null)
  const [resultado, setResultado] = useState(null)
  const playerName = ganador === 'jugador1' ? p1 : p2

  const serveOptions = isServing
    ? [
        { value: 'primer_saque', label: '1er saque', icon: '1️⃣' },
        { value: 'segundo_saque', label: '2do saque', icon: '2️⃣' },
      ]
    : []

  const resultOptions = isServing
    ? [
        { value: 'ace', label: 'Ace', icon: '🔥', desc: 'Saque directo' },
        { value: 'winner', label: 'Winner', icon: '💥', desc: 'Tiro ganador' },
        { value: null, label: 'Normal', icon: '✓', desc: 'Punto regular' },
      ]
    : [
        { value: 'winner', label: 'Winner', icon: '💥', desc: 'Tiro ganador' },
        { value: 'error_no_forzado', label: 'Error rival', icon: '❌', desc: 'Error no forzado del rival' },
        { value: 'doble_falta', label: 'Doble falta', icon: '🚫', desc: 'Doble falta del sacador' },
        { value: null, label: 'Normal', icon: '✓', desc: 'Punto regular' },
      ]

  return (
    <div
      className='rounded-xl p-4 mt-4 space-y-4 animate-fade-up'
      style={{ backgroundColor: 'var(--bg-hover)', border: '1px solid var(--border-color)' }}
    >
      <div className='flex justify-between items-center'>
        <h3 className='font-semibold text-sm'>
          Punto para <span style={{ color: 'var(--color-live)' }}>{playerName}</span>
        </h3>
        <button onClick={onCancel} className='text-xs' style={{ color: 'var(--text-muted)' }}>Cancelar</button>
      </div>

      {/* Tipo de saque */}
      {serveOptions.length > 0 && (
        <div>
          <p className='text-xs font-medium mb-2' style={{ color: 'var(--text-muted)' }}>Tipo de saque</p>
          <div className='flex gap-2'>
            {serveOptions.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setTipoSaque(tipoSaque === opt.value ? null : opt.value)}
                className={cn(
                  'flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-all text-center',
                  tipoSaque === opt.value ? 'ring-2 ring-[var(--color-live)]' : ''
                )}
                style={{
                  backgroundColor: tipoSaque === opt.value ? 'var(--color-live-bg, rgba(34,197,94,0.1))' : 'var(--bg-primary)',
                  border: '1px solid var(--border-color)',
                  color: 'var(--text-primary)',
                }}
              >
                {opt.icon} {opt.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Resultado */}
      <div>
        <p className='text-xs font-medium mb-2' style={{ color: 'var(--text-muted)' }}>¿Cómo terminó el punto?</p>
        <div className='grid grid-cols-2 gap-2'>
          {resultOptions.map((opt) => (
            <button
              key={opt.value || 'normal'}
              onClick={() => setResultado(resultado === opt.value ? undefined : opt.value)}
              className={cn(
                'px-3 py-2 rounded-lg text-left transition-all',
                resultado === opt.value ? 'ring-2 ring-[var(--color-live)]' : ''
              )}
              style={{
                backgroundColor: resultado === opt.value ? 'var(--color-live-bg, rgba(34,197,94,0.1))' : 'var(--bg-primary)',
                border: '1px solid var(--border-color)',
              }}
            >
              <span className='text-sm font-medium' style={{ color: 'var(--text-primary)' }}>
                {opt.icon} {opt.label}
              </span>
              <span className='block text-xs mt-0.5' style={{ color: 'var(--text-muted)' }}>
                {opt.desc}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className='flex gap-2'>
        <Button
          className='flex-1'
          disabled={loading}
          onClick={() => onConfirm({ tipo_saque: tipoSaque, resultado })}
        >
          Registrar punto
        </Button>
        <Button
          variant='secondary'
          disabled={loading}
          onClick={() => onConfirm({})}
        >
          Sin detalle
        </Button>
      </div>
    </div>
  )
}

/* ── Player Row ── */
function PlayerRow({ name, score, playerKey, pointKey, isWinner, isServing, isFinished, totalSetsToShow }) {
  const gamesKey = `games_${playerKey}`
  const point = score?.[pointKey] ?? '0'

  return (
    <div
      className='grid items-center py-3 px-4'
      style={{
        gridTemplateColumns: `1fr repeat(${totalSetsToShow}, 48px) 56px`,
        backgroundColor: isWinner ? 'var(--color-live-bg, rgba(34,197,94,0.05))' : 'transparent',
      }}
    >
      <div className='flex items-center gap-2 min-w-0'>
        {isServing && !isFinished && (
          <Circle className='w-2.5 h-2.5 fill-[var(--color-live)] text-[var(--color-live)] shrink-0' />
        )}
        <span className={cn('truncate text-sm', isWinner ? 'font-bold' : 'font-medium')}
          style={{ color: isWinner ? 'var(--color-live)' : 'var(--text-primary)' }}>
          {name || '—'}
        </span>
        {isWinner && <span className='text-xs'>🏆</span>}
      </div>

      {Array.from({ length: totalSetsToShow }, (_, i) => {
        const completedSet = score.sets[i]
        const isCurrent = i === score.sets.length && !isFinished
        let value = ''
        if (completedSet) value = completedSet[gamesKey]
        else if (isCurrent) value = score.currentSet[gamesKey]
        const isSetWinner = completedSet &&
          completedSet[gamesKey] > completedSet[`games_${playerKey === 'j1' ? 'j2' : 'j1'}`]
        return (
          <span key={i}
            className={cn('text-center text-base tabular-nums', isCurrent ? 'font-bold' : 'font-medium', isSetWinner ? 'font-bold' : '')}
            style={{ color: isCurrent ? 'var(--text-primary)' : isSetWinner ? 'var(--text-primary)' : 'var(--text-muted)' }}>
            {value !== '' && value !== undefined ? value : '/'}
          </span>
        )
      })}

      <span className='text-center text-lg font-bold tabular-nums'
        style={{ color: isFinished ? 'var(--text-muted)' : 'var(--club-clay, #c2410c)' }}>
        {isFinished ? '' : point}
      </span>
    </div>
  )
}
