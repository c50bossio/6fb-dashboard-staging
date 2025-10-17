/**
 * Enhanced WebSocket React Hooks for 6FB AI Agent System
 * Provides easy integration of real-time features in React components
 */

import { useState, useEffect, useRef, useCallback } from 'react'
import { getWebSocketClient } from '@/lib/enhanced-websocket-client'
import { createClient } from '@/lib/supabase/UNIFIED_CLIENT'

// Adapter function
const getSession = async () => {
  const client = createClient()
  const { data: { session } } = await client.auth.getSession()
  return session
}

/**
 * Main WebSocket hook with full functionality
 */
export function useEnhancedWebSocket(options = {}) {
  const [connectionStatus, setConnectionStatus] = useState('disconnected')
  const [isConnected, setIsConnected] = useState(false)
  const [connectionError, setConnectionError] = useState(null)
  const [features, setFeatures] = useState({})
  const [subscriptions, setSubscriptions] = useState([])
  const [stats, setStats] = useState({})
  
  const wsClient = useRef(null)
  const reconnectTimeoutRef = useRef(null)

  // Initialize WebSocket client
  useEffect(() => {
    wsClient.current = getWebSocketClient({
      debug: options.debug || false,
      autoReconnect: options.autoReconnect !== false,
      maxReconnectAttempts: options.maxReconnectAttempts || 5,
      ...options
    })

    const client = wsClient.current

    // Set up event listeners
    const unsubscribeFunctions = [
      client.on('connected', handleConnected),
      client.on('disconnected', handleDisconnected),
      client.on('connection_info', handleConnectionInfo),
      client.on('error', handleError),
      client.on('server_error', handleServerError),
      client.on('subscription_change', handleSubscriptionChange),
      client.on('max_reconnects_reached', handleMaxReconnectsReached)
    ]

    // Cleanup function
    return () => {
      unsubscribeFunctions.forEach(unsubscribe => unsubscribe())
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
      }
    }
  }, [])

  const handleConnected = useCallback((data) => {
    setConnectionStatus('connected')
    setIsConnected(true)
    setConnectionError(null)
    setFeatures(data.features || {})
    updateStats()
  }, [])

  const handleDisconnected = useCallback((data) => {
    setConnectionStatus('disconnected')
    setIsConnected(false)
    updateStats()

    if (data.code !== 1000 && data.code !== 1001) {
      setConnectionError(`Connection lost: ${data.reason || 'Unknown reason'}`)
    }
  }, [])

  const handleConnectionInfo = useCallback((data) => {
    setFeatures(data.features || {})
  }, [])

  const handleError = useCallback((error) => {
    setConnectionError(error.message || 'WebSocket error')
    setConnectionStatus('error')
  }, [])

  const handleServerError = useCallback((data) => {
    setConnectionError(data.message)
  }, [])

  const handleSubscriptionChange = useCallback((data) => {
    setSubscriptions(data.subscriptions || [])
  }, [])

  const handleMaxReconnectsReached = useCallback((data) => {
    setConnectionStatus('failed')
    setConnectionError(`Failed to reconnect after ${data.attempts} attempts`)
  }, [])

  const updateStats = useCallback(() => {
    if (wsClient.current) {
      const status = wsClient.current.getConnectionStatus()
      setStats(status.stats || {})
    }
  }, [])

  // Connection methods
  const connect = useCallback(async (sessionToken = null, userId = null) => {
    if (!wsClient.current) return { success: false, error: 'Client not initialized' }

    try {
      setConnectionStatus('connecting')
      setConnectionError(null)

      // Get session token if not provided
      let token = sessionToken
      if (!token) {
        const session = await getSession()
        if (!session?.access_token) {
          throw new Error('No session token available')
        }
        token = session.access_token
        userId = userId || session.user?.id
      }

      const result = await wsClient.current.connect(token, { userId })
      return result
    } catch (error) {
      setConnectionStatus('error')
      setConnectionError(error.message)
      return { success: false, error: error.message }
    }
  }, [])

  const disconnect = useCallback(() => {
    if (wsClient.current) {
      wsClient.current.disconnect()
    }
  }, [])

  const reconnect = useCallback(async () => {
    if (wsClient.current?.sessionToken) {
      return await connect(wsClient.current.sessionToken, wsClient.current.userId)
    }
    return { success: false, error: 'No session token available for reconnect' }
  }, [connect])

  // Subscription methods
  const subscribeToRoom = useCallback((room) => {
    if (wsClient.current) {
      wsClient.current.subscribeToRoom(room)
    }
  }, [])

  const unsubscribeFromRoom = useCallback((room) => {
    if (wsClient.current) {
      wsClient.current.unsubscribeFromRoom(room)
    }
  }, [])

  // Data request methods
  const requestLiveData = useCallback((table, filters = {}) => {
    if (wsClient.current) {
      return wsClient.current.requestLiveData(table, filters)
    }
    return false
  }, [])

  const requestDashboardMetrics = useCallback((metricsType = 'overview') => {
    if (wsClient.current) {
      return wsClient.current.requestDashboardMetrics(metricsType)
    }
    return false
  }, [])

  // Send custom message
  const sendMessage = useCallback((type, payload = {}) => {
    if (wsClient.current) {
      return wsClient.current.send(type, payload)
    }
    return false
  }, [])

  return {
    // Connection state
    isConnected,
    connectionStatus, // 'disconnected' | 'connecting' | 'connected' | 'error' | 'failed'
    connectionError,
    features,
    subscriptions,
    stats,
    
    // Connection methods
    connect,
    disconnect,
    reconnect,
    
    // Subscription methods
    subscribeToRoom,
    unsubscribeFromRoom,
    
    // Data methods
    requestLiveData,
    requestDashboardMetrics,
    sendMessage,
    
    // WebSocket client reference (for advanced usage)
    wsClient: wsClient.current
  }
}

