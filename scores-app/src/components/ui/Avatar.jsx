import { cn } from '../../utils/cn'
import { getMediaUrl } from '../../utils/getMediaUrl'

const SIZES = {
  xs: 'w-7 h-7 text-[10px]',
  sm: 'w-9 h-9 text-xs',
  md: 'w-11 h-11 text-sm',
  lg: 'w-16 h-16 text-xl',
  xl: 'w-24 h-24 text-2xl',
}

const initialsFor = (name) => String(name || 'U')
  .trim()
  .split(/\s+/)
  .slice(0, 2)
  .map((part) => part[0])
  .join('')
  .toUpperCase()

export default function Avatar({ src, name, size = 'md', className }) {
  const resolvedSrc = getMediaUrl(src)
  const sharedClassName = cn(
    'rounded-full border object-cover shrink-0',
    SIZES[size] || SIZES.md,
    className
  )

  if (resolvedSrc) {
    return <img src={resolvedSrc} alt={name ? `Foto de ${name}` : 'Foto de perfil'} className={sharedClassName} loading='lazy' decoding='async' />
  }

  return (
    <span
      className={cn(sharedClassName, 'inline-flex items-center justify-center font-bold')}
      style={{
        backgroundColor: 'var(--color-brand-dim)',
        borderColor: 'var(--border-focus)',
        color: 'var(--color-brand)',
      }}
      aria-label={name || 'Usuario'}
    >
      {initialsFor(name)}
    </span>
  )
}
