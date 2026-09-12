import api from './api'
export const supportsPush = () =>
  window.isSecureContext &&
  'serviceWorker' in navigator &&
  'PushManager' in window &&
  'Notification' in window
export async function currentPush() {
  if (!supportsPush()) return null
  const registration = await navigator.serviceWorker.getRegistration('/')
  return registration ? registration.pushManager.getSubscription() : null
}
export async function disablePush() {
  const sub = await currentPush()
  if (!sub) return
  try {
    await api.post('/push/unsubscribe', { endpoint: sub.endpoint })
  } finally {
    await sub.unsubscribe()
    localStorage.removeItem('push-owner')
  }
}
export async function enablePush(publicKey, userId) {
  if (!supportsPush())
    throw Error(
      'Este navegador no admite push. En iPhone, abre la aplicación instalada en la pantalla de inicio.'
    )
  const permission = await Notification.requestPermission()
  if (permission !== 'granted')
    throw Error('No se concedió el permiso. Puedes cambiarlo en los ajustes del navegador.')
  await navigator.serviceWorker.register('/push-sw.js', { scope: '/', updateViaCache: 'none' })
  const reg = await navigator.serviceWorker.ready
  let sub = await reg.pushManager.getSubscription()
  if (sub && localStorage.getItem('push-owner') !== String(userId)) {
    await sub.unsubscribe()
    sub = null
  }
  const key = Uint8Array.from(atob(publicKey.replace(/-/g, '+').replace(/_/g, '/')), (c) =>
    c.charCodeAt(0)
  )
  if (
    sub &&
    Array.from(new Uint8Array(sub.options.applicationServerKey || [])).join(',') !==
      Array.from(key).join(',')
  ) {
    await sub.unsubscribe()
    sub = null
  }
  if (!sub)
    sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: key })
  try {
    await api.post('/push/subscribe', sub.toJSON())
    localStorage.setItem('push-owner', String(userId))
  } catch (e) {
    await sub.unsubscribe()
    throw e
  }
}
