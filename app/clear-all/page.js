'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

export default function ClearAllPage() {
  const [cleared, setCleared] = useState(false)
  const [details, setDetails] = useState([])
  const router = useRouter()

  useEffect(() => {
    clearAllData()
  }, [])

  const clearAllData = () => {
    const clearedItems = []
    
    // 1. Clear all cookies
    console.log('🍪 Clearing all cookies...')
    const cookies = document.cookie.split(';')
    let cookieCount = 0
    
    cookies.forEach(cookie => {
      const eqPos = cookie.indexOf('=')
      const name = eqPos > -1 ? cookie.substr(0, eqPos).trim() : cookie.trim()
      if (name) {
        const paths = ['/', '/api', '/api/auth', '/dashboard', '/login']
        const domains = ['localhost', '.localhost', '', null]
        
        paths.forEach(path => {
          domains.forEach(domain => {
            if (domain) {
              document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=${path}; domain=${domain}`
            } else {
              document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=${path}`
            }
          })
        })
        
        cookieCount++
        console.log(`  Cleared cookie: ${name}`)
      }
    })
    clearedItems.push(`✅ Cleared ${cookieCount} cookies`)
    
    // 2. Clear localStorage
    console.log('💾 Clearing localStorage...')
    const localStorageCount = localStorage.length
    const localStorageKeys = []
    for (let i = 0; i < localStorage.length; i++) {
      localStorageKeys.push(localStorage.key(i))
    }
    localStorageKeys.forEach(key => {
      console.log(`  Clearing localStorage: ${key}`)
      localStorage.removeItem(key)
    })
    clearedItems.push(`✅ Cleared ${localStorageCount} localStorage items`)
    
    // 3. Clear sessionStorage
    console.log('📦 Clearing sessionStorage...')
    const sessionStorageCount = sessionStorage.length
    const sessionStorageKeys = []
    for (let i = 0; i < sessionStorage.length; i++) {
      sessionStorageKeys.push(sessionStorage.key(i))
    }
    sessionStorageKeys.forEach(key => {
      console.log(`  Clearing sessionStorage: ${key}`)
      sessionStorage.removeItem(key)
    })
    clearedItems.push(`✅ Cleared ${sessionStorageCount} sessionStorage items`)
    
    // 4. Clear IndexedDB
    console.log('🗄️ Clearing IndexedDB...')
    if ('indexedDB' in window) {
      indexedDB.databases().then(databases => {
        databases.forEach(db => {
          indexedDB.deleteDatabase(db.name)
          console.log(`  Deleted IndexedDB: ${db.name}`)
        })
        clearedItems.push(`✅ Cleared ${databases.length} IndexedDB databases`)
      }).catch(err => {
        console.error('Failed to clear IndexedDB:', err)
        clearedItems.push('⚠️ Could not clear IndexedDB')
      })
    }
    
    // 5. Clear Cache Storage (for PWAs)
    console.log('📱 Clearing Cache Storage...')
    if ('caches' in window) {
      caches.keys().then(names => {
        names.forEach(name => {
          caches.delete(name)
          console.log(`  Deleted cache: ${name}`)
        })
        clearedItems.push(`✅ Cleared ${names.length} caches`)
      }).catch(err => {
        console.error('Failed to clear caches:', err)
        clearedItems.push('⚠️ Could not clear Cache Storage')
      })
    }
    
    // 6. Unregister Service Workers
    console.log('👷 Unregistering Service Workers...')
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations().then(registrations => {
        registrations.forEach(registration => {
          registration.unregister()
          console.log(`  Unregistered service worker: ${registration.scope}`)
        })
        clearedItems.push(`✅ Unregistered ${registrations.length} service workers`)
      }).catch(err => {
        console.error('Failed to unregister service workers:', err)
        clearedItems.push('⚠️ Could not unregister service workers')
      })
    }
    
    // 7. Clear Web SQL (deprecated but might still exist)
    if (window.openDatabase) {
      try {
        const db = window.openDatabase('', '', '', '')
        db.transaction(tx => {
          tx.executeSql('DROP TABLE IF EXISTS data')
        })
        clearedItems.push('✅ Cleared Web SQL')
      } catch (e) {
        console.log('No Web SQL to clear')
      }
    }
    
    setDetails(clearedItems)
    setCleared(true)
    
    console.log('✅ All browser data cleared!')
    
    setTimeout(() => {
      router.push('/login')
    }, 3000)
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <div className="text-center">
            {!cleared ? (
              <>
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-olive-600 mx-auto"></div>
                <h2 className="mt-4 text-xl font-semibold text-gray-900">
                  Clearing all browser data...
                </h2>
                <p className="mt-2 text-sm text-gray-600">
                  Please wait while we clear cookies, localStorage, and cache
                </p>
              </>
            ) : (
              <>
                <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100">
                  <svg className="h-6 w-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                  </svg>
                </div>
                <h2 className="mt-4 text-xl font-semibold text-gray-900">
                  All browser data cleared!
                </h2>
                <div className="mt-4 text-left">
                  {details.map((detail, index) => (
                    <p key={index} className="text-sm text-gray-600 mb-1">
                      {detail}
                    </p>
                  ))}
                </div>
                <p className="mt-4 text-sm text-gray-600">
                  Redirecting to login page in 3 seconds...
                </p>
              </>
            )}
          </div>
        </div>
        
        <div className="mt-6 text-center">
          <button
            onClick={() => router.push('/login')}
            className="text-sm text-olive-600 hover:text-olive-500"
          >
            Go to login now →
          </button>
        </div>
      </div>
    </div>
  )
}