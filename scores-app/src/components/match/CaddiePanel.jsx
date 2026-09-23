import { useEffect, useRef, useState } from 'react'
import api from '../../services/api'
import Button from '../ui/Button'
import { Star, Handshake, RefreshCw, CheckCircle2, ShieldCheck } from 'lucide-react'
import Modal from '../ui/Modal'
import './caddies.css'

const criteria = [
  ['atencion', 'Atención'],
  ['colaboracion', 'Colaboración'],
  ['trato', 'Trato'],
]
export default function CaddiePanel({
  matchId,
  refreshKey,
  compact = false,
  mode = 'jugador',
  onAssignment,
  onReviewed,
}) {
  const [open, setOpen] = useState(false)
  const promptedMatch = useRef(null)
  const [data, setData] = useState(null),
    [list, setList] = useState([])
  const [error, setError] = useState(''),
    [busy, setBusy] = useState(false),
    [loading, setLoading] = useState(true)
  const [caddie, setCaddie] = useState(''),
    [reason, setReason] = useState(''),
    [search, setSearch] = useState('')
  const [scores, setScores] = useState({}),
    [comment, setComment] = useState(''),
    [success, setSuccess] = useState('')
  const [reload, setReload] = useState(0)
  useEffect(() => {
    let active = true
    setLoading(true)
    setError('')
    setData(null)
    onAssignment?.({ matchId, ready: false })
    api
      .get(`/caddies/partidos/${matchId}`, { params: { vista: mode } })
      .then(async (r) => {
        if (!r.data || !Array.isArray(r.data.evaluaciones))
          throw new Error(
            'No se pudo verificar la información del caddie. Actualiza para reintentar.'
          )
        const options = r.data.puede_asignar ? (await api.get('/caddies')).data : []
        if (!active) return
        setData(r.data)
        setList(options)
        setCaddie(String(r.data.caddie?.id || ''))
        // Prompt only once per entry: closing or refreshing must not reopen it.
        if (compact && r.data.puede_asignar && promptedMatch.current !== matchId) {
          promptedMatch.current = matchId
          if (!r.data.caddie || !options.some((u) => Number(u.id) === Number(r.data.caddie.id)))
            setOpen(true)
        }
        onAssignment?.({
          matchId,
          ready: !!r.data.caddie && options.some((u) => Number(u.id) === Number(r.data.caddie.id)),
          nombre: r.data.caddie?.nombre,
        })
      })
      .catch((e) => {
        if (active)
          setError(e.message || 'No se pudo cargar. Comprueba tu conexión e inténtalo otra vez.')
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [matchId, refreshKey, reload, mode, onAssignment, compact])
  useEffect(() => {
    setScores({})
    setComment('')
    setReason('')
    setSuccess('')
  }, [matchId])
  async function save(e, review) {
    e.preventDefault()
    if (busy || !data) return
    setBusy(true)
    setError('')
    setSuccess('')
    try {
      if (review)
        await api.post(`/caddies/partidos/${matchId}/evaluacion`, {
          ...scores,
          comentario: comment,
          version: data.version,
        })
      else
        await api.put(`/caddies/partidos/${matchId}`, {
          caddie_id: caddie ? Number(caddie) : null,
          motivo: reason,
          version: data.version,
        })
      if (review) onReviewed?.()
      setSuccess(
        review ? 'Gracias. Tu evaluación quedó guardada.' : 'Caddie asignado correctamente.'
      )
      setReason('')
      setReload((n) => n + 1)
    } catch (err) {
      setError(err.message || 'No se guardó. Conservamos tus datos para reintentar.')
    } finally {
      setBusy(false)
    }
  }
  const average = data?.evaluaciones?.length
    ? data.evaluaciones.reduce((sum, r) => sum + r.atencion + r.colaboracion + r.trato, 0) /
      (data.evaluaciones.length * 3)
    : 0
  const content = (
    <div className='space-y-4 min-w-0'>
      {loading && (
        <p role='status' className='text-sm'>
          Cargando caddie…
        </p>
      )}
      {error && (
        <div role='alert' className='text-sm rounded-xl p-3 bg-red-500/10 text-red-600 break-words'>
          {error}{' '}
          <button
            type='button'
            disabled={busy}
            className='underline ml-2'
            onClick={() => setReload((n) => n + 1)}
          >
            Actualizar
          </button>
        </div>
      )}
      {success && (
        <p role='status' className='caddie-success'>
          <CheckCircle2 size={22} />
          {success}
        </p>
      )}
      {data && (
        <>
          <div className='flex items-center justify-between gap-3'>
            <div>
              <p className='text-xs text-[var(--text-muted)]'>Caddie del partido</p>
              <p className='font-semibold'>{data.caddie?.nombre || 'Sin asignar'}</p>
            </div>
            <button
              type='button'
              aria-label='Actualizar caddie'
              className='btn-ghost p-3'
              disabled={busy}
              onClick={() => setReload((n) => n + 1)}
            >
              <RefreshCw size={16} />
            </button>
          </div>
          {data.puede_asignar && (
            <form onSubmit={(e) => save(e, false)} className='space-y-3'>
              <label className='block text-sm'>
                Buscar caddie
                <input
                  className='form-input mt-1'
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder='Nombre o apellido'
                  disabled={busy}
                />
              </label>
              <label className='block text-sm'>
                Asignación
                <select
                  className='form-input mt-1'
                  value={caddie}
                  onChange={(e) => setCaddie(e.target.value)}
                  disabled={busy}
                >
                  <option value=''>Sin asignar</option>
                  {list
                    .filter(
                      (u) =>
                        String(u.id) === caddie ||
                        `${u.nombre} ${u.apellido}`
                          .toLocaleLowerCase()
                          .includes(search.toLocaleLowerCase())
                    )
                    .map((u) => (
                      <option value={u.id} key={u.id}>
                        {u.nombre} {u.apellido}
                      </option>
                    ))}
                  {data.caddie && !list.some((u) => Number(u.id) === Number(data.caddie.id)) && (
                    <option value={data.caddie.id}>{data.caddie.nombre} (no disponible)</option>
                  )}
                </select>
              </label>
              {data.caddie && (
                <label className='block text-sm'>
                  Motivo del cambio
                  <textarea
                    className='form-input mt-1'
                    required
                    minLength={5}
                    maxLength={500}
                    rows={2}
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    disabled={busy}
                  />
                </label>
              )}
              <Button
                loading={busy}
                disabled={loading || caddie === String(data.caddie?.id || '')}
                type='submit'
                fullWidth
              >
                Guardar asignación
              </Button>
              <p className='text-xs text-[var(--text-muted)]'>
                Obligatorio antes de iniciar: selecciona un caddie y guarda la asignación. La
                marcación no se habilitará sin este paso.
              </p>
              {data.caddie && (
                <p className='text-xs text-[var(--text-muted)]'>
                  La encuesta corresponde al caddie asignado al cierre. Si hubo un reemplazo, deja
                  constancia en el motivo.
                </p>
              )}
            </form>
          )}
          {data.puede_evaluar && (
            <form onSubmit={(e) => save(e, true)} className='caddie-rating space-y-5'>
              <div>
                <h3 className='text-xl font-bold'>¿Cómo fue tu experiencia?</h3>
                <p className='text-xs text-[var(--text-muted)] mt-2'>
                  Tres pequeños gestos para mejorar el próximo partido.
                </p>
                <div className='caddie-rating-progress'>
                  <span style={{ width: `${(Object.keys(scores).length / 3) * 100}%` }} />
                </div>
                <p className='text-[11px] text-[var(--text-muted)]'>
                  {Object.keys(scores).length} de 3 valoraciones completadas
                </p>
              </div>
              {criteria.map(([key, label]) => (
                <fieldset key={key} disabled={busy}>
                  <legend>{label}</legend>
                  <div className='caddie-rating-options'>
                    {[1, 2, 3, 4, 5].map((n) => (
                      <label key={n} className='caddie-rating-choice'>
                        <input
                          className='sr-only'
                          aria-label={String(n)}
                          type='radio'
                          name={key}
                          required
                          value={n}
                          checked={scores[key] === n}
                          onChange={() => setScores((v) => ({ ...v, [key]: n }))}
                        />
                        <Star size={21} fill={scores[key] === n ? 'currentColor' : 'none'} />
                        <strong className='text-xs'>{n}</strong>
                        <small>
                          {['Mejorable', 'Regular', 'Bien', 'Muy bien', 'Excelente'][n - 1]}
                        </small>
                      </label>
                    ))}
                  </div>
                </fieldset>
              ))}
              <label className='block text-sm'>
                Comentario (opcional)
                <textarea
                  rows={3}
                  maxLength={1000}
                  className='form-input mt-1'
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  disabled={busy}
                />
              </label>
              <p className='text-xs text-[var(--text-muted)] flex gap-2'>
                <ShieldCheck size={18} className='shrink-0' />
                El caddie no verá tu nombre. Evita identificarte en el comentario. Revisa antes de
                enviar: una respuesta por persona y partido.
              </p>
              <Button type='submit' fullWidth loading={busy}>
                Enviar evaluación
              </Button>
            </form>
          )}
          {data.respondida && (
            <p className='text-sm text-[var(--color-brand)]'>
              Ya registraste tu evaluación para este partido.
            </p>
          )}
          {!!data.evaluaciones.length && (
            <div>
              <div className='caddie-average'>
                <strong>{average.toFixed(1)}</strong>
                <div>
                  <div className='flex text-[var(--color-brand)] gap-1'>
                    {[1, 2, 3, 4, 5].map((n) => (
                      <Star
                        size={13}
                        key={n}
                        fill={n <= Math.round(average) ? 'currentColor' : 'none'}
                      />
                    ))}
                  </div>
                  <p className='text-xs mt-1'>
                    {mode === 'jugador' ? 'Tu valoración' : 'Promedio de este partido'} ·{' '}
                    {data.evaluaciones.length}{' '}
                    {data.evaluaciones.length === 1 ? 'respuesta' : 'respuestas'}
                  </p>
                </div>
              </div>
              {data.evaluaciones.map((r, i) => (
                <article key={i} className='caddie-review'>
                  <div className='grid grid-cols-3 gap-2'>
                    {criteria.map(([key, label]) => (
                      <div key={key}>
                        <p className='text-[11px] text-[var(--text-muted)]'>{label}</p>
                        <p className='font-semibold'>
                          {r[key]} <span className='text-xs font-normal'>/ 5</span>
                        </p>
                      </div>
                    ))}
                  </div>
                  {r.comentario && (
                    <p className='text-sm mt-3 whitespace-pre-wrap break-words italic'>
                      “{r.comentario}”
                    </p>
                  )}
                </article>
              ))}
            </div>
          )}
          {!data.puede_evaluar && !data.respondida && !data.evaluaciones.length && (
            <p className='text-xs text-[var(--text-muted)]'>
              Las evaluaciones estarán disponibles al finalizar el partido, cuando sus jugadores
              respondan.
            </p>
          )}
        </>
      )}
    </div>
  )
  if (compact)
    return (
      <>
        <button
          type='button'
          className='judge-tool'
          onClick={() => setOpen(true)}
          aria-label={data?.caddie ? 'Ver caddie asignado' : 'Asignar caddie obligatorio'}
        >
          <Handshake size={16} />
          <span>Caddie</span>
          <span
            className={`w-1.5 h-1.5 rounded-full ${data?.caddie ? 'bg-green-500' : 'bg-amber-500'}`}
          />
        </button>
        <Modal isOpen={open} title='Caddie del partido' onClose={() => setOpen(false)} busy={busy}>
          {content}
        </Modal>
      </>
    )
  return (
    <section className='caddie-panel'>
      <h2 className='caddie-panel-title'>
        <Handshake size={20} className='text-[var(--color-brand)]' />
        {mode === 'caddie'
          ? 'Así vivieron tu atención'
          : mode === 'jugador'
            ? 'Tu valoración'
            : 'Atención del caddie'}
      </h2>
      <div className='caddie-panel-content'>{content}</div>
    </section>
  )
}
