import { useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import api from '../services/api'
import useAuthStore from '../store/useAuthStore'
import CaddiePanel from '../components/match/CaddiePanel'
import Button from '../components/ui/Button'
import { userService } from '../services/userService'
import { playerService } from '../services/playerService'
import {
  Handshake,
  Star,
  CheckCircle2,
  ArrowDown,
  RefreshCw,
  LockKeyhole,
  ClipboardList,
} from 'lucide-react'
import '../components/match/caddies.css'

export default function Caddies() {
  const user = useAuthStore((s) => s.user)
  const [params] = useSearchParams()
  const requestedMatch = /^\d+$/.test(params.get('partido') || '') ? params.get('partido') : ''
  const [matches, setMatches] = useState([]),
    [selected, setSelected] = useState(requestedMatch)
  const [access, setAccess] = useState(null),
    [mode, setMode] = useState(''),
    [visible, setVisible] = useState(6)
  const [loading, setLoading] = useState(true),
    [error, setError] = useState(''),
    [reload, setReload] = useState(0)
  const [cursor, setCursor] = useState(null)
  const detailRef = useRef(null)
  useEffect(() => {
    if (!selected || !mode || !detailRef.current) return
    detailRef.current.focus({ preventScroll: true })
    detailRef.current.scrollIntoView({
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches
        ? 'instant'
        : 'smooth',
      block: 'start',
    })
  }, [selected, mode])
  useEffect(() => {
    let active = true
    api
      .get('/caddies/contexto')
      .then((r) => {
        if (!active) return
        setAccess(r.data)
        const requested = params.get('vista')
        setMode((current) =>
          current && r.data[current]
            ? current
            : r.data[requested]
              ? requested
              : r.data.gestion
                ? 'gestion'
                : r.data.caddie
                  ? 'caddie'
                  : r.data.jugador
                    ? 'jugador'
                    : ''
        )
        if (!Object.values(r.data).some(Boolean)) setLoading(false)
      })
      .catch((e) => {
        if (active) {
          setError(e.message || 'No se pudo verificar tu acceso.')
          setLoading(false)
        }
      })
    return () => {
      active = false
    }
  }, [reload])
  useEffect(() => {
    if (!mode) return
    let active = true
    setLoading(true)
    setError('')
    api
      .get('/caddies/mis-partidos', {
        params: { vista: mode, ...(cursor ? { before: cursor } : {}) },
      })
      .then((r) => {
        if (active) setMatches(r.data)
      })
      .catch((e) => {
        if (active) setError(e.message || 'No se pudieron cargar tus partidos.')
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [reload, cursor, mode])
  const views = { caddie: 'Mis actuaciones', jugador: 'Mis valoraciones', gestion: 'Supervisión' }
  const pending = matches.filter(
    (m) => m.estado === 'finalizado' && m.caddie_id && !Number(m.respondida)
  ).length
  const reviewed = matches.filter((m) => Number(m.respuestas) > 0).length
  function switchMode(next) {
    setMode(next)
    setMatches([])
    setSelected('')
    setCursor(null)
    setVisible(6)
  }
  return (
    <div className='caddie-space'>
      <header className='caddie-hero'>
        <span className='caddie-eyebrow'>
          <Handshake size={16} /> Experiencia en cancha
        </span>
        <h1>
          {mode === 'caddie'
            ? 'Tu atención deja huella.'
            : mode === 'jugador'
              ? 'El partido termina.\nTu opinión cuenta.'
              : 'Un gran partido empieza con un gran equipo.'}
        </h1>
        <p>
          {mode === 'caddie'
            ? 'Este es tu espacio: solo tus actuaciones como caddie y las valoraciones que recibiste en cada una.'
            : mode === 'jugador'
              ? 'Reconoce lo que hizo la diferencia y cuéntanos qué podemos mejorar. Tres valoraciones, menos de un minuto.'
              : 'Asigna el caddie antes del primer saque y acompaña la calidad de la atención en cancha.'}
        </p>
        <div className='caddie-metrics'>
          <div>
            <strong>{loading ? '—' : matches.length}</strong>
            <span>
              {mode === 'caddie' ? 'actuaciones en esta página' : 'partidos en esta página'}
            </span>
          </div>
          <div>
            <strong>{loading ? '—' : mode === 'jugador' ? pending : reviewed}</strong>
            <span>{mode === 'jugador' ? 'por valorar' : 'con valoraciones'}</span>
          </div>
        </div>
      </header>
      {access && Object.values(access).filter(Boolean).length > 1 && (
        <nav className='caddie-tabs' aria-label='Mi participación'>
          {Object.entries(views)
            .filter(([key]) => access[key])
            .map(([key, label]) => (
              <button key={key} aria-pressed={mode === key} onClick={() => switchMode(key)}>
                {label}
              </button>
            ))}
        </nav>
      )}
      {error && (
        <p role='alert' className='form-error'>
          {error}
        </p>
      )}
      <section className='space-y-3'>
        <div className='caddie-section-heading'>
          <div>
            <h2>{views[mode] || 'Tus partidos'}</h2>
            <p className='text-xs text-[var(--text-muted)] mt-1'>
              Elige un encuentro para{' '}
              {mode === 'jugador' ? 'compartir tu experiencia' : 'ver su detalle'}.
            </p>
          </div>
          <button
            className='btn-ghost p-3'
            aria-label='Actualizar partidos'
            disabled={loading}
            onClick={() => setReload((n) => n + 1)}
          >
            <RefreshCw size={18} />
          </button>
        </div>
        {loading ? (
          <div className='card p-6' role='status'>
            Preparando tus partidos…
          </div>
        ) : (
          <div className='caddie-match-grid'>
            {matches.slice(0, visible).map((m) => {
              const ready =
                mode === 'jugador' &&
                m.estado === 'finalizado' &&
                m.caddie_id &&
                !Number(m.respondida)
              const done = mode === 'jugador' ? Number(m.respondida) : Number(m.respuestas) > 0
              return (
                <button
                  key={m.id}
                  className='caddie-match'
                  aria-label={`Ver partido ${m.id}`}
                  aria-pressed={selected === String(m.id)}
                  onClick={() => setSelected(String(m.id))}
                >
                  <small>
                    #{m.id} · {m.torneo || 'Partido libre'}
                  </small>
                  <strong>{m.participante1}</strong>
                  <span className='caddie-match-vs'>vs.</span>
                  <strong>{m.participante2}</strong>
                  <span className={`caddie-status ${ready ? 'pending' : done ? 'done' : ''}`}>
                    {ready ? (
                      <Star size={12} />
                    ) : done ? (
                      <CheckCircle2 size={12} />
                    ) : (
                      <ClipboardList size={12} />
                    )}{' '}
                    {ready
                      ? 'Tu valoración está pendiente'
                      : done
                        ? 'Ver valoración'
                        : m.estado === 'programado'
                          ? 'Por comenzar'
                          : m.estado === 'en_vivo'
                            ? 'En juego'
                            : 'Sin valoraciones todavía'}
                  </span>
                </button>
              )
            })}
          </div>
        )}
        <div className='flex flex-wrap gap-2'>
          {visible < matches.length && (
            <Button variant='ghost' onClick={() => setVisible((n) => n + 6)}>
              Ver más <ArrowDown size={14} />
            </Button>
          )}
          {cursor && (
            <Button
              variant='ghost'
              disabled={loading}
              onClick={() => {
                setCursor(null)
                setSelected('')
                setVisible(6)
              }}
            >
              Más recientes
            </Button>
          )}
          {matches.length === 100 && (
            <Button
              variant='ghost'
              disabled={loading}
              onClick={() => {
                setCursor(matches.at(-1).id)
                setSelected('')
                setVisible(6)
              }}
            >
              Partidos anteriores
            </Button>
          )}
        </div>
        {!loading && !matches.length && (
          <div className='card p-6 text-sm text-[var(--text-muted)]'>
            {mode === 'caddie'
              ? 'Todavía no tienes partidos asignados como caddie. Aquí aparecerán únicamente tus actuaciones.'
              : 'Aún no tienes partidos disponibles. Para valorar, tu cuenta debe estar vinculada a tu jugador.'}
          </div>
        )}
      </section>
      {selected && mode && (
        <div ref={detailRef} tabIndex={-1} className='scroll-mt-24 outline-none'>
          <CaddiePanel
            key={`${mode}:${selected}`}
            mode={mode}
            matchId={selected}
            refreshKey={reload}
            onReviewed={() =>
              setMatches((rows) =>
                rows.map((m) => (String(m.id) === selected ? { ...m, respondida: 1 } : m))
              )
            }
          />
        </div>
      )}
      <p className='text-xs text-[var(--text-muted)] flex items-start gap-2'>
        <LockKeyhole size={15} className='shrink-0' />
        Las valoraciones son privadas. Como caddie solo puedes consultar las de tus propios
        partidos; no se muestran nombres de jugadores que respondieron.
      </p>
      {user?.rol === 'admin' && <RoleManager />}
    </div>
  )
}

function RoleManager() {
  const [users, setUsers] = useState([]),
    [players, setPlayers] = useState([]),
    [caddies, setCaddies] = useState([])
  const [selected, setSelected] = useState(''),
    [player, setPlayer] = useState(''),
    [query, setQuery] = useState('')
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [success, setSuccess] = useState(''),
    [ready, setReady] = useState(false)
  async function load() {
    setReady(false)
    setError('')
    try {
      const [u, p, c] = await Promise.all([
        userService.getAll(),
        playerService.getAdminAll({ activo: 'true' }),
        api.get('/caddies'),
      ])
      setUsers(u.data)
      setPlayers(p.data.filter((p) => p.activo && !p.usuario))
      setCaddies(c.data)
      setReady(true)
    } catch (e) {
      setError(e.message || 'No se pudieron cargar las cuentas.')
    }
  }
  useEffect(() => {
    load()
  }, [])
  const account = users.find((u) => String(u.id) === selected),
    enabled = caddies.some((u) => String(u.id) === selected)
  async function change(link) {
    if (!selected || busy) return
    setBusy(true)
    setError('')
    setSuccess('')
    try {
      await api.put(
        `/caddies/usuarios/${selected}/${link ? 'jugador' : 'rol'}`,
        link ? { jugador_id: Number(player) } : { activo: !enabled }
      )
      setSuccess(
        link ? 'Jugador vinculado.' : 'Rol de caddie actualizado. El rol principal no cambió.'
      )
      setPlayer('')
      await load()
    } catch (e) {
      setError(e.message || 'No se pudo guardar. Reintenta.')
    } finally {
      setBusy(false)
    }
  }
  return (
    <details className='card p-4'>
      <summary className='font-semibold cursor-pointer'>Administrar roles y jugadores</summary>
      <div className='space-y-3 mt-4'>
        <p className='text-xs text-[var(--text-muted)]'>
          Una sola cuenta puede ser juez, caddie y jugador. Crea las cuentas nuevas en Usuarios y
          habilita aquí su rol adicional de caddie.
        </p>
        {error && (
          <p role='alert' className='form-error'>
            {error}{' '}
            <button className='underline' disabled={busy} onClick={load}>
              Reintentar
            </button>
          </p>
        )}
        {success && (
          <p role='status' className='text-sm text-[var(--color-brand)]'>
            {success}
          </p>
        )}
        <label className='block text-sm'>
          Buscar persona
          <input
            className='form-input mt-1'
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            disabled={busy}
          />
        </label>
        <label className='block text-sm'>
          Cuenta
          <select
            className='form-input mt-1'
            disabled={busy || !ready}
            value={selected}
            onChange={(e) => {
              setSelected(e.target.value)
              setPlayer('')
              setSuccess('')
            }}
          >
            <option value=''>Seleccionar persona</option>
            {users
              .filter(
                (u) =>
                  String(u.id) === selected ||
                  `${u.nombre} ${u.apellido}`.toLowerCase().includes(query.toLowerCase())
              )
              .map((u) => (
                <option key={u.id} value={u.id}>
                  {u.nombre} {u.apellido} · {u.rol}
                </option>
              ))}
          </select>
        </label>
        {account && (
          <>
            <p className='text-sm'>
              Caddie: <strong>{enabled ? 'Habilitado' : 'No habilitado'}</strong> · Jugador:{' '}
              {account.jugador ? 'Vinculado' : 'Sin vincular'}
            </p>
            <Button fullWidth disabled={busy || !ready} onClick={() => change(false)}>
              {enabled ? 'Deshabilitar rol de caddie' : 'Habilitar rol de caddie'}
            </Button>
            {!account.jugador && (
              <>
                <label className='block text-sm'>
                  Vincular jugador existente
                  <select
                    className='form-input mt-1'
                    disabled={busy}
                    value={player}
                    onChange={(e) => setPlayer(e.target.value)}
                  >
                    <option value=''>Seleccionar jugador</option>
                    {players.map((p) => (
                      <option value={p.id} key={p.id}>
                        {p.nombre} {p.apellido}
                      </option>
                    ))}
                  </select>
                </label>
                <Button
                  variant='secondary'
                  fullWidth
                  disabled={busy || !player}
                  onClick={() => change(true)}
                >
                  Vincular a esta cuenta
                </Button>
              </>
            )}
          </>
        )}
      </div>
    </details>
  )
}
