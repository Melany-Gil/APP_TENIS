import { cn } from '../../utils/cn'

const variants = {
  default: 'bg-border-light text-text-secondary',
  brand: 'bg-brand/20 text-brand',
  live: 'bg-red-500/20 text-red-400',
  success: 'bg-green-500/20 text-green-400',
  atp: 'bg-blue-500/20 text-blue-400',
  wta: 'bg-pink-500/20 text-pink-400',
  padel: 'bg-purple-500/20 text-purple-400',
}

export default function Badge({ children, variant = 'default', dot = false, className = '' }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold',
        variants[variant],
        className
      )}
    >
      {dot && variant === 'live' && (
        <span className='w-1.5 h-1.5 rounded-full bg-red-400 animate-ping inline-flex' />
      )}
      {children}
    </span>
  )
}
