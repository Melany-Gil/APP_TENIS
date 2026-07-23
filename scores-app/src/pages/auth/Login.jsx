import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { CreditCard, Eye, EyeOff, Lock } from 'lucide-react'
import useAuthStore from '../../store/useAuthStore'
import useUIStore from '../../store/useUIStore'
import { authService } from '../../services/authService'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'

export default function Login() {
  const [showPassword, setShowPassword] = useState(false)
  const { login } = useAuthStore()
  const { addToast } = useUIStore()
  const navigate = useNavigate()
  const location = useLocation()
  const redirectTo = location.state?.from || '/'
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm()

  const onSubmit = async (credentials) => {
    try {
      const response = await authService.login(credentials)
      const user = response?.user ?? response?.data?.user
      if (!user) throw new Error('Respuesta inválida del servidor')

      login(user)
      addToast({ type: 'success', title: '¡Bienvenido!', message: `Hola, ${user.nombre}` })
      navigate(redirectTo, { replace: true })
    } catch (error) {
      setError('numero_documento', {
        message: error.message || 'Documento o contraseña incorrectos',
      })
    }
  }

  return (
    <div className='auth-card animate-fade-up'>
      <div className='mb-9'>
        <p
          className='text-xs font-bold uppercase tracking-[0.18em] mb-2'
          style={{ color: 'var(--color-brand)' }}
        >
          Club Unión · Tenis
        </p>
        <h1
          className='text-3xl font-extrabold tracking-[-0.04em] mb-2'
          style={{ color: 'var(--text-primary)' }}
        >
          Bienvenido
        </h1>
        <p className='text-sm' style={{ color: 'var(--text-muted)' }}>
          Inicia sesión para guardar favoritos, gestionar tu perfil y administrar el torneo.
        </p>
      </div>

      {location.state?.message && (
        <p
          className='mb-5 rounded-lg px-3 py-2 text-sm'
          style={{ backgroundColor: 'var(--color-brand-dim)', color: 'var(--color-brand)' }}
        >
          {location.state.message}
        </p>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className='flex flex-col gap-5'>
        <div className='form-group'>
          <label className='form-label'>Número de documento</label>
          <div className='relative'>
            <CreditCard
              className='absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none'
              style={{ color: 'var(--text-muted)' }}
            />
            <input
              inputMode='numeric'
              autoComplete='username'
              placeholder='1090512345'
              className={`form-input pl-10 ${errors.numero_documento ? 'error' : ''}`}
              {...register('numero_documento', {
                required: 'El número de documento es requerido',
                minLength: { value: 5, message: 'Documento inválido' },
                maxLength: { value: 20, message: 'Documento inválido' },
                pattern: { value: /^\d+$/, message: 'Usa únicamente números' },
              })}
            />
          </div>
          {errors.numero_documento && (
            <p className='form-error'>{errors.numero_documento.message}</p>
          )}
        </div>

        <Input
          label='Contraseña'
          type={showPassword ? 'text' : 'password'}
          autoComplete='current-password'
          placeholder='Tu contraseña'
          leftIcon={<Lock className='w-4 h-4' />}
          rightIcon={
            <button
              type='button'
              onClick={() => setShowPassword((current) => !current)}
              aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
            >
              {showPassword ? <EyeOff className='w-4 h-4' /> : <Eye className='w-4 h-4' />}
            </button>
          }
          error={errors.password?.message}
          {...register('password', { required: 'La contraseña es requerida' })}
        />

        <div className='flex justify-end'>
          <Link
            to='/forgot-password'
            className='text-sm font-medium'
            style={{ color: 'var(--color-brand)' }}
          >
            ¿Olvidaste tu contraseña?
          </Link>
        </div>

        <Button type='submit' fullWidth size='lg' loading={isSubmitting}>
          Iniciar sesión
        </Button>
      </form>

      <Link
        to='/'
        className='block text-center text-sm mt-5 font-medium'
        style={{ color: 'var(--color-brand)' }}
      >
        Continuar sin iniciar sesión
      </Link>

      <p className='text-center text-sm mt-7' style={{ color: 'var(--text-muted)' }}>
        ¿No tienes acceso? Solicítalo a un administrador.
      </p>
    </div>
  )
}
