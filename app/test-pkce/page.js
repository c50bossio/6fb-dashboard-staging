'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/browser-client'

export default function TestPKCEPage() {
  const [logs, setLogs] = useState([])
  const [supabase, setSupabase] = useState(null)
  
  useEffect(() => {
    // Initialize Supabase client
    const client = createClient()
    setSupabase(client)
    addLog('Supabase client initialized')
    
    // Check for PKCE verifier immediately
    checkPKCEVerifier()
  }, [])
  
  const addLog = (message, type = 'info') => {
    const timestamp = new Date().toLocaleTimeString()
    setLogs(prev => [...prev, { timestamp, message, type }])
    console.log(`[${timestamp}] ${message}`)
  }
  
  const checkPKCEVerifier = () => {
    addLog('Checking for PKCE verifier...')
    
    // Check all possible PKCE storage keys
    const possibleKeys = [
      'sb-dfhqjdoydihajmjxniee-auth-token-code-verifier',
      'sb-dfhqjdoydihajmjxniee-auth-token',
      'supabase-auth-token-code-verifier'
    ]
    
    let found = false
    possibleKeys.forEach(key => {
      const value = localStorage.getItem(key)
      if (value) {
        if (key.includes('verifier')) {
          addLog(`✅ PKCE verifier found at: ${key}`, 'success')
          addLog(`Verifier value: ${value.substring(0, 20)}...`, 'success')
          found = true
        } else {
          try {
            const parsed = JSON.parse(value)
            if (parsed.code_verifier) {
              addLog(`✅ PKCE verifier found in: ${key}`, 'success')
              addLog(`Verifier: ${parsed.code_verifier.substring(0, 20)}...`, 'success')
              found = true
            }
          } catch {
            // Not JSON
          }
        }
      }
    })
    
    if (!found) {
      addLog('❌ No PKCE verifier found in localStorage', 'error')
    }
    
    // Also check all localStorage keys
    const allKeys = Object.keys(localStorage)
    addLog(`Total localStorage keys: ${allKeys.length}`)
    allKeys.forEach(key => {
      if (key.includes('sb-') || key.includes('supabase') || key.includes('pkce') || key.includes('verifier')) {
        addLog(`Found auth-related key: ${key}`)
      }
    })
  }
  
  const startOAuthFlow = async () => {
    if (!supabase) {
      addLog('Supabase client not initialized', 'error')
      return
    }
    
    addLog('Starting OAuth flow...')
    
    // Clear old auth data first
    const authKeys = Object.keys(localStorage).filter(k => 
      k.includes('sb-') || k.includes('supabase') || k.includes('auth')
    )
    authKeys.forEach(key => {
      localStorage.removeItem(key)
      addLog(`Cleared: ${key}`)
    })
    
    try {
      // Start OAuth with debug logging
      addLog('Calling signInWithOAuth...')
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`
        }
      })
      
      if (error) {
        addLog(`OAuth error: ${error.message}`, 'error')
        return
      }
      
      addLog('OAuth initiated successfully', 'success')
      
      // Immediately check if PKCE verifier was stored
      setTimeout(() => {
        addLog('Checking if PKCE verifier was stored...')
        checkPKCEVerifier()
      }, 100)
      
      // Show redirect URL
      if (data?.url) {
        addLog(`Redirect URL: ${data.url.substring(0, 100)}...`)
        
        // Wait a moment to check storage, then redirect
        setTimeout(() => {
          addLog('Redirecting to Google...')
          window.location.href = data.url
        }, 2000)
      }
      
    } catch (err) {
      addLog(`Exception: ${err.message}`, 'error')
      console.error(err)
    }
  }
  
  const testManualPKCE = () => {
    addLog('Testing manual PKCE storage...')
    
    // Generate a test verifier
    const testVerifier = 'test_verifier_' + Math.random().toString(36).substring(7)
    
    // Try storing it in the expected location
    const key = 'sb-dfhqjdoydihajmjxniee-auth-token-code-verifier'
    localStorage.setItem(key, testVerifier)
    
    addLog(`Manually stored verifier at: ${key}`, 'success')
    addLog(`Value: ${testVerifier}`)
    
    // Verify it was stored
    const retrieved = localStorage.getItem(key)
    if (retrieved === testVerifier) {
      addLog('✅ localStorage is working correctly', 'success')
    } else {
      addLog('❌ localStorage write/read failed', 'error')
    }
  }
  
  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">PKCE Verifier Testing</h1>
        
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Test Actions</h2>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={checkPKCEVerifier}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Check PKCE Verifier
            </button>
            <button
              onClick={testManualPKCE}
              className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700"
            >
              Test Manual Storage
            </button>
            <button
              onClick={startOAuthFlow}
              className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
            >
              Start OAuth Flow
            </button>
            <button
              onClick={() => {
                localStorage.clear()
                sessionStorage.clear()
                setLogs([])
                addLog('Cleared all storage', 'success')
              }}
              className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
            >
              Clear All Storage
            </button>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Debug Logs</h2>
          <div className="bg-gray-900 text-gray-100 p-4 rounded font-mono text-sm max-h-96 overflow-y-auto">
            {logs.length === 0 ? (
              <div className="text-gray-500">No logs yet. Click a test action above.</div>
            ) : (
              logs.map((log, i) => (
                <div
                  key={i}
                  className={`mb-1 ${
                    log.type === 'error' ? 'text-red-400' :
                    log.type === 'success' ? 'text-green-400' :
                    log.type === 'warning' ? 'text-yellow-400' :
                    'text-gray-300'
                  }`}
                >
                  <span className="text-gray-500">[{log.timestamp}]</span> {log.message}
                </div>
              ))
            )}
          </div>
        </div>
        
        <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <h3 className="font-semibold text-yellow-900 mb-2">⚠️ Critical Issue Found</h3>
          <p className="text-yellow-800 mb-2">
            The PKCE code verifier is NOT being stored in localStorage when OAuth starts.
            This is why the OAuth callback fails - Supabase can't complete the PKCE challenge.
          </p>
          <p className="text-yellow-800">
            Possible causes:
          </p>
          <ul className="list-disc list-inside text-yellow-800 mt-1">
            <li>Browser blocking localStorage</li>
            <li>Supabase client misconfiguration</li>
            <li>PKCE flow not properly initialized</li>
          </ul>
        </div>
      </div>
    </div>
  )
}