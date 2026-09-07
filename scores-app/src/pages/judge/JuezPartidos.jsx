import { useEffect, useState, useCallback, useRef } from 'react'
import { ArrowLeft, Pause, Play, Undo2, RefreshCw, X, Settings2, BarChart3 } from 'lucide-react'
import { matchService } from '../../services/matchService'
import { getParticipantName } from '../../utils/matchParticipants'
import { createJudgeSession } from '../../utils/judgeSession'
import { confirm } from '../../utils/confirm'
import MatchStats from '../../components/match/MatchStats'
import { useMatchTimer } from '../../hooks/useMatchTimer'
import { useMatchRealtime } from '../../hooks/useMatchRealtime'
import './judge.css'

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
  const reason = event.motivo === 'doble_falta' ? 'Doble falta' : reasons.find(([key]) => key === event.motivo)?.[1] || 'Punto sin detalle'
  return `${names[event.ganador]} · ${reason}`
}

export default function JuezPartidos() {
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
  const listRequest = useRef(0)

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
    const session = createJudgeSession(matchService, setView)
    sessionRef.current = session
    refreshMatches()
    return () => { session.dispose(); ++listRequest.current }
  }, [refreshMatches])

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
    const interval = setInterval(recover, 30000)
    return () => {
      clearInterval(interval)
      window.removeEventListener('online', recover)
      window.removeEventListener('offline', recover)
      window.removeEventListener('focus', recover)
      document.removeEventListener('visibilitychange', recover)
    }
  }, [selectedId])

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
  const locked = view.busy || view.needsSync || !online || nameBusy
  const canScore = playing && !paused && !locked
  const server = live?.saca || 'jugador1'
  const receiver = server === 'jugador1' ? 'jugador2' : 'jugador1'
  const lastEvent = state?.eventos_recientes?.[0]
  const { formatted: elapsed } = useMatchTimer(live, live?.estado)

  const write = async (operation) => {
    if (locked) return false
    const success = await sessionRef.current.write(operation)
    if (success) { setPending(null); setPanel(null) }
    return success
  }
  const point = (ganador, motivo = 'punto_sin_detalle') => write((id) => matchService.addJudgeEvent(id, { tipo: 'punto', ganador, motivo }))
  const select = (item) => {
    setPending(null); setPanel(null)
    sessionRef.current.select(item)
  }
  const undo = async () => {
    if (await confirm({ title: 'Deshacer última acción', message: reasonLabel(lastEvent, names), confirmLabel: 'Deshacer' })) {
      await write((id) => matchService.undoPoint(id))
    }
  }
  const openSettings = () => {
    setNameDraft([match?.nombre_override_j1 || '', match?.nombre_override_j2 || ''])
    setNameError(''); setPanel('settings')
  }
  const saveNames = async (event) => {
    event.preventDefault()
    if (nameBusy || locked) return
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
        <div><h1 className='text-xl font-bold'>Mesa de juez</h1><p className='text-sm text-[var(--text-muted)]'>Selecciona el partido que vas a arbitrar.</p></div>
        <button className='btn-ghost p-3' onClick={refreshMatches} disabled={listLoading} aria-label='Actualizar partidos'><RefreshCw size={20} /></button>
      </div>
      {listError && <p role='alert'>{listError}</p>}
      {listLoading && <p role='status'>Cargando partidos…</p>}
      {!listLoading && !matches.length && <p className='card p-5'>No tienes partidos asignados.</p>}
      <div className='grid sm:grid-cols-2 gap-3'>
        {matches.map((item) => <button key={item.id} onClick={() => select(item)} className='card p-4 text-left hover:bg-[var(--bg-hover)]'>
          <span className='text-xs text-[var(--text-muted)]'>{item.cancha?.nombre || 'Cancha por definir'} · {item.torneo?.nombre || 'Partido libre'}</span>
          <strong className='block my-2'>{getParticipantName(item, 1)} <span className='font-normal'>vs</span> {getParticipantName(item, 2)}</strong>
          <span className='text-sm'>{{ en_vivo: '● En vivo', programado: 'Programado', finalizado: 'Finalizado', cancelado: 'Cancelado' }[item.estado] || item.estado} →</span>
        </button>)}
      </div>
    </section>
  )

  return (
    <section className='judge-desk' aria-label='Control del partido'>
      <div className='judge-toolbar'>
        <button className='judge-tool' disabled={view.busy || nameBusy} onClick={() => { select(null); refreshMatches() }}><ArrowLeft size={17} /> Partidos</button>
        <span className='text-xs truncate'>{match?.cancha?.nombre || 'Mesa de juez'}</span>
        <button className='judge-tool' disabled={view.busy || view.syncing} onClick={() => sessionRef.current.sync()} aria-label='Sincronizar marcador'><RefreshCw size={17} /></button>
      </div>
      {!state ? <div className='card p-6' role='status'>{view.error || 'Cargando marcador…'}</div> : <>
        <div className='judge-status'>
          <span>{finished ? (live?.estado === 'cancelado' ? 'Cancelado' : 'Finalizado') : paused ? 'Pausado' : playing ? '● En vivo' : 'Programado'}</span>
          <span>{elapsed}</span>
          <span>{score.currentSet.tiebreak ? 'Tie-break' : score.deuce ? (match?.formato?.modo_game === 'sin_ventaja' ? 'Punto decisivo' : 'Iguales') : score.breakpoint ? `${score.breakpoint.count} punto(s) de quiebre` : `Set ${score.sets.length + (finished ? 0 : 1)}`}</span>
        </div>
        <div className='judge-scoreboard'>
          <div className='judge-score-heading'><span>Jugador / pareja</span><span>Sets</span><span>Games</span><span>Puntos</span></div>
          {['jugador1', 'jugador2'].map((side, i) => <div key={side} className='judge-score-row'>
            <div className='min-w-0'><strong className='judge-player-name'>{names[side]}</strong><span className='text-xs text-[var(--text-muted)]'>{!finished && server === side ? `● Saca · ${score.numero_servicio}º servicio` : finished && score.ganador === side ? 'Ganador' : ' '}</span></div>
            <span>{score.sets.filter((set) => set[`games_j${i + 1}`] > set[`games_j${2 - i}`]).length}</span>
            <span>{score.currentSet[`games_j${i + 1}`]}</span>
            <strong className='judge-points'>{finished ? '—' : score[`punto_j${i + 1}`]}</strong>
          </div>)}
          <div className='judge-sets'>Sets: {score.sets.length ? score.sets.map((set, i) => <span key={i}>S{i + 1}: {set.games_j1}–{set.games_j2}</span>) : 'sin sets terminados'}</div>
        </div>
        <div className='judge-feedback' role='status' aria-live='polite'>
          {!online ? 'Sin conexión · no se enviarán puntos' : view.busy ? 'Guardando… espera la confirmación' : view.needsSync ? 'Sin confirmar · pulsa sincronizar' : `Último: ${reasonLabel(lastEvent, names)}`}
        </div>
        {view.error && <p role='alert' className='text-xs text-red-500'>{view.error}</p>}
        {playing && <>
          <label className='judge-mode'><input type='checkbox' checked={!quick} disabled={locked || Boolean(pending)} onChange={(event) => setQuick(!event.target.checked)} /> Registrar motivo del punto <span>{quick ? '1 toque' : '2 toques'}</span></label>
          <div className='judge-point-buttons'>
            {['jugador1', 'jugador2'].map((side, i) => <button key={side} className={`judge-point judge-side-${i + 1}`} disabled={!canScore || Boolean(pending)} onClick={() => quick ? point(side) : setPending(side)}>
              <span className='text-sm'>Punto para</span><strong>{names[side]}</strong><span className='text-3xl leading-none'>+1</span>
            </button>)}
          </div>
          <div className='judge-service-controls'>
            <button className='judge-tool' disabled={!canScore} onClick={() => score.numero_servicio === 1 ? write((id) => matchService.addJudgeEvent(id, { tipo: 'primera_falta' })) : point(receiver, 'doble_falta')}>
              {score.numero_servicio === 1 ? '1ª falta · sin punto' : 'Doble falta · punto al receptor'}
            </button>
            <button className='judge-tool' disabled={!canScore} onClick={() => write((id) => matchService.addJudgeEvent(id, { tipo: 'let' }))}>Let / repetir</button>
          </div>
        </>}
        {!playing && !finished && <button className='btn-primary py-4' disabled={locked} onClick={() => write((id) => matchService.startLive(id))}><Play size={18} /> Iniciar partido</button>}
        {finished && <p className='text-sm font-semibold text-center'>{score.ganador ? `Ganador: ${names[score.ganador]}. Resultado guardado.` : 'Este partido no admite puntos.'}</p>}
        <div className='judge-bottom-controls'>
          {playing && <button className='judge-tool' disabled={locked} onClick={() => write((id) => matchService.pauseLive(id, !paused))}>{paused ? <Play size={18} /> : <Pause size={18} />}{paused ? 'Reanudar' : 'Pausar'}</button>}
          <button className='judge-tool' disabled={locked || !lastEvent || live?.estado === 'cancelado'} onClick={undo}><Undo2 size={18} /> Deshacer</button>
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
          <button className='judge-tool w-full' disabled={!canScore} onClick={async () => {
            // Close the native modal so the global confirmation stays reachable.
            setPanel(null)
            if (await confirm({ title: 'Cambiar sacador', message: `¿Debe sacar ${names[receiver]}?`, confirmLabel: 'Cambiar saque' })) await write((id) => matchService.setServer(id, receiver))
          }}>Cambiar saque a {names[receiver]}</button>
          <form className='space-y-3' onSubmit={saveNames}>
            <h3 className='font-semibold'>Nombres en pantalla</h3><p className='text-xs'>Solo cambia la etiqueta; no sustituye al jugador registrado. Vacío restaura su nombre.</p>
            {nameDraft.map((name, index) => <label key={index} className='block text-sm'>Jugador / pareja {index + 1}<input className='form-input mt-1' maxLength={120} value={name} onChange={(event) => setNameDraft((old) => old.map((value, i) => i === index ? event.target.value : value))} /></label>)}
            <button className='btn-primary' disabled={locked}>{nameBusy ? 'Guardando…' : 'Guardar nombres'}</button>
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
