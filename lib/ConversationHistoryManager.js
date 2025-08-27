'use client'

/**
 * Optimized Conversation History Manager
 * 
 * Handles:
 * - Memory-efficient conversation storage
 * - Automatic cleanup and pagination
 * - Intelligent caching with compression
 * - Search and filtering capabilities
 * - Export/import functionality
 */

class ConversationHistoryManager {
  constructor(options = {}) {
    this.maxMessagesPerSession = options.maxMessagesPerSession || 100
    this.maxSessions = options.maxSessions || 20
    this.compressionThreshold = options.compressionThreshold || 50 // messages
    this.storagePrefix = options.storagePrefix || 'conv_hist'
    this.cleanupInterval = options.cleanupInterval || 5 * 60 * 1000 // 5 minutes
    
    // In-memory cache for active sessions
    this.activeCache = new Map()
    this.searchIndex = new Map() // Simple search index
    
    // Start cleanup interval
    this.startCleanupInterval()
    
    // Track memory usage
    this.memoryStats = {
      activeSessions: 0,
      totalMessages: 0,
      lastCleanup: Date.now(),
      compressionSaves: 0
    }
  }

  /**
   * Add a message to a conversation session
   */
  addMessage(sessionId, message) {
    if (!sessionId || !message) return false
    
    // Ensure message has required fields
    const normalizedMessage = {
      id: message.id || Date.now() + Math.random(),
      role: message.role,
      content: message.content,
      timestamp: message.timestamp || new Date().toISOString(),
      ...message
    }
    
    // Get or create session
    let session = this.getSession(sessionId)
    if (!session) {
      session = {
        id: sessionId,
        messages: [],
        created: new Date().toISOString(),
        lastAccessed: new Date().toISOString(),
        compressed: false
      }
    }
    
    // Add message
    session.messages.push(normalizedMessage)
    session.lastAccessed = new Date().toISOString()
    
    // Update search index
    this.updateSearchIndex(sessionId, normalizedMessage)
    
    // Check if session needs trimming
    if (session.messages.length > this.maxMessagesPerSession) {
      session.messages = session.messages.slice(-this.maxMessagesPerSession)
    }
    
    // Store session
    this.storeSession(sessionId, session)
    
    // Update memory stats
    this.memoryStats.totalMessages++
    
    return true
  }

  /**
   * Get messages for a session with pagination
   */
  getMessages(sessionId, options = {}) {
    const { page = 1, limit = 20, search = null } = options
    
    const session = this.getSession(sessionId)
    if (!session) return { messages: [], total: 0, hasMore: false }
    
    let messages = [...session.messages]
    
    // Apply search filter if provided
    if (search) {
      const searchLower = search.toLowerCase()
      messages = messages.filter(msg => 
        msg.content.toLowerCase().includes(searchLower)
      )
    }
    
    // Apply pagination
    const total = messages.length
    const start = (page - 1) * limit
    const end = start + limit
    const paginatedMessages = messages.slice(start, end)
    const hasMore = end < total
    
    // Update last accessed
    session.lastAccessed = new Date().toISOString()
    this.activeCache.set(sessionId, session)
    
    return {
      messages: paginatedMessages,
      total,
      hasMore,
      page,
      totalPages: Math.ceil(total / limit)
    }
  }

  /**
   * Get a complete session
   */
  getSession(sessionId) {
    // Check active cache first
    if (this.activeCache.has(sessionId)) {
      return this.activeCache.get(sessionId)
    }
    
    // Load from storage
    try {
      const stored = localStorage.getItem(`${this.storagePrefix}_${sessionId}`)
      if (stored) {
        const session = JSON.parse(stored)
        
        // Decompress if needed
        if (session.compressed && session.compressedData) {
          session.messages = this.decompress(session.compressedData)
          session.compressed = false
          delete session.compressedData
        }
        
        // Add to active cache
        this.activeCache.set(sessionId, session)
        return session
      }
    } catch (error) {
      console.error('Failed to load session:', error)
    }
    
    return null
  }

