import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { Eye, EyeOff, Lock, UserRound } from 'lucide-react'
import useAuthStore from '../../store/useAuthStore'
import useUIStore from '../../store/useUIStore'
import { authService } from '../../services/authService'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'

export default function Login() {
  const [showPassword, setShowPassword] = useState(false)
  const [accessType, setAccessType] = useState('general')
  const judgeAccess = accessType === 'juez'
  const { login } = useAuthStore()
  const { addToast } = useUIStore()
  const navigate = useNavigate()
  const location = useLocation()
  const requestedRedirect = location.state?.from
  const {
    register,
    handleSubmit,
    setError,
    resetField,
    setFocus,
    formState: { errors, isSubmitting },
  } = useForm()

  const onSubmit = async (credentials) => {
    try {
      const response = await authService.login({ ...credentials, tipo_acceso: accessType })
      const user = response?.user ?? response?.data?.user
      if (!user) throw new Error('Respuesta inválida del servidor')

      login(user)
      addToast({ type: 'success', title: '¡Bienvenido!', message: `Hola, ${user.nombre}` })
      const redirectTo =
        requestedRedirect ||
        (user.rol === 'juez_director' ? '/director' : user.rol === 'juez' ? '/juez' : user.rol === 'admin' ? '/admin' : '/')
      navigate(redirectTo, { replace: true })
    } catch (error) {
      setError('identificador', {
        message: error.message || 'Documento, usuario o contraseña incorrectos',
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
          <label htmlFor='login-identifier' className='form-label'>{judgeAccess ? 'Nombre de usuario' : 'Usuario, correo o celular'}</label>
          <div className='relative'>
            <UserRound
              className='absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none'
              style={{ color: 'var(--text-muted)' }}
            />
            <input
              id='login-identifier'
              autoComplete='username'
              inputMode='text'
              autoCapitalize='none'
              spellCheck={false}
              placeholder={judgeAccess ? 'Ingresa tu nombre de usuario' : 'Ingresa tu usuario, correo o celular'}
              className={`form-input pl-10 ${errors.identificador ? 'error' : ''}`}
              {...register('identificador', {
                required: judgeAccess ? 'Ingresa tu nombre de usuario' : 'Ingresa tu usuario, correo o celular',
                setValueAs: (value) => (typeof value === 'string' ? value.trim() : value),
              })}
            />
          </div>
          {errors.identificador && <p className='form-error'>{errors.identificador.message}</p>}
          <p className='text-xs mt-1' style={{ color: 'var(--text-muted)' }}>
            {judgeAccess ? 'Acceso para jueces de partido y juez director.' : 'Usa cualquiera de estos datos que tengas registrado y tu contraseña.'}
          </p>
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

      <button type='button' disabled={isSubmitting} className='block w-full text-center text-sm mt-5 font-medium underline disabled:opacity-50'
        style={{ color: 'var(--color-brand)' }}
        onClick={() => {
          setAccessType(judgeAccess ? 'general' : 'juez')
          resetField('identificador'); resetField('password'); setShowPassword(false)
          setFocus('identificador')
        }}>
        {judgeAccess ? 'Volver al ingreso general' : 'Ingresar como juez'}
      </button>

      <Link
        to='/'
        className='block text-center text-sm mt-5 font-medium'
        style={{ color: 'var(--color-brand)' }}
      >
        Continuar sin iniciar sesión
      </Link>

      <p className='text-center text-sm mt-7' style={{ color: 'var(--text-muted)' }}>
        ¿No tienes acceso o no registraste correo para recuperar tu contraseña? Contacta al administrador.
      </p>
    </div>
  )
}
