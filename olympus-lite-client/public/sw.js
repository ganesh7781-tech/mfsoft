// Simple PWA Service Worker
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  // Let browser make standard request (network-first)
  event.respondWith(fetch(event.request).catch(() => {
    return caches.match(event.request);
  }));
});
