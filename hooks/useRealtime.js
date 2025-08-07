import { useState, useEffect, useRef, useCallback } from 'react'

// Mock Pusher client for development
const createMockPusher = (key, options) => {
  return {
    subscribe: (channelName) => ({
      bind: (eventName, callback) => {
        // Store callback for mock events
        if (!window.mockPusherCallbacks) {
          window.mockPusherCallbacks = {}
        }
        
        const callbackKey = `${channelName}-${eventName}`
        window.mockPusherCallbacks[callbackKey] = callback
        
        // Start mock data streaming for development
        if (eventName === 'metrics-update') {
          startMockMetricsStream(callback)
        } else if (eventName === 'notification') {
          startMockNotificationStream(callback)
        }
      },
      unbind: (eventName) => {
        const callbackKey = `${channelName}-${eventName}`
        if (window.mockPusherCallbacks) {
          delete window.mockPusherCallbacks[callbackKey]
        }
      }
    }),
    unsubscribe: (channelName) => {
      // Clean up mock callbacks
      if (window.mockPusherCallbacks) {
        Object.keys(window.mockPusherCallbacks).forEach(key => {
          if (key.startsWith(channelName)) {
            delete window.mockPusherCallbacks[key]
          }
        })
      }
    },
    disconnect: () => {
      // Clean up all mock callbacks
      window.mockPusherCallbacks = {}
    }
  }
}

const startMockMetricsStream = (callback) => {
  const interval = setInterval(() => {
    const mockData = generateMockMetrics()
    callback({
      metrics: mockData,
      timestamp: new Date().toISOString(),
      session_id: 'mock-session'
    })
  }, 5000) // Update every 5 seconds
  
  // Store interval for cleanup
  if (!window.mockPusherIntervals) {
    window.mockPusherIntervals = []
  }
  window.mockPusherIntervals.push(interval)
}

const startMockNotificationStream = (callback) => {
  const interval = setInterval(() => {
    // Only send notifications occasionally (20% chance)
    if (Math.random() > 0.8) {
      const mockNotification = generateMockNotification()
      callback({
        notification: mockNotification,
        timestamp: new Date().toISOString(),
        session_id: 'mock-session'
      })
    }
  }, 15000) // Check every 15 seconds
  
  if (!window.mockPusherIntervals) {
    window.mockPusherIntervals = []
  }
  window.mockPusherIntervals.push(interval)
}

const generateMockMetrics = () => {
  const currentHour = new Date().getHours()
  const isPeakHour = (10 <= currentHour <= 14) || (17 <= currentHour <= 19)
  const peakMultiplier = isPeakHour ? 1.5 : 0.7
  
  return {
    total_revenue: Math.round((450 * peakMultiplier + Math.random() * 100 - 50) * 100) / 100,
    daily_bookings: Math.floor(12 * peakMultiplier + Math.random() * 5 - 2),
    active_customers: Math.floor(Math.random() * 30) + 15,
    satisfaction_rating: Math.round((4.1 + Math.random() * 0.7) * 10) / 10,
    utilization_rate: Math.round((0.65 + Math.random() * 0.3) * 100) / 100,
    average_wait_time: Math.floor(Math.random() * 20) + 5,
    peak_hour_indicator: isPeakHour,
    current_hour: currentHour
  }
}

const generateMockNotification = () => {
  const notifications = [
    {
      type: 'booking_milestone',
      title: 'Booking Milestone',
      message: `${Math.floor(Math.random() * 50) + 50} bookings this week!`,
      priority: 'success'
    },
    {
      type: 'customer_feedback',
      title: 'New 5-Star Review',
      message: 'Amazing service and great attention to detail!',
      priority: 'info'
    },
    {
      type: 'revenue_alert',
      title: 'Revenue Goal Met',
      message: `Daily target exceeded: $${Math.floor(Math.random() * 200) + 400}`,
      priority: 'success'
    },
    {
      type: 'ai_insight',
      title: 'AI Insight',
      message: `Peak efficiency detected - ${Math.floor(Math.random() * 20) + 80}% utilization`,
      priority: 'info'
    }
  ]
  
  const notification = notifications[Math.floor(Math.random() * notifications.length)]
  return {
    ...notification,
    id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    timestamp: new Date().toISOString(),
    read: false
  }
}

export const useRealtime = () => {
  const [isConnected, setIsConnected] = useState(false)
  const [connectionError, setConnectionError] = useState(null)
  const [sessionId, setSessionId] = useState(null)
  const [channelName, setChannelName] = useState(null)
  const [pusherClient, setPusherClient] = useState(null)
  const [channel, setChannel] = useState(null)
  
  // Real-time data states
  const [realtimeMetrics, setRealtimeMetrics] = useState(null)
  const [notifications, setNotifications] = useState([])
  const [aiResponses, setAiResponses] = useState([])
  
  const connectionAttempts = useRef(0)
  const maxRetries = 3
  
  const connect = useCallback(async () => {
    try {
      setConnectionError(null)
      
      // Initialize real-time connection
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
        
        // Initialize Pusher (or mock for development)
        const pusher = createMockPusher(data.pusherConfig.key, {
          cluster: data.pusherConfig.cluster,
          forceTLS: data.pusherConfig.forceTLS
        })
        
        setPusherClient(pusher)
        
        // Subscribe to channel
        const realtimeChannel = pusher.subscribe(data.channelName)
        setChannel(realtimeChannel)
        
        // Bind event listeners
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
      
      // Retry connection with exponential backoff
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
      
      // Clean up Pusher connection
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
      
      // Clean up mock intervals
      if (window.mockPusherIntervals) {
        window.mockPusherIntervals.forEach(interval => clearInterval(interval))
        window.mockPusherIntervals = []
      }
      
      // Reset states
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
  
  // Auto-connect on mount
  useEffect(() => {
    connect()
    
    // Auto-disconnect on unmount
    return () => {
      disconnect()
    }
  }, [])
  
  return {
    // Connection state
    isConnected,
    connectionError,
    sessionId,
    channelName,
    
    // Real-time data
    realtimeMetrics,
    notifications,
    aiResponses,
    
    // Connection controls
    connect,
    disconnect,
    sendMetricEvent,
    
    // Notification controls
    markNotificationRead,
    clearNotifications,
    
    // Helper computed values
    unreadNotifications: notifications.filter(n => !n.read).length,
    hasRealtimeData: Boolean(realtimeMetrics),
    connectionStatus: isConnected ? 'connected' : connectionError ? 'error' : 'connecting'
  }
}