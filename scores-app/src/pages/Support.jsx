import { useEffect, useState } from 'react'
import api from '../services/api'
import useAuthStore from '../store/useAuthStore'
import ActionDialog from '../components/common/ActionDialog'

const states = { abierto: 'Abierto', en_revision: 'En revisión', resuelto: 'Resuelto' }
const initial = () => ({
  asunto: '',
  mensaje: '',
  categoria: 'tecnico',
  prioridad: 'media',
  request_id: crypto.randomUUID(),
})
export default function Support() {
  const admin = useAuthStore((s) => s.user?.rol === 'admin')
  const [items, setItems] = useState([]),
    [ticket, setTicket] = useState(null)
  const [creating, setCreating] = useState(false),
    [form, setForm] = useState(initial)
  const [reply, setReply] = useState(''),
    [status, setStatus] = useState('en_revision')
  const [busy, setBusy] = useState(false),
    [loading, setLoading] = useState(true),
    [error, setError] = useState('')
  const load = async () => {
    setLoading(true)
    try {
      setItems((await api.get('/tickets')).data)
      setError('')
    } catch (e) {
      setError(e.message || 'No se pudo cargar. Reintenta cuando tengas conexión.')
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => {
    void load()
  }, [])
  const open = async (id) => {
    setBusy(true)
    setError('')
    try {
      const data = (await api.get(`/tickets/${id}`)).data
      setTicket(data)
      setReply('')
      setStatus(data.estado)
    } catch (e) {
      setError(e.message || 'No se pudo abrir la solicitud.')
    } finally {
      setBusy(false)
    }
  }
  const submit = async (e) => {
    e.preventDefault()
    if (busy) return
    setBusy(true)
    setError('')
    try {
      if (creating) {
        await api.post('/tickets', form)
        setCreating(false)
        setForm(initial())
      } else {
        await api.put(`/tickets/${ticket.id}/responder`, {
          mensaje: reply,
          estado: status,
          version: ticket.version,
        })
        setTicket(null)
      }
      await load()
    } catch (e) {
      setError(e.message || 'No se pudo enviar. Conservamos el texto para que puedas reintentar.')
    } finally {
      setBusy(false)
    }
  }
  const field = (name, value) => setForm((f) => ({ ...f, [name]: value }))
  return (
    <section className='space-y-5'>
      <header className='flex flex-wrap justify-between gap-3 items-center'>
        <div>
          <h1 className='text-2xl font-bold'>{admin ? 'Tickets de soporte' : 'Soporte'}</h1>
          <p className='text-sm text-[var(--text-secondary)]'>
            {admin
              ? 'Revisa solicitudes y responde a los jueces.'
              : 'Reporta un inconveniente y consulta la respuesta de administración.'}
          </p>
        </div>
        <button
          className='btn-primary px-4 py-2'
          onClick={() => {
            setCreating(true)
            setError('')
          }}
        >
          Nueva solicitud
        </button>
      </header>
      {error && !creating && !ticket && (
        <p role='alert' className='text-red-600'>
          {error}
        </p>
      )}
      <div className='flex justify-between gap-3 text-sm'>
        <span>Últimas 100 solicitudes · {items.length} mostradas</span>
        <button className='underline' disabled={loading || busy} onClick={load}>
          Actualizar
        </button>
      </div>
      {loading ? (
        <p role='status'>Cargando solicitudes…</p>
      ) : items.length === 0 ? (
        <div className='card p-6'>Todavía no hay solicitudes.</div>
      ) : (
        <div className='grid gap-3'>
          {items.map((t) => (
            <button
              disabled={busy}
              key={t.id}
              onClick={() => open(t.id)}
              className='card p-4 text-left space-y-2 hover:border-[var(--color-brand)]'
            >
              <div className='flex flex-wrap justify-between gap-2'>
                <strong className='break-words min-w-0'>
                  #{t.id} · {t.asunto}
                </strong>
                <span className='text-sm rounded-full bg-[var(--bg-hover)] px-3 py-1'>
                  {states[t.estado] || t.estado}
                </span>
              </div>
              <p className='text-sm text-[var(--text-secondary)]'>
                {admin && `${t.autor} · `}Prioridad {t.prioridad}
              </p>
            </button>
          ))}
        </div>
      )}
      {(creating || ticket) && (
        <ActionDialog
          title={creating ? 'Nueva solicitud' : `Solicitud #${ticket.id}`}
          busy={busy}
          onClose={() => {
            setCreating(false)
            setTicket(null)
            setError('')
          }}
        >
          {error && (
            <p role='alert' className='text-red-600'>
              {error}
            </p>
          )}
          {creating ? (
            <form onSubmit={submit} className='space-y-4'>
              <label className='block'>
                Asunto
                <input
                  className='form-input w-full mt-1'
                  required
                  maxLength={160}
                  value={form.asunto}
                  onChange={(e) => field('asunto', e.target.value)}
                />
              </label>
              <div className='grid grid-cols-2 gap-3'>
                <label>
                  Tipo
                  <select
                    className='form-input w-full mt-1'
                    value={form.categoria}
                    onChange={(e) => field('categoria', e.target.value)}
                  >
                    {Object.entries({
                      marcador: 'Marcador',
                      cancha: 'Cancha',
                      pelotas: 'Pelotas',
                      jugador: 'Jugador',
                      tecnico: 'Problema técnico',
                      otro: 'Otro',
                    }).map(([v, l]) => (
                      <option key={v} value={v}>
                        {l}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Prioridad
                  <select
                    className='form-input w-full mt-1'
                    value={form.prioridad}
                    onChange={(e) => field('prioridad', e.target.value)}
                  >
                    {['baja', 'media', 'alta', 'urgente'].map((v) => (
                      <option key={v} value={v}>
                        {v}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <label className='block'>
                ¿Qué ocurrió?
                <textarea
                  className='form-input w-full mt-1'
                  required
                  rows={5}
                  maxLength={4000}
                  value={form.mensaje}
                  onChange={(e) => field('mensaje', e.target.value)}
                />
              </label>
              <p className='text-xs text-[var(--text-muted)]'>
                Indica el partido o cancha si corresponde. No incluyas contraseñas. Para una
                urgencia en cancha, avisa también directamente al director.
              </p>
              <button disabled={busy} className='btn-primary px-4 py-2'>
                {busy ? 'Enviando…' : 'Enviar solicitud'}
              </button>
            </form>
          ) : (
            <div className='space-y-4'>
              <h3 className='font-semibold break-words'>{ticket.asunto}</h3>
              <p className='text-sm'>
                {states[ticket.estado]} · Prioridad {ticket.prioridad}
              </p>
              <p className='whitespace-pre-wrap break-words'>{ticket.mensaje}</p>
              <h3 className='font-semibold'>Respuestas</h3>
              {ticket.respuestas.length === 0 && <p className='text-sm'>Aún no hay respuestas.</p>}
              {ticket.respuestas.map((r) => (
                <article key={r.id} className='rounded-xl bg-[var(--bg-hover)] p-3'>
                  <strong className='text-sm'>{r.autor}</strong>
                  <p className='whitespace-pre-wrap break-words'>{r.mensaje}</p>
                </article>
              ))}
              {admin && (
                <form onSubmit={submit} className='space-y-3'>
                  <label className='block'>
                    Estado
                    <select
                      className='form-input w-full'
                      value={status}
                      onChange={(e) => setStatus(e.target.value)}
                    >
                      {Object.entries(states).map(([v, l]) => (
                        <option value={v} key={v}>
                          {l}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className='block'>
                    Respuesta
                    <textarea
                      className='form-input w-full'
                      required
                      maxLength={4000}
                      rows={4}
                      value={reply}
                      onChange={(e) => setReply(e.target.value)}
                    />
                  </label>
                  <button disabled={busy} className='btn-primary px-4 py-2'>
                    {busy ? 'Guardando…' : 'Guardar respuesta'}
                  </button>
                </form>
              )}
            </div>
          )}
        </ActionDialog>
      )}
    </section>
  )
}