/**
 * Hook for AI chat functionality
 */
export function useAIChat(agentId = 'business_coach', options = {}) {
  const [messages, setMessages] = useState([])
  const [isTyping, setIsTyping] = useState(false)
  const [currentAgent, setCurrentAgent] = useState(agentId)
  
  const wsClient = useRef(null)
  const sessionId = useRef(null)

  useEffect(() => {
    wsClient.current = getWebSocketClient(options)
    const client = wsClient.current
    sessionId.current = `chat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    // Set up chat-specific listeners
    const unsubscribeFunctions = [
      client.on('agent_response', handleAgentResponse),
      client.on('typing', handleTyping)
    ]

    return () => {
      unsubscribeFunctions.forEach(unsubscribe => unsubscribe())
    }
  }, [agentId])

  const handleAgentResponse = useCallback((data) => {
    if (data.agentId === currentAgent) {
      setMessages(prev => [...prev, {
        id: `msg_${Date.now()}`,
        type: 'agent',
        agentId: data.agentId,
        agentName: data.agentName,
        message: data.message,
        timestamp: data.timestamp,
        model: data.model
      }])
      setIsTyping(false)
    }
  }, [currentAgent])

  const handleTyping = useCallback((data) => {
    if (data.agentId === currentAgent) {
      setIsTyping(data.isTyping)
    }
  }, [currentAgent])

  const sendMessage = useCallback((message) => {
    if (!wsClient.current || !message.trim()) return false

    // Add user message to UI immediately
    const userMessage = {
      id: `msg_${Date.now()}`,
      type: 'user',
      message: message.trim(),
      timestamp: new Date().toISOString()
    }
    
    setMessages(prev => [...prev, userMessage])

    // Send to WebSocket
    const sent = wsClient.current.sendChatMessage(message.trim(), currentAgent, sessionId.current)
    
    if (sent) {
      setIsTyping(true)
    }

    return sent
  }, [currentAgent])

  const switchAgent = useCallback((newAgentId) => {
    setCurrentAgent(newAgentId)
    sessionId.current = `chat_${newAgentId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }, [])

  const clearMessages = useCallback(() => {
    setMessages([])
    setIsTyping(false)
  }, [])

  return {
    messages,
    isTyping,
    currentAgent,
    sendMessage,
    switchAgent,
    clearMessages
  }
}

/**
 * Hook for real-time notifications
 */
export function useRealtimeNotifications(options = {}) {
  const [notifications, setNotifications] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)
  
  const wsClient = useRef(null)
  const maxNotifications = options.maxNotifications || 50

  useEffect(() => {
    wsClient.current = getWebSocketClient(options)
    const client = wsClient.current

    const unsubscribe = client.on('notification', handleNotification)
    return () => unsubscribe()
  }, [])

  const handleNotification = useCallback((data) => {
    const notification = {
      id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: data.type,
      title: data.title,
      message: data.message,
      priority: data.priority || 'normal',
      timestamp: data.timestamp,
      read: false,
      userId: data.userId,
      fromUser: data.fromUser
    }

    setNotifications(prev => {
      const updated = [notification, ...prev].slice(0, maxNotifications)
      return updated
    })
    
    setUnreadCount(prev => prev + 1)

    // Show browser notification if permission granted
    if ('Notification' in window && Notification.permission === 'granted') {
      const browserNotification = new Notification(notification.title, {
        body: notification.message,
        icon: '/favicon.png',
        tag: notification.id
      })
      
      setTimeout(() => browserNotification.close(), 5000)
    }
  }, [maxNotifications])

  const markAsRead = useCallback((notificationId) => {
    setNotifications(prev => 
      prev.map(notif => 
        notif.id === notificationId 
          ? { ...notif, read: true }
          : notif
      )
    )
    
    setUnreadCount(prev => Math.max(0, prev - 1))
  }, [])

  const markAllAsRead = useCallback(() => {
    setNotifications(prev => 
      prev.map(notif => ({ ...notif, read: true }))
    )
    setUnreadCount(0)
  }, [])

  const removeNotification = useCallback((notificationId) => {
    setNotifications(prev => {
      const notification = prev.find(n => n.id === notificationId)
      if (notification && !notification.read) {
        setUnreadCount(count => Math.max(0, count - 1))
      }
      return prev.filter(n => n.id !== notificationId)
    })
  }, [])

  const clearAll = useCallback(() => {
    setNotifications([])
    setUnreadCount(0)
  }, [])

  return {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    removeNotification,
    clearAll
  }
}

