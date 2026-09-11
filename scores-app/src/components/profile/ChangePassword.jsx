import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import ActionDialog from '../common/ActionDialog'
import Input from '../ui/Input'
import Button from '../ui/Button'
import { userService } from '../../services/userService'
import { authService } from '../../services/authService'
import useAuthStore from '../../store/useAuthStore'

export default function ChangePassword({ onClose }) {
  const [currentPassword, setCurrent] = useState('')
  const [newPassword, setNew] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const navigate = useNavigate()
  const submit = async e => {
    e.preventDefault(); setError('')
    if (newPassword !== confirmation) { setError('Las contraseñas nuevas no coinciden.'); return }
    setBusy(true)
    try {
      await userService.changePassword({ currentPassword, newPassword })
      await authService.logout().catch(() => {})
      useAuthStore.getState().logout()
      navigate('/login', { replace: true })
    } catch (err) { setError(err.message || 'No se pudo actualizar la contraseña.') }
    finally { setBusy(false) }
  }
  return <ActionDialog title='Cambiar contraseña' onClose={onClose} busy={busy}>
    <p className='text-sm'>Por seguridad, después de guardarla tendrás que ingresar de nuevo. Se cerrarán las sesiones anteriores.</p>
    <form className='space-y-4' onSubmit={submit}>
      <Input label='Contraseña actual' type='password' autoComplete='current-password' required value={currentPassword} onChange={e => setCurrent(e.target.value)} disabled={busy} />
      <Input label='Nueva contraseña' type='password' autoComplete='new-password' required minLength={8} maxLength={72} value={newPassword} onChange={e => setNew(e.target.value)} disabled={busy} />
      <p className='text-sm' style={{ color: 'var(--text-muted)' }}>Mínimo 8 caracteres, una mayúscula y un número.</p>
      <Input label='Repetir nueva contraseña' type='password' autoComplete='new-password' required value={confirmation} onChange={e => setConfirmation(e.target.value)} disabled={busy} />
      {error && <p role='alert' className='text-sm text-red-600'>{error}</p>}
      <Button type='submit' loading={busy}>Guardar contraseña</Button>
    </form>
  </ActionDialog>
}
