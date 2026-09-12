// No fetch handler or asset cache: this worker cannot interfere with live scoring.
self.addEventListener('push', (event) => {
  let tag = 'support'
  try {
    const data = event.data?.json()
    if (/^support-\d+$/.test(data?.tag)) tag = data.tag
  } catch {}
  event.waitUntil(
    self.registration.showNotification('Tenis Club Unión', {
      body: 'Tienes un nuevo aviso de soporte. Ingresa para consultarlo.',
      icon: '/branding/subcomite-tenis-club-union.png',
      tag,
      data: { url: '/' },
    })
  )
})
self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  // Always same-origin; never trust a URL supplied in the push payload.
  event.waitUntil(self.clients.openWindow(new URL('/', self.location.origin).href))
})
