import { useEffect, useMemo, useState } from 'react'
import {
  AlertTriangle,
  ArrowLeft,
  Check,
  CircleDot,
  RotateCcw,
  Sparkles,
  Trophy,
  Undo2,
  X,
} from 'lucide-react'
import { Link, useParams } from 'react-router-dom'
import Button from '../../components/ui/Button'
import { matchService } from '../../services/matchService'
import useUIStore from '../../store/useUIStore'
import { getParticipantName } from '../../utils/matchParticipants'

const REASONS = [
  { value: 'ace', label: 'Ace', detail: 'Saque válido que el receptor no toca', icon: Sparkles },
  { value: 'tiro_ganador', label: 'Tiro ganador', detail: 'Golpe directo que no puede devolverse', icon: Trophy },
  { value: 'error_forzado', label: 'Error forzado', detail: 'La presión del rival provoca el error', icon: Check },
  { value: 'error_no_forzado', label: 'Error no forzado', detail: 'El rival falla sin presión suficiente', icon: X },
  { value: 'doble_falta', label: 'Doble falta', detail: 'Falló también el segundo servicio', icon: AlertTriangle },
  { value: 'penalizacion', label: 'Penalización', detail: 'Punto otorgado por decisión del juez', icon: CircleDot },
  { value: 'infraccion', label: 'Infracción', detail: 'Toque, invasión u otra infracción', icon: AlertTriangle },
]

