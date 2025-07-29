/**
 * 6FB AI Agent System - Service Worker
 * 
 * Implements offline-first caching strategies for PWA functionality
 */

const CACHE_NAME = '6fb-ai-v1.0.0';
const STATIC_CACHE = `${CACHE_NAME}-static`;
const DYNAMIC_CACHE = `${CACHE_NAME}-dynamic`;
const API_CACHE = `${CACHE_NAME}-api`;

// Resources to cache immediately on install
const STATIC_ASSETS = [
  '/',
  '/dashboard',
  '/dashboard/agents',
  '/dashboard/integrations',
  '/offline',
  '/manifest.json',
  '/icons/icon-192x192.svg',
  '/icons/icon-512x512.svg',
  // Next.js static files will be cached dynamically
];

// API endpoints to cache
const API_ENDPOINTS = [
  '/api/agents',
  '/api/integrations',
  '/api/auth/me',
];

// Network-first resources (always try network first)
const NETWORK_FIRST = [
  '/api/agents/chat',
  '/api/integrations/sync',
  '/api/auth',
];

// Cache-first resources (images, icons, static assets)
const CACHE_FIRST = [
  '/icons/',
  '/screenshots/',
  '/_next/static/',
  '/favicon.ico',
];

/**
 * Install Event - Cache static assets
 */
self.addEventListener('install', event => {
  console.log('[SW] Installing service worker...');
  
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then(cache => {
        console.log('[SW] Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => {
        console.log('[SW] Static assets cached successfully');
        return self.skipWaiting(); // Take control immediately
      })
      .catch(error => {
        console.error('[SW] Failed to cache static assets:', error);
      })
  );
});

/**
 * Activate Event - Clean up old caches
 */
