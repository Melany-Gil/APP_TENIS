import { useEffect, useState, useCallback, useRef, useMemo } from 'react'
import { useOutletContext } from 'react-router-dom'
import { ArrowLeft, Pause, Play, Undo2, RefreshCw, X, Settings2, BarChart3, UserCheck, AlertTriangle, Search } from 'lucide-react'
import { matchService } from '../../services/matchService'
import { getParticipantName } from '../../utils/matchParticipants'
import { createJudgeSession } from '../../utils/judgeSession'
import { confirm } from '../../utils/confirm'
import MatchStats from '../../components/match/MatchStats'
import MatchPhotoCapture from '../../components/match/MatchPhotoCapture'
import { useMatchTimer } from '../../hooks/useMatchTimer'
import { useMatchRealtime } from '../../hooks/useMatchRealtime'
import './judge.css'
import useAuthStore from '../../store/useAuthStore'
import { projectJudgeEvent } from '../../utils/projectJudgeEvent'
import { doublesServer } from '../../utils/doublesServer'

const reasons = [
  ['tiro_ganador', 'Winner', 'Golpe ganador que el rival no logra devolver'],
  ['ace', 'Ace', 'Saque válido que gana el punto sin que el rival toque la pelota'],
  ['error_no_forzado', 'Error no forzado', 'Fallo sin presión clara del oponente'],
  ['error_forzado', 'Error forzado', 'Fallo provocado por la presión del oponente'],
  ['infraccion', 'Infracción del rival', 'Por ejemplo, tocar la red'],
  ['penalizacion', 'Penalización', 'Punto otorgado por sanción'],
]
const reasonLabel = (event, names) => {
  if (!event) return 'Todavía no hay acciones registradas'
  if (event.tipo === 'primera_falta') return 'Primera falta · segundo saque'
  if (event.tipo === 'let') return 'Let · se repite el saque'
  if (event.tipo === 'cambio_servidor') return 'Cambio de sacador'
  if (event.tipo === 'correccion') return 'Corrección de marcador por supervisión'
  const reason = event.motivo === 'doble_falta' ? 'Doble falta' : reasons.find(([key]) => key === event.motivo)?.[1] || 'Punto sin detalle'
  return `${names[event.ganador]} · ${reason}`
}

