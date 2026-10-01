import { useState } from 'react'
import { createPortal } from 'react-dom'
import { useDialogFocus } from '../../hooks/useDialogFocus'
import { History, Search, UserMinus, RefreshCw, X, ShieldAlert } from 'lucide-react'

export default function ModalAuditoriaParticipacion({ isOpen, onClose, audit = [] }) {
  const [search, setSearch] = useState('')
  const dialogRef = useDialogFocus(isOpen, onClose, false)

  if (!isOpen) return null

  const filtered = audit.filter((a) => {
    const term = search.toLowerCase()
    const pName = (a.participante_nombre || `${a.tipo} #${a.participante_id}`).toLowerCase()
    const actor = (a.actor_nombre || a.actor_email || `Admin #${a.actor_id}`).toLowerCase()
    const motivo = (a.motivo || '').toLowerCase()
    return pName.includes(term) || actor.includes(term) || motivo.includes(term)
  })

  return createPortal(
    <div
      ref={dialogRef}
      className='fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs'
      role='dialog'
      aria-modal='true'
      aria-labelledby='modal-auditoria-title'
    >
      <div className='card w-full max-w-lg max-h-[85vh] flex flex-col shadow-2xl border border-[var(--border-color)] rounded-2xl animate-in fade-in zoom-in-95 duration-150'>
        {/* Header */}
        <div className='flex items-center justify-between gap-3 p-3.5 sm:p-4 border-b border-[var(--border-color)]'>
          <div className='flex items-center gap-2 text-[var(--color-brand)]'>
            <History className='w-4 h-4 shrink-0' />
            <div>
              <h3 id='modal-auditoria-title' className='font-bold text-sm sm:text-base text-[var(--text-primary)]'>
                Auditoría de Retiros
              </h3>
              <p className='text-[11px] text-[var(--text-muted)]'>
                Historial de retiros y reactivaciones
              </p>
            </div>
          </div>
          <button
            type='button'
            onClick={onClose}
            className='btn-ghost p-1 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)]'
            aria-label='Cerrar'
          >
            <X className='w-4 h-4' />
          </button>
        </div>

        {/* Buscador */}
        <div className='p-3 border-b border-[var(--border-color)] bg-[var(--bg-secondary)]/40'>
          <div className='relative'>
            <Search className='w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]' />
            <input
              type='text'
              className='form-input w-full pl-8 pr-7 text-xs py-1.5 rounded-xl'
              placeholder='Buscar por pareja, admin o motivo…'
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search && (
              <button
                type='button'
                onClick={() => setSearch('')}
                className='absolute right-2 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-primary)] p-0.5'
              >
                <X className='w-3 h-3' />
              </button>
            )}
          </div>
        </div>

        {/* Lista de Eventos */}
        <div className='p-3 sm:p-4 overflow-y-auto space-y-2.5 flex-1'>
          {!audit.length ? (
            <div className='text-center py-8 text-[var(--text-muted)] space-y-1.5'>
              <ShieldAlert className='w-6 h-6 mx-auto opacity-40' />
              <p className='text-xs'>Aún no hay retiros ni reactivaciones registrados.</p>
            </div>
          ) : !filtered.length ? (
            <div className='text-center py-8 text-[var(--text-muted)]'>
              <p className='text-xs'>No se encontraron registros con esa búsqueda.</p>
            </div>
          ) : (
            filtered.map((item) => {
              const isRetiro = Boolean(item.retirado)
              const dateStr = new Date(item.created_at).toLocaleString('es-CO', {
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })

              return (
                <article
                  key={item.id}
                  className='p-2.5 sm:p-3 rounded-xl border border-[var(--border-color)] bg-[var(--bg-hover)] space-y-1.5 text-xs'
                >
                  <div className='flex items-center justify-between gap-1.5'>
                    <div className='flex items-center gap-1.5 min-w-0'>
                      <span
                        className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-semibold shrink-0 ${
                          isRetiro
                            ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
                            : 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                        }`}
                      >
                        {isRetiro ? <UserMinus className='w-2.5 h-2.5' /> : <RefreshCw className='w-2.5 h-2.5' />}
                        {isRetiro ? 'Retiro' : 'Reactivado'}
                      </span>
                      <strong className='text-[var(--text-primary)] truncate text-xs'>
                        {item.participante_nombre || `${item.tipo === 'pareja' ? 'Pareja' : 'Jugador'} #${item.participante_id}`}
                      </strong>
                    </div>
                    <span className='text-[10px] text-[var(--text-muted)] shrink-0'>{dateStr}</span>
                  </div>

                  <p className='text-[11px] text-[var(--text-primary)] bg-[var(--bg-card)] p-2 rounded-lg border border-[var(--border-color)]/60 italic'>
                    "{item.motivo}"
                  </p>

                  <div className='flex items-center justify-between text-[10px] text-[var(--text-muted)] pt-0.5'>
                    <span className='truncate'>
                      Por: <strong className='text-[var(--text-secondary)]'>{item.actor_nombre || item.actor_email || `Admin #${item.actor_id}`}</strong>
                    </span>
                    <span className='shrink-0 ml-2'>#{item.id}</span>
                  </div>
                </article>
              )
            })
          )}
        </div>

        {/* Footer */}
        <div className='p-2.5 border-t border-[var(--border-color)] flex justify-end bg-[var(--bg-secondary)]/30'>
          <button type='button' onClick={onClose} className='btn-secondary px-3 py-1.5 text-xs rounded-xl'>
            Cerrar
          </button>
        </div>
      </div>
    </div>, document.body
  )
}
