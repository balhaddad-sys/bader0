// Offline support for the website. The atlas is one page, so the page and its icons are all it needs.
// tools/build_web.mjs stamps the cache name below, so each build starts a fresh cache.
const CACHE = 'cnl-__VERSION__';
const FILES = ['./', 'manifest.webmanifest', 'icon-192.png', 'icon-512.png', 'icon-maskable-512.png', 'apple-touch-icon.png'];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(FILES)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(key => key !== CACHE).map(key => caches.delete(key))))
    .then(() => self.clients.claim()));
});
// The page: network first so updates arrive, the cached copy when offline. Icons: cache first. Never the APK.
self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET' || new URL(request.url).origin !== location.origin || request.url.endsWith('.apk')) return;
  if (request.mode === 'navigate') {
    event.respondWith(fetch(request).then(response => {
      if (response.ok) { const copy = response.clone(); caches.open(CACHE).then(cache => cache.put('./', copy)); }
      return response;
    }).catch(() => caches.match('./')));
    return;
  }
  event.respondWith(caches.match(request).then(hit => hit || fetch(request)));
});
