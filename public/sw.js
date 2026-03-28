// =====================================================
// UNILINK SERVICE WORKER - Push Notifications Engine
// =====================================================

const CACHE_NAME = 'unilink-v1';

self.addEventListener('install', (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// ── Handle incoming push notifications ──────────────
self.addEventListener('push', (event) => {
  if (!event.data) return;

  let data;
  try {
    data = event.data.json();
  } catch {
    data = { title: 'UniLink', body: event.data.text(), type: 'message' };
  }

  const isCall = data.type === 'call';

  const options = {
    body: data.body || 'You have a new notification',
    icon: '/pwa-192x192.png',
    badge: '/favicon.svg',
    tag: data.tag || data.type || 'general',       // Replaces same-type duplicates
    renotify: true,
    requireInteraction: isCall,                    // Call alerts persist until acted on
    vibrate: isCall ? [300, 100, 300, 100, 300] : [200, 100, 200],
    data: {
      url: data.url || '/',
      matchId: data.matchId,
      type: data.type
    },
    actions: isCall
      ? [
          { action: 'accept', title: '✅ Accept' },
          { action: 'decline', title: '❌ Decline' }
        ]
      : data.type === 'message'
        ? [{ action: 'reply', title: '💬 Open Chat' }]
        : []
  };

  event.waitUntil(
    self.registration.showNotification(data.title || 'UniLink', options)
  );
});

// ── Handle notification click actions ───────────────
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const { action } = event;
  const { url, matchId } = event.notification.data;

  let targetUrl = url;
  if ((action === 'reply' || action === 'accept') && matchId) {
    targetUrl = `/chat/${matchId}`;
  }

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Focus existing tab if open
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.focus();
          client.navigate(targetUrl);
          return;
        }
      }
      // Otherwise open a new window
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});
