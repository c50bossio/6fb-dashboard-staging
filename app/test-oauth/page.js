'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/browser-client'

export default function TestOAuthPage() {
  const [status, setStatus] = useState('')
  const [logs, setLogs] = useState([])
  
  const addLog = (message, type = 'info') => {
    const timestamp = new Date().toLocaleTimeString()
    setLogs(prev => [...prev, { timestamp, message, type }])
    console.log(`[${timestamp}] ${message}`)
  }
  
  const testDirectOAuth = async () => {
    setLogs([])
    addLog('Starting direct OAuth test...')
    
    try {
      const supabase = createClient()
      addLog('Supabase client created')
      
      const { data: { session: currentSession } } = await supabase.auth.getSession()
      if (currentSession) {
        addLog(`Already signed in as: ${currentSession.user.email}`, 'success')
        return
      }
      
      const keys = Object.keys(localStorage).filter(k => k.includes('sb-'))
      keys.forEach(key => {
        localStorage.removeItem(key)
        addLog(`Cleared localStorage: ${key}`)
      })
      
      addLog('Initiating OAuth with Google...')
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
          skipBrowserRedirect: false
        }
      })
      
      if (error) {
        addLog(`OAuth error: ${error.message}`, 'error')
      } else {
        addLog('OAuth initiated successfully', 'success')
        addLog(`Redirect URL: ${data.url}`)
      }
      
    } catch (err) {
      addLog(`Exception: ${err.message}`, 'error')
    }
  }
  
  const testWithPlanData = async () => {
    setLogs([])
    addLog('Starting OAuth with plan data test...')
    
    try {
      const planData = {
        planId: 'price_1Rvec7EzoIvSRPoD2pNplqi0',
        billingPeriod: 'monthly',
        timestamp: Date.now()
      }
      
      sessionStorage.setItem('oauth_plan_data', JSON.stringify(planData))
      addLog('Stored plan data in sessionStorage', 'success')
      
      const supabase = createClient()
      addLog('Supabase client created')
      
      addLog('Initiating OAuth with plan data...')
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`
        }
      })
      
      if (error) {
        addLog(`OAuth error: ${error.message}`, 'error')
      } else {
        addLog('OAuth initiated with plan data', 'success')
      }
      
    } catch (err) {
      addLog(`Exception: ${err.message}`, 'error')
    }
  }
  
  const checkStorage = () => {
    setLogs([])
    addLog('Checking browser storage...')
    
    const localKeys = Object.keys(localStorage)
    const supabaseKeys = localKeys.filter(k => k.includes('sb-') || k.includes('supabase'))
    
    addLog(`Total localStorage keys: ${localKeys.length}`)
    addLog(`Supabase keys: ${supabaseKeys.length}`)
    
    supabaseKeys.forEach(key => {
      const value = localStorage.getItem(key)
      if (value) {
        try {
          const parsed = JSON.parse(value)
          if (parsed.access_token) {
            addLog(`${key}: Has access_token`, 'success')
          } else if (parsed.code_verifier) {
            addLog(`${key}: Has PKCE verifier`, 'success')
          } else {
            addLog(`${key}: ${value.substring(0, 50)}...`)
          }
        } catch {
          addLog(`${key}: ${value.substring(0, 50)}...`)
        }
      }
    })
    
    const sessionKeys = Object.keys(sessionStorage)
    addLog(`SessionStorage keys: ${sessionKeys.length}`)
    
    sessionKeys.forEach(key => {
      const value = sessionStorage.getItem(key)
      if (value) {
        addLog(`sessionStorage.${key}: ${value.substring(0, 50)}...`)
      }
    })
    
    const pkceKey = 'sb-dfhqjdoydihajmjxniee-auth-token-code-verifier'
    const verifier = localStorage.getItem(pkceKey)
    if (verifier) {
      addLog(`PKCE verifier found: ${verifier.substring(0, 20)}...`, 'success')
    } else {
      addLog('PKCE verifier NOT found', 'error')
    }
  }
  
  const clearAll = () => {
    localStorage.clear()
    sessionStorage.clear()
    setLogs([])
    addLog('Cleared all storage', 'success')
  }
  
  const checkSession = async () => {
    setLogs([])
    addLog('Checking current session...')
    
    try {
      const supabase = createClient()
      const { data: { session }, error } = await supabase.auth.getSession()
      
      if (error) {
        addLog(`Session error: ${error.message}`, 'error')
      } else if (session) {
        addLog(`Active session: ${session.user.email}`, 'success')
        addLog(`Provider: ${session.user.app_metadata?.provider || 'unknown'}`)
        addLog(`Expires: ${new Date(session.expires_at * 1000).toLocaleString()}`)
      } else {
        addLog('No active session', 'warning')
      }
    } catch (err) {
      addLog(`Exception: ${err.message}`, 'error')
    }
  }
  
  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">OAuth Flow Testing</h1>
        
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Test Actions</h2>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={testDirectOAuth}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Test Direct OAuth
            </button>
            <button
              onClick={testWithPlanData}
              className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
            >
              Test OAuth with Plan
            </button>
            <button
              onClick={checkStorage}
              className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700"
            >
              Check Storage
            </button>
            <button
              onClick={checkSession}
              className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
            >
              Check Session
            </button>
            <button
              onClick={clearAll}
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
        
        <div className="mt-6 text-sm text-gray-600">
          <p className="font-semibold mb-2">Instructions:</p>
          <ol className="list-decimal list-inside space-y-1">
            <li>Click "Clear All Storage" first to start fresh</li>
            <li>Click "Test Direct OAuth" to test basic OAuth flow</li>
            <li>Complete Google sign-in when redirected</li>
            <li>You'll return to /auth/callback and then redirect based on status</li>
            <li>Come back here and click "Check Session" to verify</li>
          </ol>
        </div>
      </div>
    </div>
  )
}