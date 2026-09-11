import { forwardRef, useId } from 'react'
import { cn } from '../../utils/cn'

const Input = forwardRef(
  (
    { id, label, error, hint, leftIcon, rightIcon, className = '', containerClassName = '', ...props },
    ref
  ) => {
    const generatedId = useId()
    const inputId = id || generatedId
    return (
      <div className={cn('form-group', containerClassName)}>
        {label && <label htmlFor={inputId} className='form-label'>{label}</label>}

        <div className='relative'>
          {leftIcon && (
            <div
              className='absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none'
              style={{ color: 'var(--text-muted)' }}
            >
              {leftIcon}
            </div>
          )}

          <input
            id={inputId}
            ref={ref}
            className={cn(
              'form-input',
              error && 'error',
              leftIcon && 'pl-10',
              rightIcon && 'pr-10',
              className
            )}
            {...props}
          />

          {rightIcon && (
            <div
              className='absolute right-3 top-1/2 -translate-y-1/2'
              style={{ color: 'var(--text-muted)' }}
            >
              {rightIcon}
            </div>
          )}
        </div>

        {error && <p className='form-error'>{error}</p>}
        {hint && !error && <p className='form-hint'>{hint}</p>}
      </div>
    )
  }
)

Input.displayName = 'Input'
export default Input
