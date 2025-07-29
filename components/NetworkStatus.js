'use client';

import { useState, useEffect } from 'react';
import { WifiIcon, WifiOffIcon, CloudOffIcon, RefreshCwIcon, AlertTriangleIcon } from 'lucide-react';

export default function NetworkStatus() {
  const [isOnline, setIsOnline] = useState(true);
  const [showBanner, setShowBanner] = useState(false);
  const [lastOnline, setLastOnline] = useState(null);
  const [pendingActions, setPendingActions] = useState(0);
  const [connectionQuality, setConnectionQuality] = useState('good');

  useEffect(() => {
    // Initial state
    setIsOnline(navigator.onLine);

    const handleOnline = () => {
      setIsOnline(true);
      setShowBanner(true);
      
      // Auto-hide success banner after 3 seconds
      setTimeout(() => setShowBanner(false), 3000);
      
      // Sync pending actions
      if (pendingActions > 0) {
        syncPendingActions();
      }
    };

    const handleOffline = () => {
      setIsOnline(false);
      setLastOnline(new Date());
      setShowBanner(true);
    };

    // Connection quality detection (simplified)
    const detectConnectionQuality = () => {
      if ('connection' in navigator) {
        const connection = navigator.connection;
        const effectiveType = connection.effectiveType;
        
        if (effectiveType === 'slow-2g' || effectiveType === '2g') {
          setConnectionQuality('poor');
        } else if (effectiveType === '3g') {
          setConnectionQuality('fair');
        } else {
          setConnectionQuality('good');
        }
      }
    };

    // Listen for network events
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    // Listen for connection changes
    if ('connection' in navigator) {
      navigator.connection.addEventListener('change', detectConnectionQuality);
    }

    // Initial quality check
    detectConnectionQuality();

    // Periodic connectivity test
    const connectivityCheck = setInterval(() => {
      if (navigator.onLine) {
        // Test actual connectivity with a lightweight request
        fetch('/api/health', { 
          method: 'HEAD', 
          cache: 'no-cache',
          signal: AbortSignal.timeout(5000)
        })
        .then(response => {
          if (!response.ok && isOnline) {
            // Server unreachable but browser thinks we're online
            setConnectionQuality('poor');
          }
        })
        .catch(() => {
          if (isOnline) {
            setConnectionQuality('poor');
          }
        });
      }
    }, 30000);

    // Listen for failed requests from service worker
    const handleMessage = (event) => {
      if (event.data?.type === 'NETWORK_ERROR') {
        setPendingActions(prev => prev + 1);
      } else if (event.data?.type === 'SYNC_SUCCESS') {
        setPendingActions(prev => Math.max(0, prev - 1));
      }
    };

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', handleMessage);
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(connectivityCheck);
      
      if ('connection' in navigator) {
        navigator.connection.removeEventListener('change', detectConnectionQuality);
      }
      
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.removeEventListener('message', handleMessage);
      }
    };
  }, [isOnline, pendingActions]);

  const syncPendingActions = async () => {
    try {
      // Trigger background sync via service worker
      if ('serviceWorker' in navigator && 'sync' in window.ServiceWorkerRegistration.prototype) {
        const registration = await navigator.serviceWorker.ready;
        await registration.sync.register('background-sync-data');
        
        // Also sync any queued forms
        await registration.sync.register('background-sync-form');
      }
    } catch (error) {
      console.log('Sync registration failed:', error);
    }
  };

  const handleRetry = () => {
    window.location.reload();
  };

  const dismissBanner = () => {
    setShowBanner(false);
  };

  // Don't show anything if online and no banner needed
  if (isOnline && !showBanner && pendingActions === 0) {
    return null;
  }

  return (
    <>
      {/* Network Status Banner */}
      {showBanner && (
        <div className={`fixed top-0 left-0 right-0 z-40 transform transition-transform duration-300 ${
          showBanner ? 'translate-y-0' : '-translate-y-full'
        }`}>
          <div className={`px-4 py-3 text-sm font-medium text-center ${
            isOnline 
              ? 'bg-green-600 text-white' 
              : 'bg-red-600 text-white'
          }`}>
            <div className="flex items-center justify-center space-x-2">
              {isOnline ? (
                <>
                  <WifiIcon size={16} />
                  <span>Back online! Syncing data...</span>
                </>
              ) : (
                <>
                  <WifiOffIcon size={16} />
                  <span>You're offline. Some features may be limited.</span>
                </>
              )}
              <button
                onClick={dismissBanner}
                className="ml-4 text-white/80 hover:text-white"
              >
                ×
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Persistent Status Indicator */}
      {(!isOnline || pendingActions > 0 || connectionQuality === 'poor') && (
        <div className="fixed bottom-4 right-4 z-50">
          <div className={`px-4 py-2 rounded-full shadow-lg flex items-center space-x-2 ${
            !isOnline 
              ? 'bg-red-500 text-white' 
              : connectionQuality === 'poor'
              ? 'bg-yellow-500 text-white'
              : 'bg-blue-500 text-white'
          }`}>
            {!isOnline ? (
              <>
                <CloudOffIcon size={16} />
                <span className="text-sm font-medium">Offline</span>
                {lastOnline && (
                  <span className="text-xs opacity-75">
                    Since {lastOnline.toLocaleTimeString()}
                  </span>
                )}
              </>
            ) : connectionQuality === 'poor' ? (
              <>
                <AlertTriangleIcon size={16} />
                <span className="text-sm font-medium">Slow Connection</span>
              </>
            ) : (
              <>
                <RefreshCwIcon size={16} className="animate-spin" />
                <span className="text-sm font-medium">Syncing...</span>
              </>
            )}
            
            {pendingActions > 0 && (
              <div className="bg-white/20 rounded-full px-2 py-0.5">
                <span className="text-xs font-bold">{pendingActions}</span>
              </div>
            )}
          </div>
          
          {/* Retry Button for Offline */}
          {!isOnline && (
            <button
              onClick={handleRetry}
              className="mt-2 w-full bg-white text-red-600 px-3 py-1 rounded-full text-xs font-medium hover:bg-gray-50"
            >
              Retry Connection
            </button>
          )}
        </div>
      )}

      {/* Connection Quality Indicator (top right) */}
      {isOnline && (
        <div className="fixed top-4 right-4 z-30">
          <div className={`w-3 h-3 rounded-full ${
            connectionQuality === 'good' 
              ? 'bg-green-400' 
              : connectionQuality === 'fair'
              ? 'bg-yellow-400'
              : 'bg-red-400'
          }`} title={`Connection: ${connectionQuality}`}>
            {connectionQuality === 'poor' && (
              <div className="absolute inset-0 bg-red-400 rounded-full animate-ping opacity-75"></div>
            )}
          </div>
        </div>
      )}
    </>
  );
}