'use client'

import { useState, useEffect } from 'react'

export default function TestSupabaseOAuth() {
  const [logs, setLogs] = useState([])
  
  const addLog = (message, data = null) => {
    const entry = {
      time: new Date().toISOString(),
      message,
      data
    }
    console.log(message, data || '')
    setLogs(prev => [...prev, entry])
  }
  
  useEffect(() => {
    // Check current URL for OAuth response
    const currentUrl = window.location.href
    const hashParams = new URLSearchParams(window.location.hash.substring(1))
    const searchParams = new URLSearchParams(window.location.search)
    
    addLog('Current URL', currentUrl)
    
    // Check for error
    const error = searchParams.get('error') || hashParams.get('error')
    if (error) {
      addLog('OAuth Error', {
        error,
        description: searchParams.get('error_description') || hashParams.get('error_description')
      })
    }
    
    // Check for code
    const code = searchParams.get('code')
    if (code) {
      addLog('Authorization Code Found', code.substring(0, 20) + '...')
    }
    
    // Check for access token (implicit flow)
    const accessToken = hashParams.get('access_token')
    if (accessToken) {
      addLog('Access Token Found (Implicit)', accessToken.substring(0, 20) + '...')
    }
    
    // Log all URL parameters
    const allParams = {}
    for (const [key, value] of searchParams) {
      allParams[key] = value.length > 50 ? value.substring(0, 50) + '...' : value
    }
    for (const [key, value] of hashParams) {
      allParams['#' + key] = value.length > 50 ? value.substring(0, 50) + '...' : value
    }
    if (Object.keys(allParams).length > 0) {
      addLog('All URL Parameters', allParams)
    }
  }, [])
  
  const startGoogleOAuth = () => {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    
    // Build the OAuth URL exactly as Supabase expects
    const params = new URLSearchParams({
      provider: 'google',
      redirect_to: `${window.location.origin}/auth/test-supabase-oauth`
    })
    
    const oauthUrl = `${supabaseUrl}/auth/v1/authorize?${params.toString()}`
    
    addLog('Starting OAuth with URL', oauthUrl)
    
    // Redirect to OAuth
    window.location.href = oauthUrl
  }
  
  const testDirectAPI = async () => {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    
    addLog('Testing Supabase Auth API directly...')
    
    try {
      // Test auth health
      const healthResponse = await fetch(`${supabaseUrl}/auth/v1/health`, {
        headers: { 'apikey': supabaseAnonKey }
      })
      
      addLog('Auth Health Check', {
        status: healthResponse.status,
        ok: healthResponse.ok,
        text: await healthResponse.text()
      })
      
      // Test settings
      const settingsResponse = await fetch(`${supabaseUrl}/auth/v1/settings`, {
        headers: { 'apikey': supabaseAnonKey }
      })
      
      const settings = await settingsResponse.json()
      addLog('Auth Settings', {
        status: settingsResponse.status,
        external_providers: settings.external_providers,
        google_enabled: settings.external_providers?.includes('google')
      })
      
    } catch (error) {
      addLog('API Test Error', error.message)
    }
  }
  
  const clearAndRestart = () => {
    // Clear all auth-related storage
    localStorage.removeItem('sb-access-token')
    localStorage.removeItem('sb-refresh-token')
    localStorage.removeItem('sb-user')
    localStorage.removeItem('sb-session')
    localStorage.removeItem('dev_bypass')
    localStorage.removeItem('dev_session')
    
    // Clear cookies
    document.cookie.split(";").forEach(function(c) { 
      document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/")
    })
    
    setLogs([])
    addLog('Cleared all auth data')
  }
  
  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">Supabase OAuth Test</h1>
        
        <div className="grid gap-4 mb-6">
          <button
            onClick={startGoogleOAuth}
            className="px-6 py-3 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Start Google OAuth (Direct to Supabase)
          </button>
          
          <button
            onClick={testDirectAPI}
            className="px-6 py-3 bg-purple-600 text-white rounded hover:bg-purple-700"
          >
            Test Supabase Auth API
          </button>
          
          <button
            onClick={clearAndRestart}
            className="px-6 py-3 bg-gray-600 text-white rounded hover:bg-gray-700"
          >
            Clear All Auth Data
          </button>
        </div>
        
        <div className="bg-gray-800 rounded-lg p-4">
          <h2 className="text-lg font-semibold mb-3">Logs:</h2>
          <div className="space-y-2 font-mono text-sm">
            {logs.length === 0 ? (
              <div className="text-gray-400">No logs yet. Click a button to start testing.</div>
            ) : (
              logs.map((log, i) => (
                <div key={i} className="border-b border-gray-700 pb-2">
                  <div className="text-gray-400 text-xs">{log.time}</div>
                  <div className="text-white">{log.message}</div>
                  {log.data && (
                    <pre className="text-gray-300 text-xs mt-1 overflow-x-auto">
                      {typeof log.data === 'string' ? log.data : JSON.stringify(log.data, null, 2)}
                    </pre>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
        
        <div className="mt-6 p-4 bg-yellow-900 rounded-lg">
          <h3 className="font-semibold mb-2">Expected OAuth Flow:</h3>
          <ol className="list-decimal list-inside text-sm space-y-1">
            <li>Click "Start Google OAuth"</li>
            <li>Redirected to Google sign-in</li>
            <li>After sign-in, Google redirects to Supabase</li>
            <li>Supabase redirects back here with code or token</li>
            <li>Check logs for the authorization code</li>
          </ol>
        </div>
      </div>
    </div>
  )
}