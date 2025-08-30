'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '../../lib/supabase/UNIFIED_CLIENT'

/**
 * Live cookie monitoring component for real-time debugging
 * Shows cookie changes, session events, and authentication state in real-time
 */
export default function LiveCookieMonitor({ isVisible = false }) {
  const [events, setEvents] = useState([])
  const [isMonitoring, setIsMonitoring] = useState(false)
  const [cookieSnapshot, setCookieSnapshot] = useState({})
  const [sessionState, setSessionState] = useState(null)
  const intervalRef = useRef(null)
  const eventIdRef = useRef(0)
  const lastCookieSnapshot = useRef({})

  const supabase = createClient()

  const addEvent = (type, message, data = {}) => {
    const event = {
      id: eventIdRef.current++,
      timestamp: new Date().toISOString(),
      time: new Date().toLocaleTimeString(),
      type,
      message,
      data,
    }
    
    setEvents(prev => [event, ...prev.slice(0, 99)]) // Keep last 100 events
  }

  const getCurrentCookies = () => {
    if (typeof window === 'undefined') return {}
    
    return document.cookie.split(';').reduce((cookies, cookie) => {
      const [name, value] = cookie.split('=').map(c => c.trim())
      if (name && name !== '') {
        cookies[name] = {
          value: value || '',
          length: (value || '').length,
          isSupabase: name.includes('sb-') || name.includes('supabase'),
          isAuth: name.includes('auth') || name.includes('token'),
          hash: btoa(value || '').substring(0, 8) // Short hash for change detection
        }
      }
      return cookies
    }, {})
  }

  const checkForCookieChanges = () => {
    const currentCookies = getCurrentCookies()
    const supabaseCookies = Object.keys(currentCookies)
      .filter(name => currentCookies[name].isSupabase)
      .reduce((obj, name) => {
        obj[name] = currentCookies[name]
        return obj
      }, {})

    setCookieSnapshot(supabaseCookies)

    // Compare with last snapshot for changes
    const lastCookies = lastCookieSnapshot.current
    const currentSupabaseNames = Object.keys(supabaseCookies)
    const lastSupabaseNames = Object.keys(lastCookies)

    // Check for new cookies
    const newCookies = currentSupabaseNames.filter(name => !lastSupabaseNames.includes(name))
    newCookies.forEach(name => {
      addEvent('cookie-added', `New cookie: ${name}`, {
        name,
        length: supabaseCookies[name].length,
        isAuth: supabaseCookies[name].isAuth
      })
    })

    // Check for removed cookies
    const removedCookies = lastSupabaseNames.filter(name => !currentSupabaseNames.includes(name))
    removedCookies.forEach(name => {
      addEvent('cookie-removed', `Removed cookie: ${name}`, { name })
    })

    // Check for changed cookies
    currentSupabaseNames.forEach(name => {
      if (lastCookies[name] && lastCookies[name].hash !== supabaseCookies[name].hash) {
        addEvent('cookie-changed', `Cookie modified: ${name}`, {
          name,
          oldLength: lastCookies[name].length,
          newLength: supabaseCookies[name].length,
          lengthDiff: supabaseCookies[name].length - lastCookies[name].length
        })
      }
    })

    lastCookieSnapshot.current = { ...supabaseCookies }
  }

  const checkSessionState = async () => {
    try {
      const { data: { session }, error } = await supabase.auth.getSession()
      
      const newState = {
        hasSession: !!session,
        error: error?.message || null,
        userId: session?.user?.id || null,
        email: session?.user?.email || null,
        expiresAt: session?.expires_at || null,
        expiresIn: session?.expires_at ? Math.round((session.expires_at * 1000 - Date.now()) / 1000) : null
      }

      // Check for session state changes
      if (sessionState) {
        if (sessionState.hasSession !== newState.hasSession) {
          if (newState.hasSession) {
            addEvent('session-established', 'Session established', {
              userId: newState.userId,
              email: newState.email
            })
          } else {
            addEvent('session-lost', 'Session lost', {
              previousUserId: sessionState.userId
            })
          }
        }
        
        if (sessionState.expiresIn && newState.expiresIn && 
            Math.abs(sessionState.expiresIn - newState.expiresIn) > 30) {
          addEvent('session-refreshed', 'Session refreshed', {
            newExpiresIn: newState.expiresIn,
            oldExpiresIn: sessionState.expiresIn
          })
        }
      }

      setSessionState(newState)
      
    } catch (err) {
      addEvent('session-error', 'Session check failed', { error: err.message })
    }
  }

  const startMonitoring = () => {
    if (typeof window === 'undefined') return
    
    setIsMonitoring(true)
    addEvent('monitor-started', 'Cookie monitoring started', {})
    
    // Initial snapshots
    checkForCookieChanges()
    checkSessionState()
    
    // Set up monitoring interval
    intervalRef.current = setInterval(() => {
      checkForCookieChanges()
      checkSessionState()
    }, 1000)
  }

  const stopMonitoring = () => {
    setIsMonitoring(false)
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
    addEvent('monitor-stopped', 'Cookie monitoring stopped', {})
  }

  const clearEvents = () => {
    setEvents([])
    eventIdRef.current = 0
  }

  const forceSessionRefresh = async () => {
    try {
      addEvent('manual-refresh', 'Manually triggered session refresh', {})
      const { data, error } = await supabase.auth.refreshSession()
      
      if (error) {
        addEvent('refresh-failed', 'Session refresh failed', { error: error.message })
      } else if (data?.session) {
        addEvent('refresh-success', 'Session refresh successful', {
          userId: data.session.user.id,
          expiresIn: Math.round((data.session.expires_at * 1000 - Date.now()) / 1000)
        })
      }
    } catch (err) {
      addEvent('refresh-error', 'Session refresh error', { error: err.message })
    }
  }

  useEffect(() => {
    if (isVisible && !isMonitoring) {
      startMonitoring()
    } else if (!isVisible && isMonitoring) {
      stopMonitoring()
    }
    
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [isVisible])

  // Set up auth event listener
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      addEvent('auth-event', `Auth event: ${event}`, {
        event,
        hasSession: !!session,
        userId: session?.user?.id || null
      })
    })

    return () => subscription.unsubscribe()
  }, [])

  if (!isVisible) return null

  const getEventColor = (type) => {
    switch (type) {
      case 'cookie-added': return 'text-green-600 dark:text-green-400'
      case 'cookie-removed': return 'text-red-600 dark:text-red-400'
      case 'cookie-changed': return 'text-yellow-600 dark:text-yellow-400'
      case 'session-established': return 'text-green-600 dark:text-green-400 font-semibold'
      case 'session-lost': return 'text-red-600 dark:text-red-400 font-semibold'
      case 'session-refreshed': return 'text-blue-600 dark:text-blue-400'
      case 'auth-event': return 'text-purple-600 dark:text-purple-400'
      case 'session-error': 
      case 'refresh-failed': 
      case 'refresh-error': return 'text-red-600 dark:text-red-400'
      default: return 'text-gray-600 dark:text-gray-400'
    }
  }

  return (
    <div className="fixed bottom-4 right-4 w-96 h-80 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg z-40 overflow-hidden flex flex-col">
      {/* Header */}
      <div className="p-3 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-900">
        <div className="flex items-center space-x-2">
          <div className={`w-2 h-2 rounded-full ${isMonitoring ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`} />
          <h4 className="text-sm font-semibold">Live Monitor</h4>
          <span className="text-xs text-gray-500">
            {Object.keys(cookieSnapshot).length} cookies
          </span>
        </div>
        <div className="flex items-center space-x-1">
          {sessionState && (
            <div className={`text-xs px-2 py-1 rounded ${
              sessionState.hasSession 
                ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' 
                : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
            }`}>
              {sessionState.hasSession ? 'Active' : 'No Session'}
            </div>
          )}
          <button
            onClick={clearEvents}
            className="text-xs px-2 py-1 bg-gray-500 text-white rounded hover:bg-gray-600"
          >
            Clear
          </button>
        </div>
      </div>

      {/* Controls */}
      <div className="p-2 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center text-xs">
        <div className="flex space-x-1">
          <button
            onClick={isMonitoring ? stopMonitoring : startMonitoring}
            className={`px-2 py-1 rounded text-white ${
              isMonitoring 
                ? 'bg-red-500 hover:bg-red-600' 
                : 'bg-green-500 hover:bg-green-600'
            }`}
          >
            {isMonitoring ? 'Stop' : 'Start'}
          </button>
          <button
            onClick={forceSessionRefresh}
            className="px-2 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Refresh Session
          </button>
        </div>
        <div className="text-gray-500">
          {events.length} events
        </div>
      </div>

      {/* Event Log */}
      <div className="flex-1 overflow-y-auto p-2 text-xs font-mono">
        {events.length === 0 ? (
          <div className="text-gray-500 text-center py-4">
            {isMonitoring ? 'Monitoring for events...' : 'Start monitoring to see events'}
          </div>
        ) : (
          <div className="space-y-1">
            {events.map(event => (
              <div key={event.id} className={`${getEventColor(event.type)}`}>
                <div className="flex justify-between items-start">
                  <span className="flex-1">{event.message}</span>
                  <span className="text-gray-400 text-xs ml-2">{event.time}</span>
                </div>
                {Object.keys(event.data).length > 0 && (
                  <div className="text-gray-500 text-xs ml-2 mt-1">
                    {JSON.stringify(event.data, null, 0)}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}