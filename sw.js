// MRPS MUSIC Service Worker (PWA & Android Auto Offline Ready)
const CACHE_NAME = 'mrps-music-v80';
const STATIC_ASSETS = [
    './',
    './index.html',
    './manifest.webmanifest',
    './assets/css/styles.css?v=80',
    './assets/js/app.js?v=80',
    './assets/js/data.js?v=80',
    './assets/js/shader.js?v=80',
    './assets/icons/icon.svg',
    './assets/icons/icon-192.png',
    './assets/icons/icon-512.png'
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(STATIC_ASSETS).catch((err) => {
                console.warn('Pre-cache partial failure:', err);
            });
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
    const url = new URL(event.request.url);

    // Network-only for external streaming / API calls (YouTube, Apple iTunes, Piped)
    if (url.origin !== location.origin) {
        return;
    }

    // Stale-while-revalidate for local app shell assets
    event.respondWith(
        caches.match(event.request).then((cachedResponse) => {
            const fetchPromise = fetch(event.request).then((networkResponse) => {
                if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
                    const responseToCache = networkResponse.clone();
                    caches.open(CACHE_NAME).then((cache) => {
                        cache.put(event.request, responseToCache);
                    });
                }
                return networkResponse;
            }).catch(() => cachedResponse);

            return cachedResponse || fetchPromise;
        })
    );
});
