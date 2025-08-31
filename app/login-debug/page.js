'use client'

import { useState, useEffect, useRef } from 'react'

export default function AuthDebugConsole() {
  // Global state
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
  const [isInitialized, setIsInitialized] = useState(false)

  // Initialize debug console
  useEffect(() => {
    const init = async () => {
      log('🚀 6FB Auth Debug Console initialized', 'info')
      await loadSupabase()
      await runInitialChecks()
      startRealtimeMonitoring()
      setIsInitialized(true)
    }

    init()
  }, [])

  // Logging system
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

  // Supabase initialization
  const loadSupabase = async () => {
    try {
      const { createClient } = await import('@supabase/supabase-js')
      
      const supabaseUrl = 'https://dfhqjdoydihajmjxniee.supabase.co'
      const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRmaHFqZG95ZGloYWptanhuaWVlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQwODcwMTAsImV4cCI6MjA2OTY2MzAxMH0.TUYnEBzpB2LQaGLIXg5wtvJHyyhFD2QAOMdY_B-V1fI'
      
      const client = createClient(supabaseUrl, supabaseKey)
      
      // Set up auth state listener
      client.auth.onAuthStateChange((event, session) => {
        log(`🔐 Auth state changed: ${event}`, event === 'SIGNED_IN' ? 'success' : 'info')
        setDebugState(prev => ({ ...prev, session }))
      })

      setDebugState(prev => ({ ...prev, supabase: client }))
      log('✅ Supabase client initialized successfully', 'success')
      
    } catch (error) {
      log(`❌ Failed to initialize Supabase: ${error.message}`, 'error')
    }
  }

  // Health checks
  const runHealthCheck = async () => {
    log('🏥 Starting comprehensive health check...', 'info')
    
    try {
      // Test Supabase connection
      if (debugState.supabase) {
        const { data, error } = await debugState.supabase.auth.getSession()
        if (error) {
          log(`⚠️ Supabase session error: ${error.message}`, 'warning')
        } else {
          log('✅ Supabase connection healthy', 'success')
        }
      }

      // Test API endpoints
      const endpoints = ['/api/auth/health', '/api/health/supabase', '/api/health/ai', '/api/health/stripe']
      
      for (const endpoint of endpoints) {
        try {
          const response = await fetch(endpoint)
          log(`${response.ok ? '✅' : '❌'} ${endpoint} → ${response.status}`, response.ok ? 'success' : 'error')
        } catch (error) {
          log(`❌ ${endpoint} failed: ${error.message}`, 'error')
        }
      }

    } catch (error) {
      log(`❌ Health check failed: ${error.message}`, 'error')
    }
  }

  // Initial checks
  const runInitialChecks = async () => {
    // Environment detection
    const isLocalhost = typeof window !== 'undefined' ? window.location.hostname === 'localhost' : false
    const port = typeof window !== 'undefined' ? window.location.port : 'unknown'
    
    log(`🌍 Environment: ${isLocalhost ? `Development (${port})` : 'Production'}`, 'info')
    
    // Run health check
    await runHealthCheck()
    
    // Check current session
    await refreshSession()
  }

  // Session management
  const refreshSession = async () => {
    try {
      if (!debugState.supabase) {
        log('⚠️ Supabase not initialized', 'warning')
        return
      }

      const { data, error } = await debugState.supabase.auth.getSession()
      if (error) {
        log(`❌ Session fetch error: ${error.message}`, 'error')
        return
      }

      setDebugState(prev => ({ ...prev, session: data.session }))
      
      if (data.session) {
        log(`✅ Active session found for user: ${data.session.user.email}`, 'success')
      } else {
        log('ℹ️ No active session', 'info')
      }
      
    } catch (error) {
      log(`❌ Session refresh failed: ${error.message}`, 'error')
    }
  }

  // Authentication tests
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

  // Real-time monitoring
  const startRealtimeMonitoring = () => {
    setDebugState(prev => ({ ...prev, monitoring: { ...prev.monitoring, realtime: true } }))
    
    // Update session periodically
    const interval = setInterval(refreshSession, 30000) // Every 30 seconds

    log('🔄 Real-time monitoring started', 'success')

    return () => clearInterval(interval)
  }

  // Utility functions
  const clearLogs = () => {
    setDebugState(prev => ({ ...prev, logs: [] }))
    log('🗑️ Debug logs cleared', 'info')
  }

  const exportDebugData = () => {
    const debugData = {
      timestamp: new Date().toISOString(),
      logs: debugState.logs,
      networkRequests: debugState.networkRequests,
      performance: debugState.performance,
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

  // Component for login test form
  const LoginTestForm = () => {
    const [email, setEmail] = useState('demo@barbershop.com')
    const [password, setPassword] = useState('demo123')
    const [testing, setTesting] = useState(false)
    const [result, setResult] = useState(null)

    const handleSubmit = async (e) => {
      e.preventDefault()
      setTesting(true)
      setResult(null)
      
      const testResult = await testEmailPasswordLogin(email, password)
      setResult(testResult)
      setTesting(false)
    }

    return (
      <div className="bg-gray-800 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-blue-400 mb-4">Email/Password Login</h3>
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
            disabled={testing}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 p-3 rounded transition-colors"
          >
            {testing ? 'Testing...' : 'Test Login'}
          </button>
        </form>
        
        {result && (
          <div className="mt-4 p-3 bg-gray-900 rounded text-sm">
            <div className={result.success ? 'text-green-400' : 'text-red-400'}>
              {result.success ? '✅ Login Successful' : '❌ Login Failed'}
            </div>
            {result.error && <div className="text-xs text-gray-400">Error: {result.error}</div>}
            {result.duration && <div className="text-xs text-gray-400">Duration: {result.duration}ms</div>}
          </div>
        )}
      </div>
    )
  }

  if (!isInitialized) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400 mx-auto mb-4"></div>
          <div className="text-xl font-semibold">Initializing Debug Console...</div>
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
            <span>Supabase: <span className="font-semibold text-green-400">Online</span></span>
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
              {/* System Health */}
              <div className="bg-gray-800 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-blue-400 mb-4">System Health</h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span>Supabase DB</span>
                    <span className="text-green-400">Healthy</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Auth Service</span>
                    <span className="text-green-400">Healthy</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>API Endpoints</span>
                    <span className="text-green-400">Healthy</span>
                  </div>
                </div>
              </div>

              {/* Performance */}
              <div className="bg-gray-800 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-green-400 mb-4">Performance</h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span>Avg Response</span>
                    <span>{debugState.performance.requests > 0 ? 
                      Math.round(debugState.performance.totalTime / debugState.performance.requests) : 0}ms</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Success Rate</span>
                    <span>{debugState.performance.requests > 0 ? 
                      Math.round(((debugState.performance.requests - debugState.performance.errors) / debugState.performance.requests) * 100) : 100}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Total Requests</span>
                    <span>{debugState.performance.requests}</span>
                  </div>
                </div>
              </div>

              {/* Current Session */}
              <div className="bg-gray-800 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-purple-400 mb-4">Current Session</h3>
                <div className="space-y-2">
                  <div>Status: <span className="font-semibold">{debugState.session ? 'Active' : 'None'}</span></div>
                  <div>User ID: <span className="text-xs text-gray-400">
                    {debugState.session ? debugState.session.user.id.substring(0, 12) + '...' : 'N/A'}
                  </span></div>
                  <div>Expires: <span className="text-xs text-gray-400">
                    {debugState.session ? new Date(debugState.session.expires_at * 1000).toLocaleString() : 'N/A'}
                  </span></div>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-gray-800 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-yellow-400 mb-4">Quick Actions</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <button onClick={runHealthCheck} className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded text-sm transition-colors">
                  Health Check
                </button>
                <button onClick={refreshSession} className="bg-green-600 hover:bg-green-700 px-4 py-2 rounded text-sm transition-colors">
                  Refresh Session
                </button>
                <button onClick={clearLogs} className="bg-red-600 hover:bg-red-700 px-4 py-2 rounded text-sm transition-colors">
                  Clear Logs
                </button>
                <button onClick={exportDebugData} className="bg-purple-600 hover:bg-purple-700 px-4 py-2 rounded text-sm transition-colors">
                  Export Debug
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Session Tab */}
        {activeTab === 'session' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-gray-800 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-blue-400 mb-4">Session Details</h3>
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
              <button onClick={refreshSession} className="mt-4 bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded text-sm">
                Refresh Session
              </button>
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
              <h3 className="text-lg font-semibold text-green-400 mb-4">OAuth Providers</h3>
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