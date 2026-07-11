self.addEventListener('install', (e) => {
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (e) => {
  // Light pass-through fetch listener to satisfy PWA criteria
});

self.addEventListener('push', (e) => {
  let data = { title: 'Mapa.OS', body: 'Lembrete: Não se esqueça de alimentar suas reservas de hoje!' };
  if (e.data) {
    try {
      data = e.data.json();
    } catch (err) {
      data.body = e.data.text();
    }
  }

  const options = {
    body: data.body,
    icon: 'img/mapaos-logo-icon-sf.png',
    badge: 'img/mapaos-logo-icon-sf.png',
    vibrate: [100, 50, 100],
    data: {
      url: data.url || 'index.html'
    }
  };

  e.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  const targetUrl = e.notification.data && e.notification.data.url ? e.notification.data.url : 'index.html';
  
  e.waitUntil(
    clients.matchAll({ type: 'window' }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(targetUrl) && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});
