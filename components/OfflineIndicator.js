'use client'

import { useState, useEffect } from 'react'
import { WifiIcon } from '@heroicons/react/24/outline'

/**
 * Offline Indicator Component
 * Shows a banner when the user loses internet connection
 * Automatically hides when connection is restored
 */
export default function OfflineIndicator() {
  const [isOnline, setIsOnline] = useState(true)
  const [showBanner, setShowBanner] = useState(false)

  useEffect(() => {
    // Initial state
    setIsOnline(navigator.onLine)

    // Handle online/offline events
    const handleOnline = () => {
      setIsOnline(true)
      // Show success message briefly then hide banner
      setTimeout(() => {
        setShowBanner(false)
      }, 2000)
    }

    const handleOffline = () => {
      setIsOnline(false)
      setShowBanner(true)
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  if (!showBanner) return null

  return (
    <div
      className={`fixed top-0 left-0 right-0 z-[9999] transform transition-all duration-300 ${
        isOnline ? 'translate-y-0' : 'translate-y-0'
      }`}
    >
      <div
        className={`mx-auto max-w-7xl px-4 py-3 ${
          isOnline
            ? 'bg-green-500'
            : 'bg-orange-500'
        }`}
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            {isOnline ? (
              // Online - success icon
              <svg
                className="h-6 w-6 text-white animate-pulse"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            ) : (
              // Offline - wifi slash icon
              <WifiIcon className="h-6 w-6 text-white" />
            )}
            <div>
              <p className="text-sm font-semibold text-white">
                {isOnline ? 'Back Online' : 'No Internet Connection'}
              </p>
              <p className="text-xs text-white/90">
                {isOnline
                  ? 'Your connection has been restored'
                  : 'Some features may not work until you reconnect'}
              </p>
            </div>
          </div>

          {!isOnline && (
            <button
              onClick={() => window.location.reload()}
              className="flex-shrink-0 rounded-md bg-white/20 px-3 py-2 text-sm font-medium text-white hover:bg-white/30 transition-colors"
            >
              Retry
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
