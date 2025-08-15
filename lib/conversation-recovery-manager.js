/**
 * Conversation Recovery Manager
 * Enhances existing localStorage conversation persistence with recovery features
 * Works with existing OptimizedAIChat and VirtualScrollChat components
 */

export class ConversationRecoveryManager {
  constructor() {
    this.storagePrefix = 'ai_conversation_'
    this.metadataKey = 'ai_conversations_metadata'
    this.crashRecoveryKey = 'ai_crash_recovery'
    this.maxRecoveryAge = 24 * 60 * 60 * 1000 // 24 hours
    this.recoveryCheckInterval = 30000 // 30 seconds
    
    this.isRecoveryMode = false
    this.recoveryData = null
    this.heartbeatTimer = null
    
    this.initialize()
  }

  /**
   * Initialize recovery manager
   */
  initialize() {
    try {
      this.checkForCrashRecovery()
      
      this.startHeartbeat()
      
      this.setupUnloadHandlers()
      
      this.cleanupOldConversations()
      
      console.log('Conversation recovery manager initialized')
      
    } catch (error) {
      console.error('Failed to initialize conversation recovery:', error)
    }
  }

  /**
   * Check for crash recovery data
   */
  checkForCrashRecovery() {
    try {
      const recoveryData = localStorage.getItem(this.crashRecoveryKey)
      if (recoveryData) {
        const recovery = JSON.parse(recoveryData)
        const age = Date.now() - recovery.timestamp
        
        if (age < this.maxRecoveryAge) {
          this.recoveryData = recovery
          this.isRecoveryMode = true
          console.log('Crash recovery data found:', recovery.sessionId)
          
          this.emitRecoveryEvent('recovery-available', recovery)
        } else {
          localStorage.removeItem(this.crashRecoveryKey)
        }
      }
    } catch (error) {
      console.error('Error checking for crash recovery:', error)
    }
  }

  /**
   * Save conversation state for crash recovery
   */
  saveRecoveryState(sessionId, messages, additionalData = {}) {
    if (!sessionId || !messages) return
    
    try {
      const recoveryState = {
        sessionId,
        messages,
        timestamp: Date.now(),
        url: window.location.href,
        messageCount: messages.length,
        lastMessage: messages[messages.length - 1]?.content?.substring(0, 100),
        ...additionalData
      }
      
      localStorage.setItem(this.crashRecoveryKey, JSON.stringify(recoveryState))
      
    } catch (error) {
      console.error('Failed to save recovery state:', error)
    }
  }

  /**
   * Clear recovery state (called after successful save)
   */
  clearRecoveryState() {
    try {
      localStorage.removeItem(this.crashRecoveryKey)
      this.recoveryData = null
      this.isRecoveryMode = false
    } catch (error) {
      console.error('Failed to clear recovery state:', error)
    }
  }

  /**
   * Get available recovery data
   */
  getRecoveryData() {
    return this.recoveryData
  }

  /**
   * Accept recovery (restore conversation)
   */
  acceptRecovery() {
    const recovery = this.recoveryData
    if (!recovery) return null
    
    try {
      const restoredSession = {
        sessionId: recovery.sessionId,
        messages: recovery.messages,
        recovered: true,
        recoveredAt: Date.now(),
        originalCrashTime: recovery.timestamp
      }
      
      localStorage.setItem(
        `${this.storagePrefix}${recovery.sessionId}`,
        JSON.stringify(restoredSession)
      )
      
      this.updateConversationMetadata(recovery.sessionId, {
        recovered: true,
        recoveredAt: Date.now()
      })
      
      this.clearRecoveryState()
      
      console.log('Recovery accepted for session:', recovery.sessionId)
      this.emitRecoveryEvent('recovery-accepted', restoredSession)
      
      return restoredSession
      
    } catch (error) {
      console.error('Failed to accept recovery:', error)
      return null
    }
  }

  /**
   * Reject recovery (discard crash data)
   */
  rejectRecovery() {
    const recovery = this.recoveryData
    if (recovery) {
      this.clearRecoveryState()
      console.log('Recovery rejected for session:', recovery.sessionId)
      this.emitRecoveryEvent('recovery-rejected', recovery)
    }
  }

