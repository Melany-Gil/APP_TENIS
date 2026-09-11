import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import { LogOut, Mail } from 'lucide-react'
import { useDialogFocus } from '../../hooks/useDialogFocus'
import { userService } from '../../services/userService'
import { authService } from '../../services/authService'
import useAuthStore from '../../store/useAuthStore'
import useUIStore from '../../store/useUIStore'
import Input from '../ui/Input'
import Button from '../ui/Button'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export default function EmailRequiredDialog() {
  const { user, isAuthenticated, updateUser, logout } = useAuthStore()
  const { addToast } = useUIStore()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [loggingOut, setLoggingOut] = useState(false)
  // Foco atrapado y Escape bloqueado: solo se sale guardando o cerrando sesión.
  const dialogRef = useDialogFocus(true, () => {}, true)

  const needsEmail = isAuthenticated && user && !String(user.email || '').trim()

  // Sincroniza con el servidor por si el admin ya registró el correo:
  // evita pedirlo cuando en realidad ya existe.
  useEffect(() => {
    if (!needsEmail) return
    let cancelled = false
    userService
      .getMe()
      .then((response) => {
        if (!cancelled && response?.data?.email) updateUser(response.data)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [needsEmail, updateUser])

  useEffect(() => {
    if (needsEmail) {
      setEmail('')
      setError('')
    }
  }, [needsEmail, user?.id])

  if (!needsEmail) return null

  const submit = async (event) => {
    event.preventDefault()
    setError('')
    const value = email.trim().toLowerCase()
    if (!value) {
      setError('Ingresa tu correo electrónico.')
      return
    }
    if (value.length > 150 || !EMAIL_RE.test(value)) {
      setError('Ingresa un correo válido (máximo 150 caracteres).')
      return
    }
    setBusy(true)
    try {
      const response = await userService.updateMe({ email: value })
      updateUser(response.data)
      addToast({ type: 'success', title: 'Correo guardado', message: 'Gracias, ya registramos tu correo.' })
    } catch (err) {
      setError(err.message || 'No se pudo guardar el correo. Reintenta.')
    } finally {
      setBusy(false)
    }
  }

  const handleLogout = async () => {
    if (busy || loggingOut) return
    setLoggingOut(true)
    try {
      await authService.logout().catch(() => {})
      logout()
      navigate('/login', { replace: true })
    } finally {
      setLoggingOut(false)
    }
  }

  return createPortal(
    <div
      className='fixed inset-0 z-[100] flex items-center justify-center p-4 animate-fade-up'
      style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}
      role='presentation'
    >
      <div
        ref={dialogRef}
        role='dialog'
        aria-modal='true'
        aria-labelledby='email-required-title'
        tabIndex={-1}
        className='w-full rounded-2xl overflow-hidden'
        style={{
          maxWidth: '420px',
          backgroundColor: 'var(--bg-sidebar)',
          border: '1px solid var(--border-color)',
          boxShadow: '0 20px 60px rgba(0,0,0,0.4)',
        }}
      >
        <div className='flex items-start gap-3 px-5 pt-5 pb-2'>
          <div
            className='w-10 h-10 rounded-xl flex items-center justify-center shrink-0'
            style={{ backgroundColor: 'var(--color-brand-dim)' }}
          >
            <Mail className='w-5 h-5' style={{ color: 'var(--color-brand)' }} />
          </div>
          <div className='flex-1 min-w-0 pt-1'>
            <h3 id='email-required-title' className='text-base font-bold' style={{ color: 'var(--text-primary)' }}>
              Agrega tu correo electrónico
            </h3>
          </div>
        </div>

        <form onSubmit={submit}>
          <div className='px-5 pb-4 space-y-4'>
            <p className='text-sm leading-relaxed' style={{ color: 'var(--text-secondary)' }}>
              Hola{user?.nombre ? `, ${user.nombre}` : ''}. Para avisarte de tus partidos y ayudarte a recuperar tu
              cuenta, necesitamos tu correo. Solo te lo pedimos una vez.
            </p>
            <Input
              label='Correo electrónico'
              type='email'
              autoComplete='email'
              placeholder='tucorreo@ejemplo.com'
              required
              maxLength={150}
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              disabled={busy || loggingOut}
              leftIcon={<Mail className='w-4 h-4' />}
              error={error}
            />
          </div>

          <div
            className='flex gap-3 px-5 py-4'
            style={{ borderTop: '1px solid var(--border-color)', backgroundColor: 'var(--bg-hover)' }}
          >
            <Button
              type='button'
              variant='secondary'
              fullWidth
              disabled={busy || loggingOut}
              loading={loggingOut}
              leftIcon={<LogOut className='w-4 h-4' />}
              onClick={handleLogout}
            >
              Cerrar sesión
            </Button>
            <Button type='submit' fullWidth loading={busy} disabled={loggingOut}>
              Guardar correo
            </Button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  )
}
