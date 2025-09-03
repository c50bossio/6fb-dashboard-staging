'use client'

import { useEffect, useState } from 'react'
import { toast } from '@/hooks/use-toast'
import cacheManager from '@/lib/cacheManager'

export default function ServiceWorkerProvider({ children }) {
  const [isOnline, setIsOnline] = useState(true)
  const [swRegistration, setSwRegistration] = useState(null)
  const [swUpdateAvailable, setSwUpdateAvailable] = useState(false)

  useEffect(() => {
    // Completely disable service worker and unregister any existing ones
    // Service workers disabled for authentication debugging
    
    if ('serviceWorker' in navigator) {
      // Unregister all existing service workers
      navigator.serviceWorker.getRegistrations().then(registrations => {
        registrations.forEach(registration => {
          registration.unregister()
        })
      }).catch(error => {
        // Silent failure - service worker cleanup is not critical
      })
    }

    const handleOnline = () => {
      setIsOnline(true)
      toast({
        title: "Back Online",
        description: "Your connection has been restored.",
        variant: "success"
      })
    }

    const handleOffline = () => {
      setIsOnline(false)
      toast({
        title: "You're Offline",
        description: "Some features may be limited.",
        variant: "warning"
      })
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    setIsOnline(navigator.onLine)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  async function registerServiceWorker() {
    try {
      // Service worker registration temporarily disabled for auth debugging
      setSwRegistration(null)
      return null

    } catch (error) {
      console.error('Service Worker registration failed:', error)
    }
  }

  function updateServiceWorker(worker) {
    worker.postMessage({ type: 'SKIP_WAITING' })
    
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      window.location.reload()
    })
  }
  
  async function handleUpdate(registration) {
    try {
      // Use cache manager to handle the update properly
      await cacheManager.applyUpdate(registration)
    } catch (error) {
      console.error('Update failed:', error)
      // Fallback to simple reload
      window.location.reload(true)
    }
  }

  useEffect(() => {
    let deferredPrompt = null

    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault()
      deferredPrompt = e
      
      showInstallPromotion(deferredPrompt)
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    }
  }, [])

  function showInstallPromotion(prompt) {
    // PWA install prompt disabled as requested by user
    // This prevents the "Install App" notification from appearing
    console.log('[ServiceWorkerProvider] PWA install prompt suppressed')
    return
  }

  return (
    <>
      {children}
      {/* Offline indicator */}
      {!isOnline && (
        <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-auto z-50">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg px-4 py-2 text-sm text-yellow-800 flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636a9 9 0 010 12.728m0 0l-2.829-2.829m2.829 2.829L21 21M15.536 8.464a5 5 0 010 7.072m0 0l-2.829-2.829m-4.243 2.829a4.978 4.978 0 01-1.414-2.83m-1.414 5.658a9 9 0 01-2.167-9.238m7.824 2.167a1 1 0 111.414 1.414m-1.414-1.414L3 3m8.293 8.293l1.414 1.414" />
            </svg>
            <span>Offline Mode</span>
          </div>
        </div>
      )}
    </>
  )
}