  /**
   * Get all conversation sessions
   */
  getAllConversations() {
    const conversations = []
    
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i)
        
        if (key && key.startsWith(this.storagePrefix)) {
          const sessionId = key.replace(this.storagePrefix, '')
          const data = localStorage.getItem(key)
          
          if (data) {
            const conversation = JSON.parse(data)
            conversations.push({
              sessionId,
              ...conversation,
              lastAccessed: conversation.timestamp || 0
            })
          }
        }
      }
      
      conversations.sort((a, b) => b.lastAccessed - a.lastAccessed)
      
    } catch (error) {
      console.error('Failed to load conversations:', error)
    }
    
    return conversations
  }

  /**
   * Get conversation by session ID
   */
  getConversation(sessionId) {
    try {
      const data = localStorage.getItem(`${this.storagePrefix}${sessionId}`)
      return data ? JSON.parse(data) : null
    } catch (error) {
      console.error('Failed to load conversation:', error)
      return null
    }
  }

  /**
   * Delete conversation
   */
  deleteConversation(sessionId) {
    try {
      localStorage.removeItem(`${this.storagePrefix}${sessionId}`)
      this.removeFromMetadata(sessionId)
      
      console.log('Deleted conversation:', sessionId)
      this.emitRecoveryEvent('conversation-deleted', { sessionId })
      
      return true
    } catch (error) {
      console.error('Failed to delete conversation:', error)
      return false
    }
  }

  /**
   * Export conversation
   */
  exportConversation(sessionId, format = 'json') {
    const conversation = this.getConversation(sessionId)
    if (!conversation) return null
    
    switch (format.toLowerCase()) {
      case 'json':
        return JSON.stringify(conversation, null, 2)
        
      case 'txt':
        return this.convertToText(conversation)
        
      case 'csv':
        return this.convertToCSV(conversation)
        
      default:
        throw new Error(`Unsupported export format: ${format}`)
    }
  }

  /**
   * Import conversation
   */
  importConversation(data, options = {}) {
    try {
      const conversation = typeof data === 'string' ? JSON.parse(data) : data
      
      let sessionId = conversation.sessionId || this.generateSessionId()
      
      if (this.getConversation(sessionId) && !options.overwrite) {
        sessionId = this.generateSessionId()
        conversation.sessionId = sessionId
      }
      
      conversation.imported = true
      conversation.importedAt = Date.now()
      
      localStorage.setItem(
        `${this.storagePrefix}${sessionId}`,
        JSON.stringify(conversation)
      )
      
      this.updateConversationMetadata(sessionId, {
        imported: true,
        importedAt: Date.now()
      })
      
      console.log('Imported conversation:', sessionId)
      return sessionId
      
    } catch (error) {
      console.error('Failed to import conversation:', error)
      throw error
    }
  }

  /**
   * Search conversations
   */
  searchConversations(query) {
    const results = []
    const lowerQuery = query.toLowerCase()
    
    const conversations = this.getAllConversations()
    
    conversations.forEach(conversation => {
      let score = 0
      const matches = []
      
      conversation.messages?.forEach((message, index) => {
        if (message.content.toLowerCase().includes(lowerQuery)) {
          score += message.role === 'user' ? 3 : 2
          matches.push({
            type: 'message',
            content: message.content,
            role: message.role,
            index
          })
        }
      })
      
      if (score > 0) {
        results.push({
          conversation,
          score,
          matches: matches.slice(0, 3) // Limit matches
        })
      }
    })
    
    return results.sort((a, b) => b.score - a.score)
  }

  /**
   * Update conversation metadata
   */
  updateConversationMetadata(sessionId, metadata) {
    try {
      const existing = this.getMetadata()
      existing[sessionId] = {
        ...existing[sessionId],
        ...metadata,
        lastUpdated: Date.now()
      }
      
      localStorage.setItem(this.metadataKey, JSON.stringify(existing))
    } catch (error) {
      console.error('Failed to update metadata:', error)
    }
  }

  /**
   * Get conversation metadata
   */
  getMetadata() {
    try {
      const data = localStorage.getItem(this.metadataKey)
      return data ? JSON.parse(data) : {}
    } catch (error) {
      console.error('Failed to load metadata:', error)
      return {}
    }
  }

  /**
   * Remove from metadata
   */
  removeFromMetadata(sessionId) {
    try {
      const metadata = this.getMetadata()
      delete metadata[sessionId]
      localStorage.setItem(this.metadataKey, JSON.stringify(metadata))
    } catch (error) {
      console.error('Failed to remove from metadata:', error)
    }
  }

  /**
   * Clean up old conversations
   */
  cleanupOldConversations(maxAge = 7 * 24 * 60 * 60 * 1000) { // 7 days
    const cutoff = Date.now() - maxAge
    let cleaned = 0
    
    const conversations = this.getAllConversations()
    
    conversations.forEach(conversation => {
      if (conversation.lastAccessed < cutoff && !conversation.recovered) {
        this.deleteConversation(conversation.sessionId)
        cleaned++
      }
    })
    
    if (cleaned > 0) {
      console.log(`Cleaned up ${cleaned} old conversations`)
      this.emitRecoveryEvent('conversations-cleaned', { count: cleaned })
    }
    
    return cleaned
  }

  /**
   * Start heartbeat monitoring
   */
  startHeartbeat() {
    this.heartbeatTimer = setInterval(() => {
      localStorage.setItem('ai_heartbeat', Date.now().toString())
    }, this.recoveryCheckInterval)
  }

  /**
   * Set up unload handlers for clean shutdown
   */
  setupUnloadHandlers() {
    window.addEventListener('beforeunload', () => {
      this.clearRecoveryState()
      
      if (this.heartbeatTimer) {
        clearInterval(this.heartbeatTimer)
      }
    })
    
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) {
        this.checkForCrashRecovery()
      }
    })
  }

  /**
   * Generate unique session ID
   */
  generateSessionId() {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  /**
   * Convert conversation to text format
   */
  convertToText(conversation) {
    let text = `Conversation Export\n`
    text += `Session: ${conversation.sessionId}\n`
    text += `Date: ${new Date(conversation.timestamp || Date.now()).toLocaleString()}\n`
    text += `Messages: ${conversation.messages?.length || 0}\n\n`
    
    if (conversation.messages) {
      conversation.messages.forEach((message, index) => {
        const speaker = message.role === 'user' ? 'You' : (message.agent || 'Assistant')
        text += `${speaker}: ${message.content}\n\n`
      })
    }
    
    return text
  }

  /**
   * Convert conversation to CSV format
   */
  convertToCSV(conversation) {
    let csv = 'Index,Role,Content,Timestamp,Agent\n'
    
    if (conversation.messages) {
      conversation.messages.forEach((message, index) => {
        const content = `"${message.content.replace(/"/g, '""')}"`
        csv += `${index + 1},${message.role},${content},${message.timestamp || ''},${message.agent || ''}\n`
      })
    }
    
    return csv
  }

  /**
   * Emit recovery events
   */
  emitRecoveryEvent(type, data) {
    const event = new CustomEvent(`conversation-recovery`, {
      detail: { type, data }
    })
    
    window.dispatchEvent(event)
  }

  /**
   * Get recovery statistics
   */
  getStats() {
    const conversations = this.getAllConversations()
    const recovered = conversations.filter(c => c.recovered).length
    
    return {
      totalConversations: conversations.length,
      recoveredConversations: recovered,
      hasRecoveryData: !!this.recoveryData,
      isRecoveryMode: this.isRecoveryMode,
      oldestConversation: conversations.length > 0 
        ? Math.min(...conversations.map(c => c.lastAccessed))
        : null,
      totalMessages: conversations.reduce((sum, c) => sum + (c.messages?.length || 0), 0)
    }
  }
}

let recoveryManager = null

/**
 * Get or create recovery manager instance
 */
export function getRecoveryManager() {
  if (!recoveryManager) {
    recoveryManager = new ConversationRecoveryManager()
  }
  return recoveryManager
}

export default getRecoveryManager()