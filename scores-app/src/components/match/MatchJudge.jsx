import { Gavel } from 'lucide-react'

export default function MatchJudge({ match, dark = false, className = '' }) {
  const name = [match.juez?.nombre, match.juez?.apellido]
    .map((part) => String(part || '').trim()).filter(Boolean).join(' ')

  return (
    <div
      className={`flex items-start gap-1.5 text-xs ${className}`}
      style={{ color: dark ? 'rgba(255,255,255,0.75)' : 'var(--text-secondary)' }}
    >
      <Gavel className='w-3.5 h-3.5 shrink-0 mt-0.5' aria-hidden='true' />
      <span className='min-w-0 break-words'>
        <span className='font-semibold'>Juez:</span> {name || (match.juez?.id ? 'Nombre no disponible' : 'Sin asignar')}
      </span>
    </div>
  )
}
