import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { Mail, Lock, ArrowLeft } from 'lucide-react'
import { authService } from '../../services/authService'
import useUIStore from '../../store/useUIStore'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'

const STEPS = { EMAIL: 1, OTP: 2, PASSWORD: 3, SUCCESS: 4 }

export default function ForgotPassword() {
  const [step, setStep] = useState(STEPS.EMAIL)
  const [email, setEmail] = useState('')
  const [otp, setOtp] = useState(['', '', '', '', '', ''])
  const { addToast } = useUIStore()

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm()
  const password = watch('password')

  const onEmailSubmit = async (data) => {
    try {
      await authService.forgotPassword(data.email)
      setEmail(data.email)
      setStep(STEPS.OTP)
      addToast({
        type: 'success',
        title: 'Código enviado',
        message: `Revisa tu correo ${data.email}`,
      })
    } catch (err) {
      addToast({ type: 'error', title: 'Error', message: err.message || 'Correo no encontrado' })
    }
  }

  const onOtpSubmit = async (e) => {
    e.preventDefault()
    const code = otp.join('')
    if (code.length < 6) {
      addToast({ type: 'error', title: 'Ingresa el código completo' })
      return
    }
    try {
      await authService.verifyOtp({ email, otp_code: code })
      setStep(STEPS.PASSWORD)
    } catch (err) {
      addToast({ type: 'error', title: 'Código inválido', message: err.message })
    }
  }

  const onPasswordSubmit = async (data) => {
    try {
      await authService.resetPassword({
        email,
        otp_code: otp.join(''),
        password: data.password,
      })
      setStep(STEPS.SUCCESS)
      addToast({ type: 'success', title: 'Contraseña actualizada' })
    } catch (err) {
      addToast({ type: 'error', title: 'Error', message: err.message })
    }
  }

  const handleOtpChange = (val, idx) => {
    const next = [...otp]
    next[idx] = val.slice(-1)
    setOtp(next)
    if (val && idx < 5) document.getElementById(`otp-${idx + 1}`)?.focus()
  }

  return (
    <div className='auth-card animate-fade-up'>
      {/* Header */}
      <div className='mb-8'>
        <h1 className='text-2xl font-black mb-1' style={{ color: 'var(--text-primary)' }}>
          {step === STEPS.EMAIL && 'Recuperar contraseña'}
          {step === STEPS.OTP && 'Verificar código'}
          {step === STEPS.PASSWORD && 'Nueva contraseña'}
          {step === STEPS.SUCCESS && '¡Listo!'}
        </h1>
        <p className='text-sm' style={{ color: 'var(--text-muted)' }}>
          {step === STEPS.EMAIL && 'Ingresa tu correo para continuar'}
          {step === STEPS.OTP && `Código enviado a ${email}`}
          {step === STEPS.PASSWORD && 'Crea una nueva contraseña segura'}
          {step === STEPS.SUCCESS && 'Tu contraseña fue actualizada correctamente'}
        </p>
      </div>

      {/* Step indicator */}
      {step !== STEPS.SUCCESS && (
        <div className='flex items-center justify-center gap-2 mb-6'>
          {[1, 2, 3].map((s) => (
            <div key={s} className='flex items-center gap-2'>
              <div
                className='w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold transition-all'
                style={{
                  backgroundColor:
                    step > s
                      ? 'var(--color-brand)'
                      : step === s
                        ? 'var(--color-brand-dim)'
                        : 'var(--bg-hover)',
                  color:
                    step > s ? '#fff' : step === s ? 'var(--color-brand)' : 'var(--text-muted)',
                  border:
                    step === s ? '1px solid var(--color-brand)' : '1px solid var(--border-color)',
                }}
              >
                {step > s ? '✓' : s}
              </div>
              {s < 3 && (
                <div
                  className='w-8 h-px'
                  style={{
                    backgroundColor: step > s ? 'var(--color-brand)' : 'var(--border-color)',
                  }}
                />
              )}
            </div>
          ))}
        </div>
      )}

      {/* Step 1 — Email */}
      {step === STEPS.EMAIL && (
        <form onSubmit={handleSubmit(onEmailSubmit)} className='flex flex-col gap-4'>
          <Input
            label='Correo electrónico'
            type='email'
            placeholder='tu@email.com'
            leftIcon={<Mail className='w-4 h-4' />}
            error={errors.email?.message}
            {...register('email', { required: 'El correo es requerido' })}
          />
          <Button type='submit' fullWidth loading={isSubmitting}>
            Enviar código
          </Button>
        </form>
      )}

      {/* Step 2 — OTP */}
      {step === STEPS.OTP && (
        <form onSubmit={onOtpSubmit} className='flex flex-col gap-4'>
          <div>
            <label className='form-label mb-3 block'>Código de 6 dígitos</label>
            <div className='flex items-center gap-2 justify-center'>
              {otp.map((digit, idx) => (
                <input
                  key={idx}
                  id={`otp-${idx}`}
                  type='text'
                  inputMode='numeric'
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleOtpChange(e.target.value, idx)}
                  className='form-input w-11 h-12 text-center text-lg font-bold p-0'
                />
              ))}
            </div>
          </div>
          <Button type='submit' fullWidth>
            Verificar código
          </Button>
          <button
            type='button'
            className='btn-ghost text-xs w-full'
            onClick={() => authService.forgotPassword(email).catch(() => {})}
            style={{ color: 'var(--text-muted)' }}
          >
            ¿No recibiste el código? Reenviar
          </button>
        </form>
      )}

      {/* Step 3 — Nueva contraseña */}
      {step === STEPS.PASSWORD && (
        <form onSubmit={handleSubmit(onPasswordSubmit)} className='flex flex-col gap-4'>
          <Input
            label='Nueva contraseña'
            type='password'
            placeholder='Mínimo 8 caracteres'
            leftIcon={<Lock className='w-4 h-4' />}
            error={errors.password?.message}
            {...register('password', {
              required: 'La contraseña es requerida',
              minLength: { value: 8, message: 'Mínimo 8 caracteres' },
            })}
          />
          <Input
            label='Confirmar contraseña'
            type='password'
            placeholder='Repite tu contraseña'
            leftIcon={<Lock className='w-4 h-4' />}
            error={errors.confirmPassword?.message}
            {...register('confirmPassword', {
              required: 'Confirma tu contraseña',
              validate: (v) => v === password || 'Las contraseñas no coinciden',
            })}
          />
          <Button type='submit' fullWidth loading={isSubmitting}>
            Guardar contraseña
          </Button>
        </form>
      )}

      {/* Step 4 — Éxito */}
      {step === STEPS.SUCCESS && (
        <div className='text-center py-4 flex flex-col gap-4'>
          <div
            className='w-16 h-16 rounded-2xl flex items-center justify-center mx-auto text-3xl'
            style={{ backgroundColor: 'rgba(34,197,94,0.15)' }}
          >
            ✓
          </div>
          <p className='text-sm' style={{ color: 'var(--text-secondary)' }}>
            Ya puedes iniciar sesión con tu nueva contraseña.
          </p>
          <Link to='/login'>
            <Button fullWidth>Iniciar sesión</Button>
          </Link>
        </div>
      )}

      {step !== STEPS.SUCCESS && (
        <div className='text-center mt-5'>
          <Link
            to='/login'
            className='inline-flex items-center gap-2 text-sm'
            style={{ color: 'var(--text-muted)' }}
          >
            <ArrowLeft className='w-4 h-4' /> Volver al inicio de sesión
          </Link>
        </div>
      )}
    </div>
  )
}
