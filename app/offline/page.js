'use client';

import { useEffect, useState } from 'react';
import { WifiIcon, RefreshCcwIcon, HomeIcon, ServerIcon } from 'lucide-react';

export default function OfflinePage() {
  const [isOnline, setIsOnline] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    // Check online status
    setIsOnline(navigator.onLine);

    const handleOnline = () => {
      setIsOnline(true);
      // Redirect to home page when back online
      setTimeout(() => {
        window.location.href = '/dashboard';
      }, 2000);
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleRetry = async () => {
    setRetryCount(prev => prev + 1);
    
    try {
      // Try to fetch a small resource to test connectivity
      const response = await fetch('/api/health', { 
        method: 'HEAD',
        cache: 'no-cache'
      });
      
      if (response.ok) {
        window.location.reload();
      }
    } catch (error) {
      console.log('Still offline');
    }
  };

  const goToHome = () => {
    window.location.href = '/';
  };

  const viewCachedData = () => {
    window.location.href = '/dashboard';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
        {/* Status Icon */}
        <div className={`mx-auto w-20 h-20 rounded-full flex items-center justify-center mb-6 transition-all duration-500 ${
          isOnline 
            ? 'bg-green-100 text-green-600' 
            : 'bg-red-100 text-red-600'
        }`}>
          {isOnline ? (
            <WifiIcon size={40} className="animate-pulse" />
          ) : (
            <ServerIcon size={40} className="animate-bounce" />
          )}
        </div>

        {/* Status Message */}
        <h1 className={`text-2xl font-bold mb-4 transition-colors duration-300 ${
          isOnline ? 'text-green-600' : 'text-gray-800'
        }`}>
          {isOnline ? 'Connection Restored!' : 'You\'re Offline'}
        </h1>

        <p className={`text-gray-600 mb-8 transition-opacity duration-300 ${
          isOnline ? 'opacity-75' : 'opacity-100'
        }`}>
          {isOnline 
            ? 'Great! Your internet connection is back. Redirecting you to the dashboard...'
            : 'No internet connection detected. You can still access cached content or try reconnecting.'
          }
        </p>

        {/* Online Status - Auto Redirect */}
        {isOnline && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
            <div className="flex items-center justify-center text-green-700">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-green-600 mr-2"></div>
              <span className="text-sm">Redirecting to dashboard...</span>
            </div>
          </div>
        )}

        {/* Offline Actions */}
        {!isOnline && (
          <div className="space-y-4">
            {/* Retry Connection */}
            <button
              onClick={handleRetry}
              disabled={retryCount >= 3}
              className={`w-full flex items-center justify-center px-6 py-3 rounded-xl font-medium transition-all duration-200 ${
                retryCount >= 3
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-blue-600 text-white hover:bg-blue-700 active:transform active:scale-95'
              }`}
            >
              <RefreshCcwIcon size={20} className={`mr-2 ${retryCount >= 3 ? '' : 'group-hover:animate-spin'}`} />
              {retryCount >= 3 ? 'Check Your Connection' : `Retry Connection ${retryCount > 0 ? `(${retryCount}/3)` : ''}`}
            </button>

            {/* View Cached Content */}
            <button
              onClick={viewCachedData}
              className="w-full flex items-center justify-center px-6 py-3 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-all duration-200 active:transform active:scale-95"
            >
              <HomeIcon size={20} className="mr-2" />
              View Cached Dashboard
            </button>

            {/* Go to Home */}
            <button
              onClick={goToHome}
              className="w-full text-gray-500 text-sm hover:text-gray-700 transition-colors duration-200"
            >
              Go to Home Page
            </button>
          </div>
        )}

        {/* Offline Tips */}
        {!isOnline && (
          <div className="mt-8 pt-6 border-t border-gray-200">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">While Offline, You Can:</h3>
            <ul className="text-sm text-gray-600 space-y-2 text-left">
              <li className="flex items-center">
                <div className="w-2 h-2 bg-blue-400 rounded-full mr-3"></div>
                View previously loaded dashboard data
              </li>
              <li className="flex items-center">
                <div className="w-2 h-2 bg-blue-400 rounded-full mr-3"></div>
                Access cached agent configurations
              </li>
              <li className="flex items-center">
                <div className="w-2 h-2 bg-blue-400 rounded-full mr-3"></div>
                Browse integration settings
              </li>
              <li className="flex items-center">
                <div className="w-2 h-2 bg-gray-400 rounded-full mr-3"></div>
                <span className="text-gray-400">New data will sync when reconnected</span>
              </li>
            </ul>
          </div>
        )}

        {/* Connection Info */}
        <div className="mt-6 text-xs text-gray-400">
          <p>Connection Status: {isOnline ? 'Online' : 'Offline'}</p>
          <p>Last Updated: {new Date().toLocaleTimeString()}</p>
        </div>
      </div>
    </div>
  );
}