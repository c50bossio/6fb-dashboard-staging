/**
 * Enhanced WebSocket Client for 6FB AI Agent System
 * Provides reliable real-time communication with advanced features
 */

export class EnhancedWebSocketClient {
  constructor(options = {}) {
    this.ws = null
    this.isConnected = false
    this.isConnecting = false
    this.reconnectAttempts = 0
    this.maxReconnectAttempts = options.maxReconnectAttempts || 5
    this.reconnectDelay = options.reconnectDelay || 1000
    this.heartbeatInterval = null
    this.heartbeatDelay = options.heartbeatDelay || 30000
    this.messageQueue = []
    this.listeners = new Map()
    this.subscriptions = new Set()
    this.connectionId = null
    this.userId = null
    this.sessionToken = null
    this.connectionStats = {
      connected_at: null,
      messages_sent: 0,
      messages_received: 0,
      reconnect_count: 0,
      last_error: null
    }
    
    // Configuration
    this.config = {
      baseUrl: options.baseUrl || this.getWebSocketUrl(),
      autoReconnect: options.autoReconnect !== false,
      enableHeartbeat: options.enableHeartbeat !== false,
      queueMessages: options.queueMessages !== false,
      debug: options.debug || false
    }
  }

  /**
   * Get WebSocket URL based on environment
   */
  getWebSocketUrl() {
    if (typeof window !== 'undefined') {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
      const host = window.location.host
      return `${protocol}//${host}`
    }
    
    const isProduction = process.env.NODE_ENV === 'production'
    return isProduction ? 'wss://api.6fb.ai' : 'ws://localhost:8000'
  }

  /**
   * Connect to WebSocket server
   */
  async connect(sessionToken, options = {}) {
    if (this.isConnected || this.isConnecting) {
      this.debug('Already connected or connecting')
      return { success: true, connectionId: this.connectionId }
    }

    this.isConnecting = true
    this.sessionToken = sessionToken
    this.userId = options.userId

    try {
      const wsUrl = `${this.config.baseUrl}/ws/${sessionToken}`
      this.debug(`Connecting to: ${wsUrl}`)

      this.ws = new WebSocket(wsUrl)
      
      // Set up event listeners
      this.ws.onopen = this.handleOpen.bind(this)
      this.ws.onmessage = this.handleMessage.bind(this)
      this.ws.onerror = this.handleError.bind(this)
      this.ws.onclose = this.handleClose.bind(this)

      // Wait for connection or timeout
      await this.waitForConnection()

      return {
        success: true,
        connectionId: this.connectionId,
        features: this.features
      }

    } catch (error) {
      this.isConnecting = false
      this.debug('Connection failed:', error)
      throw error
    }
  }

