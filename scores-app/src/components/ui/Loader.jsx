import { cn } from '../../utils/cn'

export default function Loader({ size = 'md', fullscreen = false, className = '' }) {
  const sizes = {
    sm: 'w-4 h-4 border-2',
    md: 'w-8 h-8 border-2',
    lg: 'w-12 h-12 border-[3px]',
  }

  const spinner = (
    <div
      className={cn('rounded-full animate-spin border-t-transparent', sizes[size], className)}
      style={{ borderColor: 'var(--border-focus)', borderTopColor: 'transparent' }}
    />
  )

  if (fullscreen) {
    return (
      <div
        className='flex items-center justify-center min-h-screen'
        style={{ backgroundColor: 'var(--bg-primary)' }}
      >
        {spinner}
      </div>
    )
  }

  return spinner
}
