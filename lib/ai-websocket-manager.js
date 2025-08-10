/**
 * AI WebSocket Manager for Real-time Agent Collaboration
 * Enables multi-agent communication and live updates
 */

export class AIWebSocketManager {
  constructor() {
    this.ws = null
    this.reconnectAttempts = 0
    this.maxReconnectAttempts = 5
    this.reconnectDelay = 1000
    this.heartbeatInterval = null
    this.messageQueue = []
    this.listeners = new Map()
    this.agentStatuses = new Map()
    this.isConnected = false
    this.sessionId = null
  }

  /**
   * Connect to WebSocket server
   */
  async connect(options = {}) {
    const { userId, sessionId, token } = options
    this.sessionId = sessionId || this.generateSessionId()
    
    try {
      // Determine WebSocket URL
      const wsUrl = this.getWebSocketUrl()
      
      // Add authentication params
      const params = new URLSearchParams({
        session_id: this.sessionId,
        user_id: userId || 'anonymous',
        token: token || ''
      })
      
      this.ws = new WebSocket(`${wsUrl}?${params}`)
      
      // Set up event handlers
      this.ws.onopen = this.handleOpen.bind(this)
      this.ws.onmessage = this.handleMessage.bind(this)
      this.ws.onerror = this.handleError.bind(this)
      this.ws.onclose = this.handleClose.bind(this)
      
      // Wait for connection
      await this.waitForConnection()
      
      return {
        success: true,
        sessionId: this.sessionId
      }
      
    } catch (error) {
      console.error('WebSocket connection failed:', error)
      throw error
    }
  }

  /**
   * Get WebSocket URL based on environment
   */
  getWebSocketUrl() {
    const isProduction = process.env.NODE_ENV === 'production'
    const host = process.env.NEXT_PUBLIC_WS_HOST || 
                 (isProduction ? 'wss://api.6fb.ai' : 'ws://localhost:8001')
    return `${host}/ws/agents`
  }

