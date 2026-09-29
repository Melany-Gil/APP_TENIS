import { useEffect, useState } from 'react'
import { ShieldCheck, History, UserMinus } from 'lucide-react'
import { tournamentService } from '../../services/tournamentService'
import { confirm } from '../../utils/confirm'

export default function TournamentRetirements({ tournamentId, onChange }) {
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [busy, setBusy] = useState(false)
  const [selection, setSelection] = useState('')
  const [reason, setReason] = useState('')
  const [revision, setRevision] = useState(0)
  useEffect(() => {
    let active = true
    setData(null)
    Promise.all([
      tournamentService.getRetirementParticipants(tournamentId),
      tournamentService.getRetirements(tournamentId),
      tournamentService.getRetirementAudit(tournamentId),
    ])
      .then(([p, s, a]) => {
        if (active) setData({ participants: p.data, states: s.data, audit: a.data })
      })
      .catch((e) => {
        if (active) setError(e.message || 'No se pudo cargar la participación')
      })
    return () => {
      active = false
    }
  }, [tournamentId, revision])
  const participant = data?.participants.find((p) => `${p.tipo}:${p.participante_id}` === selection)
  const state = data?.states.estados.find(
    (s) => s.tipo === participant?.tipo && s.participante_id === participant?.participante_id
  )
  const effective =
    participant &&
    data.states[participant.tipo === 'pareja' ? 'parejas' : 'jugadores'].includes(
      participant.participante_id
    )
  const inherited = effective && !state?.retirado
  const save = async (e) => {
    e.preventDefault()
    if (!participant || busy || inherited) return
    if (
      !(await confirm({
        title: state?.retirado ? 'Reactivar participación' : 'Registrar retiro del torneo',
        message: `${participant.nombre}. El historial y los resultados se conservarán. Este cambio solo afecta a este torneo; los partidos pendientes no se resolverán automáticamente.`,
        confirmLabel: state?.retirado ? 'Reactivar' : 'Registrar retiro',
      }))
    )
      return
    setBusy(true)
    setError('')
    setNotice('')
    try {
      const res = await tournamentService.setRetirement(tournamentId, {
        tipo: participant.tipo,
        participante_id: participant.participante_id,
        retirado: !state?.retirado,
        version: state?.version || 0,
        motivo: reason.trim(),
      })
      setNotice(res.data.message)
      setReason('')
      onChange?.()
    } catch (e) {
      setError(e.message || 'No se pudo guardar el cambio')
    } finally {
      setBusy(false)
      setRevision((v) => v + 1)
    }
  }
  return (
    <section className='card overflow-hidden'>
      <header className='p-4 sm:p-5 bg-[var(--bg-hover)] flex gap-3 items-start'>
        <ShieldCheck className='shrink-0 text-[var(--color-brand)]' size={24} />
        <div>
          <h2 className='font-bold text-lg'>Participación en el torneo</h2>
          <p className='text-sm text-[var(--text-secondary)] mt-1'>
            Gestiona retiros sin borrar la historia deportiva. Los motivos son privados para
            administración.
          </p>
        </div>
      </header>
      <div className='p-4 sm:p-5 space-y-4'>
        {error && (
          <p role='alert' className='text-sm text-red-600'>
            {error}
          </p>
        )}
        {notice && (
          <p role='status' className='rounded-xl p-3 text-sm bg-[var(--bg-hover)]'>
            {notice}
          </p>
        )}
        {!data ? (
          <button
            className='btn-secondary'
            onClick={() => {
              setError('')
              setRevision((v) => v + 1)
            }}
          >
            Actualizar participación
          </button>
        ) : (
          <>
            <form onSubmit={save} className='space-y-4'>
              <label className='block text-sm font-medium'>
                Jugador o pareja
                <select
                  aria-label='Jugador o pareja'
                  className='form-input mt-2'
                  value={selection}
                  disabled={busy}
                  onChange={(e) => {
                    setSelection(e.target.value)
                    setReason('')
                    setNotice('')
                  }}
                >
                  <option value=''>Selecciona un participante</option>
                  {data.participants.map((p) => (
                    <option
                      key={`${p.tipo}:${p.participante_id}`}
                      value={`${p.tipo}:${p.participante_id}`}
                    >
                      {p.tipo === 'pareja' ? 'Pareja' : 'Jugador'} · {p.nombre}
                      {data.states[p.tipo === 'pareja' ? 'parejas' : 'jugadores'].includes(
                        p.participante_id
                      )
                        ? ' · Retirado'
                        : ''}
                    </option>
                  ))}
                </select>
              </label>
              {inherited ? (
                <p className='text-sm rounded-xl p-3 bg-[var(--bg-hover)]'>
                  Esta pareja no está disponible porque uno de sus jugadores se retiró. Selecciona
                  al jugador para gestionar su reactivación.
                </p>
              ) : (
                participant && (
                  <>
                    <label className='block text-sm font-medium'>
                      Motivo privado {state?.retirado ? 'de reactivación' : 'del retiro'}
                  <textarea
                    aria-label={state?.retirado ? 'Motivo privado de reactivación' : 'Motivo privado del retiro'}
                        className='form-input mt-2 resize-y'
                        rows={3}
                        required
                        minLength={3}
                        maxLength={500}
                        value={reason}
                        disabled={busy}
                        onChange={(e) => setReason(e.target.value)}
                        placeholder='Solo visible para administradores'
                      />
                    </label>
                    <button
                      type='submit'
                      className='btn-primary w-full sm:w-auto flex items-center justify-center gap-2'
                      disabled={busy || reason.trim().length < 3}
                    >
                      <UserMinus size={16} />
                      {busy
                        ? 'Guardando…'
                        : state?.retirado
                          ? 'Reactivar en este torneo'
                          : 'Registrar retiro del torneo'}
                    </button>
                  </>
                )
              )}
            </form>
            <details className='rounded-xl border border-[var(--border-color)] p-3'>
              <summary className='cursor-pointer text-sm font-semibold'>
                <History size={15} className='inline mr-2' />
                Historial privado de cambios
              </summary>
              <div className='mt-3 space-y-3 max-h-80 overflow-y-auto'>
                {!data.audit.length && (
                  <p className='text-sm text-[var(--text-muted)]'>
                    Aún no hay cambios registrados.
                  </p>
                )}
                {data.audit.map((a) => (
                  <article
                    key={a.id}
                    className='text-sm border-t border-[var(--border-color)] pt-3 break-words'
                  >
                    <strong>
                      {data.participants.find(
                        (p) => p.tipo === a.tipo && p.participante_id === Number(a.participante_id)
                      )?.nombre || `${a.tipo} #${a.participante_id}`}
                    </strong>
                    <p>
                      {a.retirado ? 'Retiro' : 'Reactivación'} ·{' '}
                      {new Date(a.created_at).toLocaleString('es-CO')} · Admin #{a.actor_id}
                    </p>
                    <p className='text-[var(--text-secondary)] mt-1 whitespace-pre-wrap'>
                      {a.motivo}
                    </p>
                  </article>
                ))}
              </div>
            </details>
          </>
        )}
      </div>
    </section>
  )
}
