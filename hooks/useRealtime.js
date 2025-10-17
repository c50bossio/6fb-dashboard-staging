import { useState, useEffect, useRef, useCallback } from 'react'
import { subscribeToChannel, unsubscribeFromChannel, CHANNELS, EVENTS } from '@/lib/supabase-realtime'

/**
 * Fallback polling for when real-time is unavailable
 */
const startMetricsPolling = async (callback) => {
  const fetchMetrics = async () => {
    try {
      const response = await fetch('/api/analytics/realtime-metrics')
      if (response.ok) {
        const data = await response.json()
        callback({
          metrics: data.metrics || data,
          timestamp: new Date().toISOString(),
          session_id: data.session_id || 'realtime'
        })
      }
    } catch (error) {
      console.error('Failed to fetch real-time metrics:', error)
    }
  }

  fetchMetrics()

  const interval = setInterval(fetchMetrics, 5000)

  if (!window.pollingIntervals) {
    window.pollingIntervals = []
  }
  window.pollingIntervals.push(interval)
}

const startNotificationPolling = async (callback) => {
  let lastNotificationId = null

  const fetchNotifications = async () => {
    try {
      const response = await fetch('/api/notifications/unread')
      if (response.ok) {
        const data = await response.json()
        const notifications = data.notifications || []

        if (notifications.length > 0) {
          const latestNotification = notifications[0]
          if (latestNotification.id !== lastNotificationId) {
            lastNotificationId = latestNotification.id
            callback({
              notification: latestNotification,
              timestamp: new Date().toISOString(),
              session_id: 'realtime'
            })
          }
        }
      }
    } catch (error) {
      console.error('Failed to fetch notifications:', error)
    }
  }

  const interval = setInterval(fetchNotifications, 15000)

  if (!window.pollingIntervals) {
    window.pollingIntervals = []
  }
  window.pollingIntervals.push(interval)
}

export const useRealtime = () => {
  const [isConnected, setIsConnected] = useState(false)
  const [connectionError, setConnectionError] = useState(null)
  const [sessionId, setSessionId] = useState(null)
  const [channelName, setChannelName] = useState(null)
  const [channel, setChannel] = useState(null)

  const [realtimeMetrics, setRealtimeMetrics] = useState(null)
  const [notifications, setNotifications] = useState([])
  const [aiResponses, setAiResponses] = useState([])

  const connectionAttempts = useRef(0)
  const maxRetries = 3

  const connect = useCallback(async () => {
    try {
      setConnectionError(null)

      // Generate a session ID if we don't have one
      const newSessionId = sessionId || `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      setSessionId(newSessionId)

      // Create channel name
      const newChannelName = CHANNELS.SESSION_UPDATES(newSessionId)
      setChannelName(newChannelName)

      // Subscribe to Supabase Realtime channel
      const realtimeChannel = subscribeToChannel(newChannelName, {
        [EVENTS.AI_TYPING]: (data) => {
          console.log('AI typing:', data)
        },
        [EVENTS.AI_RESPONSE]: (data) => {
          setAiResponses(prev => [data.response, ...prev.slice(0, 19)]) // Keep last 20
        },
        [EVENTS.NEW_NOTIFICATION]: (data) => {
          setNotifications(prev => [data.notification, ...prev.slice(0, 9)]) // Keep last 10
        },
        'metrics-update': (data) => {
          setRealtimeMetrics(data.metrics)
        }
      })

      setChannel(realtimeChannel)
      setIsConnected(true)
      connectionAttempts.current = 0

      console.log('✅ Connected to Supabase Realtime:', newChannelName)

    } catch (error) {
      console.error('Real-time connection error:', error)
      setConnectionError(error.message)
      connectionAttempts.current++

      if (connectionAttempts.current < maxRetries) {
        const retryDelay = Math.pow(2, connectionAttempts.current) * 1000
        setTimeout(() => {
          console.log(`Retrying connection in ${retryDelay}ms...`)
          connect()
        }, retryDelay)
      } else {
        // Fallback to polling after max retries
        console.warn('⚠️ Falling back to polling for real-time updates')
        startMetricsPolling((data) => setRealtimeMetrics(data.metrics))
        startNotificationPolling((data) => setNotifications(prev => [data.notification, ...prev.slice(0, 9)]))
      }
    }
  }, [sessionId])

  const disconnect = useCallback(async () => {
    try {
      if (channelName) {
        unsubscribeFromChannel(channelName)
      }

      // Clear polling intervals if any
      if (window.pollingIntervals) {
        window.pollingIntervals.forEach(interval => clearInterval(interval))
        window.pollingIntervals = []
      }

      setIsConnected(false)
      setConnectionError(null)
      setChannel(null)
      setRealtimeMetrics(null)

      console.log('✅ Disconnected from Supabase Realtime')

    } catch (error) {
      console.error('Disconnect error:', error)
    }
  }, [channelName])

  const sendMetricEvent = useCallback(async (event, data) => {
    try {
      const response = await fetch('/api/realtime/metrics', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ event, data })
      })

      return await response.json()
    } catch (error) {
      console.error('Metric event error:', error)
      return { success: false, error: error.message }
    }
  }, [])

  const markNotificationRead = useCallback((notificationId) => {
    setNotifications(prev =>
      prev.map(notif =>
        notif.id === notificationId
          ? { ...notif, read: true }
          : notif
      )
    )
  }, [])

  const clearNotifications = useCallback(() => {
    setNotifications([])
  }, [])

  useEffect(() => {
    connect()

    return () => {
      disconnect()
    }
  }, [])

  return {
    isConnected,
    connectionError,
    sessionId,
    channelName,

    realtimeMetrics,
    notifications,
    aiResponses,

    connect,
    disconnect,
    sendMetricEvent,

    markNotificationRead,
    clearNotifications,

    unreadNotifications: notifications.filter(n => !n.read).length,
    hasRealtimeData: Boolean(realtimeMetrics),
    connectionStatus: isConnected ? 'connected' : connectionError ? 'error' : 'connecting'
  }
}