  /**
   * Store a session with optional compression
   */
  storeSession(sessionId, session) {
    try {
      // Update active cache
      this.activeCache.set(sessionId, { ...session })
      
      // Prepare for storage
      const storageSession = { ...session }
      
      // Compress large sessions
      if (session.messages.length > this.compressionThreshold) {
        storageSession.compressedData = this.compress(session.messages)
        storageSession.compressed = true
        delete storageSession.messages
        this.memoryStats.compressionSaves++
      }
      
      // Store to localStorage
      localStorage.setItem(
        `${this.storagePrefix}_${sessionId}`, 
        JSON.stringify(storageSession)
      )
      
      // Update sessions index
      this.updateSessionsIndex(sessionId, {
        id: sessionId,
        created: session.created,
        lastAccessed: session.lastAccessed,
        messageCount: session.messages?.length || 0
      })
      
    } catch (error) {
      console.error('Failed to store session:', error)
    }
  }

  /**
   * Get all session summaries
   */
  getAllSessions(options = {}) {
    const { limit = 10, sort = 'lastAccessed' } = options
    
    try {
      const indexData = localStorage.getItem(`${this.storagePrefix}_index`)
      if (!indexData) return []
      
      const sessions = JSON.parse(indexData)
      
      // Sort sessions
      const sortedSessions = sessions.sort((a, b) => {
        if (sort === 'created') {
          return new Date(b.created) - new Date(a.created)
        }
        return new Date(b.lastAccessed) - new Date(a.lastAccessed)
      })
      
      return sortedSessions.slice(0, limit)
    } catch (error) {
      console.error('Failed to load sessions:', error)
      return []
    }
  }

  /**
   * Search across all conversations
   */
  async searchConversations(query, options = {}) {
    const { limit = 50, sessionLimit = 5 } = options
    const results = []
    const searchLower = query.toLowerCase()
    
    // Get recent sessions to search
    const sessions = this.getAllSessions({ limit: sessionLimit })
    
    for (const sessionInfo of sessions) {
      const session = this.getSession(sessionInfo.id)
      if (!session) continue
      
      const matches = session.messages.filter(msg =>
        msg.content.toLowerCase().includes(searchLower)
      ).slice(0, 3) // Max 3 matches per session
      
      if (matches.length > 0) {
        results.push({
          sessionId: session.id,
          sessionCreated: session.created,
          matches: matches.map(msg => ({
            ...msg,
            snippet: this.createSnippet(msg.content, query)
          }))
        })
      }
      
      if (results.length >= limit) break
    }
    
    return results
  }

  /**
   * Delete a conversation session
   */
  deleteSession(sessionId) {
    try {
      // Remove from active cache
      this.activeCache.delete(sessionId)
      
      // Remove from localStorage
      localStorage.removeItem(`${this.storagePrefix}_${sessionId}`)
      
      // Update sessions index
      const indexData = localStorage.getItem(`${this.storagePrefix}_index`)
      if (indexData) {
        const sessions = JSON.parse(indexData)
        const updatedSessions = sessions.filter(s => s.id !== sessionId)
        localStorage.setItem(`${this.storagePrefix}_index`, JSON.stringify(updatedSessions))
      }
      
      // Remove from search index
      this.searchIndex.delete(sessionId)
      
      return true
    } catch (error) {
      console.error('Failed to delete session:', error)
      return false
    }
  }

