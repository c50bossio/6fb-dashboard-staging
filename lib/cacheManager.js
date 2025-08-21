/**
 * Cache Manager
 * 
 * Centralized cache management for the application
 * Handles service worker caches, browser storage, and deployment updates
 */

/**
 * Clear all application caches
 * This is the nuclear option - clears everything
 */
export const clearAllCaches = async () => {
  const results = {
    serviceWorker: false,
    caches: false,
    localStorage: false,
    sessionStorage: false,
    errors: []
  };

  try {
    // 1. Clear Service Worker caches
    if ('caches' in window) {
      const cacheNames = await caches.keys();
      await Promise.all(
        cacheNames.map(name => caches.delete(name))
      );
      console.log('[CacheManager] Cleared service worker caches:', cacheNames);
      results.caches = true;
    }

    // 2. Update Service Worker
    if ('serviceWorker' in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      
      // Send message to service worker to clear its caches
      if (navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({
          type: 'CLEAR_ALL_CACHES'
        });
      }
      
      // Force update all service workers
      await Promise.all(
        registrations.map(registration => registration.update())
      );
      
      console.log('[CacheManager] Updated service workers');
      results.serviceWorker = true;
    }

    // 3. Clear localStorage (preserving auth)
    if (typeof localStorage !== 'undefined') {
      const authKeys = Object.keys(localStorage).filter(key => 
        key.includes('supabase') || key.includes('auth')
      );
      const authData = {};
      
      authKeys.forEach(key => {
        authData[key] = localStorage.getItem(key);
      });
      
      localStorage.clear();
      
      // Restore auth data
      Object.entries(authData).forEach(([key, value]) => {
        localStorage.setItem(key, value);
      });
      
      console.log('[CacheManager] Cleared localStorage (preserved auth)');
      results.localStorage = true;
    }

    // 4. Clear sessionStorage
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.clear();
      console.log('[CacheManager] Cleared sessionStorage');
      results.sessionStorage = true;
    }

    return { success: true, results };
  } catch (error) {
    console.error('[CacheManager] Error clearing caches:', error);
    results.errors.push(error.message);
    return { success: false, results, error };
  }
};

/**
 * Check for deployment updates
 */
export const checkForUpdates = async () => {
  try {
    // Check service worker for updates
    if ('serviceWorker' in navigator) {
      const registration = await navigator.serviceWorker.getRegistration();
      if (registration) {
        await registration.update();
        
        // Check if update is available
        if (registration.waiting) {
          console.log('[CacheManager] Update available');
          return { updateAvailable: true, registration };
        }
      }
    }

    // Check build ID
    const currentBuildId = process.env.NEXT_PUBLIC_BUILD_ID;
    const response = await fetch('/api/build-info', { 
      cache: 'no-cache',
      headers: {
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
      }
    });
    
    if (response.ok) {
      const data = await response.json();
      if (data.buildId && data.buildId !== currentBuildId) {
        console.log(`[CacheManager] Build mismatch - Current: ${currentBuildId}, Server: ${data.buildId}`);
        return { updateAvailable: true, newBuildId: data.buildId };
      }
    }

    return { updateAvailable: false };
  } catch (error) {
    console.error('[CacheManager] Error checking for updates:', error);
    return { updateAvailable: false, error };
  }
};

/**
 * Apply update and reload
 */
export const applyUpdate = async (registration = null) => {
  try {
    // Clear all caches first
    await clearAllCaches();

    // If we have a waiting service worker, activate it
    if (registration && registration.waiting) {
      registration.waiting.postMessage({ type: 'SKIP_WAITING' });
      
      // Wait for the new service worker to take control
      await new Promise((resolve) => {
        navigator.serviceWorker.addEventListener('controllerchange', resolve, { once: true });
      });
    }

    // Force reload to get fresh content
    window.location.reload(true);
  } catch (error) {
    console.error('[CacheManager] Error applying update:', error);
    // Fallback to simple reload
    window.location.reload(true);
  }
};

/**
 * Smart cache refresh - only clears what's necessary
 */
export const refreshCache = async () => {
  try {
    // Just update service worker and clear old caches
    if ('serviceWorker' in navigator) {
      const registration = await navigator.serviceWorker.getRegistration();
      if (registration) {
        await registration.update();
      }
    }

    // Clear only old caches
    if ('caches' in window) {
      const cacheNames = await caches.keys();
      const currentVersion = process.env.NEXT_PUBLIC_BUILD_ID;
      
      await Promise.all(
        cacheNames.map(name => {
          // Delete caches that don't match current version
          if (!name.includes(currentVersion)) {
            console.log(`[CacheManager] Deleting old cache: ${name}`);
            return caches.delete(name);
          }
        })
      );
    }

    return { success: true };
  } catch (error) {
    console.error('[CacheManager] Error refreshing cache:', error);
    return { success: false, error };
  }
};

/**
 * Get cache status information
 */
export const getCacheStatus = async () => {
  const status = {
    serviceWorker: null,
    caches: [],
    storage: {},
    buildInfo: {}
  };

  try {
    // Service Worker status
    if ('serviceWorker' in navigator) {
      const registration = await navigator.serviceWorker.getRegistration();
      if (registration) {
        status.serviceWorker = {
          state: registration.active ? 'active' : 'inactive',
          scope: registration.scope,
          updateAvailable: !!registration.waiting
        };
      }
    }

    // Cache storage
    if ('caches' in window) {
      const cacheNames = await caches.keys();
      status.caches = cacheNames;
    }

    // Storage usage
    if ('storage' in navigator && 'estimate' in navigator.storage) {
      const estimate = await navigator.storage.estimate();
      status.storage = {
        usage: `${(estimate.usage / 1024 / 1024).toFixed(2)} MB`,
        quota: `${(estimate.quota / 1024 / 1024).toFixed(2)} MB`,
        percentage: `${((estimate.usage / estimate.quota) * 100).toFixed(2)}%`
      };
    }

    // Build info
    status.buildInfo = {
      currentBuild: process.env.NEXT_PUBLIC_BUILD_ID,
      buildTime: process.env.NEXT_PUBLIC_BUILD_TIME
    };

    return status;
  } catch (error) {
    console.error('[CacheManager] Error getting cache status:', error);
    return { ...status, error: error.message };
  }
};

/**
 * Install update prompt handler
 */
export const setupUpdatePrompt = (onUpdateAvailable) => {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.ready.then(registration => {
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        
        newWorker?.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            // New service worker is ready
            if (onUpdateAvailable) {
              onUpdateAvailable(registration);
            }
          }
        });
      });
    });

    // Also listen for messages from service worker
    navigator.serviceWorker.addEventListener('message', (event) => {
      if (event.data && event.data.type === 'SW_UPDATED') {
        console.log('[CacheManager] Service worker updated:', event.data);
        if (onUpdateAvailable) {
          onUpdateAvailable();
        }
      }
    });
  }
};

// Auto-check for updates on load
if (typeof window !== 'undefined') {
  // Check for updates after page load
  window.addEventListener('load', async () => {
    // Wait a bit to not interfere with initial load
    setTimeout(async () => {
      const result = await checkForUpdates();
      if (result.updateAvailable) {
        console.log('[CacheManager] Update available on page load');
      }
    }, 5000);
  });
}

export default {
  clearAll: clearAllCaches,
  checkForUpdates,
  applyUpdate,
  refresh: refreshCache,
  getStatus: getCacheStatus,
  setupUpdatePrompt
};