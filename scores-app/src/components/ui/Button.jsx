import { cn } from '../../utils/cn'
import Loader from './Loader'

const variants = {
  primary: 'btn-primary',
  secondary: 'btn-secondary',
  ghost: 'btn-ghost',
  danger: 'btn-danger',
  outline: 'btn-secondary',
}

const sizes = {
  sm: 'text-xs px-3 py-2',
  md: '', // usa el padding por defecto de .btn
  lg: 'text-sm px-6 py-3',
  icon: 'p-2',
}

export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  fullWidth = false,
  className = '',
  leftIcon,
  rightIcon,
  ...props
}) {
  return (
    <button
      className={cn(variants[variant], sizes[size], fullWidth && 'w-full', className)}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <Loader size='sm' />
      ) : (
        <>
          {leftIcon && <span className='shrink-0'>{leftIcon}</span>}
          {children}
          {rightIcon && <span className='shrink-0'>{rightIcon}</span>}
        </>
      )}
    </button>
  )
}