  /**
   * Wait for connection to establish
   */
  waitForConnection(timeout = 10000) {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.isConnecting = false
        reject(new Error('WebSocket connection timeout'))
      }, timeout)

      const checkConnection = setInterval(() => {
        if (this.isConnected) {
          clearTimeout(timer)
          clearInterval(checkConnection)
          this.isConnecting = false
          resolve()
        }
      }, 100)
    })
  }

  /**
   * Handle WebSocket open event
   */
  handleOpen(event) {
    this.debug('WebSocket connected')
    this.isConnected = true
    this.isConnecting = false
    this.reconnectAttempts = 0
    this.connectionStats.connected_at = new Date().toISOString()
    this.connectionStats.reconnect_count += 1

    if (this.config.enableHeartbeat) {
      this.startHeartbeat()
    }

    this.processMessageQueue()
    this.emit('connected', { event, connectionId: this.connectionId })
  }

  /**
   * Handle incoming WebSocket messages
   */
  handleMessage(event) {
    this.connectionStats.messages_received += 1

    try {
      const data = JSON.parse(event.data)
      this.debug('Received message:', data)

      switch (data.type) {
        case 'connection':
          this.handleConnectionMessage(data)
          break
        
        case 'response':
          this.handleAgentResponse(data)
          break
        
        case 'typing':
          this.handleTypingIndicator(data)
          break
        
        case 'notification':
          this.handleNotification(data)
          break
        
        case 'realtime_update':
          this.handleRealtimeUpdate(data)
          break
        
        case 'live_data':
          this.handleLiveData(data)
          break
        
        case 'dashboard_metrics':
          this.handleDashboardMetrics(data)
          break
        
        case 'booking_update':
          this.handleBookingUpdate(data)
          break
        
        case 'live_metrics':
          this.handleLiveMetrics(data)
          break
        
        case 'subscribed':
        case 'unsubscribed':
          this.handleSubscriptionResponse(data)
          break
        
        case 'pong':
          this.handlePong(data)
          break
        
        case 'error':
          this.handleServerError(data)
          break
        
        default:
          this.emit('message', data)
      }

    } catch (error) {
      this.debug('Failed to parse message:', error)
      this.emit('parse_error', { error, rawData: event.data })
    }
  }

  /**
   * Handle connection message
   */
  handleConnectionMessage(data) {
    this.connectionId = data.connection_id
    this.features = data.features || {}
    this.emit('connection_info', data)
  }

  /**
   * Handle AI agent response
   */
  handleAgentResponse(data) {
    this.emit('agent_response', {
      agentId: data.agent_id,
      agentName: data.agent_name,
      message: data.message,
      timestamp: data.timestamp,
      model: data.model
    })
  }

  /**
   * Handle typing indicator
   */
  handleTypingIndicator(data) {
    this.emit('typing', {
      agentId: data.agent_id,
      agentName: data.agent_name,
      isTyping: true
    })

    // Auto-clear typing indicator after 5 seconds
    setTimeout(() => {
      this.emit('typing', {
        agentId: data.agent_id,
        agentName: data.agent_name,
        isTyping: false
      })
    }, 5000)
  }

  /**
   * Handle real-time notifications
   */
  handleNotification(data) {
    this.emit('notification', {
      type: data.notification_type || data.type,
      title: data.title,
      message: data.message,
      priority: data.priority || 'normal',
      timestamp: data.timestamp,
      userId: data.user_id,
      fromUser: data.from_user
    })
  }

  /**
   * Handle real-time data updates
   */
  handleRealtimeUpdate(data) {
    this.emit('realtime_update', {
      table: data.table,
      event: data.event,
      data: data.data,
      timestamp: data.timestamp
    })

    // Emit table-specific events
    this.emit(`table_update:${data.table}`, {
      event: data.event,
      data: data.data,
      timestamp: data.timestamp
    })
  }

  /**
   * Handle live data responses
   */
  handleLiveData(data) {
    this.emit('live_data', {
      table: data.table,
      data: data.data,
      timestamp: data.timestamp
    })
  }

  /**
   * Handle dashboard metrics
   */
  handleDashboardMetrics(data) {
    this.emit('dashboard_metrics', {
      metricsType: data.metrics_type,
      data: data.data,
      timestamp: data.timestamp
    })
  }

  /**
   * Handle booking updates
   */
  handleBookingUpdate(data) {
    this.emit('booking_update', {
      bookingId: data.booking_id,
      status: data.status,
      data: data.data,
      timestamp: data.timestamp
    })
  }

  /**
   * Handle live metrics
   */
  handleLiveMetrics(data) {
    this.emit('live_metrics', {
      metrics: data.metrics,
      timestamp: data.timestamp,
      source: data.source
    })
  }

  /**
   * Handle subscription responses
   */
  handleSubscriptionResponse(data) {
    if (data.type === 'subscribed') {
      this.subscriptions.add(data.room)
    } else {
      this.subscriptions.delete(data.room)
    }
    
    this.emit('subscription_change', {
      room: data.room,
      subscribed: data.type === 'subscribed',
      subscriptions: Array.from(this.subscriptions)
    })
  }

  /**
   * Handle pong response
   */
  handlePong(data) {
    this.emit('pong', data)
  }

  /**
   * Handle server errors
   */
  handleServerError(data) {
    this.connectionStats.last_error = data.message
    this.emit('server_error', {
      message: data.message,
      timestamp: data.timestamp
    })
  }

  /**
   * Handle WebSocket error
   */
  handleError(error) {
    this.debug('WebSocket error:', error)
    this.connectionStats.last_error = error.message || 'WebSocket error'
    this.emit('error', error)
  }

  /**
   * Handle WebSocket close
   */
  handleClose(event) {
    this.debug('WebSocket closed:', event.code, event.reason)
    this.isConnected = false
    this.connectionId = null
    
    this.stopHeartbeat()
    this.emit('disconnected', { 
      code: event.code, 
      reason: event.reason,
      wasClean: event.wasClean
    })

    if (this.config.autoReconnect && this.shouldReconnect(event.code)) {
      this.scheduleReconnect()
    }
  }

  /**
   * Check if we should attempt reconnection
   */
  shouldReconnect(code) {
    const noReconnectCodes = [1000, 1001, 1005, 4001, 4002, 4003]
    return !noReconnectCodes.includes(code) && 
           this.reconnectAttempts < this.maxReconnectAttempts
  }

  /**
   * Schedule reconnection attempt
   */
  scheduleReconnect() {
    this.reconnectAttempts++
    const delay = Math.min(
      this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1),
      30000 // Max 30 seconds
    )

    this.debug(`Scheduling reconnect attempt ${this.reconnectAttempts} in ${delay}ms`)
    
    setTimeout(() => {
      if (this.sessionToken) {
        this.connect(this.sessionToken, { userId: this.userId })
          .catch(error => {
            this.debug('Reconnection failed:', error)
            if (this.reconnectAttempts < this.maxReconnectAttempts) {
              this.scheduleReconnect()
            } else {
              this.emit('max_reconnects_reached', { attempts: this.reconnectAttempts })
            }
          })
      }
    }, delay)
  }

  /**
   * Send message to WebSocket
   */
  send(type, payload = {}) {
    const message = {
      type,
      ...payload,
      timestamp: Date.now()
    }

    if (this.isConnected && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message))
      this.connectionStats.messages_sent += 1
      this.debug('Sent message:', message)
      return true
    } else if (this.config.queueMessages) {
      this.messageQueue.push(message)
      this.debug('Queued message:', message)
      return false
    } else {
      this.debug('Cannot send message - not connected:', message)
      return false
    }
  }

  /**
   * Process queued messages
   */
  processMessageQueue() {
    this.debug(`Processing ${this.messageQueue.length} queued messages`)
    while (this.messageQueue.length > 0 && this.isConnected) {
      const message = this.messageQueue.shift()
      this.ws.send(JSON.stringify(message))
      this.connectionStats.messages_sent += 1
    }
  }

  /**
   * Send chat message to AI agent
   */
  sendChatMessage(message, agentId = 'business_coach', sessionId = null) {
    return this.send('chat', {
      message,
      agent_id: agentId,
      session_id: sessionId || this.connectionId
    })
  }

  /**
   * Subscribe to room/channel
   */
  subscribeToRoom(room) {
    this.send('subscribe', { room })
  }

  /**
   * Unsubscribe from room/channel
   */
  unsubscribeFromRoom(room) {
    this.send('unsubscribe', { room })
  }

  /**
   * Request live data
   */
  requestLiveData(table, filters = {}) {
    return this.send('live_data_request', { table, filters })
  }

  /**
   * Request dashboard metrics
   */
  requestDashboardMetrics(metricsType = 'overview') {
    return this.send('dashboard_metrics', { metrics_type: metricsType })
  }

  /**
   * Start heartbeat
   */
  startHeartbeat() {
    this.stopHeartbeat() // Clear any existing interval
    
    this.heartbeatInterval = setInterval(() => {
      if (this.isConnected) {
        this.send('ping', { timestamp: Date.now() })
      }
    }, this.heartbeatDelay)
  }

  /**
   * Stop heartbeat
   */
  stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval)
      this.heartbeatInterval = null
    }
  }

  /**
   * Event emitter functionality
   */
  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, [])
    }
    this.listeners.get(event).push(callback)
    return () => this.off(event, callback) // Return cleanup function
  }

  off(event, callback) {
    if (this.listeners.has(event)) {
      const callbacks = this.listeners.get(event)
      const index = callbacks.indexOf(callback)
      if (index > -1) {
        callbacks.splice(index, 1)
      }
    }
  }

  emit(event, data) {
    if (this.listeners.has(event)) {
      this.listeners.get(event).forEach(callback => {
        try {
          callback(data)
        } catch (error) {
          this.debug(`Error in event listener for ${event}:`, error)
        }
      })
    }
  }

  /**
   * Get connection status
   */
  getConnectionStatus() {
    return {
      isConnected: this.isConnected,
      isConnecting: this.isConnecting,
      connectionId: this.connectionId,
      userId: this.userId,
      reconnectAttempts: this.reconnectAttempts,
      queuedMessages: this.messageQueue.length,
      subscriptions: Array.from(this.subscriptions),
      stats: { ...this.connectionStats },
      features: this.features || {}
    }
  }

  /**
   * Disconnect WebSocket
   */
  disconnect(code = 1000, reason = 'Client disconnect') {
    this.config.autoReconnect = false // Prevent auto-reconnect
    
    if (this.ws) {
      this.ws.close(code, reason)
    }
    
    this.stopHeartbeat()
    this.isConnected = false
    this.isConnecting = false
    this.messageQueue = []
    this.subscriptions.clear()
  }

  /**
   * Debug logging
   */
  debug(...args) {
    if (this.config.debug) {
      console.log('[EnhancedWebSocketClient]', ...args)
    }
  }
}

// Singleton instance for easy use
let wsClient = null

/**
 * Get or create WebSocket client instance
 */
export function getWebSocketClient(options = {}) {
  if (!wsClient) {
    wsClient = new EnhancedWebSocketClient(options)
  }
  return wsClient
}

/**
 * Reset WebSocket client (useful for testing)
 */
export function resetWebSocketClient() {
  if (wsClient) {
    wsClient.disconnect()
    wsClient = null
  }
}

export default getWebSocketClient()