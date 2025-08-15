'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/browser-client'

export default function DebugPKCEPage() {
  const [logs, setLogs] = useState([])
  const [cookies, setCookies] = useState([])
  const [localStorage, setLocalStorage] = useState([])
  const [sessionStorage, setSessionStorage] = useState([])
  
  const addLog = (message) => {
    const timestamp = new Date().toISOString()
    setLogs(prev => [...prev, `[${timestamp}] ${message}`])
    console.log(`🔍 PKCE Debug: ${message}`)
  }

  const updateStorageStates = () => {
    // Get all cookies
    const allCookies = document.cookie.split('; ').map(cookie => {
      const [name, value] = cookie.split('=')
      return { name, value: value || '(empty)' }
    }).filter(cookie => cookie.name)
    setCookies(allCookies)

    // Get localStorage items
    const localItems = []
    for (let i = 0; i < window.localStorage.length; i++) {
      const key = window.localStorage.key(i)
      if (key) {
        localItems.push({ 
          name: key, 
          value: window.localStorage.getItem(key)?.substring(0, 100) + '...' 
        })
      }
    }
    setLocalStorage(localItems)

    // Get sessionStorage items  
    const sessionItems = []
    for (let i = 0; i < window.sessionStorage.length; i++) {
      const key = window.sessionStorage.key(i)
      if (key) {
        sessionItems.push({ 
          name: key, 
          value: window.sessionStorage.getItem(key)?.substring(0, 100) + '...' 
        })
      }
    }
    setSessionStorage(sessionItems)
  }

  useEffect(() => {
    addLog('Debug page loaded')
    updateStorageStates()
  }, [])

  const handleOAuthDebug = async () => {
    addLog('=== Starting OAuth Debug Test ===')
    
    try {
      // Create Supabase client
      const supabase = createClient()
      addLog('✅ Supabase client created')
      
      // Get initial storage state
      addLog('📊 Capturing BEFORE state...')
      updateStorageStates()
      
      // Simulate OAuth initiation WITHOUT actually redirecting
      addLog('🚀 Initiating OAuth (dry run)...')
      
      // We'll manually trigger the OAuth setup without redirect
      const redirectTo = `${window.location.origin}/auth/callback`
      addLog(`🔄 Would redirect to: ${redirectTo}`)
      
      // Try to access the auth internals to see what PKCE data would be created
      try {
        // This will start the OAuth flow and create PKCE data, but we need to prevent redirect
        const oauthPromise = supabase.auth.signInWithOAuth({
          provider: 'google',
          options: {
            redirectTo: redirectTo,
            skipBrowserRedirect: true // This might prevent the actual redirect
          }
        })
        
        // Give it a moment to set up PKCE
        setTimeout(() => {
          addLog('📊 Capturing AFTER OAuth initiation state...')
          updateStorageStates()
          
          // Look specifically for PKCE-related items
          const pkceItems = []
          
          // Check cookies for code verifier
          document.cookie.split('; ').forEach(cookie => {
            const [name, value] = cookie.split('=')
            if (name && name.includes('code-verifier')) {
              pkceItems.push(`Cookie: ${name} = ${value?.substring(0, 20)}...`)
              addLog(`🔐 Found PKCE cookie: ${name}`)
            }
          })
          
          // Check localStorage
          for (let i = 0; i < window.localStorage.length; i++) {
            const key = window.localStorage.key(i)
            if (key && key.includes('code-verifier')) {
              pkceItems.push(`LocalStorage: ${key} = ${window.localStorage.getItem(key)?.substring(0, 20)}...`)
              addLog(`🔐 Found PKCE localStorage: ${key}`)
            }
          }
          
          // Check sessionStorage
          for (let i = 0; i < window.sessionStorage.length; i++) {
            const key = window.sessionStorage.key(i)
            if (key && key.includes('code-verifier')) {
              pkceItems.push(`SessionStorage: ${key} = ${window.sessionStorage.getItem(key)?.substring(0, 20)}...`)
              addLog(`🔐 Found PKCE sessionStorage: ${key}`)
            }
          }
          
          if (pkceItems.length === 0) {
            addLog('❌ NO PKCE CODE VERIFIER DATA FOUND!')
          } else {
            addLog(`✅ Found ${pkceItems.length} PKCE items:`)
            pkceItems.forEach(item => addLog(`  - ${item}`))
          }
          
        }, 2000)
        
        const result = await oauthPromise
        addLog(`OAuth result: ${JSON.stringify(result)}`)
        
      } catch (oauthError) {
        addLog(`OAuth error (expected): ${oauthError.message}`)
      }
      
    } catch (error) {
      addLog(`❌ Error: ${error.message}`)
    }
  }

  const clearAllStorage = () => {
    addLog('🧹 Clearing all storage...')
    
    // Clear cookies
    document.cookie.split("; ").forEach(function(c) { 
      document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/"); 
    })
    
    // Clear localStorage
    window.localStorage.clear()
    
    // Clear sessionStorage  
    window.sessionStorage.clear()
    
    updateStorageStates()
    addLog('✅ All storage cleared')
  }

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <h1 className="text-3xl font-bold mb-6">PKCE Debug Tool</h1>
      
      <div className="space-y-4 mb-8">
        <button 
          onClick={handleOAuthDebug}
          className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700"
        >
          🔍 Debug OAuth PKCE Flow
        </button>
        
        <button 
          onClick={clearAllStorage}
          className="bg-red-600 text-white px-6 py-3 rounded-lg hover:bg-red-700 ml-4"
        >
          🧹 Clear All Storage
        </button>
        
        <button 
          onClick={updateStorageStates}
          className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 ml-4"
        >
          🔄 Refresh Storage View
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Debug Logs */}
        <div className="bg-gray-900 text-green-400 p-4 rounded-lg">
          <h2 className="text-xl font-bold mb-4">Debug Logs</h2>
          <div className="h-96 overflow-y-auto font-mono text-sm">
            {logs.map((log, index) => (
              <div key={index} className="mb-1">{log}</div>
            ))}
          </div>
        </div>

        {/* Storage States */}
        <div className="space-y-6">
          {/* Cookies */}
          <div className="bg-white border rounded-lg p-4">
            <h3 className="text-lg font-semibold mb-2">Cookies ({cookies.length})</h3>
            <div className="max-h-32 overflow-y-auto">
              {cookies.length === 0 ? (
                <p className="text-gray-500">No cookies found</p>
              ) : (
                cookies.map((cookie, index) => (
                  <div key={index} className="text-sm mb-1">
                    <strong>{cookie.name}:</strong> {cookie.value}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* LocalStorage */}
          <div className="bg-white border rounded-lg p-4">
            <h3 className="text-lg font-semibold mb-2">LocalStorage ({localStorage.length})</h3>
            <div className="max-h-32 overflow-y-auto">
              {localStorage.length === 0 ? (
                <p className="text-gray-500">No localStorage items</p>
              ) : (
                localStorage.map((item, index) => (
                  <div key={index} className="text-sm mb-1">
                    <strong>{item.name}:</strong> {item.value}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* SessionStorage */}
          <div className="bg-white border rounded-lg p-4">
            <h3 className="text-lg font-semibold mb-2">SessionStorage ({sessionStorage.length})</h3>
            <div className="max-h-32 overflow-y-auto">
              {sessionStorage.length === 0 ? (
                <p className="text-gray-500">No sessionStorage items</p>
              ) : (
                sessionStorage.map((item, index) => (
                  <div key={index} className="text-sm mb-1">
                    <strong>{item.name}:</strong> {item.value}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
      
      <div className="mt-8 p-4 bg-yellow-100 rounded-lg">
        <h3 className="font-semibold">Instructions:</h3>
        <ol className="list-decimal list-inside mt-2 space-y-1">
          <li>Click "Debug OAuth PKCE Flow" to simulate OAuth initiation</li>
          <li>Watch the logs and storage states to see what PKCE data is created</li>
          <li>Look for cookies with "code-verifier" in their names</li>
          <li>Compare with what the server expects to receive</li>
        </ol>
      </div>
    </div>
  )
}