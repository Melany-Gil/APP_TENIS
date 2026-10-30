import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Link, useSearchParams } from 'react-router-dom'
import {
  ArrowRight,
  Camera,
  Check,
  Clock,
  Maximize2,
  Plus,
  RefreshCw,
  Shuffle,
  Trophy,
  Users,
} from 'lucide-react'
import useAuthStore from '../store/useAuthStore'
import ActionDialog from '../components/common/ActionDialog'
import { confirm } from '../utils/confirm'
import { padelFlashService as api } from '../services/padelFlashService'
import './PadelFlash.css'

const clock = (m) =>
  m === '' || m == null
    ? ''
    : `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`
const minutes = (s) => {
  const [h, m] = s.split(':').map(Number)
  return h * 60 + m
}
const label = (p) => (p ? `${p.jugador1} / ${p.jugador2}` : 'Pareja pendiente')
const stateLabel = {
  pendiente: 'Próximamente',
  abierta: 'Votación abierta',
  cerrada: 'Votación cerrada',
  revelada: 'Resultados publicados',
}
const newEvent = {
  nombre: 'Flash de Pádel · Disfraces',
  fecha: '2026-10-30',
  cancha1: 'Pádel 1',
  cancha2: 'Pádel 2',
  inicio: 1080,
  pausa_inicio: '',
  pausa_fin: '',
  cierre: 1320,
  formato: 'individual',
  duracion_partido: 20,
  tamano_grupo: 5,
}

function Field({ title, children }) {
  return (
    <label className='pf-field'>
      <span>{title}</span>
      {children}
    </label>
  )
}
function CostumePhoto({ pair }) {
  const [failed, setFailed] = useState(false),
    [retry, setRetry] = useState(0)
  useEffect(() => setFailed(false), [pair.foto_url])
  if (!pair.foto_url || failed)
    return (
      <div>
        <Camera size={30} />
        <span>{failed ? 'Foto no disponible' : 'Foto pendiente'}</span>
        {failed && (
          <button
            className='pf-link'
            onClick={() => {
              setRetry((n) => n + 1)
              setFailed(false)
            }}
          >
            Reintentar
          </button>
        )}
      </div>
    )
  return (
    <img
      src={`${api.photoUrl(pair.foto_url)}${retry ? `?retry=${retry}` : ''}`}
      alt={`Disfraz de ${label(pair)}`}
      loading='lazy'
      onError={() => setFailed(true)}
    />
  )
}
function Timer({ match, now, duracion }) {
  if (match.motivo) return <span className='pf-status'>Registrado</span>
  if (!match.inicio_real) return <span className='pf-status'>Programado</span>
  const remaining = Math.max(
    0,
    Math.ceil((Number(match.inicio_real) + duracion * 60000 - now) / 1000)
  )
  return (
    <span className={`pf-status ${remaining ? 'pf-live' : ''}`}>
      {remaining
        ? `${Math.floor(remaining / 60)}:${String(remaining % 60).padStart(2, '0')}`
        : 'Tiempo cumplido'}
    </span>
  )
}

