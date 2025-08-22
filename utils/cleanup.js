/**
 * Memory Leak Cleanup Utilities
 * Provides hooks and utilities to prevent memory leaks
 * Ensures proper cleanup of intervals, timeouts, event listeners, and subscriptions
 */

import { useEffect, useRef, useCallback } from 'react'
import { logger } from '@/lib/logger'

const cleanupLogger = logger.child('cleanup')

/**
 * Track active intervals and timeouts for cleanup
 */
class TimerManager {
  constructor() {
    this.timers = new Set()
    this.intervals = new Set()
  }

  setTimeout(callback, delay, ...args) {
    const id = setTimeout(() => {
      this.timers.delete(id)
      callback(...args)
    }, delay)
    
    this.timers.add(id)
    return id
  }

  setInterval(callback, delay, ...args) {
    const id = setInterval(callback, delay, ...args)
    this.intervals.add(id)
    return id
  }

  clearTimeout(id) {
    if (this.timers.has(id)) {
      clearTimeout(id)
      this.timers.delete(id)
    }
  }

  clearInterval(id) {
    if (this.intervals.has(id)) {
      clearInterval(id)
      this.intervals.delete(id)
    }
  }

  clearAll() {
    this.timers.forEach(id => clearTimeout(id))
    this.intervals.forEach(id => clearInterval(id))
    this.timers.clear()
    this.intervals.clear()
    
    cleanupLogger.debug('Cleared all timers and intervals', {
      timersCleared: this.timers.size,
      intervalsCleared: this.intervals.size
    })
  }
}

/**
 * Track event listeners for cleanup
 */
class EventListenerManager {
  constructor() {
    this.listeners = new Map()
  }

  addEventListener(target, event, handler, options) {
    if (!this.listeners.has(target)) {
      this.listeners.set(target, new Map())
    }
    
    const targetListeners = this.listeners.get(target)
    if (!targetListeners.has(event)) {
      targetListeners.set(event, new Set())
    }
    
    targetListeners.get(event).add({ handler, options })
    target.addEventListener(event, handler, options)
    
    return () => this.removeEventListener(target, event, handler, options)
  }

  removeEventListener(target, event, handler, options) {
    const targetListeners = this.listeners.get(target)
    if (targetListeners) {
      const eventListeners = targetListeners.get(event)
      if (eventListeners) {
        eventListeners.forEach(listener => {
          if (listener.handler === handler) {
            target.removeEventListener(event, handler, options)
            eventListeners.delete(listener)
          }
        })
        
        if (eventListeners.size === 0) {
          targetListeners.delete(event)
        }
      }
      
      if (targetListeners.size === 0) {
        this.listeners.delete(target)
      }
    }
  }

  removeAll() {
    this.listeners.forEach((targetListeners, target) => {
      targetListeners.forEach((eventListeners, event) => {
        eventListeners.forEach(({ handler, options }) => {
          target.removeEventListener(event, handler, options)
        })
      })
    })
    
    const totalRemoved = Array.from(this.listeners.values())
      .reduce((sum, map) => sum + map.size, 0)
    
    this.listeners.clear()
    
    cleanupLogger.debug('Removed all event listeners', { totalRemoved })
  }
}

/**
 * Hook for automatic cleanup of side effects
 */
export function useCleanup() {
  const timerManager = useRef(new TimerManager())
  const eventManager = useRef(new EventListenerManager())
  const cleanupFunctions = useRef(new Set())

  const registerCleanup = useCallback((cleanupFn) => {
    cleanupFunctions.current.add(cleanupFn)
    return () => {
      cleanupFunctions.current.delete(cleanupFn)
      cleanupFn()
    }
  }, [])

  const safeSetTimeout = useCallback((callback, delay, ...args) => {
    return timerManager.current.setTimeout(callback, delay, ...args)
  }, [])

  const safeSetInterval = useCallback((callback, delay, ...args) => {
    return timerManager.current.setInterval(callback, delay, ...args)
  }, [])

  const safeClearTimeout = useCallback((id) => {
    timerManager.current.clearTimeout(id)
  }, [])

  const safeClearInterval = useCallback((id) => {
    timerManager.current.clearInterval(id)
  }, [])

  const safeAddEventListener = useCallback((target, event, handler, options) => {
    return eventManager.current.addEventListener(target, event, handler, options)
  }, [])

  useEffect(() => {
    return () => {
      // Cleanup everything on unmount
      timerManager.current.clearAll()
      eventManager.current.removeAll()
      
      // Run all registered cleanup functions
      cleanupFunctions.current.forEach(fn => {
        try {
          fn()
        } catch (error) {
          cleanupLogger.error('Error during cleanup', error)
        }
      })
      
      cleanupFunctions.current.clear()
    }
  }, [])

  return {
    setTimeout: safeSetTimeout,
    setInterval: safeSetInterval,
    clearTimeout: safeClearTimeout,
    clearInterval: safeClearInterval,
    addEventListener: safeAddEventListener,
    registerCleanup
  }
}

/**
 * Hook for WebSocket connections with automatic cleanup
 */
