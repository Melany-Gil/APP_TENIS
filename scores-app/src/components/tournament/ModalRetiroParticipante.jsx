import { useState } from 'react'
import { createPortal } from 'react-dom'
import { useDialogFocus } from '../../hooks/useDialogFocus'
import { AlertCircle, ShieldCheck, UserMinus, RefreshCw, X } from 'lucide-react'
import { tournamentService } from '../../services/tournamentService'
import useUIStore from '../../store/useUIStore'
import useAuthStore from '../../store/useAuthStore'

export default function ModalRetiroParticipante({
  isOpen,
  onClose,
  participant,
  tournamentId,
  isRetiring = true,
  currentVersion = 0,
  onSuccess,
}) {
  const { addToast } = useUIStore()
  const currentUser = useAuthStore((s) => s.user)
  const [motivo, setMotivo] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const dialogRef = useDialogFocus(isOpen && Boolean(participant), onClose, busy)

  if (!isOpen || !participant) return null

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (busy) return
    const cleanMotivo = motivo.trim()
    if (cleanMotivo.length < 3) {
      setError('El motivo debe tener al menos 3 caracteres.')
      return
    }

    setBusy(true)
    setError('')
    try {
      const res = await tournamentService.setRetirement(tournamentId, {
        tipo: participant.tipo,
        participante_id: participant.participante_id,
        retirado: isRetiring,
        version: currentVersion,
        motivo: cleanMotivo,
      })
      addToast(
        res?.data?.message ||
          (isRetiring
            ? 'Retiro registrado y cupo del grupo liberado.'
            : 'Participación reactivada correctamente.'),
        'success'
      )
      setMotivo('')
      onClose()
      onSuccess?.()
    } catch (err) {
      setError(err?.response?.data?.message || err.message || 'No se pudo registrar el cambio')
    } finally {
      setBusy(false)
    }
  }

  const playersLabel = [participant.jugador1, participant.jugador2]
    .filter(Boolean)
    .map((j) => `${j.nombre} ${j.apellido || ''}`.trim())
    .join(' y ')

  return createPortal(
    <div
      ref={dialogRef}
      className='fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs'
      role='dialog'
      aria-modal='true'
      aria-labelledby='modal-retiro-title'
    >
      <div className='card w-full max-w-md max-h-[90dvh] overflow-y-auto p-4 sm:p-5 space-y-3.5 shadow-2xl border border-[var(--border-color)] rounded-2xl animate-in fade-in zoom-in-95 duration-150'>
        {/* Cabecera */}
        <div className='flex items-center justify-between gap-3 border-b border-[var(--border-color)] pb-2.5'>
          <div
            className={`flex items-center gap-2 font-bold text-base sm:text-lg ${
              isRetiring ? 'text-amber-500' : 'text-emerald-500'
            }`}
          >
            {isRetiring ? (
              <UserMinus className='w-4 h-4 sm:w-5 sm:h-5 shrink-0' />
            ) : (
              <RefreshCw className='w-4 h-4 sm:w-5 sm:h-5 shrink-0' />
            )}
            <h3 id='modal-retiro-title' className='text-[var(--text-primary)]'>
              {isRetiring ? 'Retirar del Torneo' : 'Reactivar en Torneo'}
            </h3>
          </div>
          <button
            type='button'
            onClick={onClose}
            disabled={busy}
            className='btn-ghost p-1 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)]'
            aria-label='Cerrar'
          >
            <X className='w-4 h-4' />
          </button>
        </div>

        {/* Pareja / Participante */}
        <div className='p-3 rounded-xl bg-[var(--bg-hover)] space-y-1 text-xs sm:text-sm'>
          <div className='flex items-center justify-between gap-2'>
            <p className='font-bold text-[var(--text-primary)] truncate'>{participant.nombre}</p>
            {participant.categoria_nombre && (
              <span className='px-1.5 py-0.5 rounded text-[10px] font-semibold bg-[var(--color-brand)]/15 text-[var(--color-brand)] shrink-0'>
                {participant.categoria_nombre}
              </span>
            )}
          </div>
          {playersLabel && (
            <p className='text-[11px] text-[var(--text-muted)] truncate'>{playersLabel}</p>
          )}
          {participant.grupo ? (
            <p className='text-[11px] text-[var(--text-secondary)]'>
              Grupo actual:{' '}
              <strong>
                {/^grupo\b/i.test(participant.grupo.trim())
                  ? participant.grupo.trim()
                  : `Grupo ${participant.grupo.trim()}`}
              </strong>{' '}
              (quedará libre para sustituto)
            </p>
          ) : (
            <p className='text-[11px] text-[var(--text-muted)]'>
              Inscripción sin grupo asignado todavía
            </p>
          )}
        </div>

        {/* Noticia explicativa compacta */}
        <div
          className={`rounded-xl p-2.5 sm:p-3 border text-[11px] sm:text-xs flex items-start gap-2 ${
            isRetiring
              ? 'bg-amber-500/10 border-amber-500/20 text-amber-700 dark:text-amber-300'
              : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-700 dark:text-emerald-300'
          }`}
        >
          <ShieldCheck
            className={`w-4 h-4 shrink-0 mt-0.5 ${
              isRetiring ? 'text-amber-500' : 'text-emerald-500'
            }`}
          />
          <div className='space-y-0.5'>
            <p className='font-semibold'>
              {isRetiring
                ? participant.grupo
                  ? 'Cupo liberado · Historial conservado'
                  : 'Retiro de inscripción · Historial conservado'
                : 'Reincorporación inmediata'}
            </p>
            <p className='leading-tight opacity-90'>
              {isRetiring
                ? participant.pj > 0
                  ? `Tiene ${participant.pj} partido(s) jugados. Su historial y estadísticas se mantienen intactos en el torneo.`
                  : participant.grupo
                  ? 'Su espacio en el grupo quedará libre de inmediato para otra pareja.'
                  : 'Quedará registrado el retiro de la inscripción para este torneo.'
                : 'La pareja volverá a estar habilitada para programar partidos o asignarse en este torneo.'}
            </p>
          </div>
        </div>

        {error && (
          <div
            role='alert'
            className='p-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-600 dark:text-red-400 flex items-start gap-1.5'
          >
            <AlertCircle className='w-4 h-4 shrink-0 mt-0.5' />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className='space-y-3 pt-1'>
          <label className='block text-xs font-medium text-[var(--text-secondary)] space-y-1'>
            <span>
              Motivo {isRetiring ? 'del retiro' : 'de la reactivación'}{' '}
              <span className='text-red-500'>*</span>
            </span>
            <textarea
              className='form-input w-full text-xs sm:text-sm resize-none rounded-xl'
              rows={2}
              required
              minLength={3}
              maxLength={500}
              placeholder={
                isRetiring
                  ? 'Ej: Lesión de rodilla, viaje imprevisto, motivos personales...'
                  : 'Ej: Recuperado de lesión, confirmada disponibilidad...'
              }
              value={motivo}
              disabled={busy}
              onChange={(e) => setMotivo(e.target.value)}
            />
            <span className='block text-[10px] text-[var(--text-muted)]'>
              Mín. 3 caracteres · Registrado por {currentUser?.nombre || 'Admin'}
            </span>
          </label>

          <div className='flex items-center justify-end gap-2 pt-2 border-t border-[var(--border-color)]'>
            <button
              type='button'
              onClick={onClose}
              disabled={busy}
              className='btn-secondary px-3.5 py-1.5 text-xs sm:text-sm rounded-xl'
            >
              Cancelar
            </button>
            <button
              type='submit'
              disabled={busy || motivo.trim().length < 3}
              className={`btn-primary px-3.5 py-1.5 text-xs sm:text-sm rounded-xl flex items-center gap-1.5 font-medium ${
                isRetiring
                  ? 'bg-amber-600 hover:bg-amber-700 text-white'
                  : 'bg-emerald-600 hover:bg-emerald-700 text-white'
              }`}
            >
              {isRetiring ? (
                <>
                  <UserMinus className='w-3.5 h-3.5' />
                  {busy ? 'Guardando…' : 'Confirmar Retiro'}
                </>
              ) : (
                <>
                  <RefreshCw className='w-3.5 h-3.5' />
                  {busy ? 'Guardando…' : 'Confirmar Reactivación'}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>, document.body
  )
}