  /**
   * Clear old sessions automatically
   */
  performCleanup() {
    try {
      const now = Date.now()
      const sessions = this.getAllSessions({ limit: 100 })
      
      // Remove sessions older than 30 days
      const thirtyDaysAgo = now - (30 * 24 * 60 * 60 * 1000)
      let removedCount = 0
      
      for (const session of sessions) {
        const lastAccessed = new Date(session.lastAccessed).getTime()
        if (lastAccessed < thirtyDaysAgo) {
          this.deleteSession(session.id)
          removedCount++
        }
      }
      
      // If we still have too many sessions, remove oldest
      const remainingSessions = sessions.length - removedCount
      if (remainingSessions > this.maxSessions) {
        const excessCount = remainingSessions - this.maxSessions
        const sortedSessions = sessions
          .filter(s => new Date(s.lastAccessed).getTime() >= thirtyDaysAgo)
          .sort((a, b) => new Date(a.lastAccessed) - new Date(b.lastAccessed))
        
        for (let i = 0; i < excessCount; i++) {
          this.deleteSession(sortedSessions[i].id)
          removedCount++
        }
      }
      
      // Clean active cache
      if (this.activeCache.size > this.maxSessions) {
        const activeEntries = Array.from(this.activeCache.entries())
        const sortedActive = activeEntries.sort((a, b) => 
          new Date(a[1].lastAccessed) - new Date(b[1].lastAccessed)
        )
        
        // Keep only the most recent sessions in cache
        const keepCount = Math.floor(this.maxSessions * 0.8) // 80% of max
        for (let i = 0; i < activeEntries.length - keepCount; i++) {
          this.activeCache.delete(sortedActive[i][0])
        }
      }
      
      // Update memory stats
      this.memoryStats.activeSessions = this.activeCache.size
      this.memoryStats.lastCleanup = now
      
      console.debug(`🧹 Conversation cleanup: removed ${removedCount} sessions, ${this.activeCache.size} active`)
      
      return { removed: removedCount, active: this.activeCache.size }
    } catch (error) {
      console.error('Cleanup failed:', error)
      return { removed: 0, active: this.activeCache.size }
    }
  }

  /**
   * Export conversation data
   */
  exportConversations(sessionIds = null) {
    try {
      const sessions = sessionIds 
        ? sessionIds.map(id => this.getSession(id)).filter(Boolean)
        : this.getAllSessions({ limit: 50 }).map(info => this.getSession(info.id)).filter(Boolean)
      
      const exportData = {
        version: '1.0',
        exported: new Date().toISOString(),
        sessions: sessions.map(session => ({
          id: session.id,
          created: session.created,
          lastAccessed: session.lastAccessed,
          messages: session.messages
        }))
      }
      
      return JSON.stringify(exportData, null, 2)
    } catch (error) {
      console.error('Export failed:', error)
      return null
    }
  }

  /**
   * Import conversation data
   */
  importConversations(jsonData) {
    try {
      const data = JSON.parse(jsonData)
      let importedCount = 0
      
      for (const session of data.sessions) {
        // Add each message to rebuild the session properly
        for (const message of session.messages) {
          this.addMessage(session.id, message)
        }
        importedCount++
      }
      
      return { imported: importedCount, total: data.sessions.length }
    } catch (error) {
      console.error('Import failed:', error)
      return { imported: 0, total: 0 }
    }
  }

  /**
   * Get memory usage statistics
   */
  getMemoryStats() {
    const storageUsage = this.calculateStorageUsage()
    
    return {
      ...this.memoryStats,
      activeSessions: this.activeCache.size,
      storageUsage,
      cacheHitRate: this.calculateCacheHitRate()
    }
  }

  // Private helper methods
  
  updateSearchIndex(sessionId, message) {
    if (!this.searchIndex.has(sessionId)) {
      this.searchIndex.set(sessionId, [])
    }
    
    const words = message.content.toLowerCase().split(/\s+/)
    const sessionIndex = this.searchIndex.get(sessionId)
    
    words.forEach(word => {
      if (word.length > 2) { // Index words longer than 2 characters
        sessionIndex.push({
          word,
          messageId: message.id,
          timestamp: message.timestamp
        })
      }
    })
  }

  updateSessionsIndex(sessionId, sessionInfo) {
    try {
      const indexData = localStorage.getItem(`${this.storagePrefix}_index`)
      const sessions = indexData ? JSON.parse(indexData) : []
      
      // Update or add session info
      const existingIndex = sessions.findIndex(s => s.id === sessionId)
      if (existingIndex >= 0) {
        sessions[existingIndex] = sessionInfo
      } else {
        sessions.push(sessionInfo)
      }
      
      localStorage.setItem(`${this.storagePrefix}_index`, JSON.stringify(sessions))
    } catch (error) {
      console.error('Failed to update sessions index:', error)
    }
  }

