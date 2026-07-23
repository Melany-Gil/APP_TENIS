import { CheckCircle, AlertCircle, Info, X } from 'lucide-react'
import useUIStore from '../../store/useUIStore'
import { cn } from '../../utils/cn'

const icons = {
  success: <CheckCircle className='w-5 h-5 text-green-500 shrink-0' />,
  error: <AlertCircle className='w-5 h-5 text-red-500 shrink-0' />,
  info: <Info className='w-5 h-5 shrink-0' style={{ color: 'var(--color-brand)' }} />,
}

function ToastItem({ toast }) {
  const { removeToast } = useUIStore()
  return (
    <div className={cn('toast', `toast-${toast.type || 'info'}`)}>
      {icons[toast.type] || icons.info}
      <div className='flex-1 min-w-0'>
        {toast.title && (
          <p className='text-sm font-semibold' style={{ color: 'var(--text-primary)' }}>
            {toast.title}
          </p>
        )}
        {toast.message && (
          <p className='text-xs mt-0.5' style={{ color: 'var(--text-secondary)' }}>
            {toast.message}
          </p>
        )}
      </div>
      <button onClick={() => removeToast(toast.id)} className='btn-ghost p-1 shrink-0'>
        <X className='w-4 h-4' />
      </button>
    </div>
  )
}

export default function ToastContainer() {
  const { toasts } = useUIStore()
  if (!toasts.length) return null
  return (
    <div className='fixed bottom-4 right-4 z-50 flex flex-col gap-2 w-80'>
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} />
      ))}
    </div>
  )
}
