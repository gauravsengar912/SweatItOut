// SweatItOut Service Worker v3
const CACHE = 'sweatitout-v3';
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  'https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Sans:wght@300;400;500&display=swap',
  'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js'
];

self.addEventListener('install', function(e) {
  e.waitUntil(
    caches.open(CACHE).then(function(cache) {
      return cache.addAll(ASSETS.map(function(url) {
        return new Request(url, {mode: 'no-cors'});
      })).catch(function(err) {
        console.warn('SW cache partial fail:', err);
      });
    }).then(function() { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function(e) {
  e.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(
        keys.filter(function(k) { return k !== CACHE; })
            .map(function(k) { return caches.delete(k); })
      );
    }).then(function() { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function(e) {
  var url = e.request.url;
  // Pass through API, fonts and external calls
  if (url.includes('googleapis.com') || url.includes('youtube') ||
      url.includes('fonts.g') || url.includes('cdnjs.')) {
    return;
  }
  e.respondWith(
    caches.match(e.request).then(function(cached) {
      if (cached) return cached;
      return fetch(e.request).then(function(res) {
        if (res && res.status === 200 && e.request.method === 'GET') {
          caches.open(CACHE).then(function(c) { c.put(e.request, res.clone()); });
        }
        return res;
      }).catch(function() {
        if (e.request.mode === 'navigate') return caches.match('./index.html');
      });
    })
  );
});
