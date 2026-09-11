import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import { IdCard, LogOut, Mail } from 'lucide-react'
import { useDialogFocus } from '../../hooks/useDialogFocus'
import { userService } from '../../services/userService'
import { authService } from '../../services/authService'
import useAuthStore from '../../store/useAuthStore'
import useUIStore from '../../store/useUIStore'
import Input from '../ui/Input'
import Button from '../ui/Button'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const DOC_RE = /^\d{5,20}$/

export default function EmailRequiredDialog() {
  const { user, isAuthenticated, updateUser, logout } = useAuthStore()
  const { addToast } = useUIStore()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [documento, setDocumento] = useState('')
  const [emailError, setEmailError] = useState('')
  const [docError, setDocError] = useState('')
  const [busy, setBusy] = useState(false)
  const [loggingOut, setLoggingOut] = useState(false)
  // Foco atrapado y Escape bloqueado: solo se sale guardando o cerrando sesión.
  const dialogRef = useDialogFocus(true, () => {}, true)

  const missingEmail = isAuthenticated && user && !String(user.email || '').trim()
  const missingDoc = isAuthenticated && user && !String(user.numero_documento || '').trim()
  const needsData = Boolean(missingEmail || missingDoc)

  // Sincroniza con el servidor por si el admin ya registró los datos:
  // evita pedirlos cuando en realidad ya existen.
  useEffect(() => {
    if (!needsData) return
    let cancelled = false
    userService
      .getMe()
      .then((response) => {
        if (!cancelled && response?.data && (response.data.email || response.data.numero_documento)) {
          updateUser(response.data)
        }
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [needsData, updateUser])

  useEffect(() => {
    if (needsData) {
      setEmail('')
      setDocumento('')
      setEmailError('')
      setDocError('')
    }
  }, [needsData, user?.id])

  if (!needsData) return null

  const submit = async (event) => {
    event.preventDefault()
    setEmailError('')
    setDocError('')

    const payload = {}
    let valid = true

    if (missingEmail) {
      const value = email.trim().toLowerCase()
      if (!value) {
        setEmailError('Ingresa tu correo electrónico.')
        valid = false
      } else if (value.length > 150 || !EMAIL_RE.test(value)) {
        setEmailError('Ingresa un correo válido (máximo 150 caracteres).')
        valid = false
      } else {
        payload.email = value
      }
    }

    if (missingDoc) {
      const value = documento.trim()
      if (!value) {
        setDocError('Ingresa tu número de documento.')
        valid = false
      } else if (!DOC_RE.test(value)) {
        setDocError('El documento debe tener entre 5 y 20 dígitos.')
        valid = false
      } else {
        payload.numero_documento = value
      }
    }

    if (!valid) return

    setBusy(true)
    try {
      const response = await userService.updateMe(payload)
      updateUser(response.data)
      addToast({ type: 'success', title: 'Datos guardados', message: 'Gracias, ya completamos tu información.' })
    } catch (err) {
      const message = err.message || 'No se pudieron guardar los datos. Reintenta.'
      // Lleva el error al campo correspondiente cuando sea posible.
      if (/correo/i.test(message) && missingEmail) setEmailError(message)
      else if (/documento/i.test(message) && missingDoc) setDocError(message)
      else if (missingEmail && !missingDoc) setEmailError(message)
      else if (missingDoc && !missingEmail) setDocError(message)
      else setEmailError(message)
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

  const missingBoth = Boolean(missingEmail && missingDoc)

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
              Completa tus datos
            </h3>
          </div>
        </div>

        <form onSubmit={submit}>
          <div className='px-5 pb-4 space-y-4'>
            <p className='text-sm leading-relaxed' style={{ color: 'var(--text-secondary)' }}>
              Hola{user?.nombre ? `, ${user.nombre}` : ''}. Para avisarte de tus partidos, ayudarte a recuperar tu
              cuenta y tener tu información completa, necesitamos{' '}
              {missingBoth ? 'tu correo y tu número de documento' : missingEmail ? 'tu correo' : 'tu número de documento'}.
              Solo te lo pedimos una vez.
            </p>
            {missingEmail && (
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
                error={emailError}
              />
            )}
            {missingDoc && (
              <Input
                label='Número de documento'
                type='text'
                inputMode='numeric'
                autoComplete='off'
                placeholder='Ej. 1234567890'
                required
                minLength={5}
                maxLength={20}
                value={documento}
                onChange={(event) => setDocumento(event.target.value.replace(/\D/g, '').slice(0, 20))}
                disabled={busy || loggingOut}
                leftIcon={<IdCard className='w-4 h-4' />}
                error={docError}
                hint='Solo dígitos, entre 5 y 20.'
              />
            )}
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
              Guardar datos
            </Button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  )
}