  compress(messages) {
    // Simple compression: stringify and use basic text compression techniques
    const jsonString = JSON.stringify(messages)
    // In a real implementation, you might use a compression library like pako
    return btoa(jsonString) // Base64 encoding as simple compression
  }

  decompress(compressedData) {
    try {
      const jsonString = atob(compressedData)
      return JSON.parse(jsonString)
    } catch (error) {
      console.error('Decompression failed:', error)
      return []
    }
  }

  createSnippet(text, query, maxLength = 150) {
    const queryIndex = text.toLowerCase().indexOf(query.toLowerCase())
    if (queryIndex === -1) return text.substring(0, maxLength) + '...'
    
    const start = Math.max(0, queryIndex - 50)
    const end = Math.min(text.length, queryIndex + query.length + 50)
    
    let snippet = text.substring(start, end)
    if (start > 0) snippet = '...' + snippet
    if (end < text.length) snippet = snippet + '...'
    
    return snippet
  }

  calculateStorageUsage() {
    let totalSize = 0
    
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key && key.startsWith(this.storagePrefix)) {
        const value = localStorage.getItem(key)
        totalSize += key.length + (value ? value.length : 0)
      }
    }
    
    return {
      bytes: totalSize,
      kb: Math.round(totalSize / 1024),
      mb: Math.round(totalSize / (1024 * 1024))
    }
  }

  calculateCacheHitRate() {
    // Simple cache hit rate calculation
    // In a more sophisticated implementation, you'd track actual hits/misses
    return (this.activeCache.size / Math.max(1, this.memoryStats.activeSessions)) * 100
  }

  startCleanupInterval() {
    if (this.cleanupIntervalId) return
    
    this.cleanupIntervalId = setInterval(() => {
      this.performCleanup()
    }, this.cleanupInterval)
  }

  stopCleanupInterval() {
    if (this.cleanupIntervalId) {
      clearInterval(this.cleanupIntervalId)
      this.cleanupIntervalId = null
    }
  }

  destroy() {
    this.stopCleanupInterval()
    this.activeCache.clear()
    this.searchIndex.clear()
  }
}

// Singleton instance
let conversationManager = null

export function getConversationManager(options = {}) {
  if (!conversationManager) {
    conversationManager = new ConversationHistoryManager(options)
  }
  return conversationManager
}

// React hook for easy integration
import { useState, useEffect, useCallback } from 'react'

export function useConversationHistory(sessionId) {
  const [messages, setMessages] = useState([])
  const [loading, setLoading] = useState(false)
  const [hasMore, setHasMore] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  
  const manager = getConversationManager()
  
  const loadMessages = useCallback(async (page = 1, search = null) => {
    if (!sessionId) return
    
    setLoading(true)
    try {
      const result = manager.getMessages(sessionId, { page, search })
      
      if (page === 1) {
        setMessages(result.messages)
      } else {
        setMessages(prev => [...prev, ...result.messages])
      }
      
      setHasMore(result.hasMore)
      setCurrentPage(page)
    } finally {
      setLoading(false)
    }
  }, [sessionId, manager])
  
  const addMessage = useCallback((message) => {
    if (!sessionId) return false
    
    const success = manager.addMessage(sessionId, message)
    if (success) {
      setMessages(prev => [...prev, message])
    }
    return success
  }, [sessionId, manager])
  
  const searchMessages = useCallback(async (query) => {
    return await manager.searchConversations(query, { sessionLimit: 1 })
  }, [manager])
  
  useEffect(() => {
    if (sessionId) {
      loadMessages(1)
    }
  }, [sessionId, loadMessages])
  
  return {
    messages,
    loading,
    hasMore,
    currentPage,
    loadMessages,
    loadMore: () => loadMessages(currentPage + 1),
    addMessage,
    searchMessages,
    manager
  }
}

export default ConversationHistoryManager