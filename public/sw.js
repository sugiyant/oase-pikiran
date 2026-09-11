const CACHE_NAME = 'oase-pikiran-v2';
const ASSETS = [
  '/',
  '/explore/',
  '/archive/',
  '/about/',
  '/favicon.svg',
  '/manifest.json'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS);
    })
  );
  self.skipWaiting();
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
    })
  );
  self.claim();
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // For API calls or dynamic pages, try network first, fallback to cache
  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/articles/')) {
    event.respondWith(
      fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse.ok) {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseClone);
            });
          }
          return networkResponse;
        })
        .catch(() => {
          return caches.match(event.request);
        })
    );
    return;
  }

  // For static assets, cache first, fallback to network
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        // Fetch in background to update cache
        fetch(event.request).then((networkResponse) => {
          if (networkResponse.ok) {
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, networkResponse);
            });
          }
        }).catch(() => {});
        return cachedResponse;
      }
      return fetch(event.request).then((networkResponse) => {
        if (networkResponse.ok) {
          const responseClone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
        }
        return networkResponse;
      }).catch(() => {
        if (event.request.mode === 'navigate') {
          return caches.match('/');
        }
      });
    })
  );
});

// Background sync to prefetch all articles when online
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'PREFETCH_ALL') {
    event.waitUntil(
      fetch('/api/get-articles')
        .then(res => res.json())
        .then(articles => {
          caches.open(CACHE_NAME).then(cache => {
            // Cache the JSON list
            cache.put('/api/get-articles', new Response(JSON.stringify(articles)));
            // Cache individual article routes if they exist
            articles.forEach(article => {
              const articleUrl = `/articles/${article.slug}/`;
              fetch(articleUrl).then(res => {
                if (res.ok) cache.put(articleUrl, res);
              }).catch(() => {});
            });
          });
        }).catch(() => {})
    );
  }
});
