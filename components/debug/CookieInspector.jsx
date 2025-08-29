'use client'

import { useState, useEffect } from 'react'
import { createClient } from '../../lib/supabase/browser-client'

/**
 * Real-time cookie inspection tool for debugging session persistence issues
 * Shows current cookie state, session status, and provides testing utilities
 */
export default function CookieInspector({ isOpen, onClose }) {
  const [cookieData, setCookieData] = useState({})
  const [sessionData, setSessionData] = useState(null)
  const [refreshCount, setRefreshCount] = useState(0)
  const [autoRefresh, setAutoRefresh] = useState(false)
  const [logs, setLogs] = useState([])

  const supabase = createClient()

  const addLog = (message, type = 'info') => {
    const timestamp = new Date().toLocaleTimeString()
    setLogs(prev => [
      { timestamp, message, type, id: Date.now() },
      ...prev.slice(0, 49) // Keep last 50 logs
    ])
  }

  const analyzeCookies = () => {
    if (typeof window === 'undefined') return

    const allCookies = document.cookie.split(';').reduce((cookies, cookie) => {
      const [name, value] = cookie.split('=').map(c => c.trim())
      if (name && name !== '') {
        cookies[name] = {
          value: value || '',
          length: (value || '').length,
          isSupabase: name.includes('sb-') || name.includes('supabase'),
          isAuth: name.includes('auth') || name.includes('token'),
          isPKCE: name.includes('pkce') || name.includes('verifier')
        }
      }
      return cookies
    }, {})

    const supabaseCookies = Object.keys(allCookies)
      .filter(name => allCookies[name].isSupabase)
      .reduce((obj, name) => {
        obj[name] = allCookies[name]
        return obj
      }, {})

    setCookieData({
      all: allCookies,
      supabase: supabaseCookies,
      stats: {
        total: Object.keys(allCookies).length,
        supabaseCount: Object.keys(supabaseCookies).length,
        authCount: Object.keys(allCookies).filter(name => allCookies[name].isAuth).length,
        pkceCount: Object.keys(allCookies).filter(name => allCookies[name].isPKCE).length
      }
    })

    addLog(`Cookie analysis complete: ${Object.keys(allCookies).length} total, ${Object.keys(supabaseCookies).length} Supabase`, 'info')
  }

  const checkSession = async () => {
    try {
      const { data: { session }, error } = await supabase.auth.getSession()
      
      setSessionData({
        hasSession: !!session,
        error: error?.message || null,
        user: session?.user ? {
          id: session.user.id,
          email: session.user.email,
          provider: session.user.app_metadata?.provider
        } : null,
        tokens: session ? {
          hasAccessToken: !!session.access_token,
          hasRefreshToken: !!session.refresh_token,
          expiresAt: session.expires_at,
          expiresIn: session.expires_at ? Math.round((session.expires_at * 1000 - Date.now()) / 1000) : null
        } : null
      })

      if (session) {
        addLog(`Session found: ${session.user.email} (expires in ${Math.round((session.expires_at * 1000 - Date.now()) / 1000)}s)`, 'success')
      } else {
        addLog(`No session found${error ? ': ' + error.message : ''}`, 'warning')
      }
    } catch (err) {
      addLog(`Session check failed: ${err.message}`, 'error')
      setSessionData({ error: err.message })
    }
  }

  const refresh = () => {
    setRefreshCount(prev => prev + 1)
    analyzeCookies()
    checkSession()
    addLog('Manual refresh triggered', 'info')
  }

  const clearCookies = () => {
    if (typeof window === 'undefined') return
    
    // Get all Supabase cookies
    const supabaseCookieNames = Object.keys(cookieData.all || {})
      .filter(name => cookieData.all[name]?.isSupabase)

    // Clear each Supabase cookie
    supabaseCookieNames.forEach(name => {
      document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`
    })

    addLog(`Cleared ${supabaseCookieNames.length} Supabase cookies`, 'warning')
    setTimeout(refresh, 100)
  }

  const testCookie = () => {
    const testName = 'debug-test-cookie'
    const testValue = `test-${Date.now()}`
    document.cookie = `${testName}=${testValue}; path=/; max-age=3600`
    
    addLog(`Set test cookie: ${testName}=${testValue}`, 'info')
    setTimeout(refresh, 100)
  }

  useEffect(() => {
    if (isOpen) {
      refresh()
    }
  }, [isOpen])

  useEffect(() => {
    let interval
    if (autoRefresh && isOpen) {
      interval = setInterval(refresh, 2000)
    }
    return () => {
      if (interval) clearInterval(interval)
    }
  }, [autoRefresh, isOpen])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Cookie Inspector & Session Debugger
          </h3>
          <div className="flex items-center space-x-2">
            <label className="flex items-center space-x-2 text-sm">
              <input
                type="checkbox"
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
                className="rounded"
              />
              <span>Auto-refresh (2s)</span>
            </label>
            <button
              onClick={refresh}
              className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
            >
              Refresh ({refreshCount})
            </button>
            <button
              onClick={onClose}
              className="px-3 py-1 bg-gray-500 text-white rounded hover:bg-gray-600 text-sm"
            >
              Close
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-hidden flex">
          {/* Left Panel - Cookie Data */}
          <div className="w-1/2 p-4 overflow-y-auto border-r border-gray-200 dark:border-gray-700">
            <div className="space-y-4">
              {/* Cookie Stats */}
              <div className="bg-gray-50 dark:bg-gray-900 p-3 rounded">
                <h4 className="font-semibold mb-2">Cookie Statistics</h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>Total: {cookieData.stats?.total || 0}</div>
                  <div>Supabase: {cookieData.stats?.supabaseCount || 0}</div>
                  <div>Auth: {cookieData.stats?.authCount || 0}</div>
                  <div>PKCE: {cookieData.stats?.pkceCount || 0}</div>
                </div>
              </div>

              {/* Session Status */}
              <div className={`p-3 rounded ${
                sessionData?.hasSession 
                  ? 'bg-green-50 dark:bg-green-900 border border-green-200 dark:border-green-700'
                  : 'bg-red-50 dark:bg-red-900 border border-red-200 dark:border-red-700'
              }`}>
                <h4 className="font-semibold mb-2">
                  Session Status: {sessionData?.hasSession ? '✅ Active' : '❌ None'}
                </h4>
                {sessionData?.user && (
                  <div className="text-sm space-y-1">
                    <div>ID: {sessionData.user.id}</div>
                    <div>Email: {sessionData.user.email}</div>
                    <div>Provider: {sessionData.user.provider}</div>
                    {sessionData.tokens?.expiresIn && (
                      <div>Expires in: {sessionData.tokens.expiresIn}s</div>
                    )}
                  </div>
                )}
                {sessionData?.error && (
                  <div className="text-sm text-red-600 dark:text-red-400">
                    Error: {sessionData.error}
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex space-x-2">
                <button
                  onClick={testCookie}
                  className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 text-sm"
                >
                  Test Cookie
                </button>
                <button
                  onClick={clearCookies}
                  className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 text-sm"
                >
                  Clear Supabase Cookies
                </button>
              </div>

              {/* Supabase Cookies */}
              <div>
                <h4 className="font-semibold mb-2">Supabase Cookies</h4>
                <div className="space-y-2">
                  {Object.entries(cookieData.supabase || {}).map(([name, data]) => (
                    <div key={name} className="bg-gray-50 dark:bg-gray-900 p-2 rounded text-xs">
                      <div className="font-mono text-blue-600 dark:text-blue-400">{name}</div>
                      <div className="text-gray-600 dark:text-gray-400 truncate">
                        Length: {data.length} | Auth: {data.isAuth ? '✅' : '❌'} | PKCE: {data.isPKCE ? '✅' : '❌'}
                      </div>
                      <div className="text-gray-500 font-mono text-xs truncate mt-1">
                        {data.value.substring(0, 50)}{data.value.length > 50 ? '...' : ''}
                      </div>
                    </div>
                  ))}
                  {Object.keys(cookieData.supabase || {}).length === 0 && (
                    <div className="text-gray-500 text-sm italic">No Supabase cookies found</div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Right Panel - Live Logs */}
          <div className="w-1/2 p-4 overflow-y-auto">
            <div className="flex justify-between items-center mb-2">
              <h4 className="font-semibold">Live Activity Log</h4>
              <button
                onClick={() => setLogs([])}
                className="px-2 py-1 bg-gray-500 text-white rounded hover:bg-gray-600 text-xs"
              >
                Clear Logs
              </button>
            </div>
            <div className="space-y-1 text-xs font-mono">
              {logs.map(log => (
                <div
                  key={log.id}
                  className={`p-2 rounded ${
                    log.type === 'error' ? 'bg-red-50 dark:bg-red-900 text-red-800 dark:text-red-200' :
                    log.type === 'warning' ? 'bg-yellow-50 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200' :
                    log.type === 'success' ? 'bg-green-50 dark:bg-green-900 text-green-800 dark:text-green-200' :
                    'bg-gray-50 dark:bg-gray-900 text-gray-800 dark:text-gray-200'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <span className="flex-1">{log.message}</span>
                    <span className="text-xs opacity-70 ml-2">{log.timestamp}</span>
                  </div>
                </div>
              ))}
              {logs.length === 0 && (
                <div className="text-gray-500 text-center py-4">No logs yet</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}