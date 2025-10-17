'use client'

import { useState, useEffect, useRef } from 'react'

export default function DebugAuth() {
  // Global state for enhanced debugging
  const [debugState, setDebugState] = useState({
    logs: [],
    networkRequests: [],
    performance: {
      requests: 0,
      totalTime: 0,
      errors: 0
    },
    monitoring: {
      network: false,
      realtime: false
    },
    supabase: null,
    session: null
  })

  const [activeTab, setActiveTab] = useState('overview')
  const [logFilter, setLogFilter] = useState('all')
  const [results, setResults] = useState({})
  const [testing, setTesting] = useState(true)
  const [isInitialized, setIsInitialized] = useState(false)

  // Enhanced logging system
  const log = (message, type = 'info') => {
    const timestamp = new Date().toTimeString().split(' ')[0]
    const logEntry = {
      timestamp,
      message,
      type,
      id: Date.now() + Math.random()
    }
    
    setDebugState(prev => {
      const newLogs = [logEntry, ...prev.logs]
      if (newLogs.length > 1000) {
        newLogs.splice(1000)
      }
      return { ...prev, logs: newLogs }
    })
    
    console.log(`[${timestamp}] ${message}`)
  }

  useEffect(() => {
    const runTests = async () => {
      log('🚀 6FB Auth Debug Console initialized', 'info')
      const testResults = {}
      
      // Test 1: Check environment variables
      log('🔍 Checking environment variables...', 'info')
      testResults.envVars = {
        url: process.env.NEXT_PUBLIC_SUPABASE_URL || 'NOT SET',
        hasKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        keyLength: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.length || 0
      }
      
      // Test 2: Try to import Supabase
      try {
        log('📦 Testing Supabase import...', 'info')
        const { createBrowserClient } = await import('@supabase/ssr')
        testResults.importSuccess = true
        log('✅ Supabase import successful', 'success')
        
        // Test 3: Try to create client
        try {
          log('🔧 Creating Supabase client...', 'info')
          const client = createBrowserClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
          )
          testResults.clientCreated = true
          setDebugState(prev => ({ ...prev, supabase: client }))
          log('✅ Supabase client created successfully', 'success')
          
          // Set up auth state listener
          client.auth.onAuthStateChange((event, session) => {
            log(`🔐 Auth state changed: ${event}`, event === 'SIGNED_IN' ? 'success' : 'info')
            setDebugState(prev => ({ ...prev, session }))
          })
          
          // Test 4: Try to call getSession with timeout
          try {
            log('🔍 Testing session retrieval...', 'info')
            const timeoutPromise = new Promise((_, reject) => 
              setTimeout(() => reject(new Error('Timeout after 5 seconds')), 5000)
            )
            
            const sessionPromise = client.auth.getSession()
            
            const result = await Promise.race([sessionPromise, timeoutPromise])
            testResults.sessionResponse = {
              success: true,
              hasSession: !!result?.data?.session,
              error: result?.error?.message || null
            }
            
            if (result?.data?.session) {
              log(`✅ Active session found for user: ${result.data.session.user.email}`, 'success')
              setDebugState(prev => ({ ...prev, session: result.data.session }))
            } else {
              log('ℹ️ No active session found', 'info')
            }
          } catch (sessionError) {
            testResults.sessionResponse = {
              success: false,
              error: sessionError.message
            }
            log(`❌ Session test failed: ${sessionError.message}`, 'error')
          }
          
        } catch (clientError) {
          testResults.clientCreated = false
          testResults.clientError = clientError.message
          log(`❌ Client creation failed: ${clientError.message}`, 'error')
        }
        
      } catch (importError) {
        testResults.importSuccess = false
        testResults.importError = importError.message
        log(`❌ Supabase import failed: ${importError.message}`, 'error')
      }
      
      // Test 5: Check if we can reach Supabase URL
      try {
        log('🏥 Testing Supabase health endpoint...', 'info')
        const startTime = Date.now()
        const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/health`, {
          method: 'GET',
          headers: {
            'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
            'Content-Type': 'application/json'
          }
        })
        const duration = Date.now() - startTime
        
        testResults.healthCheck = {
          status: response.status,
          ok: response.ok,
          statusText: response.statusText,
          duration
        }
        
        log(`${response.ok ? '✅' : '❌'} Supabase health check: ${response.status} (${duration}ms)`, response.ok ? 'success' : 'error')
      } catch (fetchError) {
        testResults.healthCheck = {
          error: fetchError.message
        }
        log(`❌ Supabase health check failed: ${fetchError.message}`, 'error')
      }
      
      // Test API endpoints
      const endpoints = ['/api/auth/health', '/api/auth/session', '/api/health/supabase']
      for (const endpoint of endpoints) {
        try {
          const startTime = Date.now()
          const response = await fetch(endpoint)
          const duration = Date.now() - startTime
          log(`${response.ok ? '✅' : '❌'} ${endpoint} → ${response.status} (${duration}ms)`, response.ok ? 'success' : 'error')
        } catch (error) {
          log(`❌ ${endpoint} failed: ${error.message}`, 'error')
        }
      }
      
      setResults(testResults)
      setTesting(false)
      setIsInitialized(true)
      log('✅ Authentication diagnostics complete', 'success')
    }
    
    runTests()
  }, [])

  // Authentication test functions
  const testEmailPasswordLogin = async (email, password) => {
    if (!email || !password) {
      log('❌ Email and password required for login test', 'error')
      return
    }

    log(`🔐 Testing email/password login for: ${email}`, 'info')

    try {
      const startTime = Date.now()
      const { data, error } = await debugState.supabase.auth.signInWithPassword({
        email,
        password
      })

      const duration = Date.now() - startTime

      if (error) {
        log(`❌ Login failed: ${error.message} (${duration}ms)`, 'error')
      } else {
        log(`✅ Login successful for ${email} (${duration}ms)`, 'success')
      }
      
      return { success: !error, error, data, duration }
    } catch (error) {
      log(`❌ Login exception: ${error.message}`, 'error')
      return { success: false, error: error.message }
    }
  }

  const testGoogleOAuth = async () => {
    log('🔗 Testing Google OAuth flow', 'info')

    try {
      const { data, error } = await debugState.supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`
        }
      })

      if (error) {
        log(`❌ Google OAuth error: ${error.message}`, 'error')
      } else {
        log('✅ Google OAuth flow initiated successfully', 'success')
      }
      
      return { success: !error, error, data }
    } catch (error) {
      log(`❌ Google OAuth exception: ${error.message}`, 'error')
      return { success: false, error: error.message }
    }
  }

  // Utility functions
  const clearLogs = () => {
    setDebugState(prev => ({ ...prev, logs: [] }))
    log('🗑️ Debug logs cleared', 'info')
  }

  const exportDebugData = () => {
    const debugData = {
      timestamp: new Date().toISOString(),
      testResults: results,
      logs: debugState.logs,
      session: debugState.session,
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
      url: typeof window !== 'undefined' ? window.location.href : 'unknown'
    }

    const blob = new Blob([JSON.stringify(debugData, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `6fb-auth-debug-${Date.now()}.json`
    a.click()
    URL.revokeObjectURL(url)

    log('📥 Debug data exported successfully', 'success')
  }

  // Filter logs
  const filteredLogs = logFilter === 'all' 
    ? debugState.logs 
    : debugState.logs.filter(log => log.type === logFilter)

  // Login test component
  const LoginTestForm = () => {
    const [email, setEmail] = useState('demo@barbershop.com')
    const [password, setPassword] = useState('demo123')
    const [testingLogin, setTestingLogin] = useState(false)
    const [loginResult, setLoginResult] = useState(null)

    const handleSubmit = async (e) => {
      e.preventDefault()
      setTestingLogin(true)
      setLoginResult(null)
      
      const testResult = await testEmailPasswordLogin(email, password)
      setLoginResult(testResult)
      setTestingLogin(false)
    }

    return (
      <div className="bg-gray-800 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-blue-400 mb-4">Email/Password Login Test</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            className="w-full p-3 bg-gray-700 border border-gray-600 rounded text-white"
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            className="w-full p-3 bg-gray-700 border border-gray-600 rounded text-white"
          />
          <button
            type="submit"
            disabled={testingLogin || !debugState.supabase}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 p-3 rounded transition-colors"
          >
            {testingLogin ? 'Testing...' : 'Test Login'}
          </button>
        </form>
        
        {loginResult && (
          <div className="mt-4 p-3 bg-gray-900 rounded text-sm">
            <div className={loginResult.success ? 'text-green-400' : 'text-red-400'}>
              {loginResult.success ? '✅ Login Successful' : '❌ Login Failed'}
            </div>
            {loginResult.error && <div className="text-xs text-gray-400">Error: {loginResult.error}</div>}
            {loginResult.duration && <div className="text-xs text-gray-400">Duration: {loginResult.duration}ms</div>}
          </div>
        )}
      </div>
    )
  }

  if (testing) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400 mx-auto mb-4"></div>
          <div className="text-xl font-semibold">Running Authentication Diagnostics...</div>
          <div className="text-gray-400 mt-2">Please wait...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white font-mono">
      <div className="container mx-auto px-4 py-6">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-blue-400 mb-2">🔍 6FB Authentication Debug Console</h1>
          <div className="flex flex-wrap items-center gap-4 text-sm text-gray-300">
            <span>Environment: <span className="font-semibold">Development (3000)</span></span>
            <span>Supabase: <span className={`font-semibold ${results.importSuccess && results.clientCreated ? 'text-green-400' : 'text-red-400'}`}>
              {results.importSuccess && results.clientCreated ? 'Connected' : 'Disconnected'}
            </span></span>
            <span>Session: <span className="font-semibold">{debugState.session ? 'Active' : 'None'}</span></span>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="mb-6">
          <div className="flex flex-wrap border-b border-gray-700">
            {['overview', 'session', 'tests', 'logs'].map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 text-sm font-medium border-b-2 border-transparent hover:text-blue-400 capitalize ${
                  activeTab === tab ? 'border-blue-400 text-blue-400' : ''
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div>
            {/* Original diagnostic results */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              <div className="bg-gray-800 p-6 rounded-lg">
                <h2 className="font-bold mb-4 text-blue-400">Environment Variables</h2>
                <pre className="text-sm bg-gray-900 p-3 rounded overflow-auto">{JSON.stringify(results.envVars, null, 2)}</pre>
              </div>
              
              <div className="bg-gray-800 p-6 rounded-lg">
                <h2 className="font-bold mb-4 text-green-400">Supabase Connection</h2>
                <div className="space-y-2">
                  <p>Import: {results.importSuccess ? '✅ Success' : '❌ Failed'}</p>
                  <p>Client: {results.clientCreated ? '✅ Created' : '❌ Failed'}</p>
                  {results.importError && <p className="text-red-400 text-sm">Import Error: {results.importError}</p>}
                  {results.clientError && <p className="text-red-400 text-sm">Client Error: {results.clientError}</p>}
                </div>
              </div>

              <div className="bg-gray-800 p-6 rounded-lg">
                <h2 className="font-bold mb-4 text-purple-400">Session Status</h2>
                <pre className="text-sm bg-gray-900 p-3 rounded overflow-auto">{JSON.stringify(results.sessionResponse, null, 2)}</pre>
              </div>

              <div className="bg-gray-800 p-6 rounded-lg">
                <h2 className="font-bold mb-4 text-yellow-400">Health Check</h2>
                <pre className="text-sm bg-gray-900 p-3 rounded overflow-auto">{JSON.stringify(results.healthCheck, null, 2)}</pre>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-gray-800 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-yellow-400 mb-4">Quick Actions</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <button onClick={() => window.location.reload()} className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded text-sm transition-colors">
                  Retry Tests
                </button>
                <button onClick={clearLogs} className="bg-red-600 hover:bg-red-700 px-4 py-2 rounded text-sm transition-colors">
                  Clear Logs
                </button>
                <button onClick={exportDebugData} className="bg-purple-600 hover:bg-purple-700 px-4 py-2 rounded text-sm transition-colors">
                  Export Debug
                </button>
                <a href="/test-simple-auth" className="inline-block bg-green-600 hover:bg-green-700 px-4 py-2 rounded text-sm text-center transition-colors">
                  Simple Auth Test
                </a>
              </div>
            </div>
          </div>
        )}

        {/* Session Tab */}
        {activeTab === 'session' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-gray-800 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-blue-400 mb-4">Current Session</h3>
              {debugState.session ? (
                <div className="space-y-2 text-sm">
                  <div><strong>User ID:</strong> {debugState.session.user.id}</div>
                  <div><strong>Email:</strong> {debugState.session.user.email}</div>
                  <div><strong>Provider:</strong> {debugState.session.user.app_metadata?.provider || 'email'}</div>
                  <div><strong>Created:</strong> {new Date(debugState.session.user.created_at).toLocaleString()}</div>
                  <div><strong>Last Sign In:</strong> {new Date(debugState.session.user.last_sign_in_at).toLocaleString()}</div>
                  <div><strong>Expires:</strong> {new Date(debugState.session.expires_at * 1000).toLocaleString()}</div>
                  <div><strong>Token Type:</strong> {debugState.session.token_type}</div>
                  <div><strong>Access Token:</strong> {debugState.session.access_token.substring(0, 50)}...</div>
                </div>
              ) : (
                <div className="text-gray-400">No active session</div>
              )}
            </div>

            <div className="bg-gray-800 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-green-400 mb-4">Storage Inspector</h3>
              <div className="space-y-2 text-sm">
                <div><strong>localStorage:</strong> {typeof localStorage !== 'undefined' ? localStorage.length : 0} items</div>
                <div><strong>sessionStorage:</strong> {typeof sessionStorage !== 'undefined' ? sessionStorage.length : 0} items</div>
                <div><strong>Cookies:</strong> {typeof document !== 'undefined' ? document.cookie.split(';').length : 0} cookies</div>
              </div>
            </div>
          </div>
        )}

        {/* Tests Tab */}
        {activeTab === 'tests' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <LoginTestForm />
            
            <div className="bg-gray-800 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-green-400 mb-4">OAuth Tests</h3>
              <div className="space-y-3">
                <button onClick={testGoogleOAuth} className="w-full bg-red-600 hover:bg-red-700 p-3 rounded transition-colors">
                  Test Google OAuth
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Logs Tab */}
        {activeTab === 'logs' && (
          <div>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-green-400">Live Debug Logs</h3>
              <div className="flex gap-2">
                <select
                  value={logFilter}
                  onChange={(e) => setLogFilter(e.target.value)}
                  className="bg-gray-700 border border-gray-600 rounded px-3 py-1 text-sm"
                >
                  <option value="all">All Logs</option>
                  <option value="error">Errors Only</option>
                  <option value="warning">Warnings Only</option>
                  <option value="info">Info Only</option>
                  <option value="success">Success Only</option>
                </select>
                <button onClick={clearLogs} className="bg-red-600 hover:bg-red-700 px-4 py-1 rounded text-sm">
                  Clear
                </button>
                <button onClick={exportDebugData} className="bg-blue-600 hover:bg-blue-700 px-4 py-1 rounded text-sm">
                  Export
                </button>
              </div>
            </div>
            
            <div className="bg-gray-900 rounded-lg p-4 max-h-96 overflow-y-auto">
              {filteredLogs.length === 0 ? (
                <div className="text-gray-400 text-center py-8">No logs to display</div>
              ) : (
                filteredLogs.map(log => (
                  <div
                    key={log.id}
                    className={`p-2 mb-1 rounded text-xs border-l-3 ${
                      log.type === 'error' ? 'border-red-500 bg-red-900 bg-opacity-20' :
                      log.type === 'warning' ? 'border-yellow-500 bg-yellow-900 bg-opacity-20' :
                      log.type === 'success' ? 'border-green-500 bg-green-900 bg-opacity-20' :
                      'border-blue-500 bg-blue-900 bg-opacity-20'
                    }`}
                  >
                    <span className="text-gray-400">[{log.timestamp}]</span>
                    <span className="ml-2">{log.message}</span>
                  </div>
                ))
              )}
            </div>

            <div className="mt-4 bg-gray-800 rounded-lg p-4">
              <h4 className="font-semibold text-yellow-400 mb-2">Log Statistics</h4>
              <div className="grid grid-cols-4 gap-4 text-sm">
                <div>Total: <span>{debugState.logs.length}</span></div>
                <div>Errors: <span className="text-red-400">{debugState.logs.filter(log => log.type === 'error').length}</span></div>
                <div>Warnings: <span className="text-yellow-400">{debugState.logs.filter(log => log.type === 'warning').length}</span></div>
                <div>Success: <span className="text-green-400">{debugState.logs.filter(log => log.type === 'success').length}</span></div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}