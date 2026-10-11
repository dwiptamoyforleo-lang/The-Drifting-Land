// Service Worker for The Drifting World
const CACHE_NAME = 'drifting-world-v2';

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      // Determine base path from the service worker location
      const basePath = self.registration.scope;
      const assets = [
        basePath,
        `${basePath}index.html`,
        `${basePath}manifest.json`,
        `${basePath}icon.svg`
      ];

      // Cache files individually so a 404 on one never causes install rejection
      for (const url of assets) {
        try {
          await cache.add(url);
        } catch {
          // Non-fatal if asset not reachable
        }
      }
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(event.request).catch(() => {
        // Fallback to cached index.html
        return caches.match(`${self.registration.scope}index.html`);
      });
    })
  );
});
