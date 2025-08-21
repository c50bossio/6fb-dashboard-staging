/**
 * Service Worker for 6FB AI Agent System
 * Handles offline functionality, caching, and background sync
 * 
 * IMPORTANT: This service worker now uses dynamic versioning to ensure
 * deployment changes are reflected immediately
 */

// Dynamic cache versioning - changes with each deployment
const BUILD_TIMESTAMP = new Date().getTime();
const CACHE_VERSION = '2.0.0';
const CACHE_NAME = `app-cache-${CACHE_VERSION}-${BUILD_TIMESTAMP}`;
const API_CACHE = `api-cache-${CACHE_VERSION}-${BUILD_TIMESTAMP}`;

const urlsToCache = [
  '/',
  '/offline',
  '/manifest.json',
  '/favicon.ico'
];

const API_CACHE_MAX_AGE = 5 * 60 * 1000; // 5 minutes

// Track if this is a new installation
let isNewInstallation = false;

self.addEventListener('install', (event) => {
  isNewInstallation = true;
  console.log(`[SW] Installing new service worker with cache: ${CACHE_NAME}`);
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[SW] Caching essential files');
        return cache.addAll(urlsToCache);
      })
      .then(() => {
        // Immediately take control of all clients
        console.log('[SW] Skip waiting to activate immediately');
        return self.skipWaiting();
      })
  );
});

self.addEventListener('activate', (event) => {
  console.log(`[SW] Activating service worker with cache: ${CACHE_NAME}`);
  
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          // Delete ALL old caches that don't match current version
          if (!cacheName.includes(CACHE_VERSION) || 
              (cacheName !== CACHE_NAME && cacheName !== API_CACHE)) {
            console.log('[SW] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
    .then(() => {
      // Claim all clients immediately
      console.log('[SW] Claiming all clients');
      return self.clients.claim();
    })
    .then(() => {
      // Notify all clients about the update
      return self.clients.matchAll().then(clients => {
        clients.forEach(client => {
          client.postMessage({
            type: 'SW_UPDATED',
            version: CACHE_VERSION,
            timestamp: BUILD_TIMESTAMP
          });
        });
      });
    })
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

// Implement stale-while-revalidate strategy for better updates
async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cachedResponse = await cache.match(request);
  
  // Always fetch in background to update cache
  const fetchPromise = fetch(request)
    .then(response => {
      if (response && response.ok) {
        const responseToCache = response.clone();
        cache.put(request, responseToCache).catch(err => {
          console.log('[SW] Cache update failed:', err);
        });
      }
      return response;
    })
    .catch(error => {
      console.log('[SW] Fetch failed, using cache:', error);
      return cachedResponse;
    });
  
  // Return cached immediately if available, otherwise wait for network
  return cachedResponse || fetchPromise;
}

async function cacheFirstStrategy(request, cacheName) {
  try {
    const cache = await caches.open(cacheName);
    const cachedResponse = await cache.match(request);
    
    if (cachedResponse) {
      // Return cached immediately and don't try to fetch if offline
      return cachedResponse;
    }
    
    // Only fetch if we don't have a cached version
    return fetch(request).then(response => {
      if (response && response.ok) {
        const responseToCache = response.clone();
        cache.put(request, responseToCache).catch(err => {
          console.log('[SW] Cache update failed:', err);
        });
      }
      return response;
    }).catch(error => {
      console.log('[SW] Fetch failed for uncached resource:', error);
      // Return a proper error response
      return new Response('Resource not available offline', {
        status: 503,
        statusText: 'Service Unavailable'
      });
    });
  } catch (error) {
    console.log('[SW] cacheFirstStrategy error:', error);
    return new Response('Service Worker Error', {
      status: 500,
      statusText: 'Internal Error'
    });
  }
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
  try {
    const response = await fetch(request);
    
    if (response && response.ok) {
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
  } catch (error) {
    console.log('[SW] fetchAndCache failed:', error);
    // Try to return from cache if fetch fails
    const cache = await caches.open(cacheName);
    const cachedResponse = await cache.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    // Return error response if nothing cached
    throw error;
  }
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
  if (event.data) {
    switch (event.data.type) {
      case 'SKIP_WAITING':
        self.skipWaiting();
        break;
        
      case 'CLEAR_ALL_CACHES':
        // Allow manual cache clearing
        event.waitUntil(
          caches.keys().then(cacheNames => {
            return Promise.all(
              cacheNames.map(cacheName => {
                console.log('[SW] Clearing cache:', cacheName);
                return caches.delete(cacheName);
              })
            );
          })
        );
        break;
        
      case 'GET_VERSION':
        // Respond with current version
        event.ports[0].postMessage({
          version: CACHE_VERSION,
          timestamp: BUILD_TIMESTAMP
        });
        break;
    }
  }
});

async function getPendingAppointments() {
  return [];
}

async function removePendingAppointment(id) {
  return true;
}