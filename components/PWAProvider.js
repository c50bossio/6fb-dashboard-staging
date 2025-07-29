'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import PWAInstallPrompt from './PWAInstallPrompt';
import NetworkStatus from './NetworkStatus';

const PWAContext = createContext({});

export const usePWA = () => {
  const context = useContext(PWAContext);
  if (!context) {
    throw new Error('usePWA must be used within a PWAProvider');
  }
  return context;
};

export default function PWAProvider({ children }) {
  const [isInstallable, setIsInstallable] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [swRegistration, setSWRegistration] = useState(null);
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [cacheSize, setCacheSize] = useState(0);
  const [pendingSync, setPendingSync] = useState([]);

  useEffect(() => {
    // Check if already installed
    const standalone = window.matchMedia('(display-mode: standalone)').matches || 
                      window.navigator.standalone;
    setIsInstalled(standalone);

    // Initialize online status
    setIsOnline(navigator.onLine);

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Service worker management
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then(registration => {
        setSWRegistration(registration);
        
        // Check for updates
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              setUpdateAvailable(true);
            }
          });
        });
      });

      // Listen for messages from service worker
      navigator.serviceWorker.addEventListener('message', handleSWMessage);
    }

    // Check install prompt availability
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setIsInstallable(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Periodic cache size check
    const cacheCheckInterval = setInterval(checkCacheSize, 60000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.removeEventListener('message', handleSWMessage);
      }
      
      clearInterval(cacheCheckInterval);
    };
  }, []);

  const handleSWMessage = (event) => {
    const { type, data } = event.data || {};
    
    switch (type) {
      case 'CACHE_UPDATED':
        checkCacheSize();
        break;
        
      case 'SYNC_QUEUED':
        setPendingSync(prev => [...prev, data]);
        break;
        
      case 'SYNC_COMPLETED':
        setPendingSync(prev => prev.filter(item => item.id !== data.id));
        break;
        
      case 'UPDATE_AVAILABLE':
        setUpdateAvailable(true);
        break;
        
      default:
        console.log('[PWA] Unknown SW message:', type);
    }
  };

  const checkCacheSize = async () => {
    if (!swRegistration) return;
    
    try {
      const messageChannel = new MessageChannel();
      messageChannel.port1.onmessage = (event) => {
        setCacheSize(event.data.size || 0);
      };
      
      swRegistration.active?.postMessage(
        { type: 'GET_CACHE_SIZE' },
        [messageChannel.port2]
      );
    } catch (error) {
      console.log('[PWA] Failed to check cache size:', error);
    }
  };

  const updateServiceWorker = async () => {
    if (!swRegistration) return;
    
    try {
      // Tell SW to skip waiting
      swRegistration.waiting?.postMessage({ type: 'SKIP_WAITING' });
      
      // Reload page to activate new SW
      window.location.reload();
    } catch (error) {
      console.log('[PWA] Failed to update SW:', error);
    }
  };

  const clearCache = async (cacheName = null) => {
    if (!swRegistration) return;
    
    try {
      const messageChannel = new MessageChannel();
      messageChannel.port1.onmessage = (event) => {
        if (event.data.success) {
          checkCacheSize();
          console.log('[PWA] Cache cleared successfully');
        }
      };
      
      swRegistration.active?.postMessage(
        { type: 'CLEAR_CACHE', data: { cacheName } },
        [messageChannel.port2]
      );
    } catch (error) {
      console.log('[PWA] Failed to clear cache:', error);
    }
  };

  const queueAction = async (action) => {
    if (!swRegistration) return;
    
    try {
      swRegistration.active?.postMessage({
        type: 'QUEUE_FORM',
        data: {
          id: Date.now(),
          ...action,
          timestamp: new Date().toISOString()
        }
      });
      
      // Register background sync
      if ('sync' in window.ServiceWorkerRegistration.prototype) {
        await swRegistration.sync.register('background-sync-form');
      }
    } catch (error) {
      console.log('[PWA] Failed to queue action:', error);
    }
  };

  const requestPersistentStorage = async () => {
    if ('storage' in navigator && 'persist' in navigator.storage) {
      try {
        const persistent = await navigator.storage.persist();
        console.log('[PWA] Persistent storage:', persistent);
        return persistent;
      } catch (error) {
        console.log('[PWA] Failed to request persistent storage:', error);
      }
    }
    return false;
  };

  const getStorageEstimate = async () => {
    if ('storage' in navigator && 'estimate' in navigator.storage) {
      try {
        const estimate = await navigator.storage.estimate();
        return estimate;
      } catch (error) {
        console.log('[PWA] Failed to get storage estimate:', error);
      }
    }
    return null;
  };

  const contextValue = {
    // Status
    isInstallable,
    isInstalled,
    isOnline,
    updateAvailable,
    cacheSize,
    pendingSync,
    
    // Actions
    updateServiceWorker,
    clearCache,
    queueAction,
    requestPersistentStorage,
    getStorageEstimate,
    
    // Service Worker
    swRegistration
  };

  return (
    <PWAContext.Provider value={contextValue}>
      {children}
      
      {/* PWA Components */}
      <PWAInstallPrompt />
      <NetworkStatus />
      
      {/* Update Available Notification */}
      {updateAvailable && (
        <div className="fixed top-4 left-4 right-4 z-50 max-w-sm mx-auto">
          <div className="bg-blue-600 text-white rounded-lg shadow-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-semibold text-sm">Update Available</h4>
                <p className="text-xs opacity-90">New features and improvements</p>
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={() => setUpdateAvailable(false)}
                  className="text-xs text-white/70 hover:text-white"
                >
                  Later
                </button>
                <button
                  onClick={updateServiceWorker}
                  className="bg-white/20 hover:bg-white/30 px-3 py-1 rounded text-xs font-medium"
                >
                  Update
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </PWAContext.Provider>
  );
}