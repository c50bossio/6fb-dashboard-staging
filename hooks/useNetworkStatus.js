'use client';

import { useState, useEffect } from 'react';

export function useNetworkStatus() {
  const [isOnline, setIsOnline] = useState(true);
  const [connectionType, setConnectionType] = useState('unknown');
  const [effectiveType, setEffectiveType] = useState('4g');
  const [downlink, setDownlink] = useState(0);
  const [isSlowConnection, setIsSlowConnection] = useState(false);

  useEffect(() => {
    // Initial status
    setIsOnline(navigator.onLine);

    const updateOnlineStatus = () => setIsOnline(navigator.onLine);
    const updateOfflineStatus = () => setIsOnline(false);

    // Connection info
    const updateConnectionInfo = () => {
      if ('connection' in navigator) {
        const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
        
        if (connection) {
          setConnectionType(connection.type || 'unknown');
          setEffectiveType(connection.effectiveType || '4g');
          setDownlink(connection.downlink || 0);
          
          // Consider connection slow if effective type is 2g or slow-2g
          const slow = connection.effectiveType === '2g' || 
                      connection.effectiveType === 'slow-2g' ||
                      connection.downlink < 0.5;
          setIsSlowConnection(slow);
        }
      }
    };

    // Event listeners
    window.addEventListener('online', updateOnlineStatus);
    window.addEventListener('offline', updateOfflineStatus);

    // Connection change listeners
    if ('connection' in navigator) {
      const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
      if (connection) {
        connection.addEventListener('change', updateConnectionInfo);
        updateConnectionInfo(); // Initial call
      }
    }

    return () => {
      window.removeEventListener('online', updateOnlineStatus);
      window.removeEventListener('offline', updateOfflineStatus);
      
      if ('connection' in navigator) {
        const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
        if (connection) {
          connection.removeEventListener('change', updateConnectionInfo);
        }
      }
    };
  }, []);

  const getConnectionQuality = () => {
    if (!isOnline) return 'offline';
    if (isSlowConnection) return 'poor';
    if (effectiveType === '3g') return 'fair';
    return 'good';
  };

  const getConnectionSpeed = () => {
    if (!isOnline) return 0;
    return downlink;
  };

  const isConnectionFast = () => {
    return isOnline && !isSlowConnection && effectiveType !== '3g';
  };

  return {
    isOnline,
    connectionType,
    effectiveType,
    downlink,
    isSlowConnection,
    connectionQuality: getConnectionQuality(),
    connectionSpeed: getConnectionSpeed(),
    isConnectionFast: isConnectionFast()
  };
}