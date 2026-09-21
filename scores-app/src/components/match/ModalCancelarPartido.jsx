import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { X, Ban, AlertTriangle } from 'lucide-react'
import { matchService } from '../../services/matchService'
import useUIStore from '../../store/useUIStore'
import { getParticipantName } from '../../utils/matchParticipants'
import { useDialogFocus } from '../../hooks/useDialogFocus'
import { useMatchClosure } from '../../hooks/useMatchClosure'

const QUICK_CANCEL_REASONS = [
  'Lluvia / Inclemencias climáticas',
  'Cancelación por mutuo acuerdo',
  'Incomparecencia de ambos participantes',
  'Causa de fuerza mayor / Falta de luz',
]

export default function ModalCancelarPartido({ isOpen, onClose, match, onSuccess }) {
  const { addToast } = useUIStore()
  const closure = useMatchClosure(isOpen, match)
  const [motivo, setMotivo] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const dialogRef = useDialogFocus(isOpen, onClose, saving)

  useEffect(() => {
    if (!isOpen) return
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prevOverflow
    }
  }, [isOpen])

  useEffect(() => {
    if (!isOpen || !match) return
    setMotivo('')
    setError('')
  }, [isOpen, match])

  if (!isOpen || !match) return null

  const p1 = getParticipantName(match, 1) || 'Participante 1'
  const p2 = getParticipantName(match, 2) || 'Participante 2'

  const handleSave = async (e) => {
    e?.preventDefault?.()
    if (saving) return
    if (!closure.snapshot) { setError(closure.error || 'Espera mientras se verifica el partido.'); return }
    const cleanMotivo = motivo.trim()
    if (cleanMotivo.length < 3) {
      setError('Debes especificar el motivo de la cancelación (mínimo 3 caracteres)')
      return
    }

    setSaving(true)
    setError('')

    try {
      const res = await matchService.cancelMatch(
        match.id,
        match.control_version,
        cleanMotivo,
        closure.snapshot
      )
      addToast({
        type: 'success',
        title: 'Partido cancelado',
        message: 'El encuentro ha sido cancelado y registrado en la auditoría.',
      })
      if (onSuccess) onSuccess(res.data)
      onClose()
    } catch (err) {
      setError(err.message || 'Error al cancelar el partido')
    } finally {
      setSaving(false)
    }
  }

  const modalContent = (
    <div
      className='fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-4 animate-fade-in'
      style={{ backgroundColor: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)' }}
      onClick={() => !saving && onClose()}
      role='dialog'
      ref={dialogRef}
      tabIndex={-1}
      aria-modal='true'
      aria-labelledby='modal-cancelar-title'
    >
      <div
        className='card w-full max-w-lg max-h-[90vh] flex flex-col shadow-2xl border animate-scale-up'
        style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Encabezado */}
        <div className='flex items-center justify-between p-4 sm:p-5 border-b' style={{ borderColor: 'var(--border-color)' }}>
          <div className='flex items-center gap-2.5'>
            <div
              className='w-9 h-9 rounded-xl flex items-center justify-center text-red-400'
              style={{ backgroundColor: 'rgba(239, 68, 68, 0.15)' }}
            >
              <Ban className='w-5 h-5' />
            </div>
            <div>
              <h2 id='modal-cancelar-title' className='text-base font-bold' style={{ color: 'var(--text-primary)' }}>
                Cancelar Partido
              </h2>
              <p className='text-xs' style={{ color: 'var(--text-muted)' }}>
                {p1} vs {p2}
              </p>
            </div>
          </div>
          <button
            onClick={() => !saving && onClose()}
            className='btn-ghost p-1.5'
            aria-label='Cerrar'
            disabled={saving}
          >
            <X className='w-5 h-5' />
          </button>
        </div>

        {/* Formulario */}
        <form onSubmit={handleSave} className='p-4 sm:p-5 space-y-4 overflow-y-auto'>
          {/* Advertencia */}
          <div
            className='p-3 rounded-xl border flex items-start gap-2.5 text-xs'
            style={{
              backgroundColor: 'rgba(239, 68, 68, 0.08)',
              borderColor: 'rgba(239, 68, 68, 0.3)',
              color: 'var(--text-primary)',
            }}
          >
            <AlertTriangle className='w-4 h-4 text-red-500 shrink-0 mt-0.5' />
            <div>
              <span className='font-bold block text-red-500 mb-0.5'>Atención: Cancelación de Encuentro</span>
              El partido pasará a estado <strong>Cancelado</strong>, se bajará de los marcadores en vivo y no se declarará ganador.
            </div>
          </div>

          {/* Motivo de Cancelación */}
          <div>
            <label className='block text-xs font-bold uppercase tracking-wider mb-1.5' style={{ color: 'var(--text-primary)' }}>
              Motivo de Cancelación <span className='text-red-500'>*</span>
            </label>

            {/* Motivos rápidos */}
            <div className='flex flex-wrap gap-1.5 mb-2'>
              {QUICK_CANCEL_REASONS.map((r) => (
                <button
                  key={r}
                  type='button'
                  onClick={() => setMotivo(r)}
                  className='text-[11px] px-2.5 py-1 rounded-lg border transition-colors'
                  style={{
                    backgroundColor: motivo === r ? 'rgba(239, 68, 68, 0.15)' : 'var(--bg-primary)',
                    borderColor: motivo === r ? 'rgba(239, 68, 68, 0.5)' : 'var(--border-color)',
                    color: motivo === r ? '#ef4444' : 'var(--text-muted)',
                  }}
                >
                  {r}
                </button>
              ))}
            </div>

            <textarea
              className='form-input text-xs w-full resize-none'
              rows={3}
              required
              minLength={3}
              maxLength={500}
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              placeholder='Indica la razón por la cual se cancela el partido...'
            />
            <span className='text-[10px] text-[var(--text-muted)] mt-1 block'>
              Mínimo 3 caracteres. Quedará registrado en el historial y notas del partido.
            </span>
          </div>

          {error && (
            <p role='alert' className='text-xs text-red-500 bg-red-500/10 p-2.5 rounded-lg border border-red-500/20 font-medium'>
              {error}
            </p>
          )}

          {/* Botones de acción */}
          <div className='flex items-center justify-end gap-2 pt-2 border-t' style={{ borderColor: 'var(--border-color)' }}>
            <button
              type='button'
              onClick={onClose}
              className='btn-secondary text-xs px-3 py-2'
              disabled={saving}
            >
              Cerrar
            </button>
            <button
              type='submit'
              className='btn-danger text-xs px-4 py-2 flex items-center gap-1.5'
              disabled={saving || motivo.trim().length < 3}
            >
              <Ban size={14} />
              <span>{saving ? 'Cancelando…' : 'Confirmar Cancelación'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  )

  return createPortal(modalContent, document.body)
}