export default function PadelFlash() {
  const { user } = useAuthStore(),
    admin = user?.rol === 'admin',
    official = ['admin', 'juez', 'juez_director'].includes(user?.rol)
  const [params, setParams] = useSearchParams()
  const [events, setEvents] = useState([]),
    [data, setData] = useState(null),
    [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [notice, setNotice] = useState('')
  const [modal, setModal] = useState(null),
    [form, setForm] = useState({}),
    [formError, setFormError] = useState('')
  const [report, setReport] = useState(null),
    [query, setQuery] = useState(''),
    [now, setNow] = useState(Date.now())
  const [listReady, setListReady] = useState(false)
  const [turnFilter, setTurnFilter] = useState('todos')
  const [sorteando, setSorteando] = useState('')
  const generation = useRef(0),
    busyRef = useRef(false),
    offset = useRef(0)
  const eventId = params.get('evento') || String(events[0]?.id || '')
  const tab = params.get('vista') || 'programa',
    screen = params.get('pantalla') === '1'
  const select = (patch) =>
    setParams((current) => {
      const next = new URLSearchParams(current)
      for (const [k, v] of Object.entries(patch)) v == null ? next.delete(k) : next.set(k, v)
      return next
    })
  useEffect(() => {
    if (admin && listReady && !loading && (!eventId || String(data?.event?.id) === String(eventId)) && params.get('nuevo') === '1') {
      setForm({ ...newEvent })
      setFormError('')
      setModal('evento')
      setParams(current => { const next = new URLSearchParams(current); next.delete('nuevo'); return next }, { replace: true })
    }
  }, [admin, listReady, loading, eventId, data?.event?.id, params, setParams])
  const loadList = useCallback(async () => {
    const r = await api.list()
    setEvents(r.data)
    setListReady(true)
  }, [])
  const refresh = useCallback(async () => {
    if (!eventId) return
    const n = ++generation.current
    const r = await api.detail(eventId)
    if (n === generation.current) {
      setData(r.data)
      offset.current = r.data.serverTime - Date.now()
      setLoading(false)
    }
  }, [eventId])
  useEffect(() => {
    loadList().catch((e) => {
      setError(e.message || 'No se pudieron cargar los eventos')
      setLoading(false)
    })
  }, [loadList])
  useEffect(() => {
    setData(null)
    setReport(null)
    setLoading(Boolean(eventId))
    setModal(null)
    setTurnFilter('todos')
    if (eventId)
      refresh().catch((e) => {
        setError(e.message || 'No se pudo cargar el evento')
        setLoading(false)
      })
    return () => {
      generation.current++
    }
  }, [eventId, refresh])
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now() + offset.current), 1000)
    const poll = setInterval(() => {
      if (!document.hidden && !busyRef.current) refresh().catch(() => {})
    }, 15000)
    return () => {
      clearInterval(timer)
      clearInterval(poll)
    }
  }, [refresh])
  const run = async (work, message, close = false) => {
    if (busyRef.current) return
    busyRef.current = true
    setBusy(true)
    setError('')
    setFormError('')
    setNotice('')
    try {
      await work()
      if (close) setModal(null)
      if (message) setNotice(message)
      await refresh().catch(() =>
        setError('El cambio se guardó, pero no se pudo actualizar la vista. Pulsa Reintentar.')
      )
    } catch (e) {
      const msg = e.message || 'No se pudo guardar. Intenta de nuevo.'
      if (modal) setFormError(msg)
      else setError(msg)
    } finally {
      busyRef.current = false
      setBusy(false)
    }
  }
  const open = (kind, value = {}) => {
    setForm(value)
    setFormError('')
    setModal(kind)
  }
  const e = data?.event,
    pairs = data?.pairs || [],
    fixture = data?.fixture || []
  const pairMap = new Map(pairs.map((p) => [p.id, p])),
    version = e?.version
  const tabs = [
    ['programa', 'Partidos'],
    ['galeria', 'Disfraces'],
    ['parejas', 'Parejas'],
    ...(admin
      ? [
          ['sorteo', 'Sorteo'],
          ['gestion', 'Gestión'],
        ]
      : []),
  ]
  const changeState = async (estado) => {
    const messages = {
      abierta:
        'Se cerrarán las inscripciones y las fotos. La votación será pública y cada voto será definitivo.',
      cerrada: 'No se recibirán más votos. La votación no se puede volver a abrir.',
      revelada: 'Se publicarán los votos y el resultado del concurso.',
    }
    if (
      !(await confirm({
        title:
          estado === 'abierta'
            ? 'Abrir votación'
            : estado === 'cerrada'
              ? 'Cerrar votación'
              : 'Revelar resultados',
        message: messages[estado],
      }))
    )
      return
    await run(
      () => api.voting(eventId, { version, estado, ...(estado === 'revelada' ? form : {}) }),
      'Votación actualizada'
    )
    setReport(null)
  }
  const loadReport = (after) =>
    run(async () => {
      const r = await api.report(eventId, after)
      setReport((prev) => ({
        ...r.data,
        votes: after ? [...(prev?.votes || []), ...r.data.votes] : r.data.votes,
      }))
    })
  const winner = data?.ranking?.find((p) => p.id === e?.desempate_pareja) || data?.ranking?.[0]
  return (
    <div className={`pf-page ${screen ? 'pf-screen' : ''}`}>
      <header className='pf-hero'>
        <div className='pf-heading-top'>
          <span className='pf-eyebrow'>CLUB UNIÓN · PÁDEL</span>
          <button
            className='pf-icon'
            aria-label={screen ? 'Salir de pantalla' : 'Modo pantalla'}
            onClick={() => select({ pantalla: screen ? null : '1' })}
          >
            <Maximize2 size={18} />
          </button>
        </div>
        {screen && (
          <div className='pf-brands'>
            <img src='/branding/escudo-club-union.png' alt='Club Unión' />
            <img src='/branding/legal-branding.png' alt='Legal Branding' />
          </div>
        )}
        <h1>{e?.nombre || 'Flash de Pádel'}</h1>
        <p className='pf-subtitle'>
          {e
            ? `${new Date(`${e.fecha}T12:00:00-05:00`).toLocaleDateString('es-CO', { day: 'numeric', month: 'long' })} · ${clock(e.inicio)}–${clock(e.cierre)}`
            : 'Una noche de pádel y disfraces'}
        </p>
        <div className='pf-facts'>
          <span>
            <Users size={15} />
            Pádel en parejas
          </span>
          <span>
            <Clock size={15} />
            20 minutos
          </span>
          <span>
            <Trophy size={15} />
            Premio al mejor disfraz
          </span>
        </div>
        <div className='pf-toolbar'>
          {events.length > 1 && (
            <select
              aria-label='Evento de pádel'
              value={eventId}
              onChange={(x) => select({ evento: x.target.value })}
            >
              {events.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.nombre} · {v.fecha}
                </option>
              ))}
            </select>
          )}
          {admin && (
            <button className='pf-secondary' onClick={() => open('evento', { ...newEvent })}>
              <Plus size={16} />
              Nuevo evento
            </button>
          )}
          <Link className='pf-link' to='/padel'>Todos los torneos de pádel</Link>
          <Link className='pf-link' to='/reglamento?deporte=padel'>Reglamento interno</Link>
        </div>
      </header>
      {error && (
        <div className='pf-alert' role='alert'>
          {error}
          <button
            onClick={() =>
              run(async () => {
                await loadList()
                await refresh()
              })
            }
          >
            Reintentar
          </button>
        </div>
      )}
      {notice && (
        <div className='pf-notice' role='status'>
          <Check size={17} />
          {notice}
        </div>
      )}
      {loading && (
        <div className='pf-empty' role='status'>
          Cargando evento…
        </div>
      )}
      {listReady && !events.length && (
        <div className='pf-empty'>
          <h2>La próxima fecha está en camino</h2>
          {admin && (
            <button className='pf-primary' onClick={() => open('evento', { ...newEvent })}>
              Crear evento
            </button>
          )}
        </div>
      )}
      {e && (
        <>
          <nav className='pf-tabs' aria-label='Secciones de pádel'>
            {tabs.map(([key, title]) => (
              <button
                key={key}
                aria-current={tab === key ? 'page' : undefined}
                onClick={() => select({ vista: key })}
              >
                {title}
              </button>
            ))}
          </nav>
          {['programa', 'sorteo'].includes(tab) && (
            <>
              {tab === 'sorteo' && admin && (
                <section className='pf-panel pf-draw'>
                  <div>
                    <span className='pf-eyebrow'>SORTEO DE CRUCES</span>
                    <h2>{pairs.length} parejas inscritas</h2>
                    <p>
                      {e.formato === 'grupos'
                        ? `Grupos de ${e.tamano_grupo || 5} · Todos contra todos`
                        : 'Dos encuentros por pareja · Sin repetir rival'}
                    </p>
                  </div>
                  <div className='pf-toolbar'>
                    {!e.publicado && (
                      <button
                        className='pf-primary'
                        disabled={busy || pairs.length < 4}
                        onClick={async () => {
                          if (
                            fixture.length &&
                            !(await confirm({
                              title: 'Repetir sorteo',
                              message:
                                'Se reemplazarán los cruces que todavía no se han publicado.',
                            }))
                          )
                            return
                          setSorteando('spinning')
                          await Promise.all([
                            run(() => api.draw(eventId, { version }), 'Cruces sorteados'),
                            new Promise((r) => setTimeout(r, 1800)),
                          ])
                          setSorteando('reveal')
                        }}
                      >
                        <Shuffle size={17} />
                        {busy ? 'Sorteando…' : fixture.length ? 'Repetir sorteo' : 'Sortear cruces'}
                      </button>
                    )}
                    {!e.publicado && fixture.length > 0 && (
                      <button
                        className='pf-secondary'
                        disabled={busy}
                        onClick={async () => {
                          if (
                            await confirm({
                              title: 'Publicar sorteo',
                              message:
                                'Las parejas podrán consultar sus cruces. El sorteo quedará cerrado a cambios.',
                            })
                          )
                            run(() => api.publish(eventId, { version }), 'Sorteo publicado')
                        }}
                      >
                        Publicar cruces
                        <ArrowRight size={16} />
                      </button>
                    )}
                    {!!e.publicado && <span className='pf-status'>Sorteo publicado</span>}
                  </div>
                </section>
              )}
              {!fixture.length && (
                <div className='pf-empty'>
                  <Shuffle size={25} />
                  <h2>Próximamente, los cruces</h2>
                  <p>Las parejas aparecerán aquí después del sorteo.</p>
                  {admin && tab !== 'sorteo' && (
                    <button className='pf-primary' onClick={() => select({ vista: 'sorteo' })}>
                      Ir al sorteo
                    </button>
                  )}
                </div>
              )}
              {!!fixture.length && (
                <>
                  <div className='pf-section-head'>
                    <h2>{e.publicado ? 'Programación' : 'Vista previa del sorteo'}</h2>
                    <div className='pf-round-picker'>
                      <select
                        aria-label='Filtrar turno'
                        value={turnFilter}
                        onChange={(x) => setTurnFilter(x.target.value)}
                      >
                        <option value='todos'>Todos los turnos</option>
                        {[...new Set(fixture.map((m) => m.turno))].map((t) => (
                          <option key={t} value={t}>
                            Turno {t} · {clock(fixture.find((m) => m.turno === t).minuto)}
                          </option>
                        ))}
                      </select>
                      <button
                        className='pf-icon'
                        disabled={busy}
                        aria-label='Actualizar programación'
                        onClick={() => run(refresh)}
                      >
                        <RefreshCw size={17} />
                      </button>
                    </div>
                  </div>
                  <div className='pf-schedule'>
                    {[...new Set(fixture.map((m) => m.turno))]
                      .filter((t) => turnFilter === 'todos' || t === Number(turnFilter))
                      .map((turn) => {
                        const matches = fixture.filter((m) => m.turno === turn),
                          time = matches[0].minuto
                        return (
                          <section className='pf-round' key={turn}>
                            {time === e.pausa_fin && (
                              <p className='pf-break'>
                                Pausa · {clock(e.pausa_inicio)}–{clock(e.pausa_fin)}
                              </p>
                            )}
                            <h3>
                              <span>
                                Turno {turn}
                                {e.formato === 'grupos'
                                  ? ` · Grupo ${pairMap.get(matches[0].pareja1)?.grupo ?? ''}`
                                  : ''}
                              </span>
                              <time>
                                {clock(time)}–{clock(time + (e.duracion_partido || 20))}
                              </time>
                            </h3>
                            <div className='pf-courts'>
                              {matches.map((m) => (
                                <article className='pf-match' key={m.id}>
                                  <div className='pf-match-meta'>
                                    <span>{m.cancha === 1 ? e.cancha1 : e.cancha2}</span>
                                    <Timer match={m} now={now} duracion={e.duracion_partido || 20} />
                                  </div>
                                  <div className='pf-score-labels'>
                                    <span>Pareja</span>
                                    <span>S1</span>
                                    <span>S2</span>
                                  </div>
                                  {[1, 2].map((side) => (
                                    <div className='pf-score-row' key={side}>
                                      <strong>
                                        <small>#{pairMap.get(m[`pareja${side}`])?.numero}</small>
                                        {label(pairMap.get(m[`pareja${side}`]))}
                                      </strong>
                                      <b>{m[`s1${side === 1 ? 'a' : 'b'}`] ?? '—'}</b>
                                      <b>{m[`s2${side === 1 ? 'a' : 'b'}`] ?? '—'}</b>
                                    </div>
                                  ))}
                                  {m.motivo && (
                                    <p className='pf-result-note'>
                                      {m.motivo === 'tiempo'
                                        ? 'Cierre por tiempo'
                                        : 'Dos sets completados'}
                                    </p>
                                  )}
                                  {official && !!e.publicado && (
                                    <div className='pf-match-actions'>
                                      {!m.inicio_real && !m.motivo && (
                                        <button
                                          className='pf-link'
                                          disabled={busy}
                                          onClick={() =>
                                            run(
                                              () =>
                                                api.start(eventId, m.id, { version: m.version }),
                                              'Cronómetro iniciado'
                                            )
                                          }
                                        >
                                          <Clock size={15} />
                                          Iniciar {e.duracion_partido || 20} min
                                        </button>
                                      )}
                                      <button
                                        className='pf-secondary'
                                        onClick={() =>
                                          open('resultado', {
                                            ...m,
                                            s1a: m.s1a ?? '',
                                            s1b: m.s1b ?? '',
                                            s2a: m.s2a ?? '',
                                            s2b: m.s2b ?? '',
                                            motivo: m.motivo || 'tiempo',
                                            correccion: '',
                                          })
                                        }
                                      >
                                        {m.motivo ? 'Editar resultado' : 'Registrar resultado'}
                                      </button>
                                    </div>
                                  )}
                                </article>
                              ))}
                            </div>
                          </section>
                        )
                      })}
                  </div>
                </>
              )}
            </>
          )}
          {tab === 'parejas' && (
            <>
              <div className='pf-section-head'>
                <div>
                  <h2>Parejas inscritas</h2>
                  <p>{pairs.length} pareja{pairs.length === 1 ? '' : 's'}</p>
                </div>
                {admin && e.votacion === 'pendiente' && !fixture.length && (
                  <button
                    className='pf-primary'
                    onClick={() =>
                      open('pareja', {
                        numero: Array.from({ length: pairs.length + 1 }, (_, i) => i + 1).find(
                          (n) => !pairs.some((p) => p.numero === n)
                        ),
                        jugador1: '',
                        jugador2: '',
                        disfraz: '',
                        no_antes: '',
                        version,
                      })
                    }
                  >
                    <Plus size={16} />
                    Inscribir
                  </button>
                )}
              </div>
              <input
                className='pf-search'
                type='search'
                aria-label='Buscar pareja'
                placeholder='Buscar pareja o jugador'
                value={query}
                onChange={(x) => setQuery(x.target.value)}
              />
              <div className='pf-pairs'>
                {pairs
                  .filter((p) => label(p).toLocaleLowerCase().includes(query.toLocaleLowerCase()))
                  .map((p) => (
                    <article className='pf-pair' key={p.id}>
                      <span className='pf-number'>{String(p.numero).padStart(2, '0')}</span>
                      <div>
                        <h3>{p.jugador1}</h3>
                        <h3>{p.jugador2}</h3>
                        <p>{p.disfraz || 'Disfraz por anunciar'}</p>
                        {(p.grupo || p.no_antes != null) && (
                          <p className='pf-muted'>
                            {p.grupo ? `Grupo ${p.grupo}` : ''}
                            {p.grupo && p.no_antes != null ? ' · ' : ''}
                            {p.no_antes != null ? `No antes de ${clock(p.no_antes)}` : ''}
                          </p>
                        )}
                      </div>
                      {admin && e.votacion === 'pendiente' && (
                        <button
                          className='pf-link'
                          onClick={() => open('pareja', { ...p, version })}
                        >
                          Editar
                        </button>
                      )}
                    </article>
                  ))}
              </div>
            </>
          )}
          {tab === 'galeria' && (
            <>
              <div className='pf-section-head'>
                <div>
                  <span className='pf-eyebrow'>{stateLabel[e.votacion]}</span>
                  <h2>El disfraz de la noche</h2>
                </div>
                {data.voted && (
                  <span className='pf-status'>
                    <Check size={14} />
                    Tu voto está registrado
                  </span>
                )}
              </div>
              {e.votacion !== 'revelada' && (
                <p className='pf-muted'>
                  Un voto por navegador y teléfono. Resultados al cierre y la revelación. En caso de
                  empate, desempate presencial por aplausómetro.
                </p>
              )}
              {e.votacion === 'revelada' && winner && (
                <section className='pf-winner'>
                  <Trophy size={30} />
                  <span>MEJOR DISFRAZ</span>
                  <h2>{winner.disfraz || `Pareja ${winner.numero}`}</h2>
                  <p>{label(winner)}</p>
                  <strong>
                    {winner.votos} votos{e.desempate_pareja ? ' · Ganador del desempate' : ''}
                  </strong>
                </section>
              )}
              {data.ranking && (
                <ol className='pf-podium'>
                  {data.ranking
                    .filter((p) => p.votos > 0)
                    .filter(
                      (p) =>
                        p.votos >=
                        [...new Set(data.ranking.map((x) => x.votos))].sort((a, b) => b - a)[
                          Math.min(2, new Set(data.ranking.map((x) => x.votos)).size - 1)
                        ]
                    )
                    .map((p) => (
                      <li key={p.id}>
                        <span>{1 + data.ranking.filter((x) => x.votos > p.votos).length}</span>
                        <strong>{label(p)}</strong>
                        <b>{p.votos} votos</b>
                      </li>
                    ))}
                </ol>
              )}
              <div className='pf-gallery'>
                {pairs.map((p) => (
                  <article className='pf-costume' key={p.id}>
                    <div className='pf-photo'>
                      <CostumePhoto pair={p} />
                      <span className='pf-photo-number'>#{p.numero}</span>
                    </div>
                    <div className='pf-costume-body'>
                      <h3>{p.disfraz || `Pareja ${p.numero}`}</h3>
                      <p>{label(p)}</p>
                      {e.votacion === 'abierta' && (
                        <button
                          className='pf-primary'
                          disabled={data.voted || !p.foto_url}
                          onClick={() =>
                            open('voto', {
                              pareja_id: p.id,
                              nombre: '',
                              telefono: '',
                              consentimiento: false,
                            })
                          }
                        >
                          {data.voted ? 'Voto registrado' : 'Elegir disfraz'}
                        </button>
                      )}
                      {official && e.votacion === 'pendiente' && (
                        <label className={`pf-secondary pf-upload ${busy ? 'pf-disabled' : ''}`}>
                          <Camera size={16} />
                          {p.foto_url ? 'Cambiar foto' : 'Subir foto'}
                          <input
                            disabled={busy}
                            type='file'
                            accept='image/jpeg,image/png,image/webp'
                            onChange={(x) => {
                              const file = x.target.files[0]
                              x.target.value = ''
                              if (file)
                                run(() => api.photo(eventId, p.id, file, version), 'Foto guardada')
                            }}
                          />
                        </label>
                      )}
                    </div>
                  </article>
                ))}
              </div>
            </>
          )}
          {tab === 'gestion' && admin && (
            <div className='pf-management'>
              {!fixture.length && e.votacion === 'pendiente' && (
                <section className='pf-panel'>
                  <h2>Fecha y canchas</h2>
                  <p className='pf-muted'>
                    {e.fecha} · {e.cancha1} / {e.cancha2}
                  </p>
                  <button className='pf-secondary' onClick={() => open('evento', { ...e })}>
                    Editar evento
                  </button>
                </section>
              )}
              <section className='pf-panel'>
                <span className='pf-eyebrow'>VOTACIÓN</span>
                <h2>{stateLabel[e.votacion]}</h2>
                <p className='pf-muted'>
                  Al abrir, se cierran las fotos e inscripciones. Los votos no se pueden editar.
                </p>
                <div className='pf-toolbar'>
                  {e.votacion === 'pendiente' && (
                    <button
                      className='pf-primary'
                      disabled={busy}
                      onClick={() => changeState('abierta')}
                    >
                      Abrir votación
                    </button>
                  )}
                  {e.votacion === 'abierta' && (
                    <button
                      className='pf-secondary'
                      disabled={busy}
                      onClick={() => changeState('cerrada')}
                    >
                      Cerrar votación
                    </button>
                  )}
                  <button className='pf-secondary' disabled={busy} onClick={() => loadReport(0)}>
                    Consultar registro
                  </button>
                </div>
                {e.votacion === 'cerrada' && (
                  <div className='pf-form'>
                    {report?.ranking && (
                      <>
                        <h3>Conteo final</h3>
                        {report.ranking.map((p) => (
                          <p key={p.id}>
                            #{p.numero} {p.disfraz || label(p)} · {p.votos} votos
                          </p>
                        ))}
                        {report.ranking.filter((p) => p.votos === report.ranking[0]?.votos).length >
                          1 && (
                          <>
                            <Field title='Ganador del desempate'>
                              <select
                                value={form.desempate_pareja || ''}
                                onChange={(x) =>
                                  setForm({ ...form, desempate_pareja: x.target.value })
                                }
                              >
                                <option value=''>Seleccionar</option>
                                {report.ranking
                                  .filter((p) => p.votos === report.ranking[0]?.votos)
                                  .map((p) => (
                                    <option value={p.id} key={p.id}>
                                      #{p.numero} {label(p)}
                                    </option>
                                  ))}
                              </select>
                            </Field>
                            <Field title='Motivo del desempate'>
                              <input
                                maxLength={500}
                                value={form.desempate_motivo || ''}
                                onChange={(x) =>
                                  setForm({ ...form, desempate_motivo: x.target.value })
                                }
                              />
                            </Field>
                          </>
                        )}
                      </>
                    )}
                    <button
                      className='pf-primary'
                      disabled={busy || !report?.ranking}
                      onClick={() => changeState('revelada')}
                    >
                      Revelar resultados
                    </button>
                  </div>
                )}
              </section>
              {report && (
                <section className='pf-panel'>
                  <h2>Registro privado de votantes</h2>
                  <p className='pf-muted'>
                    Solo administración · Nombre y teléfono declarados, no verificados.
                  </p>
                  <div className='pf-voters'>
                    {report.votes.map((v) => (
                      <div key={v.id}>
                        <strong>{v.nombre}</strong>
                        <span>{v.telefono}</span>
                        <small>Pareja #{pairMap.get(v.pareja_id)?.numero}</small>
                      </div>
                    ))}
                  </div>
                  {report.next && (
                    <button
                      className='pf-secondary'
                      disabled={busy}
                      onClick={() => loadReport(report.next)}
                    >
                      Cargar más
                    </button>
                  )}
                  <details>
                    <summary>Historial de cambios</summary>
                    {report.audit.map((a) => (
                      <p key={a.id}>
                        {a.accion.replaceAll('_', ' ')} · Usuario #{a.user_id} ·{' '}
                        {new Date(a.created_at).toLocaleString('es-CO')}
                      </p>
                    ))}
                  </details>
                </section>
              )}
            </div>
          )}
        </>
      )}
      {modal && (
        <ActionDialog
          title={
            {
              evento: form.id ? 'Editar Flash de Pádel' : 'Nuevo Flash de Pádel',
              pareja: form.id ? 'Editar pareja' : 'Inscribir pareja',
              resultado: 'Resultado del partido',
              voto: 'Confirmar voto',
            }[modal]
          }
          busy={busy}
          onClose={() => setModal(null)}
        >
          <form
            className='pf-form'
            onSubmit={(x) => {
              x.preventDefault()
              if (modal === 'evento')
                run(
                  async () => {
                    const r = form.id ? await api.update(form.id, form) : await api.create(form)
                    await loadList()
                    select({ evento: form.id || r.data.id, vista: 'parejas' })
                  },
                  'Evento guardado',
                  true
                )
              if (modal === 'pareja')
                run(() => api.pair(eventId, form.id, form), 'Pareja guardada', true)
              if (modal === 'resultado')
                run(() => api.result(eventId, form.id, form), 'Resultado registrado', true)
              if (modal === 'voto')
                run(
                  () => api.vote(eventId, form),
                  'Tu voto quedó registrado. Gracias por participar.',
                  true
                )
            }}
          >
            {formError && (
              <p role='alert' className='pf-alert'>
                {formError}
              </p>
            )}
            {modal === 'evento' && (
              <>
                <Field title='Nombre'>
                  <input
                    required
                    maxLength={120}
                    value={form.nombre}
                    onChange={(x) => setForm({ ...form, nombre: x.target.value })}
                  />
                </Field>
                <Field title='Fecha'>
                  <input
                    required
                    type='date'
                    value={form.fecha}
                    onChange={(x) => setForm({ ...form, fecha: x.target.value })}
                  />
                </Field>
                <div className='pf-form-grid'>
                  {['cancha1', 'cancha2'].map((key, i) => (
                    <Field key={key} title={`Cancha ${i + 1} (opcional)`}>
                      <input
                        maxLength={80}
                        value={form[key]}
                        onChange={(x) => setForm({ ...form, [key]: x.target.value })}
                      />
                    </Field>
                  ))}
                </div>
                <div className='pf-form-grid'>
                  {[
                    ['inicio', 'Inicio'],
                    ['cierre', 'Fin del evento'],
                  ].map(([key, title]) => (
                    <Field key={key} title={title}>
                      <input
                        type='time'
                        required
                        value={clock(form[key])}
                        onChange={(x) => setForm({ ...form, [key]: minutes(x.target.value) })}
                      />
                    </Field>
                  ))}
                </div>
                <div className='pf-form-grid'>
                  <Field title='Formato'>
                    <select
                      value={form.formato || 'individual'}
                      onChange={(x) => setForm({ ...form, formato: x.target.value })}
                    >
                      <option value='individual'>Un cruce general (2 rivales por pareja)</option>
                      <option value='grupos'>Grupos · todos contra todos</option>
                    </select>
                  </Field>
                  <Field title='Duración del partido (min)'>
                    <input
                      type='number'
                      required
                      min={10}
                      max={60}
                      value={form.duracion_partido ?? 20}
                      onChange={(x) => setForm({ ...form, duracion_partido: x.target.value })}
                    />
                  </Field>
                </div>
                {form.formato === 'grupos' && (
                  <Field title='Parejas por grupo'>
                    <input
                      type='number'
                      required
                      min={3}
                      max={5}
                      value={form.tamano_grupo ?? 5}
                      onChange={(x) => setForm({ ...form, tamano_grupo: x.target.value })}
                    />
                  </Field>
                )}
                <label className='pf-consent'>
                  <input
                    type='checkbox'
                    checked={form.pausa_inicio !== '' && form.pausa_inicio != null}
                    onChange={(x) =>
                      setForm({
                        ...form,
                        pausa_inicio: x.target.checked ? form.pausa_inicio || 1200 : '',
                        pausa_fin: x.target.checked ? form.pausa_fin || 1230 : '',
                      })
                    }
                  />
                  <span>El evento incluye una pausa</span>
                </label>
                {form.pausa_inicio !== '' && form.pausa_inicio != null && (
                  <div className='pf-form-grid'>
                    {[
                      ['pausa_inicio', 'Inicio de pausa'],
                      ['pausa_fin', 'Fin de pausa'],
                    ].map(([key, title]) => (
                      <Field key={key} title={title}>
                        <input
                          type='time'
                          required
                          value={clock(form[key])}
                          onChange={(x) => setForm({ ...form, [key]: minutes(x.target.value) })}
                        />
                      </Field>
                    ))}
                  </div>
                )}
                <p className='pf-muted'>
                  {form.formato === 'grupos'
                    ? `Todos contra todos dentro de cada grupo de ${form.tamano_grupo || 5} · ${form.duracion_partido || 20} min por partido, canchas seguidas sin rotación`
                    : `2 partidos por pareja · ${form.duracion_partido || 20} min de juego + 5 min de rotación`}
                </p>
              </>
            )}
            {modal === 'pareja' && (
              <>
                <Field title='Número de pareja'>
                  <select
                    value={form.numero}
                    onChange={(x) => setForm({ ...form, numero: Number(x.target.value) })}
                  >
                    {Array.from(
                      { length: Math.max(pairs.length + 1, form.numero || 0) },
                      (_, i) => i + 1
                    )
                      .filter(
                        (n) =>
                          n === form.numero ||
                          !pairs.some((p) => p.numero === n && p.id !== form.id)
                      )
                      .map((n) => (
                        <option key={n} value={n}>
                          {n}
                        </option>
                      ))}
                  </select>
                </Field>
                {['jugador1', 'jugador2'].map((key, i) => (
                  <Field key={key} title={`Jugador ${i + 1} · Nombre y apellido`}>
                    <input
                      required
                      minLength={2}
                      maxLength={100}
                      autoComplete='off'
                      value={form[key]}
                      onChange={(x) => setForm({ ...form, [key]: x.target.value })}
                    />
                  </Field>
                ))}
                <Field title='Nombre del disfraz (opcional)'>
                  <input
                    maxLength={100}
                    value={form.disfraz}
                    onChange={(x) => setForm({ ...form, disfraz: x.target.value })}
                  />
                </Field>
                <label className='pf-consent'>
                  <input
                    type='checkbox'
                    checked={form.no_antes !== '' && form.no_antes != null}
                    onChange={(x) =>
                      setForm({
                        ...form,
                        no_antes: x.target.checked ? form.no_antes || e?.inicio || 360 : '',
                      })
                    }
                  />
                  <span>No programar su primer partido antes de cierta hora</span>
                </label>
                {form.no_antes !== '' && form.no_antes != null && (
                  <Field title='No antes de'>
                    <input
                      type='time'
                      required
                      value={clock(form.no_antes)}
                      onChange={(x) => setForm({ ...form, no_antes: minutes(x.target.value) })}
                    />
                  </Field>
                )}
              </>
            )}
            {modal === 'resultado' && (
              <>
                <p className='pf-muted'>
                  Turno {form.turno} · {form.cancha === 1 ? e.cancha1 : e.cancha2}
                </p>
                <div className='pf-result-form'>
                  <div>
                    <span>Pareja</span>
                    <b>Set 1</b>
                    <b>Set 2</b>
                  </div>
                  {[1, 2].map((side) => (
                    <div key={side}>
                      <strong>{label(pairMap.get(form[`pareja${side}`]))}</strong>
                      {[1, 2].map((set) => {
                        const key = `s${set}${side === 1 ? 'a' : 'b'}`
                        return (
                          <input
                            key={key}
                            aria-label={`Set ${set}, pareja ${side}`}
                            required={set === 1}
                            type='number'
                            inputMode='numeric'
                            min='0'
                            max='20'
                            value={form[key]}
                            onChange={(x) => setForm({ ...form, [key]: x.target.value })}
                          />
                        )
                      })}
                    </div>
                  ))}
                </div>
                <p className='pf-muted'>
                  Deja el set 2 vacío si no se jugó. Al cumplir los {e.duracion_partido || 20}{' '}
                  minutos se conserva el marcador, aunque el set esté incompleto.
                </p>
                <Field title='Cierre'>
                  <select
                    value={form.motivo}
                    onChange={(x) => setForm({ ...form, motivo: x.target.value })}
                  >
                    <option value='tiempo'>20 minutos cumplidos</option>
                    <option value='dos_sets'>Dos sets completados</option>
                  </select>
                </Field>
                {fixture.find((m) => m.id === form.id)?.motivo && (
                  <Field title='Motivo de la corrección'>
                    <input
                      required
                      maxLength={500}
                      value={form.correccion}
                      onChange={(x) => setForm({ ...form, correccion: x.target.value })}
                    />
                  </Field>
                )}
              </>
            )}
            {modal === 'voto' && (
              <>
                <div className='pf-vote-choice'>
                  <span>Tu elección</span>
                  <strong>
                    #{pairMap.get(form.pareja_id)?.numero} ·{' '}
                    {pairMap.get(form.pareja_id)?.disfraz || label(pairMap.get(form.pareja_id))}
                  </strong>
                </div>
                <Field title='Nombre y apellido'>
                  <input
                    autoComplete='name'
                    required
                    minLength={2}
                    maxLength={100}
                    value={form.nombre}
                    onChange={(x) => setForm({ ...form, nombre: x.target.value })}
                  />
                </Field>
                <Field title='Teléfono'>
                  <input
                    autoComplete='tel'
                    type='tel'
                    inputMode='tel'
                    placeholder='300 123 4567'
                    required
                    maxLength={25}
                    value={form.telefono}
                    onChange={(x) => setForm({ ...form, telefono: x.target.value })}
                  />
                </Field>
                <p className='pf-muted'>
                  Colombia: 10 dígitos. Para otro país, incluye + e indicativo.
                </p>
                <label className='pf-consent'>
                  <input
                    type='checkbox'
                    required
                    checked={form.consentimiento}
                    onChange={(x) => setForm({ ...form, consentimiento: x.target.checked })}
                  />
                  <span>
                    Acepto el uso de mi nombre y teléfono para registrar el voto y controlar
                    duplicados. Solo los verá la administración del evento. Mi voto es definitivo.
                  </span>
                </label>
              </>
            )}
            <div className='pf-form-actions'>
              {modal === 'pareja' && form.id && !fixture.length && (
                <button
                  type='button'
                  className='pf-link pf-danger'
                  disabled={busy}
                  onClick={async () => {
                    if (
                      await confirm({
                        title: 'Retirar pareja',
                        message: `Se retirará a ${label(form)} de este evento.`,
                        danger: true,
                      })
                    )
                      run(
                        () => api.removePair(eventId, form.id, { version: form.version }),
                        'Pareja retirada',
                        true
                      )
                  }}
                >
                  Retirar pareja
                </button>
              )}
              <button className='pf-primary' disabled={busy} type='submit'>
                {busy
                  ? 'Guardando…'
                  : modal === 'voto'
                    ? 'Confirmar mi voto'
                    : modal === 'evento' && !form.id
                      ? 'Crear evento'
                      : 'Guardar'}
                <ArrowRight size={16} />
              </button>
            </div>
          </form>
        </ActionDialog>
      )}
      {sorteando &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            className='fixed inset-0 z-[200] flex flex-col items-center justify-center gap-7 bg-black/55 backdrop-blur-sm px-4 py-6 overflow-y-auto'
            role='status'
            aria-live='polite'
          >
            {sorteando === 'spinning' && (
              <>
                <div className='pf-sorteo-deck'>
                  {Array.from({ length: 5 }).map((_, i) => (
                    <span key={i} className='pf-sorteo-card' />
                  ))}
                </div>
                <p className='pf-sorteo-label'>
                  <Shuffle size={20} className='pf-sorteo-icon' />
                  Sorteando cruces…
                </p>
              </>
            )}
            {sorteando === 'reveal' && (
              <div className='pf-sorteo-reveal'>
                <p className='pf-sorteo-label'>
                  <Trophy size={20} />
                  {e.formato === 'grupos' ? 'Grupos del sorteo' : 'Cruces sorteados'}
                </p>
                {e.formato === 'grupos' ? (
                  <div className='pf-sorteo-groups'>
                    {[...new Set(pairs.map((p) => p.grupo).filter(Boolean))]
                      .sort((a, b) => a - b)
                      .map((g) => (
                        <div className='pf-sorteo-group' key={g}>
                          <h4>Grupo {g}</h4>
                          {pairs
                            .filter((p) => p.grupo === g)
                            .map((p, i) => (
                              <span
                                key={p.id}
                                className='pf-sorteo-item'
                                style={{ animationDelay: `${i * 0.15}s` }}
                              >
                                {label(p)}
                              </span>
                            ))}
                        </div>
                      ))}
                  </div>
                ) : (
                  <p className='pf-sorteo-item pf-sorteo-summary'>
                    {fixture.length} partidos listos · dos encuentros por pareja
                  </p>
                )}
                <button className='pf-primary' onClick={() => setSorteando('')}>
                  Listo
                </button>
              </div>
            )}
          </div>,
          document.body
        )}
    </div>
  )
}
