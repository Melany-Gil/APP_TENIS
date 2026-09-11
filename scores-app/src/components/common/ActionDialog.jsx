import { useId } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { useDialogFocus } from '../../hooks/useDialogFocus'

export default function ActionDialog({ title, onClose, busy = false, children }) {
  const id = useId()
  const ref = useDialogFocus(true, onClose, busy)
  return createPortal(<div className='fixed inset-0 z-[100] bg-black/60 p-4 flex items-center justify-center' onClick={e => { if (e.target === e.currentTarget && !busy) onClose() }}>
    <section ref={ref} role='dialog' aria-modal='true' aria-labelledby={id} tabIndex={-1} className='card w-full max-w-2xl max-h-[90dvh] overflow-y-auto p-5 space-y-4 shadow-2xl'>
      <header className='flex items-center justify-between gap-3'><h2 id={id} className='font-bold text-lg'>{title}</h2><button disabled={busy} onClick={onClose} aria-label='Cerrar ventana' className='p-2 rounded-lg hover:bg-[var(--bg-hover)]'><X size={20} /></button></header>
      {children}
    </section>
  </div>, document.body)
}
