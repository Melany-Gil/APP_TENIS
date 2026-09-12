import { useEffect, useState } from 'react'
import api from '../../services/api'
import useAuthStore from '../../store/useAuthStore'
import { supportsPush, currentPush, enablePush, disablePush } from '../../services/pushService'

export default function PushSettings() {
  const user = useAuthStore((s) => s.user)
  const [key, setKey] = useState(null),
    [enabled, setEnabled] = useState(false),
    [busy, setBusy] = useState(true),
    [message, setMessage] = useState('')
  useEffect(() => {
    let alive = true
    if (!supportsPush()) {
      setBusy(false)
      return
    }
    Promise.all([api.get('/push/config'), currentPush()])
      .then(([config, sub]) => {
        if (alive) {
          setKey(config.data.publicKey)
          setEnabled(Boolean(sub) && localStorage.getItem('push-owner') === String(user.id))
        }
      })
      .catch(() => {
        if (alive) setMessage('No se pudo consultar la configuración push.')
      })
      .finally(() => {
        if (alive) setBusy(false)
      })
    return () => {
      alive = false
    }
  }, [user.id])
  const toggle = async (renew = false) => {
    setBusy(true)
    setMessage('')
    try {
      if (enabled && !renew) {
        await disablePush()
        setEnabled(false)
        setMessage('Push desactivado en este dispositivo.')
      } else {
        await enablePush(key, user.id)
        setEnabled(true)
        setMessage('Push activado para esta sesión y dispositivo.')
      }
    } catch (e) {
      setMessage(e.message || 'No se pudo cambiar el permiso. Intenta de nuevo.')
    } finally {
      setBusy(false)
    }
  }
  return (
    <section className='rounded-xl bg-[var(--bg-hover)] p-3 space-y-2 text-sm'>
      <h3 className='font-semibold'>Avisos en este dispositivo</h3>
      <p>
        Recibe avisos de soporte aunque no tengas la página abierta. No mostramos el contenido
        privado en la pantalla bloqueada.
      </p>
      {!supportsPush() ? (
        <p>
          Push no disponible aquí. En iPhone, añade la web a la pantalla de inicio y ábrela desde su
          icono.
        </p>
      ) : (
        <div className='flex flex-wrap gap-3'>
          <button
            className='btn-primary px-3 py-2'
            disabled={busy || (!key && !enabled)}
            onClick={() => toggle()}
          >
            {busy ? 'Consultando…' : enabled ? 'Desactivar push' : 'Activar push'}
          </button>
          {enabled && key && (
            <button disabled={busy} className='underline' onClick={() => toggle(true)}>
              Renovar activación
            </button>
          )}
        </div>
      )}
      {!busy && supportsPush() && !key && (
        <p>El administrador debe configurar las claves push del servidor.</p>
      )}
      <p className='text-xs'>
        Son opcionales. Al cerrar sesión se desactivan en este navegador; al vencer la sesión,
        vuelve a activarlos. La entrega depende del sistema y de la conexión.
      </p>
      {message && <p role='status'>{message}</p>}
    </section>
  )
}
