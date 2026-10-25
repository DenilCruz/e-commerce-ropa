// Web Push handlers, loaded by the generated service worker (importScripts in vite.config.ts).
self.addEventListener('push', (event) => {
  let datos = {};
  try {
    datos = event.data ? event.data.json() : {};
  } catch {
    datos = { cuerpo: event.data ? event.data.text() : '' };
  }
  event.waitUntil(
    self.registration.showNotification(datos.titulo || 'AURA', {
      body: datos.cuerpo || '',
      icon: '/pwa-192.png',
      badge: '/pwa-192.png',
      tag: 'aura-aviso',
      data: { url: datos.url || '/admin/ventas' },
    }),
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const destino = new URL((event.notification.data && event.notification.data.url) || '/admin/ventas', self.location.origin).href;
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((ventanas) => {
      for (const ventana of ventanas) {
        if (ventana.url === destino && 'focus' in ventana) return ventana.focus();
      }
      return self.clients.openWindow(destino);
    }),
  );
});
