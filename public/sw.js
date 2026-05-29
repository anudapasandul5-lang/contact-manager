var CACHE_NAME = 'mindmap-shell-v1';
var PRECACHE_URLS = ['/', '/offline'];

self.addEventListener('install', function(event) {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(function(cache) { return cache.addAll(PRECACHE_URLS); })
      .then(function() { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function(event) {
  event.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(
        keys.filter(function(key) { return key !== CACHE_NAME; })
            .map(function(key) { return caches.delete(key); })
      );
    }).then(function() { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function(event) {
  var url = new URL(event.request.url);

  // Skip API requests — pass through to network, no caching
  if (url.pathname.startsWith('/api/')) {
    return;
  }

  event.respondWith(
    caches.open(CACHE_NAME).then(function(cache) {
      return cache.match(event.request).then(function(cachedResponse) {
        // Stale-while-revalidate: update cache in background
        var fetchPromise = fetch(event.request).then(function(networkResponse) {
          if (networkResponse && networkResponse.ok) {
            cache.put(event.request, networkResponse.clone());
          }
          return networkResponse;
        }).catch(function() {
          return null;
        });

        if (cachedResponse) {
          // Return cached response immediately, update in background
          event.waitUntil(fetchPromise);
          return cachedResponse;
        }

        // No cache hit — wait for network
        return fetchPromise.then(function(networkResponse) {
          if (networkResponse) {
            return networkResponse;
          }
          // Both cache and network failed — offline fallback for navigation
          if (event.request.mode === 'navigate') {
            return caches.match('/offline');
          }
          return new Response('Network unavailable', { status: 503 });
        });
      });
    }).catch(function() {
      // Cache open failed — try network, fallback to offline
      return fetch(event.request).catch(function() {
        if (event.request.mode === 'navigate') {
          return caches.match('/offline');
        }
        return new Response('Network unavailable', { status: 503 });
      });
    })
  );
});
