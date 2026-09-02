// Isotope Mess Manager - Service Worker
// Strategy: Cache-first for static assets, Network-first for dynamic data

const CACHE_NAME = 'isotope-mess-v2.3';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/style.css',
  '/app.js',
  '/logs.html',
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/apple-touch-icon.png'
];

// =====================
// Install Event: Cache all static assets
// =====================
self.addEventListener('install', (event) => {
  console.log('[SW] Installing Service Worker v2.3...');
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] Caching static assets...');
      return cache.addAll(STATIC_ASSETS).catch((err) => {
        console.warn('[SW] Some assets failed to cache:', err);
      });
    })
  );
  self.skipWaiting();
});

// =====================
// Activate Event: Clean old caches
// =====================
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating Service Worker v2.3...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => {
            console.log('[SW] Removing old cache:', name);
            return caches.delete(name);
          })
      );
    })
  );
  self.clients.claim();
});

// =====================
// Fetch Event: Network-first for fresh updates, Cache fallback for offline
// =====================
self.addEventListener('fetch', (event) => {
  const { request } = event;

  if (!request || request.method !== 'GET') return;

  try {
    const url = new URL(request.url);

    const isUnsupportedScheme = ['chrome-extension:', 'chrome:', 'moz-extension:', 'about:', 'data:'].includes(url.protocol);
    const isHttpLike = url.protocol === 'http:' || url.protocol === 'https:';

    if (isUnsupportedScheme || !isHttpLike) return;

    // For Firebase / external CDN requests: network only (don't cache)
    if (
      url.hostname.includes('firebase') ||
      url.hostname.includes('gstatic.com') ||
      url.hostname.includes('googleapis.com') ||
      url.hostname.includes('google.com')
    ) {
      return;
    }

    // Network-First for core web files (HTML, JS, CSS, JSON)
    event.respondWith(
      fetch(request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              try {
                cache.put(request, responseToCache);
              } catch (cacheError) {
                console.warn('[SW] Cache put skipped for unsupported request:', request.url, cacheError);
              }
            });
          }
          return networkResponse;
        })
        .catch(() => {
          // Offline fallback from cache
          return caches.match(request).then((cachedResponse) => {
            if (cachedResponse) return cachedResponse;
            if (request.headers.get('accept') && request.headers.get('accept').includes('text/html')) {
              return caches.match('/index.html');
            }
          });
        })
    );
  } catch (error) {
    console.warn('[SW] Skipping invalid request in fetch handler:', error);
  }
});

// =====================
// Background Sync: Notify clients when SW gets new data
// =====================
self.addEventListener('message', (event) => {
  if (event.data === 'skipWaiting') {
    self.skipWaiting();
  }
});
