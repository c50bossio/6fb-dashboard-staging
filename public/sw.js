/**
 * Service Worker for 6FB AI Agent System
 * Handles offline functionality, caching, and background sync
 */

const CACHE_NAME = 'v1.0.0';
const urlsToCache = [
  '/',
  '/offline',
  '/manifest.json',
  '/favicon.ico'
];

const API_CACHE = 'api-cache-v1';
const API_CACHE_MAX_AGE = 5 * 60 * 1000; // 5 minutes

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[SW] Caching essential files');
        return cache.addAll(urlsToCache);
      })
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME && cacheName !== API_CACHE) {
            console.log('[SW] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (request.method !== 'GET') return;

  // Skip service worker for authentication and payment-related routes
  const skipPaths = [
    '/auth/', 
    '/api/auth/', 
    '/login', 
    '/register', 
    '/api/supabase/',
    '/api/payments/',  // Skip all payment-related APIs
    '/api/stripe/',    // Skip Stripe-related APIs
    '/api/onboarding/' // Skip onboarding APIs
  ];
  
  if (skipPaths.some(path => url.pathname.startsWith(path))) {
    return; // Let the browser handle these requests directly
  }

  // For other API routes, use network-first but don't fail if network is down
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(request)
        .then(response => {
          if (response.ok) {
            // Clone BEFORE using the response
            const responseToCache = response.clone();
            caches.open(API_CACHE).then(cache => {
              // Wrap in try-catch to prevent network errors
              try {
                cache.put(request, responseToCache).catch(err => {
                  console.log('[SW] Cache.put error (API):', err);
                });
              } catch (err) {
                console.log('[SW] Cache operation failed:', err);
              }
            });
          }
          return response;
        })
        .catch(() => {
          // For API routes, return from cache if available, otherwise return error
          return caches.match(request).then(cached => {
            if (cached) return cached;
            // Return a proper error response instead of failing silently
            return new Response(JSON.stringify({ error: 'Network error' }), {
              status: 503,
              headers: { 'Content-Type': 'application/json' }
            });
          });
        })
    );
    return;
  }

  if (isStaticAsset(url.pathname)) {
    event.respondWith(
      cacheFirstStrategy(request, CACHE_NAME)
    );
    return;
  }

  if (request.mode === 'navigate') {
    event.respondWith(
      networkFirstStrategy(request, CACHE_NAME)
        .catch(() => caches.match('/offline'))
    );
    return;
  }

  event.respondWith(
    networkFirstStrategy(request, CACHE_NAME)
  );
});

async function cacheFirstStrategy(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  
  if (cached) {
    fetchAndCache(request, cacheName);
    return cached;
  }
  
  return fetchAndCache(request, cacheName);
}

async function networkFirstStrategy(request, cacheName, maxAge) {
  try {
    const response = await fetch(request);
    
    if (response.ok) {
      const cache = await caches.open(cacheName);
      try {
        await cache.put(request, response.clone()).catch(err => {
          console.log('[SW] Cache.put error (network-first):', err);
        });
      } catch (err) {
        console.log('[SW] Cache operation failed:', err);
      }
    }
    
    return response;
  } catch (error) {
    console.log('[SW] Network request failed, trying cache:', request.url);
    const cached = await caches.match(request);
    
    if (cached) {
      if (maxAge) {
        const cachedDate = new Date(cached.headers.get('date'));
        if (Date.now() - cachedDate.getTime() > maxAge) {
          throw new Error('Cache expired');
        }
      }
      return cached;
    }
    
    throw error;
  }
}

async function fetchAndCache(request, cacheName) {
  const response = await fetch(request);
  
  if (response.ok) {
    const cache = await caches.open(cacheName);
    try {
      await cache.put(request, response.clone()).catch(err => {
        console.log('[SW] Cache.put error (fetchAndCache):', err);
      });
    } catch (err) {
      console.log('[SW] Cache operation failed:', err);
    }
  }
  
  return response;
}

function isStaticAsset(pathname) {
  const staticExtensions = [
    '.js', '.css', '.png', '.jpg', '.jpeg', 
    '.svg', '.gif', '.webp', '.woff', '.woff2'
  ];
  
  return staticExtensions.some(ext => pathname.endsWith(ext));
}

self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-appointments') {
    event.waitUntil(syncAppointments());
  }
});

async function syncAppointments() {
  try {
    const pending = await getPendingAppointments();
    
    for (const appointment of pending) {
      await fetch('/api/appointments/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(appointment)
      });
      
      await removePendingAppointment(appointment.id);
    }
  } catch (error) {
    console.error('[SW] Sync failed:', error);
  }
}

self.addEventListener('push', (event) => {
  const options = {
    body: event.data?.text() || 'New notification',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/badge-72x72.png',
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1
    }
  };

  event.waitUntil(
    self.registration.showNotification('6FB AI Agent', options)
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  event.waitUntil(
    clients.openWindow('/')
  );
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

async function getPendingAppointments() {
  return [];
}

async function removePendingAppointment(id) {
  return true;
}