/**
 * Hook for live data updates
 */
export function useLiveData(table, filters = {}, options = {}) {
  const [data, setData] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  const [lastUpdate, setLastUpdate] = useState(null)
  
  const wsClient = useRef(null)
  const autoRefresh = options.autoRefresh !== false
  const refreshInterval = options.refreshInterval || 30000

  useEffect(() => {
    wsClient.current = getWebSocketClient(options)
    const client = wsClient.current

    const unsubscribeFunctions = [
      client.on('live_data', handleLiveData),
      client.on('realtime_update', handleRealtimeUpdate),
      client.on(`table_update:${table}`, handleTableUpdate)
    ]

    // Request initial data when connected
    const requestData = () => {
      if (client.isConnected) {
        client.requestLiveData(table, filters)
      }
    }

    client.on('connected', requestData)
    
    // Request data immediately if already connected
    requestData()

    // Set up auto-refresh if enabled
    let refreshTimer = null
    if (autoRefresh) {
      refreshTimer = setInterval(requestData, refreshInterval)
    }

    return () => {
      unsubscribeFunctions.forEach(unsubscribe => unsubscribe())
      if (refreshTimer) {
        clearInterval(refreshTimer)
      }
    }
  }, [table, JSON.stringify(filters), autoRefresh, refreshInterval])

  const handleLiveData = useCallback((response) => {
    if (response.table === table) {
      setData(response.data || [])
      setIsLoading(false)
      setError(null)
      setLastUpdate(response.timestamp)
    }
  }, [table])

  const handleRealtimeUpdate = useCallback((update) => {
    if (update.table === table) {
      setLastUpdate(update.timestamp)
      
      // Apply update based on event type
      setData(prevData => {
        switch (update.event) {
          case 'INSERT':
            return [...prevData, update.data]
          
          case 'UPDATE':
            return prevData.map(item => 
              item.id === update.data.id ? { ...item, ...update.data } : item
            )
          
          case 'DELETE':
            return prevData.filter(item => item.id !== update.data.id)
          
          default:
            return prevData
        }
      })
    }
  }, [table])

  const handleTableUpdate = useCallback((update) => {
    handleRealtimeUpdate({ table, ...update })
  }, [table, handleRealtimeUpdate])

  const refresh = useCallback(() => {
    if (wsClient.current?.isConnected) {
      setIsLoading(true)
      wsClient.current.requestLiveData(table, filters)
    }
  }, [table, filters])

  return {
    data,
    isLoading,
    error,
    lastUpdate,
    refresh
  }
}

/**
 * Hook for dashboard metrics
 */
export function useDashboardMetrics(metricsType = 'overview', options = {}) {
  const [metrics, setMetrics] = useState({})
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  const [lastUpdate, setLastUpdate] = useState(null)
  
  const wsClient = useRef(null)
  const autoRefresh = options.autoRefresh !== false
  const refreshInterval = options.refreshInterval || 10000

  useEffect(() => {
    wsClient.current = getWebSocketClient(options)
    const client = wsClient.current

    const unsubscribeFunctions = [
      client.on('dashboard_metrics', handleMetrics),
      client.on('live_metrics', handleLiveMetrics)
    ]

    const requestMetrics = () => {
      if (client.isConnected) {
        client.requestDashboardMetrics(metricsType)
      }
    }

    client.on('connected', requestMetrics)
    requestMetrics()

    let refreshTimer = null
    if (autoRefresh) {
      refreshTimer = setInterval(requestMetrics, refreshInterval)
    }

    return () => {
      unsubscribeFunctions.forEach(unsubscribe => unsubscribe())
      if (refreshTimer) {
        clearInterval(refreshTimer)
      }
    }
  }, [metricsType, autoRefresh, refreshInterval])

  const handleMetrics = useCallback((response) => {
    if (response.metricsType === metricsType) {
      setMetrics(response.data || {})
      setIsLoading(false)
      setError(null)
      setLastUpdate(response.timestamp)
    }
  }, [metricsType])

  const handleLiveMetrics = useCallback((response) => {
    setMetrics(prev => ({ ...prev, ...response.metrics }))
    setLastUpdate(response.timestamp)
  }, [])

  const refresh = useCallback(() => {
    if (wsClient.current?.isConnected) {
      setIsLoading(true)
      wsClient.current.requestDashboardMetrics(metricsType)
    }
  }, [metricsType])

  return {
    metrics,
    isLoading,
    error,
    lastUpdate,
    refresh
  }
}