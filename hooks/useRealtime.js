import { useState, useEffect, useRef, useCallback } from 'react'

const createFallbackPusher = (key, options) => {
  let pollingIntervals = []
  
  return {
    subscribe: (channelName) => ({
      bind: (eventName, callback) => {
        if (!window.pusherCallbacks) {
          window.pusherCallbacks = {}
        }
        
        const callbackKey = `${channelName}-${eventName}`
        window.pusherCallbacks[callbackKey] = callback
        
        if (eventName === 'metrics-update') {
          startMetricsPolling(callback)
        } else if (eventName === 'notification') {
          startNotificationPolling(callback)
        }
      },
      unbind: (eventName) => {
        const callbackKey = `${channelName}-${eventName}`
        if (window.pusherCallbacks) {
          delete window.pusherCallbacks[callbackKey]
        }
      }
    }),
    unsubscribe: (channelName) => {
      if (window.pusherCallbacks) {
        Object.keys(window.pusherCallbacks).forEach(key => {
          if (key.startsWith(channelName)) {
            delete window.pusherCallbacks[key]
          }
        })
      }
    },
    disconnect: () => {
      window.pusherCallbacks = {}
      pollingIntervals.forEach(interval => clearInterval(interval))
      pollingIntervals = []
    }
  }
}

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
  const [pusherClient, setPusherClient] = useState(null)
  const [channel, setChannel] = useState(null)
  
  const [realtimeMetrics, setRealtimeMetrics] = useState(null)
  const [notifications, setNotifications] = useState([])
  const [aiResponses, setAiResponses] = useState([])
  
  const connectionAttempts = useRef(0)
  const maxRetries = 3
  
  const connect = useCallback(async () => {
    try {
      setConnectionError(null)
      
      const response = await fetch('/api/realtime/connect', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          sessionId: sessionId
        })
      })
      
      const data = await response.json()
      
      if (data.success) {
        setSessionId(data.sessionId)
        setChannelName(data.channelName)
        
        const pusher = window.Pusher 
          ? new window.Pusher(data.pusherConfig.key, {
              cluster: data.pusherConfig.cluster,
              forceTLS: data.pusherConfig.forceTLS
            })
          : createFallbackPusher(data.pusherConfig.key, {
          cluster: data.pusherConfig.cluster,
          forceTLS: data.pusherConfig.forceTLS
        })
        
        setPusherClient(pusher)
        
        const realtimeChannel = pusher.subscribe(data.channelName)
        setChannel(realtimeChannel)
        
        realtimeChannel.bind('metrics-update', (data) => {
          setRealtimeMetrics(data.metrics)
        })
        
        realtimeChannel.bind('notification', (data) => {
          setNotifications(prev => [data.notification, ...prev.slice(0, 9)]) // Keep last 10
        })
        
        realtimeChannel.bind('ai-response', (data) => {
          setAiResponses(prev => [data.response, ...prev.slice(0, 19)]) // Keep last 20
        })
        
        setIsConnected(true)
        connectionAttempts.current = 0
        
        console.log('✅ Real-time connection established:', data.channelName)
        
      } else {
        throw new Error(data.error || 'Failed to connect')
      }
      
    } catch (error) {
      console.error('Real-time connection error:', error)
      setConnectionError(error.message)
      connectionAttempts.current++
      
      if (connectionAttempts.current < maxRetries) {
        const retryDelay = Math.pow(2, connectionAttempts.current) * 1000
        setTimeout(() => {
          console.log(`Retrying connection (${connectionAttempts.current}/${maxRetries})...`)
          connect()
        }, retryDelay)
      }
    }
  }, [sessionId])
  
  const disconnect = useCallback(async () => {
    try {
      if (sessionId) {
        await fetch(`/api/realtime/connect?sessionId=${sessionId}`, {
          method: 'DELETE'
        })
      }
      
      if (channel) {
        channel.unbind('metrics-update')
        channel.unbind('notification')
        channel.unbind('ai-response')
      }
      
      if (pusherClient) {
        if (channelName) {
          pusherClient.unsubscribe(channelName)
        }
        pusherClient.disconnect()
      }
      
      if (window.pollingIntervals) {
        window.pollingIntervals.forEach(interval => clearInterval(interval))
        window.pollingIntervals = []
      }
      
      setIsConnected(false)
      setConnectionError(null)
      setPusherClient(null)
      setChannel(null)
      setRealtimeMetrics(null)
      
      console.log('⏹️ Real-time connection disconnected')
      
    } catch (error) {
      console.error('Disconnect error:', error)
    }
  }, [sessionId, channel, pusherClient, channelName])
  
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