export function useWebSocket(url, options = {}) {
  const wsRef = useRef(null)
  const reconnectTimeoutRef = useRef(null)
  const { onMessage, onError, onClose, onOpen, reconnectInterval = 5000 } = options

  const connect = useCallback(() => {
    try {
      wsRef.current = new WebSocket(url)

      wsRef.current.onopen = (event) => {
        cleanupLogger.info('WebSocket connected', { url })
        onOpen?.(event)
      }

      wsRef.current.onmessage = (event) => {
        onMessage?.(event)
      }

      wsRef.current.onerror = (event) => {
        cleanupLogger.error('WebSocket error', event, { url })
        onError?.(event)
      }

      wsRef.current.onclose = (event) => {
        cleanupLogger.info('WebSocket closed', { url, code: event.code })
        onClose?.(event)
        
        // Auto-reconnect
        if (reconnectInterval > 0) {
          reconnectTimeoutRef.current = setTimeout(connect, reconnectInterval)
        }
      }
    } catch (error) {
      cleanupLogger.error('Failed to create WebSocket', error, { url })
      onError?.(error)
    }
  }, [url, onMessage, onError, onClose, onOpen, reconnectInterval])

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
      reconnectTimeoutRef.current = null
    }
    
    if (wsRef.current) {
      wsRef.current.close()
      wsRef.current = null
    }
  }, [])

  const sendMessage = useCallback((data) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(data))
    } else {
      cleanupLogger.warn('WebSocket not connected', { url })
    }
  }, [url])

  useEffect(() => {
    connect()
    return disconnect
  }, [connect, disconnect])

  return {
    sendMessage,
    disconnect,
    reconnect: connect,
    isConnected: wsRef.current?.readyState === WebSocket.OPEN
  }
}

/**
 * Hook for Pusher subscriptions with automatic cleanup
 */
export function usePusherCleanup(pusher) {
  const subscriptionsRef = useRef(new Set())

  const subscribe = useCallback((channelName) => {
    if (!pusher) return null
    
    const channel = pusher.subscribe(channelName)
    subscriptionsRef.current.add(channelName)
    
    cleanupLogger.debug('Pusher channel subscribed', { channelName })
    
    return channel
  }, [pusher])

  const unsubscribe = useCallback((channelName) => {
    if (!pusher) return
    
    pusher.unsubscribe(channelName)
    subscriptionsRef.current.delete(channelName)
    
    cleanupLogger.debug('Pusher channel unsubscribed', { channelName })
  }, [pusher])

  useEffect(() => {
    return () => {
      // Unsubscribe from all channels on unmount
      subscriptionsRef.current.forEach(channelName => {
        pusher?.unsubscribe(channelName)
      })
      
      cleanupLogger.debug('Cleaned up all Pusher subscriptions', {
        count: subscriptionsRef.current.size
      })
      
      subscriptionsRef.current.clear()
    }
  }, [pusher])

  return {
    subscribe,
    unsubscribe
  }
}

/**
 * Hook for Supabase real-time subscriptions with cleanup
 */
export function useSupabaseSubscription(supabase, options = {}) {
  const subscriptionRef = useRef(null)
  
  const subscribe = useCallback((table, filters = {}, callbacks = {}) => {
    if (!supabase) return null
    
    // Clean up existing subscription
    if (subscriptionRef.current) {
      subscriptionRef.current.unsubscribe()
    }
    
    let query = supabase.from(table).on('*', callbacks.onAny || (() => {}))
    
    if (callbacks.onInsert) {
      query = query.on('INSERT', callbacks.onInsert)
    }
    if (callbacks.onUpdate) {
      query = query.on('UPDATE', callbacks.onUpdate)
    }
    if (callbacks.onDelete) {
      query = query.on('DELETE', callbacks.onDelete)
    }
    
    // Apply filters
    Object.entries(filters).forEach(([key, value]) => {
      query = query.eq(key, value)
    })
    
    subscriptionRef.current = query.subscribe()
    
    cleanupLogger.debug('Supabase subscription created', { table, filters })
    
    return subscriptionRef.current
  }, [supabase])
  
  const unsubscribe = useCallback(() => {
    if (subscriptionRef.current) {
      subscriptionRef.current.unsubscribe()
      subscriptionRef.current = null
      cleanupLogger.debug('Supabase subscription cleaned up')
    }
  }, [])
  
  useEffect(() => {
    return unsubscribe
  }, [unsubscribe])
  
  return {
    subscribe,
    unsubscribe
  }
}

/**
 * Global cleanup function for page transitions
 */
export function performGlobalCleanup() {
  // Force garbage collection if available (V8)
  if (global.gc) {
    global.gc()
    cleanupLogger.debug('Forced garbage collection')
  }
  
  // Clear any remaining console timers
  if (console.clear) {
    console.clear()
  }
  
  // Cancel any pending animation frames
  if (typeof window !== 'undefined') {
    let id = window.requestAnimationFrame(() => {})
    while (id--) {
      window.cancelAnimationFrame(id)
    }
  }
  
  cleanupLogger.info('Global cleanup performed')
}

/**
 * Hook to run cleanup on route changes
 */
export function useRouteChangeCleanup() {
  useEffect(() => {
    const handleRouteChange = () => {
      performGlobalCleanup()
    }
    
    // Next.js route change events
    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', handleRouteChange)
      
      return () => {
        window.removeEventListener('beforeunload', handleRouteChange)
      }
    }
  }, [])
}

// Export singleton instances for global use
export const globalTimerManager = new TimerManager()
export const globalEventManager = new EventListenerManager()

// Replace global functions with safe versions in development
if (process.env.NODE_ENV === 'development') {
  const originalSetTimeout = global.setTimeout
  const originalSetInterval = global.setInterval
  
  global.setTimeout = function(...args) {
    cleanupLogger.debug('setTimeout called', { delay: args[1] })
    return originalSetTimeout.apply(this, args)
  }
  
  global.setInterval = function(...args) {
    cleanupLogger.debug('setInterval called', { delay: args[1] })
    return originalSetInterval.apply(this, args)
  }
}