export default function JudgeControl() {
  const { id } = useParams()
  const [control, setControl] = useState(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [selectedWinner, setSelectedWinner] = useState(null)
  const { addToast } = useUIStore()

  const load = async ({ quiet = false } = {}) => {
    if (!quiet) setLoading(true)
    try {
      const response = await matchService.getControl(id)
      setControl(response.data)
    } catch (error) {
      addToast({ type: 'error', title: 'No se pudo abrir el control', message: error.message })
    } finally {
      if (!quiet) setLoading(false)
    }
  }

  useEffect(() => {
    load()
    const timer = window.setInterval(() => load({ quiet: true }), 20000)
    return () => window.clearInterval(timer)
  }, [id])

  const registerEvent = async (event) => {
    setBusy(true)
    try {
      const response = await matchService.addEvent(id, event)
      setControl(response.data)
      setSelectedWinner(null)
    } catch (error) {
      addToast({ type: 'error', title: 'No se registró el evento', message: error.message })
    } finally {
      setBusy(false)
    }
  }

  const undo = async () => {
    setBusy(true)
    try {
      const response = await matchService.undoEvent(id)
      setControl(response.data)
      setSelectedWinner(null)
      addToast({ type: 'success', title: 'Última acción deshecha' })
    } catch (error) {
      addToast({ type: 'error', title: 'No se pudo deshacer', message: error.message })
    } finally {
      setBusy(false)
    }
  }

  if (loading) return <div className='skeleton h-[620px] rounded-2xl' />
  if (!control) return <p style={{ color: 'var(--text-muted)' }}>No fue posible cargar el partido.</p>

  const { partido, marcador, estadisticas, eventos_recientes: events } = control
  const names = {
    jugador1: getParticipantName(partido, 1) || 'Jugador 1',
    jugador2: getParticipantName(partido, 2) || 'Jugador 2',
  }
  const currentSet = marcador.sets?.[marcador.currentSet - 1]
  const isFinished = Boolean(marcador.winner)
  const receiver = marcador.server === 'jugador1' ? 'jugador2' : 'jugador1'

  const reasonDisabled = (reason) => {
    if (reason === 'ace') return selectedWinner !== marcador.server
    if (reason === 'doble_falta') {
      return marcador.serviceAttempt !== 2 || selectedWinner !== receiver
    }
    return false
  }

  return (
    <div className='space-y-4 animate-fade-up'>
      <div className='flex items-center justify-between gap-3'>
        <Link to='/juez' className='btn-ghost inline-flex items-center gap-2 text-sm'>
          <ArrowLeft className='w-4 h-4' /> Partidos
        </Link>
        <span className={partido.estado === 'en_vivo' ? 'badge-live' : 'badge-atp'}>
          {isFinished ? 'Finalizado' : partido.estado === 'programado' ? 'Listo para iniciar' : 'En vivo'}
        </span>
      </div>

      <section className='card overflow-hidden'>
        <div className='px-4 py-3 flex items-center justify-between' style={{ borderBottom: '1px solid var(--border-color)' }}>
          <div>
            <p className='text-[11px] font-bold uppercase tracking-wider' style={{ color: 'var(--color-brand)' }}>
              {partido.categoria?.nombre || 'Tenis'} · Mejor de {partido.formato?.mejor_de_sets || 3}
            </p>
            <p className='text-xs mt-1' style={{ color: 'var(--text-muted)' }}>
              {partido.formato?.modo_game === 'sin_ventaja' ? 'Punto decisivo' : 'Con ventaja'}
              {' · '}{partido.formato?.set_decisivo === 'match_tiebreak' ? 'Match tiebreak decisivo' : 'Set decisivo completo'}
            </p>
          </div>
          <button onClick={undo} disabled={busy || events.length === 0} className='btn-secondary px-3 py-2 text-xs disabled:opacity-40'>
            <Undo2 className='w-4 h-4' /> Deshacer
          </button>
        </div>

        <div className='p-3 sm:p-5 overflow-x-auto'>
          <div className='min-w-[470px]'>
            <div className='grid gap-2 text-center text-[10px] uppercase font-bold mb-2' style={{ gridTemplateColumns: `minmax(190px,1fr) repeat(${Math.max(marcador.sets?.length || 1, 1)},48px) 68px` }}>
              <span className='text-left' style={{ color: 'var(--text-muted)' }}>Jugador</span>
              {(marcador.sets || [currentSet]).map((set, index) => <span key={set?.number || index} style={{ color: 'var(--text-muted)' }}>Set {index + 1}</span>)}
              <span style={{ color: 'var(--text-muted)' }}>Puntos</span>
            </div>
            {['jugador1', 'jugador2'].map((side, sideIndex) => (
              <div
                key={side}
                className='grid gap-2 items-center py-3'
                style={{
                  gridTemplateColumns: `minmax(190px,1fr) repeat(${Math.max(marcador.sets?.length || 1, 1)},48px) 68px`,
                  borderTop: '1px solid var(--border-color)',
                }}
              >
                <div className='flex items-center gap-2 min-w-0'>
                  <span
                    className='w-2.5 h-2.5 rounded-full shrink-0'
                    style={{ backgroundColor: marcador.server === side ? 'var(--club-clay)' : 'transparent' }}
                    title={marcador.server === side ? 'Al servicio' : ''}
                  />
                  <strong className='truncate' style={{ color: 'var(--text-primary)' }}>{names[side]}</strong>
                  {marcador.winner === side && <Trophy className='w-4 h-4 shrink-0' style={{ color: 'var(--club-clay)' }} />}
                </div>
                {(marcador.sets || [currentSet]).map((set, index) => (
                  <strong key={set?.number || index} className='text-center text-lg' style={{ color: 'var(--text-primary)' }}>
                    {set?.games?.[sideIndex] ?? 0}
                  </strong>
                ))}
                <strong className='text-center text-2xl rounded-lg py-1' style={{ backgroundColor: 'var(--bg-hover)', color: 'var(--text-primary)' }}>
                  {marcador.displayPoints?.[sideIndex] ?? '0'}
                </strong>
              </div>
            ))}
          </div>
        </div>

        {!isFinished && (
          <div className='px-4 pb-4 flex flex-wrap items-center gap-2'>
            <span className='text-xs font-semibold rounded-full px-3 py-1.5' style={{ backgroundColor: 'var(--color-brand-dim)', color: 'var(--color-brand)' }}>
              Servicio: {names[marcador.server]}
            </span>
            <span className='text-xs rounded-full px-3 py-1.5' style={{ backgroundColor: 'var(--bg-hover)', color: 'var(--text-secondary)' }}>
              {marcador.serviceAttempt === 2 ? 'Segundo servicio' : 'Primer servicio'}
            </span>
          </div>
        )}
      </section>

      {!isFinished ? (
        <section className='space-y-3'>
          <div className='grid grid-cols-2 gap-3'>
            {['jugador1', 'jugador2'].map((side, index) => (
              <button
                key={side}
                type='button'
                disabled={busy}
                onClick={() => setSelectedWinner(side)}
                className='rounded-2xl min-h-28 px-3 py-5 flex flex-col items-center justify-center gap-2 font-black shadow-sm transition-transform active:scale-[0.98] disabled:opacity-60'
                style={{
                  background: index === 0 ? 'linear-gradient(145deg,#176b3a,#0d4a29)' : 'linear-gradient(145deg,#d8652a,#a94318)',
                  color: 'white',
                  outline: selectedWinner === side ? '4px solid rgba(255,255,255,.75)' : 'none',
                  outlineOffset: '-7px',
                }}
              >
                <span className='text-[11px] uppercase tracking-widest opacity-80'>Punto para</span>
                <span className='text-base sm:text-xl leading-tight'>{names[side]}</span>
              </button>
            ))}
          </div>

          <div className='grid grid-cols-2 gap-3'>
            <button
              type='button'
              disabled={busy || marcador.serviceAttempt === 2}
              onClick={() => registerEvent({ tipo: 'primera_falta' })}
              className='btn-secondary min-h-14 justify-center disabled:opacity-40'
            >
              <AlertTriangle className='w-4 h-4' /> Primera falta
            </button>
            <button type='button' disabled={busy} onClick={() => registerEvent({ tipo: 'let' })} className='btn-secondary min-h-14 justify-center disabled:opacity-40'>
              <RotateCcw className='w-4 h-4' /> Let / repetir
            </button>
          </div>

          {selectedWinner && (
            <div className='card p-4 animate-fade-up' style={{ border: '2px solid var(--color-brand)' }}>
              <div className='flex justify-between gap-3 mb-3'>
                <div>
                  <p className='text-xs uppercase font-bold' style={{ color: 'var(--color-brand)' }}>Justificar el punto</p>
                  <h3 className='font-extrabold mt-1' style={{ color: 'var(--text-primary)' }}>{names[selectedWinner]}</h3>
                </div>
                <button className='btn-ghost p-2' onClick={() => setSelectedWinner(null)}><X className='w-4 h-4' /></button>
              </div>
              <div className='grid grid-cols-1 sm:grid-cols-2 gap-2'>
                {REASONS.map((reason) => {
                  const disabled = reasonDisabled(reason.value)
                  return (
                    <button
                      key={reason.value}
                      type='button'
                      disabled={busy || disabled}
                      onClick={() => registerEvent({ tipo: 'punto', ganador: selectedWinner, motivo: reason.value })}
                      className='text-left rounded-xl p-3 flex gap-3 transition-colors disabled:opacity-35 disabled:cursor-not-allowed'
                      style={{ backgroundColor: 'var(--bg-hover)', border: '1px solid var(--border-color)' }}
                    >
                      <reason.icon className='w-5 h-5 shrink-0 mt-0.5' style={{ color: 'var(--color-brand)' }} />
                      <span>
                        <strong className='block text-sm' style={{ color: 'var(--text-primary)' }}>{reason.label}</strong>
                        <span className='block text-[11px] mt-0.5' style={{ color: 'var(--text-muted)' }}>{reason.detail}</span>
                      </span>
                    </button>
                  )
                })}
              </div>
              {marcador.serviceAttempt !== 2 && (
                <p className='text-[11px] mt-3' style={{ color: 'var(--text-muted)' }}>
                  Para registrar doble falta, marca primero <strong>Primera falta</strong>.
                </p>
              )}
            </div>
          )}
        </section>
      ) : (
        <section className='card p-6 text-center'>
          <Trophy className='w-10 h-10 mx-auto mb-3' style={{ color: 'var(--club-clay)' }} />
          <p className='text-sm' style={{ color: 'var(--text-muted)' }}>Ganador del partido</p>
          <h2 className='text-2xl font-black mt-1' style={{ color: 'var(--text-primary)' }}>{names[marcador.winner]}</h2>
        </section>
      )}

      <Stats stats={estadisticas} names={names} />
      <RecentEvents events={events} names={names} />
    </div>
  )
}

function Stats({ stats, names }) {
  const rows = useMemo(() => [
    ['Puntos ganados', 'puntos_ganados'],
    ['Aces', 'aces'],
    ['Dobles faltas', 'dobles_faltas'],
    ['Primer servicio', 'porcentaje_primer_servicio', '%'],
    ['Tiros ganadores', 'tiros_ganadores'],
    ['Errores no forzados', 'errores_no_forzados'],
  ], [])

  return (
    <details className='card p-4'>
      <summary className='font-bold cursor-pointer' style={{ color: 'var(--text-primary)' }}>Estadísticas en vivo</summary>
      <div className='mt-4'>
        <div className='grid grid-cols-[1fr_72px_72px] gap-2 text-xs font-bold pb-2' style={{ color: 'var(--text-muted)' }}>
          <span /> <span className='text-center truncate'>{firstName(names.jugador1)}</span><span className='text-center truncate'>{firstName(names.jugador2)}</span>
        </div>
        {rows.map(([label, key, suffix = '']) => (
          <div key={key} className='grid grid-cols-[1fr_72px_72px] gap-2 py-2.5 text-sm' style={{ borderTop: '1px solid var(--border-color)' }}>
            <span style={{ color: 'var(--text-secondary)' }}>{label}</span>
            <strong className='text-center' style={{ color: 'var(--text-primary)' }}>{stats.jugador1[key]}{suffix}</strong>
            <strong className='text-center' style={{ color: 'var(--text-primary)' }}>{stats.jugador2[key]}{suffix}</strong>
          </div>
        ))}
      </div>
    </details>
  )
}

function RecentEvents({ events, names }) {
  if (!events.length) return null
  return (
    <details className='card p-4'>
      <summary className='font-bold cursor-pointer' style={{ color: 'var(--text-primary)' }}>Historial de puntos</summary>
      <div className='mt-3 space-y-2'>
        {events.slice(0, 10).map((event) => (
          <div key={event.id} className='flex items-center justify-between gap-3 text-xs py-2' style={{ borderTop: '1px solid var(--border-color)' }}>
            <span style={{ color: 'var(--text-secondary)' }}>
              {event.tipo === 'primera_falta' ? `Primera falta · ${names[event.servidor]}` : event.tipo === 'let' ? 'Let / repetir punto' : `${names[event.ganador]} · ${reasonLabel(event.motivo)}`}
            </span>
            <span className='font-bold shrink-0' style={{ color: 'var(--text-primary)' }}>{event.marcador?.displayPoints?.join(' – ')}</span>
          </div>
        ))}
      </div>
    </details>
  )
}

const firstName = (name) => name.split(' ')[0]
const reasonLabel = (value) => REASONS.find((reason) => reason.value === value)?.label || value
