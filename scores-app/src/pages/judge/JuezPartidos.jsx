import { useEffect, useState, useCallback, useRef, useMemo } from 'react'
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

const reasons = [
  ['tiro_ganador', 'Tiro ganador', 'La pelota no pudo ser devuelta'],
  ['ace', 'Ace', 'Saque que el receptor no toca'],
  ['error_no_forzado', 'Error del rival', 'Error no forzado'],
  ['error_forzado', 'Error provocado', 'Forzaste el error del rival'],
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
  const user = useAuthStore((store) => store.user)
  const userId = user?.id
  const [exclusive, setExclusive] = useState(false)
  const lockAllowed = useRef(false)
  const [matches, setMatches] = useState([])
  const [listLoading, setListLoading] = useState(true)
  const [listError, setListError] = useState('')
  const [view, setView] = useState({ match: null, control: null, busy: false })
  const sessionRef = useRef(null)
  const [quick, setQuick] = useState(true)
  const [pending, setPending] = useState(null)
  const [panel, setPanel] = useState(null)
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
  const locked = view.busy || view.needsSync || view.conflict || nameBusy || !exclusive
  const adminLocked = locked || Boolean(view.pendingCount) || !online
  const canScore = playing && !paused && !locked
  const server = live?.saca || 'jugador1'
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
            className='card p-4 text-left hover:bg-[var(--bg-hover)] transition-colors flex flex-col justify-between'
          >
            <div>
              <div className='flex items-center justify-between gap-2 text-xs text-[var(--text-muted)] mb-1'>
                <span className='truncate'>{item.cancha?.nombre || 'Cancha por definir'} · {item.torneo?.nombre || 'Partido libre'}</span>
                <span className='shrink-0 font-semibold' style={{ color: item.estado === 'en_vivo' ? '#10b981' : 'var(--text-muted)' }}>
                  {{ en_vivo: '● En vivo', programado: 'Programado', finalizado: 'Finalizado', cancelado: 'Cancelado' }[item.estado] || item.estado} →
                </span>
              </div>
              <strong className='block my-2 text-base leading-tight'>
                {getParticipantName(item, 1)} <span className='font-normal text-xs text-[var(--text-muted)]'>vs</span> {getParticipantName(item, 2)}
              </strong>
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
        <div className='judge-scoreboard'>
          <div className='judge-score-heading'><span>Jugador / pareja</span><span>Sets<br />ganados</span><span>Juegos<br />del set</span><span>Punto<br />actual</span></div>
          {['jugador1', 'jugador2'].map((side, i) => <div key={side} className={`judge-score-row ${!finished && server === side ? 'is-serving' : ''}`}>
            <div className='min-w-0'><strong className='judge-player-name'>{names[side]}</strong>{!finished && server === side ? <span className='judge-serving-badge'>● AL SAQUE · {score.numero_servicio === 1 ? 'Primero' : 'Segundo'}</span> : finished && score.ganador === side ? <span className='judge-serving-badge'>Ganador</span> : <span className='text-xs text-[var(--text-muted)]'>{!finished ? 'Recibe' : ''}</span>}</div>
            <span>{score.sets.filter((set) => set[`games_j${i + 1}`] > set[`games_j${2 - i}`]).length}</span>
            <span>{score.currentSet[`games_j${i + 1}`]}</span>
            <strong className='judge-points'>{finished ? '—' : score[`punto_j${i + 1}`]}</strong>
          </div>)}
          <div className='judge-sets'>Sets: {score.sets.length ? score.sets.map((set, i) => <span key={i}>S{i + 1}: {set.games_j1}–{set.games_j2}</span>) : 'sin sets terminados'}</div>
        </div>
        <div className={`judge-feedback ${view.pending ? 'is-pending' : ''}`} role='status' aria-live='polite'>
          {view.pending ? `Marcador local · ${view.pendingCount} pendientes · ${view.sending ? 'sincronizando' : 'guardados aquí'}` : !online ? 'Sin conexión · los puntos se guardarán aquí' : view.busy ? 'Confirmando en el servidor…' : view.needsSync ? 'Revisa la conexión · pulsa sincronizar' : `Confirmado: ${reasonLabel(lastEvent, names)}`}
        </div>
        {view.pending && <p className='sr-only'>Puedes seguir anotando. La pantalla pública se actualizará al sincronizar. No borres los datos del navegador.</p>}
        {view.error && (view.conflict || !view.pending) && <p role='alert' className='text-xs text-red-500'>{view.error}</p>}
        {view.conflict && <button className='judge-tool' onClick={async () => {
          await sessionRef.current.sync()
          const pendingList = sessionRef.current.getPending().map((event, i) => `${i + 1}. ${reasonLabel(event, names)}`).join('\n')
          if (await confirm({ title: 'Revisar acciones en conflicto', message: `El marcador visible ahora es el del servidor. Conserva una copia de esta lista antes de descartarla y vuelve a registrar solo lo que falte:\n${pendingList}`, requireText: 'DESCARTAR', confirmLabel: 'Descartar pendientes' })) await sessionRef.current.discardConflict()
        }}>Revisar y descartar pendiente</button>}
        {playing && <>
          <label className={`judge-mode ${!quick ? 'is-detailed' : ''}`}><span className='judge-mode-copy'><strong>¿Cómo se ganó el punto?</strong><small>{quick ? 'Rápido: suma sin clasificar el motivo' : 'Detallado: elige ganador y motivo'}</small></span><span className='judge-mode-switch'><input aria-label='Registrar motivo del punto' type='checkbox' checked={!quick} disabled={locked || Boolean(pending)} onChange={(event) => setQuick(!event.target.checked)} /><span>{quick ? 'Activar detalle' : 'Detalle activo'}</span></span></label>
          <div className='judge-point-buttons'>
            {['jugador1', 'jugador2'].map((side, i) => <button key={side} className={`judge-point judge-side-${i + 1}`} disabled={!canScore || Boolean(pending)} onClick={() => quick ? point(side) : setPending(side)}>
              <span className='text-sm'>Punto para</span><strong>{names[side]}</strong><span className='text-3xl leading-none'>+1</span>
            </button>)}
          </div>
          <div className='judge-service-controls'>
            <button className='judge-tool' disabled={!canScore} onClick={() => score.numero_servicio === 1 ? record({ tipo: 'primera_falta' }) : point(receiver, 'doble_falta')}>
              {score.numero_servicio === 1 ? '1ª falta · sin punto' : 'Doble falta · punto al receptor'}
            </button>
            <button className='judge-tool' disabled={!canScore} onClick={() => record({ tipo: 'let' })}>Repetir saque (let)</button>
          </div>
        </>}
        {!playing && !finished && <button className='btn-primary py-4' disabled={adminLocked} onClick={() => write((id) => matchService.startLive(id))}><Play size={18} /> Iniciar partido</button>}
        {finished && <p className='text-sm font-semibold text-center'>{score.ganador ? `Ganador: ${names[score.ganador]}. ${view.pendingCount ? 'Resultado local pendiente de envío.' : 'Resultado guardado.'}` : 'Este partido no admite puntos.'}</p>}
        <div className='judge-bottom-controls'>
          {playing && <button className='judge-tool' disabled={adminLocked} onClick={() => write((id) => matchService.pauseLive(id, !paused))}>{paused ? <Play size={18} /> : <Pause size={18} />}{paused ? 'Reanudar' : 'Pausar'}</button>}
          <button className='judge-tool' disabled={(view.canUndoLocal ? locked : adminLocked) || !lastEvent || live?.estado === 'cancelado'} onClick={undo}><Undo2 size={18} />{view.canUndoLocal ? 'Deshacer local' : 'Deshacer'}</button>
          <button className='judge-tool' disabled={view.busy} onClick={() => setPanel('stats')}><BarChart3 size={18} /> Estadísticas</button>
          <button className='judge-tool' disabled={view.busy} onClick={openSettings}><Settings2 size={18} /> Ajustes</button>
        </div>
      </>}

      {pending && <JudgePanel title={`Punto para ${names[pending]}`} onClose={() => setPending(null)} busy={view.busy}>
        <p className='text-sm mb-3'>Selecciona cómo terminó el punto. Los errores corresponden al rival.</p>
        <div className='grid grid-cols-2 gap-2'>
          {reasons.map(([key, label, description]) => <button key={key} className='judge-reason' disabled={locked || !canScore || (key === 'ace' && pending !== server)} onClick={() => point(pending, key)}><strong>{label}</strong><span>{description}</span></button>)}
        </div>
        {view.error && <p role='alert' className='text-sm mt-3'>{view.error}</p>}
      </JudgePanel>}
      {panel && <JudgePanel title={panel === 'stats' ? 'Estadísticas y últimas acciones' : 'Ajustes del partido'} onClose={() => setPanel(null)} busy={nameBusy || view.busy}>
        {panel === 'stats' ? <>
          <MatchStats matchId={selectedId} player1={names.jugador1} player2={names.jugador2} />
          <h3 className='font-bold mt-5 mb-2'>Últimas acciones</h3>
          <ol className='space-y-2 text-sm'>{state?.eventos_recientes?.map((event) => <li key={event.id}>#{event.secuencia} · {reasonLabel(event, names)}</li>)}</ol>
        </> : <div className='space-y-4'>
          <p className='text-sm'>Al mejor de {state?.reglas.mejor_de} sets · {state?.reglas.juegos_por_set} games por set. El formato configurado del torneo se conserva.</p>
          <p className='text-xs'>El saque cambia automáticamente. Corrígelo aquí solo si es necesario.</p>
          <button className='judge-tool w-full' disabled={!canScore || adminLocked} onClick={async () => {
            // Close the native modal so the global confirmation stays reachable.
            setPanel(null)
            if (await confirm({ title: 'Cambiar sacador', message: `¿Debe sacar ${names[receiver]}?`, confirmLabel: 'Cambiar saque' })) await write((id) => matchService.setServer(id, receiver))
          }}>Cambiar saque a {names[receiver]}</button>
          <form className='space-y-3' onSubmit={saveNames}>
            <h3 className='font-semibold'>Nombres en pantalla</h3><p className='text-xs'>Solo cambia la etiqueta; no sustituye al jugador registrado. Vacío restaura su nombre.</p>
            {nameDraft.map((name, index) => <label key={index} className='block text-sm'>Jugador / pareja {index + 1}<input className='form-input mt-1' maxLength={120} value={name} onChange={(event) => setNameDraft((old) => old.map((value, i) => i === index ? event.target.value : value))} /></label>)}
            <button className='btn-primary' disabled={adminLocked}>{nameBusy ? 'Guardando…' : 'Guardar nombres'}</button>
            {nameError && <p role='alert'>{nameError}</p>}
          </form>
        </div>}
      </JudgePanel>}
    </section>
  )
}

function JudgePanel({ title, children, onClose, busy }) {
  const ref = useRef(null)
  useEffect(() => { ref.current?.showModal() }, [])
  return <dialog ref={ref} className='judge-dialog' aria-labelledby='judge-panel-title' onCancel={(event) => { event.preventDefault(); if (!busy) onClose() }}>
    <div className='judge-dialog-heading'><h2 className='font-bold' id='judge-panel-title'>{title}</h2><button className='judge-tool' onClick={onClose} disabled={busy} aria-label='Cerrar panel'><X size={20} /></button></div>
    <div className='p-4'>{children}</div>
  </dialog>
}
