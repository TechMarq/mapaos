const CACHE_NAME = 'mapaos-v2';
const STATIC_ASSETS = [
  'index.html',
  'historico_reserva.html',
  'financeiro.html',
  'config.html',
  'veiculo.html',
  'navigation.js',
  'supabase.js',
  'alerts.js',
  'veiculo.js',
  'manifest.json',
  'img/mapaos-logo-sf.svg',
  'img/mapaos-logo-icon-sf.png'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      // Pre-cache static assets (failures are non-fatal)
      return cache.addAll(STATIC_ASSETS).catch(err => {
        console.warn('[SW] Some assets failed to pre-cache:', err);
      });
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);

  // Only cache same-origin GET requests (never intercept Supabase/external API calls)
  if (e.request.method !== 'GET' || url.origin !== self.location.origin) return;

  // Network-first strategy for HTML pages (always fresh content when online)
  if (e.request.destination === 'document') {
    e.respondWith(
      fetch(e.request)
        .then(response => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(e.request, clone));
          return response;
        })
        .catch(() => caches.match(e.request))
    );
    return;
  }

  // Cache-first strategy for JS/CSS/images/fonts (serve fast, update in background)
  e.respondWith(
    caches.match(e.request).then(cached => {
      const networkFetch = fetch(e.request).then(response => {
        if (response && response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(e.request, clone));
        }
        return response;
      }).catch(() => null);

      return cached || networkFetch;
    })
  );
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