self.addEventListener('activate', event => {
  console.log('[SW] Activating service worker...');
  
  event.waitUntil(
    caches.keys()
      .then(cacheNames => {
        return Promise.all(
          cacheNames.map(cacheName => {
            if (cacheName.startsWith('6fb-ai-') && cacheName !== STATIC_CACHE && 
                cacheName !== DYNAMIC_CACHE && cacheName !== API_CACHE) {
              console.log('[SW] Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log('[SW] Service worker activated');
        return self.clients.claim(); // Take control of all clients
      })
  );
});

/**
 * Fetch Event - Implement caching strategies
 */
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Skip non-HTTP requests
  if (!request.url.startsWith('http')) {
    return;
  }
  
  // Handle different request types with appropriate strategies
  if (isApiRequest(url)) {
    event.respondWith(handleApiRequest(request));
  } else if (isStaticAsset(url)) {
    event.respondWith(handleStaticAsset(request));
  } else if (isPageRequest(request)) {
    event.respondWith(handlePageRequest(request));
  } else {
    event.respondWith(handleGenericRequest(request));
  }
});

/**
 * Check if request is for API endpoint
 */
function isApiRequest(url) {
  return url.pathname.startsWith('/api/');
}

/**
 * Check if request is for static asset
 */
function isStaticAsset(url) {
  return CACHE_FIRST.some(pattern => url.pathname.startsWith(pattern)) ||
         url.pathname.match(/\.(js|css|png|jpg|jpeg|gif|svg|ico|woff|woff2)$/);
}

/**
 * Check if request is for HTML page
 */
function isPageRequest(request) {
  return request.method === 'GET' && 
         request.headers.get('accept')?.includes('text/html');
}

/**
 * Handle API requests with network-first strategy
 */
async function handleApiRequest(request) {
  const url = new URL(request.url);
  
  // Network-first for real-time endpoints
  if (NETWORK_FIRST.some(pattern => url.pathname.startsWith(pattern))) {
    return handleNetworkFirst(request, API_CACHE);
  }
  
  // Stale-while-revalidate for other API endpoints
  return handleStaleWhileRevalidate(request, API_CACHE);
}

/**
 * Handle static assets with cache-first strategy
 */
async function handleStaticAsset(request) {
  return handleCacheFirst(request, STATIC_CACHE);
}

/**
 * Handle page requests with network-first strategy
 */
async function handlePageRequest(request) {
  return handleNetworkFirst(request, DYNAMIC_CACHE, '/offline');
}

/**
 * Handle generic requests
 */
async function handleGenericRequest(request) {
  return handleNetworkFirst(request, DYNAMIC_CACHE);
}

/**
 * Network-first caching strategy
 */
async function handleNetworkFirst(request, cacheName, fallbackUrl = null) {
  try {
    // Try network first
    const networkResponse = await fetch(request);
    
    // Cache successful responses
    if (networkResponse.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.log('[SW] Network failed, trying cache:', request.url);
    
    // Try cache
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Return fallback for HTML requests
    if (fallbackUrl && request.headers.get('accept')?.includes('text/html')) {
      return caches.match(fallbackUrl);
    }
    
    // Return offline response
    return new Response('Offline', { 
      status: 503, 
      statusText: 'Service Unavailable' 
    });
  }
}

/**
 * Cache-first caching strategy
 */
async function handleCacheFirst(request, cacheName) {
  // Try cache first
  const cachedResponse = await caches.match(request);
  if (cachedResponse) {
    return cachedResponse;
  }
  
  // Try network
  try {
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.log('[SW] Cache and network failed for:', request.url);
    return new Response('Asset not available', { 
      status: 404, 
      statusText: 'Not Found' 
    });
  }
}

/**
 * Stale-while-revalidate caching strategy
 */
async function handleStaleWhileRevalidate(request, cacheName) {
  // Get cached response immediately
  const cachedResponse = await caches.match(request);
  
  // Fetch fresh response in background
  const fetchPromise = fetch(request).then(networkResponse => {
    if (networkResponse.ok) {
      const cache = caches.open(cacheName);
      cache.then(c => c.put(request, networkResponse.clone()));
    }
    return networkResponse;
  }).catch(error => {
    console.log('[SW] Background fetch failed:', error);
    return cachedResponse;
  });
  
  // Return cached response if available, otherwise wait for network
  return cachedResponse || fetchPromise;
}

/**
 * Background Sync Event - Handle queued actions
 */
self.addEventListener('sync', event => {
  console.log('[SW] Background sync triggered:', event.tag);
  
  if (event.tag === 'background-sync-form') {
    event.waitUntil(handleFormSync());
  } else if (event.tag === 'background-sync-data') {
    event.waitUntil(handleDataSync());
  }
});

/**
 * Handle form submissions that were queued while offline
 */
async function handleFormSync() {
  try {
    // Get queued form data from IndexedDB
    const queuedForms = await getQueuedForms();
    
    for (const formData of queuedForms) {
      try {
        const response = await fetch(formData.url, {
          method: formData.method,
          headers: formData.headers,
          body: formData.body
        });
        
        if (response.ok) {
          await removeQueuedForm(formData.id);
          console.log('[SW] Queued form submitted successfully');
        }
      } catch (error) {
        console.log('[SW] Failed to submit queued form:', error);
      }
    }
  } catch (error) {
    console.error('[SW] Form sync failed:', error);
  }
}

/**
 * Handle data synchronization
 */
async function handleDataSync() {
  try {
    // Sync critical data when back online
    await Promise.all([
      syncApiData('/api/agents'),
      syncApiData('/api/integrations'),
      syncApiData('/api/auth/me')
    ]);
    
    console.log('[SW] Data sync completed');
  } catch (error) {
    console.error('[SW] Data sync failed:', error);
  }
}

/**
 * Sync API data
 */
async function syncApiData(endpoint) {
  try {
    const response = await fetch(endpoint);
    if (response.ok) {
      const cache = await caches.open(API_CACHE);
      await cache.put(endpoint, response.clone());
    }
  } catch (error) {
    console.log(`[SW] Failed to sync ${endpoint}:`, error);
  }
}

/**
 * Message Event - Handle messages from main thread
 */
self.addEventListener('message', event => {
  const { type, data } = event.data;
  
  switch (type) {
    case 'SKIP_WAITING':
      self.skipWaiting();
      break;
      
    case 'QUEUE_FORM':
      queueFormData(data);
      break;
      
    case 'GET_CACHE_SIZE':
      getCacheSize().then(size => {
        event.ports[0].postMessage({ size });
      });
      break;
      
    case 'CLEAR_CACHE':
      clearCache(data.cacheName).then(() => {
        event.ports[0].postMessage({ success: true });
      });
      break;
      
    default:
      console.log('[SW] Unknown message type:', type);
  }
});

/**
 * Push Event - Handle push notifications
 */
self.addEventListener('push', event => {
  if (!event.data) return;
  
  const options = {
    body: event.data.text(),
    icon: '/icons/icon-192x192.svg',
    badge: '/icons/icon-72x72.svg',
    vibrate: [200, 100, 200],
    tag: '6fb-notification',
    actions: [
      { action: 'open', title: 'Open App' },
      { action: 'close', title: 'Close' }
    ]
  };
  
  event.waitUntil(
    self.registration.showNotification('6FB AI Agent System', options)
  );
});

/**
 * Notification Click Event
 */
self.addEventListener('notificationclick', event => {
  event.notification.close();
  
  if (event.action === 'open' || !event.action) {
    event.waitUntil(
      clients.openWindow('/dashboard')
    );
  }
});

/**
 * Utility functions for IndexedDB operations
 * (Simplified implementation - expand as needed)
 */
async function getQueuedForms() {
  // Implementation would use IndexedDB to retrieve queued forms
  return [];
}

async function removeQueuedForm(id) {
  // Implementation would use IndexedDB to remove completed form
}

async function queueFormData(data) {
  // Implementation would use IndexedDB to store form for later submission
  console.log('[SW] Form queued for background sync:', data);
}

async function getCacheSize() {
  const cacheNames = await caches.keys();
  let totalSize = 0;
  
  for (const cacheName of cacheNames) {
    const cache = await caches.open(cacheName);
    const requests = await cache.keys();
    totalSize += requests.length;
  }
  
  return totalSize;
}

async function clearCache(cacheName) {
  if (cacheName) {
    return caches.delete(cacheName);
  } else {
    const cacheNames = await caches.keys();
    return Promise.all(cacheNames.map(name => caches.delete(name)));
  }
}