export default function JuezPartidos() {
  const { setScoringActive } = useOutletContext() || {}
  const user = useAuthStore((store) => store.user)
  const userId = user?.id
  const [exclusive, setExclusive] = useState(false)
  const lockAllowed = useRef(false)
  const [matches, setMatches] = useState([])
  const [listLoading, setListLoading] = useState(true)
  const [listError, setListError] = useState('')
  const [view, setView] = useState({ match: null, control: null, busy: false })
  const sessionRef = useRef(null)
  const [quick, setQuick] = useState(false)
  const [pending, setPending] = useState(null)
  const [panel, setPanel] = useState(null)
  const [firstServers, setFirstServers] = useState(['', ''])
  const [suspending, setSuspending] = useState(false)
  const [suspensionReason, setSuspensionReason] = useState('')
  const [conflictReview, setConflictReview] = useState(null)
  const [reviewBusy, setReviewBusy] = useState(false)
  const [reviewChecked, setReviewChecked] = useState(false)
  const [online, setOnline] = useState(navigator.onLine)
  const [nameDraft, setNameDraft] = useState(['', ''])
  const [nameBusy, setNameBusy] = useState(false)
  const [nameError, setNameError] = useState('')
  const isDirectorOrAdmin = ['admin', 'juez_director'].includes(user?.rol)
  const [judgeFilter, setJudgeFilter] = useState('todos')
  const [matchSearch, setMatchSearch] = useState('')
  const listRequest = useRef(0)

  const assignedJudges = useMemo(() => {
    const map = new Map()
    matches.forEach((m) => {
      if (m.juez?.id) {
        map.set(m.juez.id, `${m.juez.nombre} ${m.juez.apellido || ''}`.trim())
      }
    })
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }))
  }, [matches])

  const visibleMatches = useMemo(() => {
    if (!isDirectorOrAdmin) return matches
    return matches.filter((m) => {
      if (judgeFilter === 'mis_partidos') {
        if (Number(m.juez?.id) !== Number(userId)) return false
      } else if (judgeFilter === 'sin_juez') {
        if (m.juez?.id) return false
      } else if (judgeFilter !== 'todos') {
        if (String(m.juez?.id) !== String(judgeFilter)) return false
      }

      if (matchSearch.trim()) {
        const q = matchSearch.trim().toLowerCase()
        const p1 = getParticipantName(m, 1) || ''
        const p2 = getParticipantName(m, 2) || ''
        const judgeName = `${m.juez?.nombre || ''} ${m.juez?.apellido || ''}`.toLowerCase()
        const court = (m.cancha?.nombre || '').toLowerCase()
        if (!`${p1} ${p2} ${judgeName} ${court}`.toLowerCase().includes(q)) return false
      }

      return true
    })
  }, [matches, isDirectorOrAdmin, judgeFilter, matchSearch, userId])

  const refreshMatches = useCallback(async () => {
    const request = ++listRequest.current
    setListLoading(true)
    try {
      const response = await matchService.getAssignments()
      if (request !== listRequest.current) return
      setMatches(response.data || [])
      setListError('')
    } catch (error) {
      if (request === listRequest.current) setListError(error.message || 'No se pudieron cargar tus partidos')
    } finally {
      if (request === listRequest.current) setListLoading(false)
    }
  }, [])

  useEffect(() => {
    const session = createJudgeSession(matchService, setView, { storage: localStorage, userId, isOnline: () => navigator.onLine, project: projectJudgeEvent, canWrite: () => lockAllowed.current })
    sessionRef.current = session
    let release, stopped = false
    const held = new Promise(resolve => { release = resolve })
    if (navigator.locks) navigator.locks.request(`judge-outbox:${userId}`, async (lock) => {
      if (!lock || stopped) return
      lockAllowed.current = true; setExclusive(true)
      session.restore()
      session.sync()
      await held
    })
    refreshMatches()
    return () => { stopped = true; release(); lockAllowed.current = false; session.dispose(); ++listRequest.current }
  }, [refreshMatches, userId])

  const selectedId = view.match?.id
  useEffect(() => {
    const recover = () => {
      setOnline(navigator.onLine)
      if (navigator.onLine && document.visibilityState === 'visible') sessionRef.current?.sync()
    }
    window.addEventListener('online', recover)
    window.addEventListener('offline', recover)
    window.addEventListener('focus', recover)
    document.addEventListener('visibilitychange', recover)
    const interval = setInterval(recover, view.pending ? 5000 : 30000)
    return () => {
      clearInterval(interval)
      window.removeEventListener('online', recover)
      window.removeEventListener('offline', recover)
      window.removeEventListener('focus', recover)
      document.removeEventListener('visibilitychange', recover)
    }
  }, [selectedId, Boolean(view.pending)])

  useMatchRealtime(useCallback((event) => {
    if (selectedId) {
      if (event.matchId == null || Number(event.matchId) === Number(selectedId)) sessionRef.current?.sync()
    } else refreshMatches()
  }, [selectedId, refreshMatches]))

  const state = view.control
  const match = state?.partido || view.match
  const names = { jugador1: getParticipantName(match || {}, 1) || 'Jugador 1', jugador2: getParticipantName(match || {}, 2) || 'Jugador 2' }
  const score = state?.marcador
  const live = state?.en_vivo
  const finished = score?.terminado || ['finalizado', 'cancelado'].includes(live?.estado)
  const paused = Boolean(live?.pausado_at)
  const playing = live?.estado === 'en_vivo' && !finished
  useEffect(() => {
    setScoringActive?.(playing && !paused)
    return () => setScoringActive?.(false)
  }, [playing, paused, setScoringActive])
  useEffect(() => {
    if (!view.pendingCount) return
    const warn = event => { event.preventDefault(); event.returnValue = '' }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [Boolean(view.pendingCount)])
  const locked = view.busy || view.needsSync || view.conflict || nameBusy || !exclusive
  const adminLocked = locked || Boolean(view.pendingCount) || !online
  const canScore = playing && !paused && !locked
  const server = live?.saca || 'jugador1'
  const isDoubles = match?.modalidad === 'dobles'
  const individualServer = doublesServer(state?.raw_marcador, state?.doubles_order)
  const servingPlayer = individualServer && match?.[`equipo${individualServer.team}`]?.[`jugador${individualServer.member}`]
  const servingName = servingPlayer ? [servingPlayer.nombre, servingPlayer.apellido].filter(Boolean).join(' ') : null
  const receiver = server === 'jugador1' ? 'jugador2' : 'jugador1'
  const lastEvent = state?.eventos_recientes?.[0]
  const { formatted: elapsed } = useMatchTimer(live, live?.estado)

  const write = async (operation) => {
    if (adminLocked) return false
    const success = await sessionRef.current.write(operation)
    if (success) { setPending(null); setPanel(null) }
    return success
  }
  const record = async (event) => {
    if (locked) return
    setPending(null)
    return sessionRef.current.record(event)
  }
  const point = (ganador, motivo = 'punto_sin_detalle') => record({ tipo: 'punto', ganador, motivo })
  const select = (item) => {
    setPending(null); setPanel(null)
    sessionRef.current.select(item)
  }
  const undo = async () => {
    if (await confirm({ title: 'Deshacer última acción', message: reasonLabel(lastEvent, names), confirmLabel: 'Deshacer' })) {
      if (view.canUndoLocal) sessionRef.current.undoLocal()
      else await write((id) => matchService.undoPoint(id))
    }
  }
  const openSettings = () => {
    setNameDraft([match?.nombre_override_j1 || '', match?.nombre_override_j2 || ''])
    setNameError(''); setPanel('settings')
  }
  const saveNames = async (event) => {
    event.preventDefault()
    if (nameBusy || adminLocked) return
    setNameBusy(true); setNameError('')
    try {
      await matchService.updateParticipants(selectedId, { nombre_override_j1: nameDraft[0] || null, nombre_override_j2: nameDraft[1] || null })
      await sessionRef.current.sync()
      setPanel(null)
    } catch (error) { setNameError(error.message || 'No se pudieron guardar los nombres') }
    finally { setNameBusy(false) }
  }

  if (!view.match) return (
    <section className='space-y-4 py-2'>
      <div className='flex items-center justify-between gap-2'>
        <div>
          <div className='flex items-center gap-2'>
            <h1 className='text-xl font-bold'>Mesa de juez</h1>
            {isDirectorOrAdmin && (
              <span className='text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider' style={{ backgroundColor: 'rgba(234, 179, 8, 0.15)', color: '#eab308' }}>
                Supervisión Jueces
              </span>
            )}
          </div>
          <p className='text-sm text-[var(--text-muted)]'>
            {isDirectorOrAdmin
              ? 'Viendo todos los partidos de la jornada asignados a cada juez. Selecciona el que desees arbitrar.'
              : 'Selecciona el partido que vas a arbitrar.'}
          </p>
        </div>
        <button className='btn-ghost p-3' onClick={refreshMatches} disabled={listLoading} aria-label='Actualizar partidos'><RefreshCw size={20} className={listLoading ? 'animate-spin' : ''} /></button>
      </div>

      {isDirectorOrAdmin && (
        <div className='p-3.5 rounded-2xl border space-y-2.5' style={{ backgroundColor: 'var(--bg-sidebar)', borderColor: 'var(--border-color)' }}>
          <div className='flex flex-col sm:flex-row gap-2'>
            <div className='relative flex-1'>
              <Search size={15} className='absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]' />
              <input
                type='text'
                placeholder='Buscar por participante, juez o cancha…'
                value={matchSearch}
                onChange={(e) => setMatchSearch(e.target.value)}
                className='form-input pl-9 text-xs'
              />
            </div>
            <div className='w-full sm:w-64'>
              <select
                className='form-input text-xs'
                value={judgeFilter}
                onChange={(e) => setJudgeFilter(e.target.value)}
              >
                <option value='todos'>Todos los jueces ({matches.length})</option>
                <option value='mis_partidos'>Mis partidos asignados</option>
                <option value='sin_juez'>Sin juez asignado</option>
                {assignedJudges.map((j) => (
                  <option key={j.id} value={j.id}>
                    Juez: {j.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className='flex items-center justify-between text-[11px] text-[var(--text-muted)] px-0.5'>
            <span>Mostrando {visibleMatches.length} de {matches.length} partidos</span>
            {(judgeFilter !== 'todos' || matchSearch) && (
              <button
                type='button'
                onClick={() => { setJudgeFilter('todos'); setMatchSearch('') }}
                className='font-semibold text-[var(--color-brand)]'
              >
                Limpiar filtro
              </button>
            )}
          </div>
        </div>
      )}

      {listError && <p role='alert' className='text-xs text-red-500'>{listError}</p>}
      {!exclusive && <p role='status' className='text-sm'>Abre la mesa en una sola pestaña y usa un navegador actualizado con HTTPS. Si tienes otra mesa abierta, ciérrala y recarga esta.</p>}
      {listLoading && <p role='status'>Cargando partidos…</p>}
      {!listLoading && !visibleMatches.length && (
        <p className='card p-5 text-center text-sm text-[var(--text-muted)]'>
          {isDirectorOrAdmin ? 'No hay partidos que coincidan con el filtro.' : 'No tienes partidos asignados.'}
        </p>
      )}
      <div className='grid sm:grid-cols-2 gap-3'>
        {visibleMatches.map((item) => (
          <button
            key={item.id}
            onClick={() => select(item)}
            className={`judge-assignment card p-4 text-left flex flex-col justify-between ${item.estado === 'en_vivo' ? 'is-live' : ''}`}
          >
            <div>
              <div className='flex items-center justify-between gap-2 text-xs text-[var(--text-muted)] mb-1'>
                <span className='truncate'>{item.cancha?.nombre || 'Cancha por definir'} · {item.torneo?.nombre || 'Partido libre'}</span>
                <span className='shrink-0 font-semibold' style={{ color: item.estado === 'en_vivo' ? '#10b981' : 'var(--text-muted)' }}>
                  {{ en_vivo: '● En vivo', programado: 'Programado', finalizado: 'Finalizado', cancelado: 'Cancelado' }[item.estado] || item.estado} →
                </span>
              </div>
              <div className='judge-assignment-players'>
                <strong><i aria-hidden='true' />{getParticipantName(item, 1)}</strong>
                <span>contra</span>
                <strong><i aria-hidden='true' />{getParticipantName(item, 2)}</strong>
              </div>
              <span className='judge-assignment-action'>{['finalizado', 'cancelado'].includes(item.estado) ? 'Consultar encuentro' : item.estado === 'en_vivo' ? 'Ir a la mesa' : 'Preparar encuentro'} <span aria-hidden='true'>↗</span></span>
            </div>

            {isDirectorOrAdmin && (
              <div className='pt-2 mt-2 border-t' style={{ borderColor: 'var(--border-color)' }}>
                {item.juez ? (
                  <span
                    className='text-[11px] font-semibold px-2 py-0.5 rounded-md inline-flex items-center gap-1.5'
                    style={{
                      backgroundColor: Number(item.juez.id) === Number(userId) ? 'var(--color-brand-dim)' : 'var(--bg-primary)',
                      color: Number(item.juez.id) === Number(userId) ? 'var(--color-brand)' : 'var(--text-primary)',
                      border: '1px solid var(--border-color)',
                    }}
                  >
                    <UserCheck size={12} />
                    Juez: {item.juez.nombre} {item.juez.apellido} {Number(item.juez.id) === Number(userId) ? '(Tú)' : ''}
                  </span>
                ) : (
                  <span
                    className='text-[11px] font-semibold px-2 py-0.5 rounded-md inline-flex items-center gap-1 text-amber-500'
                    style={{ backgroundColor: 'rgba(245, 158, 11, 0.15)', border: '1px solid rgba(245, 158, 11, 0.3)' }}
                  >
                    <AlertTriangle size={12} /> Sin juez asignado
                  </span>
                )}
              </div>
            )}
          </button>
        ))}
      </div>
    </section>
  )

  return (
    <section className='judge-desk' aria-label='Control del partido'>
      {!exclusive && <p role='status' className='text-xs'>Otra pestaña controla la mesa o el navegador no admite el guardado seguro. Cierra la otra mesa y recarga.</p>}
      <div className='judge-toolbar'>
        <button className='judge-tool' disabled={view.busy || nameBusy || Boolean(view.pending)} onClick={() => { select(null); refreshMatches() }}><ArrowLeft size={17} /> Partidos</button>
        <span className='text-xs truncate'>{match?.cancha?.nombre || 'Mesa de juez'}</span>
        <MatchPhotoCapture key={`${userId}:${selectedId}`} matchId={selectedId} userId={userId} finished={finished} disabled={!exclusive} deferUpload={Boolean(view.pendingCount) || view.syncing || !exclusive} />
        <button className='judge-tool' disabled={view.busy || view.syncing} onClick={() => sessionRef.current.sync()} aria-label='Sincronizar marcador'><RefreshCw size={17} /></button>
      </div>
      {!state ? <div className='card p-6' role='status'>{view.error || 'Cargando marcador…'}</div> : <>
        <div className='judge-status'>
          <span>{finished ? (live?.estado === 'cancelado' ? 'Cancelado' : 'Finalizado') : paused ? 'Pausado' : playing ? '● En vivo' : 'Programado'}</span>
          <span>Tiempo: {elapsed}</span>
          <span>{score.currentSet.tiebreak ? 'Desempate' : score.deuce ? (match?.formato?.modo_game === 'sin_ventaja' ? 'Punto decisivo' : 'Iguales · 40–40') : score.breakpoint ? 'Oportunidad de ganar el juego al sacador' : `Set ${score.sets.length + (finished ? 0 : 1)}`}</span>
        </div>
        {!finished && <div className='judge-serve-bar'>
          <div><small>AL SAQUE · {score.numero_servicio === 1 ? 'PRIMER SERVICIO' : 'SEGUNDO SERVICIO'}</small><strong>{servingName || names[server]}</strong>{isDoubles && !servingName && <small>Falta confirmar el jugador de la pareja</small>}</div>
          <button className='judge-tool' disabled={view.busy} onClick={() => setPanel('serve')}><RefreshCw size={15} /> Cambiar saque</button>
        </div>}
        <div className='judge-scoreboard judge-scoreboard-sets' style={{ '--set-count': state.raw_marcador?.sets?.length || 1 }}>
          <div className='judge-score-title'><span>MESA DE MARCACIÓN</span><span>{finished ? 'Resultado' : paused ? 'En pausa' : 'Cada punto cuenta'}</span></div>
          <div className='judge-score-heading'><span>Jugador / pareja</span>{(state.raw_marcador?.sets || []).map((set, i) => <span key={i}>{set.type === 'match_tiebreak' ? 'STB' : `S${i + 1}`}<small>{set.completed ? 'Final' : 'Actual'}</small></span>)}<span>Punto</span></div>
          {['jugador1', 'jugador2'].map((side, i) => <div key={side} className={`judge-score-row judge-team-${i + 1} ${!finished && server === side ? 'is-serving' : ''}`}>
            <div className='min-w-0'><strong className='judge-player-name'>{names[side]}</strong>{!finished && server === side ? <span className='judge-serving-badge'>● AL SAQUE · {score.numero_servicio === 1 ? 'Primero' : 'Segundo'}</span> : finished && score.ganador === side ? <span className='judge-serving-badge'>Ganador</span> : <span className='text-xs text-[var(--text-muted)]'>{!finished ? 'Recibe' : ''}</span>}</div>
            {(state.raw_marcador?.sets || []).map((set, index) => <strong key={index} className={`judge-set-value ${!set.completed ? 'is-current' : ''}`} aria-label={`Set ${index + 1}: ${set.games[i]}${set.completed ? ', final' : ', actual'}`}>
              {set.games[i]}{set.type !== 'match_tiebreak' && set.tiebreak?.some(Boolean) && <sup>{set.tiebreak[i]}</sup>}
            </strong>)}
            <strong key={`${side}:${score[`punto_j${i + 1}`]}`} className='judge-points'>{finished ? '—' : score[`punto_j${i + 1}`]}</strong>
          </div>)}
          <div className='judge-set-history' aria-label='Marcador por sets'>
            {(state.raw_marcador?.sets || []).map((set, i) => <div key={i} className={`judge-set-chip ${!set.completed ? 'is-current' : ''}`}>
              <span>{set.type === 'match_tiebreak' ? 'Super TB' : `Set ${i + 1}`} · {set.completed ? 'cerrado' : 'actual'}</span>
              <strong><span>{set.games[0]}</span><span aria-hidden='true'>–</span><span>{set.games[1]}</span></strong>
              {set.type !== 'match_tiebreak' && set.tiebreak?.some(Boolean) && <small>TB {set.tiebreak[0]}–{set.tiebreak[1]}</small>}
            </div>)}
          </div>
        </div>
        <div className={`judge-feedback ${view.pending ? 'is-pending' : ''}`} role='status' aria-live='polite'>
          {view.pending ? `Marcador local · ${view.pendingCount} pendientes · ${view.sending ? 'sincronizando' : 'guardados aquí'}` : !online ? 'Sin conexión · los puntos se guardarán aquí' : view.busy ? 'Confirmando en el servidor…' : view.needsSync ? 'Revisa la conexión · pulsa sincronizar' : `Confirmado: ${reasonLabel(lastEvent, names)}`}
        </div>
        {view.pending && <p className='sr-only'>Puedes seguir anotando. La pantalla pública se actualizará al sincronizar. No borres los datos del navegador.</p>}
        {view.error && (view.conflict || !view.pending) && <p role='alert' className='text-xs text-red-500'>{view.error}</p>}
        {view.conflict && <section className='rounded-2xl border p-4 space-y-3' style={{ borderColor: 'var(--color-brand)', background: 'var(--bg-card)' }} aria-label='Revisión de marcación'>
          <h2 className='font-bold'>Revisemos antes de continuar</h2>
          <p className='text-sm'>Hay acciones locales sin confirmar. No se sumarán automáticamente sobre un marcador distinto.</p>
          <button className='judge-tool' disabled={reviewBusy || !exclusive || !online} onClick={async () => {
            setReviewBusy(true); setReviewChecked(false); setConflictReview(null)
            try { setConflictReview(await sessionRef.current.reviewConflict()) } finally { setReviewBusy(false) }
          }}>{reviewBusy ? 'Consultando…' : '1. Consultar marcador del servidor'}</button>
          {conflictReview && <>
            <div className='rounded-xl p-3 text-sm' style={{ background: 'var(--color-brand-dim)' }}>
              <strong>Servidor al consultar</strong>
              <p>Puntos: {conflictReview.control.marcador.punto_j1} – {conflictReview.control.marcador.punto_j2}</p>
              <p>Games: {conflictReview.control.marcador.currentSet?.games_j1 ?? '—'} – {conflictReview.control.marcador.currentSet?.games_j2 ?? '—'}</p>
              <p>Sets: {conflictReview.control.marcador.sets?.map(set => `${set.games_j1}–${set.games_j2}`).join(' / ') || 'sin sets terminados'}</p>
              <p className='text-xs mt-1'>Orden: {names.jugador1} / {names.jugador2}</p>
            </div>
            <h3 className='font-semibold text-sm'>2. Contrasta estas acciones con lo ocurrido en cancha</h3>
            <ol className='list-decimal pl-5 space-y-2 text-sm max-h-60 overflow-y-auto'>
              {conflictReview.actions.map(event => <li key={event.client_action_id}>{reasonLabel(event, names)}<span className='block text-xs opacity-70'>{event.attempted ? 'Enviada anteriormente: puede estar registrada; no la repitas sin verificar.' : 'Guardada localmente, aún no enviada.'}</span></li>)}
            </ol>
            <p className='text-sm'>Si tienes dudas, consulta al juez director. Mantén los pendientes hasta aclararlo.</p>
            <label className='flex items-start gap-3 py-3 text-sm'><input type='checkbox' className='mt-1 h-5 w-5 shrink-0' checked={reviewChecked} onChange={e => setReviewChecked(e.target.checked)} />Revisé la lista y sé cuáles acciones ya están registradas y cuáles faltan.</label>
            <button className='judge-tool' disabled={!reviewChecked || reviewBusy || !online || !exclusive} onClick={async () => {
              setReviewBusy(true)
              try {
                if (await confirm({ title: 'Conservar el marcador del servidor', message: 'La lista pendiente se archivará en este navegador y dejará de enviarse. Esto no modifica el marcador del servidor. Después registra únicamente las acciones que verificaste que faltan. La copia local no se restaura automáticamente.', requireText: 'REVISADO', confirmLabel: 'Archivar pendientes y continuar', danger: true })) {
                  await sessionRef.current.discardConflict(conflictReview.revision)
                  setConflictReview(null); setReviewChecked(false)
                }
              } finally { setReviewBusy(false) }
            }}>3. Resolver revisión</button>
          </>}
        </section>}
        {playing && <>
          <label className={`judge-mode ${!quick ? 'is-detailed' : ''}`}><span className='judge-mode-copy'><strong>¿Cómo se ganó el punto?</strong><small>{quick ? 'Rápido: suma sin clasificar el motivo' : 'Detallado: elige ganador y motivo'}</small></span><span className='judge-mode-switch'><input aria-label='Registrar motivo del punto' type='checkbox' checked={!quick} disabled={locked || Boolean(pending)} onChange={(event) => setQuick(!event.target.checked)} /><span>{quick ? 'Activar detalle' : 'Detalle activo'}</span></span></label>
          <div className='judge-point-buttons'>
            {['jugador1', 'jugador2'].map((side, i) => <button key={side} className={`judge-point judge-side-${i + 1}`} disabled={!canScore || Boolean(pending)} onClick={() => quick ? point(side) : setPending(side)}>
              <span className='judge-point-label'>Punto para <span className='judge-team-dot' aria-hidden='true' /></span><strong>{names[side]}</strong><span className='judge-point-add' aria-hidden='true'>+1</span>
            </button>)}
          </div>
          <div className='judge-service-controls'>
            <button className='judge-tool' disabled={!canScore} onClick={() => score.numero_servicio === 1 ? record({ tipo: 'primera_falta' }) : point(receiver, 'doble_falta')}>
              {score.numero_servicio === 1 ? '1ª falta · sin punto' : 'Marcar doble falta'}
            </button>
            <button className='judge-tool' disabled={!canScore} onClick={() => record({ tipo: 'let' })}>Let · repetir {score.numero_servicio === 1 ? '1er' : '2º'} saque</button>
          </div>
        </>}
        {!playing && !finished && <section className='judge-state-card'>
          <span className='judge-eyebrow'>ANTES DEL PRIMER SAQUE</span>
          <h2>Todo listo para comenzar</h2>
          <p>Comprueba los participantes y la cancha. Al iniciar se activa la marcación.</p>
          <div className='judge-preflight'><span>Formato<strong>Al mejor de {state?.reglas?.mejor_de ?? '—'} sets</strong></span><span>Por set<strong>{state?.reglas?.juegos_por_set ?? '—'} juegos</strong></span></div>
          <p>El saque cambia automáticamente. Si necesitas corregir el sacador inicial, entra en Ajustes después de iniciar y antes de anotar el primer punto.</p>
          <button className='btn-primary py-4 w-full' disabled={adminLocked} onClick={() => write((id) => matchService.startLive(id))}><Play size={18} /> Iniciar partido</button>
        </section>}
        {paused && !finished && <section className='judge-state-card' role='status'><span className='judge-eyebrow'>{live?.motivo_suspension ? 'PARTIDO SUSPENDIDO' : 'MESA EN PAUSA'}</span><h2>Marcador conservado</h2>{live?.motivo_suspension && <p className='break-words'><strong>Motivo:</strong> {live.motivo_suspension}</p>}<p>No puedes sumar puntos durante la pausa. Usa Reanudar cuando el encuentro continúe.</p></section>}
        {finished && <section className='judge-state-card' role='status'><span className='judge-eyebrow'>{live?.estado === 'cancelado' ? 'ENCUENTRO CANCELADO' : 'CIERRE DEL ENCUENTRO'}</span><h2>{score.ganador ? `Ganador: ${names[score.ganador]}` : 'Este partido no admite puntos.'}</h2><p>{view.pendingCount ? 'El resultado sigue pendiente de envío. Conserva este navegador y recupera la conexión.' : view.needsSync ? 'Sincroniza para verificar el estado del resultado.' : 'Consulta el resumen en Estadísticas.'}</p></section>}
        <div className='judge-bottom-controls'>
          {playing && <button className='judge-tool' disabled={adminLocked} onClick={() => write((id) => matchService.pauseLive(id, !paused))}>{paused ? <Play size={18} /> : <Pause size={18} />}{paused ? 'Reanudar' : 'Pausar'}</button>}
          <button className='judge-tool' disabled={(view.canUndoLocal ? locked : adminLocked) || !lastEvent || live?.estado === 'cancelado'} onClick={undo}><Undo2 size={18} />{view.canUndoLocal ? 'Deshacer local' : 'Deshacer'}</button>
          <button className='judge-tool' disabled={view.busy} onClick={() => setPanel('stats')}><BarChart3 size={18} /> Estadísticas</button>
          <button className='judge-tool' disabled={view.busy} onClick={openSettings}><Settings2 size={18} /> Ajustes</button>
        </div>
      </>}

      {suspending && <JudgePanel title='Suspender el encuentro' onClose={() => setSuspending(false)} busy={view.busy}>
        <form className='space-y-4' onSubmit={async e => {
          e.preventDefault()
          if (adminLocked || suspensionReason.trim().length < 5) return
          if (await write(id => matchService.suspendLive(id, suspensionReason.trim()))) setSuspending(false)
        }}>
          <p className='judge-panel-tip'>El marcador se conserva y no se declara ganador. Podrás continuar desde este punto con Reanudar. El motivo quedará en el historial de control.</p>
          <label className='block text-sm font-semibold'>Motivo de suspensión<textarea className='form-input mt-2' rows={3} required minLength={5} maxLength={500} value={suspensionReason} onChange={e => setSuspensionReason(e.target.value)} placeholder='Ejemplo: lluvia; la cancha no permite continuar.' /></label>
          <p className='text-xs text-[var(--text-muted)]'>Entre 5 y 500 caracteres. Evita incluir datos personales o médicos.</p>
          {view.error && <p role='alert' className='text-sm text-red-500'>{view.error}</p>}
          <button type='submit' className='btn-primary w-full' disabled={adminLocked || suspensionReason.trim().length < 5}>{view.busy ? 'Guardando…' : 'Confirmar suspensión'}</button>
        </form>
      </JudgePanel>}
      {pending && <JudgePanel compact title={`Punto para ${names[pending]}`} onClose={() => setPending(null)} busy={view.busy}>
        <p className='judge-panel-tip'>Error cometido por: <strong>{names[pending === 'jugador1' ? 'jugador2' : 'jugador1']}</strong>. Cerrar no registra el punto.</p>
        <div className='judge-reason-groups'>
          {[
            ['Golpe ganador', reasons.slice(0, 2)],
            ['Fallo del rival', reasons.slice(2, 4)],
            ['Decisión arbitral', reasons.slice(4)],
          ].map(([heading, options]) => <fieldset key={heading} className='judge-reason-group'>
            <legend>{heading}</legend>
            <div className='judge-reason-grid'>{options.map(([key, label, description]) => <button key={key} className={`judge-reason reason-${key}`} disabled={locked || !canScore || (key === 'ace' && pending !== server)} onClick={() => point(pending, key)}>
              <strong>{label}<span className='judge-reason-arrow' aria-hidden='true'>↗</span></strong>
              <span>{key === 'ace' && pending !== server ? 'Solo disponible para quien está sacando' : description}</span>
            </button>)}</div>
          </fieldset>)}
        </div>
        {view.error && <p role='alert' className='text-sm mt-3'>{view.error}</p>}
      </JudgePanel>}
      {panel && <JudgePanel title={panel === 'stats' ? 'Estadísticas y últimas acciones' : panel === 'serve' ? 'Control de saque' : 'Ajustes del partido'} onClose={() => setPanel(null)} busy={nameBusy || view.busy}>
        {panel === 'stats' ? <>
          <MatchStats matchId={selectedId} player1={names.jugador1} player2={names.jugador2} />
          <h3 className='font-bold mt-5 mb-2'>Últimas acciones</h3>
          <ol className='space-y-2 text-sm'>{state?.eventos_recientes?.map((event) => <li key={event.id}>#{event.secuencia} · {reasonLabel(event, names)}</li>)}</ol>
        </> : <div className='space-y-4'>
          <p className='text-sm'>Al mejor de {state?.reglas.mejor_de} sets · {state?.reglas.juegos_por_set} games por set. El formato configurado del torneo se conserva.</p>
          {playing && panel !== 'serve' && <button className='judge-tool w-full' disabled={adminLocked} onClick={() => { setPanel(null); setSuspensionReason(''); setSuspending(true) }}><Pause size={18} /> Suspender con motivo</button>}
          <p className='text-xs'>El saque cambia automáticamente. Corrígelo aquí solo si es necesario.</p>
          <button className='judge-tool w-full' disabled={!canScore || adminLocked} onClick={async () => {
            // Close the native modal so the global confirmation stays reachable.
            setPanel(null)
            if (await confirm({ title: 'Cambiar sacador', message: `¿Debe sacar ${names[receiver]}?`, confirmLabel: 'Cambiar saque' })) await write((id) => matchService.setServer(id, receiver))
          }}>Cambiar saque a {names[receiver]}</button>
          {isDoubles && !finished && <form className='judge-state-card' onSubmit={async e => {
            e.preventDefault()
            if (!firstServers.every(Boolean)) return
            if (await write(id => matchService.setDoublesOrder(id, { first1: Number(firstServers[0]), first2: Number(firstServers[1]), set: state.raw_marcador.currentSet }))) setPanel(null)
          }}>
            <h3 className='font-semibold'>Orden de saque · set {state.raw_marcador?.currentSet}</h3>
            <p>Antes del primer saque del set, selecciona quién sirve primero dentro de cada pareja. Los compañeros se alternarán automáticamente en los juegos y desempates. Vuelve a confirmar al comenzar otro set.</p>
            {[1, 2].map((team, i) => <label key={team} className='text-sm'>{names[`jugador${team}`]}
              <select className='form-input mt-1' required value={firstServers[i]} onChange={e => setFirstServers(old => old.map((v, index) => index === i ? e.target.value : v))}>
                <option value=''>Primer sacador de esta pareja</option>
                {[1, 2].map(member => { const player = match[`equipo${team}`]?.[`jugador${member}`]; return player && <option key={member} value={member}>{player.nombre} {player.apellido}</option> })}
              </select>
            </label>)}
            <button className='btn-primary' disabled={adminLocked || !firstServers.every(Boolean)}>Confirmar orden</button>
            {view.error && <p role='alert'>{view.error}</p>}
          </form>}
          {panel !== 'serve' && <form className='space-y-3' onSubmit={saveNames}>
            <h3 className='font-semibold'>Nombres en pantalla</h3><p className='text-xs'>Solo cambia la etiqueta; no sustituye al jugador registrado. Vacío restaura su nombre.</p>
            {nameDraft.map((name, index) => <label key={index} className='block text-sm'>Jugador / pareja {index + 1}<input className='form-input mt-1' maxLength={120} value={name} onChange={(event) => setNameDraft((old) => old.map((value, i) => i === index ? event.target.value : value))} /></label>)}
            <button className='btn-primary' disabled={adminLocked}>{nameBusy ? 'Guardando…' : 'Guardar nombres'}</button>
            {nameError && <p role='alert'>{nameError}</p>}
          </form>}
        </div>}
      </JudgePanel>}
    </section>
  )
}

function JudgePanel({ title, children, onClose, busy, compact = false }) {
  const ref = useRef(null)
  useEffect(() => { ref.current?.showModal() }, [])
  return <dialog ref={ref} className={`judge-dialog${compact ? ' judge-dialog-compact' : ''}`} aria-labelledby='judge-panel-title' onCancel={(event) => { event.preventDefault(); if (!busy) onClose() }}>
    <div className='judge-dialog-heading'><h2 className='font-bold' id='judge-panel-title'>{title}</h2><button className='judge-tool' onClick={onClose} disabled={busy} aria-label='Cerrar panel'><X size={20} /></button></div>
    <div className='p-4'>{children}</div>
  </dialog>
}
