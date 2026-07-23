import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { Eye, EyeOff, Mail, Lock, User, CreditCard } from 'lucide-react'
import useAuthStore from '../../store/useAuthStore'
import useUIStore from '../../store/useUIStore'
import { authService } from '../../services/authService'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'

// ── Reglas de validación ──────────────────────────────
const SOLO_LETRAS = /^[a-zA-ZáéíóúÁÉÍÓÚüÜñÑ\s]{3,}$/
const PASSWORD_FUERTE = /^(?=.*[A-Z])(?=.*\d).{8,72}$/

export default function Register() {
  const [showPwd, setShowPwd] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const { login } = useAuthStore()
  const { addToast } = useUIStore()
  const navigate = useNavigate()

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm({ mode: 'onBlur' })

  const password = watch('password')

  const onSubmit = async (data) => {
    try {
      const res = await authService.register({
        numero_documento: data.numero_documento,
        nombre: data.nombre,
        apellido: data.apellido,
        email: data.email,
        password: data.password,
      })
      const user = res?.user ?? res?.data?.user

      if (!user) throw new Error('Respuesta del servidor inválida')

      login(user)
      addToast({ type: 'success', title: '¡Cuenta creada!', message: `Bienvenido, ${user.nombre}` })
      navigate('/')
    } catch (err) {
      addToast({
        type: 'error',
        title: 'Error al registrarse',
        message: err.message || 'No se pudo crear la cuenta',
      })
    }
  }

  return (
    <div className='w-full animate-fade-up py-4' style={{ maxWidth: '620px' }}>
      {/* Header */}
      <div className='text-center mb-5'>
        <div
          className='brand-mark w-12 h-12 rounded-2xl flex items-center justify-center text-white text-sm font-extrabold mx-auto mb-4'
          style={{ backgroundColor: 'var(--color-brand)', boxShadow: 'var(--shadow-brand)' }}
        >
          CU
        </div>
        <h1
          className='text-3xl font-extrabold tracking-[-0.04em]'
          style={{ color: 'var(--text-primary)' }}
        >
          Configuración inicial
        </h1>
        <p className='text-sm mt-1' style={{ color: 'var(--text-muted)' }}>
          Crea el primer administrador del Subcomité de Tenis
        </p>
      </div>

      {/* Card */}
      <div
        className='rounded-[28px] p-5 sm:p-7'
        style={{
          backgroundColor: 'var(--bg-sidebar)',
          border: '1px solid var(--border-color)',
          boxShadow: 'var(--shadow-card)',
        }}
      >
        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          {/* Fila 1: Nombre + Apellido */}
          <div className='grid grid-cols-2 gap-3 mb-3'>
            <div className='form-group'>
              <label className='form-label'>Nombres *</label>
              <div className='relative'>
                <User
                  className='absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none'
                  style={{ color: 'var(--text-muted)' }}
                />
                <input
                  placeholder='Juan Carlos'
                  className={`form-input pl-9 ${errors.nombre ? 'error' : ''}`}
                  {...register('nombre', {
                    required: 'El nombre es requerido',
                    minLength: { value: 3, message: 'Mínimo 3 letras' },
                    pattern: {
                      value: SOLO_LETRAS,
                      message: 'Mínimo 3 letras, sin números ni caracteres especiales',
                    },
                  })}
                />
              </div>
              {errors.nombre && <p className='form-error'>{errors.nombre.message}</p>}
            </div>

            <div className='form-group'>
              <label className='form-label'>Apellidos *</label>
              <input
                placeholder='Pérez Gómez'
                className={`form-input ${errors.apellido ? 'error' : ''}`}
                {...register('apellido', {
                  required: 'El apellido es requerido',
                  minLength: { value: 3, message: 'Mínimo 3 letras' },
                  pattern: {
                    value: SOLO_LETRAS,
                    message: 'Mínimo 3 letras, sin números ni caracteres especiales',
                  },
                })}
              />
              {errors.apellido && <p className='form-error'>{errors.apellido.message}</p>}
            </div>
          </div>

          {/* Fila 2: Documento */}
          <div className='form-group mb-3'>
            <label className='form-label'>Documento *</label>
            <div className='flex gap-2'>
              <div
                className='flex items-center justify-center px-3 rounded-lg text-xs font-bold shrink-0'
                style={{
                  backgroundColor: 'var(--color-brand-dim)',
                  color: 'var(--color-brand)',
                  border: '1px solid var(--border-color)',
                }}
              >
                CC
              </div>
              <div className='relative flex-1'>
                <CreditCard
                  className='absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none'
                  style={{ color: 'var(--text-muted)' }}
                />
                <input
                  type='number'
                  placeholder='Solo números, mínimo 7 dígitos'
                  className={`form-input pl-9 ${errors.numero_documento ? 'error' : ''}`}
                  {...register('numero_documento', {
                    required: 'El documento es requerido',
                    minLength: { value: 7, message: 'Solo números, mínimo 7 dígitos' },
                    maxLength: { value: 12, message: 'Máximo 12 dígitos' },
                    pattern: { value: /^\d+$/, message: 'Solo números, mínimo 7 dígitos' },
                  })}
                />
              </div>
            </div>
            {errors.numero_documento && (
              <p className='form-error'>{errors.numero_documento.message}</p>
            )}
          </div>

          {/* Fila 3: Email */}
          <div className='form-group mb-3'>
            <label className='form-label'>Correo Electrónico *</label>
            <div className='relative'>
              <Mail
                className='absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none'
                style={{ color: 'var(--text-muted)' }}
              />
              <input
                type='email'
                placeholder='correo@ejemplo.com'
                className={`form-input pl-9 ${errors.email ? 'error' : ''}`}
                {...register('email', {
                  required: 'El correo es requerido',
                  pattern: {
                    value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                    message: 'Ingresa un correo electrónico válido',
                  },
                })}
              />
            </div>
            {errors.email && <p className='form-error'>{errors.email.message}</p>}
          </div>

          {/* Fila 4: Contraseña + Confirmar */}
          <div className='grid grid-cols-2 gap-3 mb-4'>
            <div className='form-group'>
              <label className='form-label'>Contraseña *</label>
              <div className='relative'>
                <Lock
                  className='absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none'
                  style={{ color: 'var(--text-muted)' }}
                />
                <input
                  type={showPwd ? 'text' : 'password'}
                  placeholder='Mínimo 8 caracteres'
                  className={`form-input pl-9 pr-9 ${errors.password ? 'error' : ''}`}
                  {...register('password', {
                    required: 'La contraseña es requerida',
                    pattern: {
                      value: PASSWORD_FUERTE,
                      message: 'Mínimo 8 caracteres, 1 mayúscula y 1 número',
                    },
                  })}
                />
                <button
                  type='button'
                  onClick={() => setShowPwd(!showPwd)}
                  className='absolute right-3 top-1/2 -translate-y-1/2'
                  style={{ color: 'var(--text-muted)' }}
                >
                  {showPwd ? <EyeOff className='w-4 h-4' /> : <Eye className='w-4 h-4' />}
                </button>
              </div>
              {errors.password && <p className='form-error'>{errors.password.message}</p>}
            </div>

            <div className='form-group'>
              <label className='form-label'>Confirmar *</label>
              <div className='relative'>
                <Lock
                  className='absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none'
                  style={{ color: 'var(--text-muted)' }}
                />
                <input
                  type={showConfirm ? 'text' : 'password'}
                  placeholder='Repítela'
                  className={`form-input pl-9 pr-9 ${errors.confirmPassword ? 'error' : ''}`}
                  {...register('confirmPassword', {
                    required: 'Confirma tu contraseña',
                    validate: (v) => v === password || 'Las contraseñas no coinciden',
                  })}
                />
                <button
                  type='button'
                  onClick={() => setShowConfirm(!showConfirm)}
                  className='absolute right-3 top-1/2 -translate-y-1/2'
                  style={{ color: 'var(--text-muted)' }}
                >
                  {showConfirm ? <EyeOff className='w-4 h-4' /> : <Eye className='w-4 h-4' />}
                </button>
              </div>
              {errors.confirmPassword && (
                <p className='form-error'>{errors.confirmPassword.message}</p>
              )}
            </div>
          </div>

          {/* Botón */}
          <Button type='submit' fullWidth size='lg' loading={isSubmitting}>
            Crear administrador
          </Button>
        </form>
      </div>

      {/* Link a login */}
      <p className='text-center text-sm mt-4' style={{ color: 'var(--text-muted)' }}>
        ¿Ya tienes cuenta?{' '}
        <Link to='/login' className='font-semibold' style={{ color: 'var(--color-brand)' }}>
          Inicia sesión
        </Link>
      </p>
    </div>
  )
}