  /**
   * Wait for connection to establish
   */
  waitForConnection(timeout = 5000) {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error('WebSocket connection timeout'))
      }, timeout)
      
      const checkConnection = setInterval(() => {
        if (this.isConnected) {
          clearTimeout(timer)
          clearInterval(checkConnection)
          resolve()
        }
      }, 100)
    })
  }

  /**
   * Handle WebSocket open event
   */
  handleOpen(event) {
    console.log('WebSocket connected')
    this.isConnected = true
    this.reconnectAttempts = 0
    
    // Start heartbeat
    this.startHeartbeat()
    
    // Process queued messages
    this.processMessageQueue()
    
    // Notify listeners
    this.emit('connected', { sessionId: this.sessionId })
  }

  /**
   * Handle incoming WebSocket messages
   */
  handleMessage(event) {
    try {
      const data = JSON.parse(event.data)
      
      switch (data.type) {
        case 'agent_message':
          this.handleAgentMessage(data)
          break
          
        case 'agent_status':
          this.handleAgentStatus(data)
          break
          
        case 'collaboration_update':
          this.handleCollaborationUpdate(data)
          break
          
        case 'analysis_result':
          this.handleAnalysisResult(data)
          break
          
        case 'heartbeat':
          // Server heartbeat response
          break
          
        default:
          this.emit('message', data)
      }
      
    } catch (error) {
      console.error('Failed to parse WebSocket message:', error)
    }
  }

  /**
   * Handle agent message
   */
  handleAgentMessage(data) {
    const { agent, message, context, timestamp } = data
    
    // Update agent status
    this.agentStatuses.set(agent, {
      lastMessage: message,
      lastActivity: timestamp,
      status: 'active'
    })
    
    // Emit agent-specific event
    this.emit(`agent:${agent}`, { message, context, timestamp })
    
    // Emit general agent message event
    this.emit('agent_message', data)
  }

  /**
   * Handle agent status update
   */
  handleAgentStatus(data) {
    const { agent, status, metrics } = data
    
    this.agentStatuses.set(agent, {
      ...this.agentStatuses.get(agent),
      status,
      metrics,
      lastUpdate: Date.now()
    })
    
    this.emit('agent_status', { agent, status, metrics })
  }

  /**
   * Handle collaboration update
   */
  handleCollaborationUpdate(data) {
    const { agents, task, progress, result } = data
    
    this.emit('collaboration', {
      agents,
      task,
      progress,
      result,
      timestamp: Date.now()
    })
  }

  /**
   * Handle analysis result
   */
  handleAnalysisResult(data) {
    const { analysisId, type, result, confidence } = data
    
    this.emit('analysis', {
      analysisId,
      type,
      result,
      confidence,
      timestamp: Date.now()
    })
  }

  /**
   * Handle WebSocket error
   */
  handleError(error) {
    console.error('WebSocket error:', error)
    this.emit('error', error)
  }

  /**
   * Handle WebSocket close
   */
  handleClose(event) {
    console.log('WebSocket disconnected:', event.code, event.reason)
    this.isConnected = false
    
    // Stop heartbeat
    this.stopHeartbeat()
    
    // Notify listeners
    this.emit('disconnected', { code: event.code, reason: event.reason })
    
    // Attempt reconnection
    if (this.shouldReconnect(event.code)) {
      this.reconnect()
    }
  }

  /**
   * Check if we should attempt reconnection
   */
  shouldReconnect(code) {
    // Don't reconnect for normal closure or auth failures
    const noReconnectCodes = [1000, 1001, 4001, 4002, 4003]
    return !noReconnectCodes.includes(code) && 
           this.reconnectAttempts < this.maxReconnectAttempts
  }

  /**
   * Reconnect to WebSocket
   */
  async reconnect() {
    this.reconnectAttempts++
    
    // Exponential backoff
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1)
    
    console.log(`Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})...`)
    
    setTimeout(() => {
      this.connect({ sessionId: this.sessionId })
    }, delay)
  }

  /**
   * Send message to WebSocket
   */
  send(type, payload) {
    const message = {
      type,
      payload,
      sessionId: this.sessionId,
      timestamp: Date.now()
    }
    
    if (this.isConnected && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message))
    } else {
      // Queue message if not connected
      this.messageQueue.push(message)
    }
  }

  /**
   * Process queued messages
   */
  processMessageQueue() {
    while (this.messageQueue.length > 0 && this.isConnected) {
      const message = this.messageQueue.shift()
      this.ws.send(JSON.stringify(message))
    }
  }

  /**
   * Request agent collaboration
   */
  requestCollaboration(task, agents = []) {
    this.send('collaborate', {
      task,
      agents,
      priority: task.priority || 'normal'
    })
  }

  /**
   * Request analysis
   */
  requestAnalysis(type, data) {
    const analysisId = this.generateAnalysisId()
    
    this.send('analyze', {
      analysisId,
      type,
      data
    })
    
    return analysisId
  }

  /**
   * Subscribe to agent updates
   */
  subscribeToAgent(agent) {
    this.send('subscribe', { agent })
  }

  /**
   * Unsubscribe from agent updates
   */
  unsubscribeFromAgent(agent) {
    this.send('unsubscribe', { agent })
  }

  /**
   * Start heartbeat
   */
  startHeartbeat() {
    this.heartbeatInterval = setInterval(() => {
      if (this.isConnected) {
        this.send('heartbeat', { timestamp: Date.now() })
      }
    }, 30000) // Every 30 seconds
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
          console.error(`Error in event listener for ${event}:`, error)
        }
      })
    }
  }

  /**
   * Get agent statuses
   */
  getAgentStatuses() {
    return Array.from(this.agentStatuses.entries()).map(([agent, status]) => ({
      agent,
      ...status
    }))
  }

  /**
   * Get connection status
   */
  getConnectionStatus() {
    return {
      connected: this.isConnected,
      sessionId: this.sessionId,
      reconnectAttempts: this.reconnectAttempts,
      queuedMessages: this.messageQueue.length
    }
  }

  /**
   * Disconnect WebSocket
   */
  disconnect() {
    if (this.ws) {
      this.ws.close(1000, 'Client disconnect')
      this.ws = null
    }
    this.stopHeartbeat()
    this.isConnected = false
    this.messageQueue = []
  }

  /**
   * Generate unique session ID
   */
  generateSessionId() {
    return `ws_session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  /**
   * Generate unique analysis ID
   */
  generateAnalysisId() {
    return `analysis_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }
}

// Singleton instance
let wsManager = null

/**
 * Get or create WebSocket manager instance
 */
export function getWebSocketManager() {
  if (!wsManager) {
    wsManager = new AIWebSocketManager()
  }
  return wsManager
}

// Export default instance
export default getWebSocketManager()