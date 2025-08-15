/**
 * AI Response Prefetch Manager
 * Proactively fetches responses for common queries to reduce latency
 */

export class AIPrefetchManager {
  constructor() {
    this.prefetchQueue = new Map()
    this.commonQueries = new Map()
    this.userPatterns = new Map()
    this.prefetchWorker = null
    this.isEnabled = true
    this.maxConcurrentPrefetch = 3
    this.prefetchCooldown = 5 * 60 * 1000 // 5 minutes
    this.activePrefetches = new Set()
    
    this.initializeCommonQueries()
    
    this.startPatternLearning()
  }

  /**
   * Initialize common business queries for prefetching
   */
  initializeCommonQueries() {
    const commonQueries = [
      {
        query: "How is business today?",
        priority: 10,
        agent: 'auto',
        frequency: 'daily',
        timeRelevant: true
      },
      {
        query: "Show me today's bookings",
        priority: 9,
        agent: 'auto',
        frequency: 'daily',
        timeRelevant: true
      },
      {
        query: "What's my revenue for today?",
        priority: 8,
        agent: 'elena',
        frequency: 'daily',
        timeRelevant: true
      },
      
      {
        query: "How did this week perform?",
        priority: 7,
        agent: 'auto',
        frequency: 'weekly',
        timeRelevant: true
      },
      {
        query: "Weekly revenue summary",
        priority: 6,
        agent: 'elena',
        frequency: 'weekly',
        timeRelevant: true
      },
      
      {
        query: "Marketing suggestions for growing my business",
        priority: 5,
        agent: 'sophia',
        frequency: 'biweekly',
        timeRelevant: false
      },
      {
        query: "How to get more customers?",
        priority: 5,
        agent: 'sophia',
        frequency: 'weekly',
        timeRelevant: false
      },
      
      {
        query: "How to improve my operations?",
        priority: 4,
        agent: 'david',
        frequency: 'weekly',
        timeRelevant: false
      },
      {
        query: "Staff scheduling optimization",
        priority: 4,
        agent: 'david',
        frequency: 'biweekly',
        timeRelevant: false
      },
      
      {
        query: "Business growth strategies",
        priority: 3,
        agent: 'marcus',
        frequency: 'monthly',
        timeRelevant: false
      },
      {
        query: "What should I focus on next?",
        priority: 3,
        agent: 'marcus',
        frequency: 'weekly',
        timeRelevant: false
      }
    ]
    
    commonQueries.forEach((query, index) => {
      this.commonQueries.set(`common_${index}`, {
        ...query,
        id: `common_${index}`,
        lastPrefetched: null,
        prefetchCount: 0,
        hitCount: 0
      })
    })
  }

  /**
   * Learn user query patterns for intelligent prefetching
   */
  startPatternLearning() {
    this.queryHistory = []
    this.sessionStartTime = Date.now()
    
    setInterval(() => {
      this.analyzeUserPatterns()
    }, 10 * 60 * 1000)
  }

  /**
   * Record user query for pattern learning
   */
  recordQuery(query, context = {}) {
    if (!this.isEnabled) return
    
    const record = {
      query: query.toLowerCase().trim(),
      timestamp: Date.now(),
      timeOfDay: new Date().getHours(),
      dayOfWeek: new Date().getDay(),
      agent: context.agent || 'auto',
      context: this.extractContext(context)
    }
    
    this.queryHistory.push(record)
    
    if (this.queryHistory.length > 100) {
      this.queryHistory.shift()
    }
    
    this.updateUserPatterns(record)
    
    this.triggerIntelligentPrefetch(record)
  }

  /**
   * Extract relevant context from query
   */
  extractContext(context) {
    return {
      userId: context.userId,
      shopName: context.shopName,
      hasRecentBookings: context.hasRecentBookings || false,
      businessHours: context.businessHours || 'unknown'
    }
  }

  /**
   * Update user patterns based on query history
   */
  updateUserPatterns(record) {
    const key = `pattern_${record.timeOfDay}_${record.dayOfWeek}`
    
    if (!this.userPatterns.has(key)) {
      this.userPatterns.set(key, {
        timeOfDay: record.timeOfDay,
        dayOfWeek: record.dayOfWeek,
        queries: new Map(),
        frequency: 0
      })
    }
    
    const pattern = this.userPatterns.get(key)
    pattern.frequency++
    
    if (!pattern.queries.has(record.query)) {
      pattern.queries.set(record.query, 0)
    }
    pattern.queries.set(record.query, pattern.queries.get(record.query) + 1)
  }

  /**
   * Analyze user patterns and schedule prefetching
   */
  analyzeUserPatterns() {
    if (this.queryHistory.length < 5) return
    
    const now = new Date()
    const currentHour = now.getHours()
    const currentDay = now.getDay()
    
    const relevantPatterns = Array.from(this.userPatterns.values())
      .filter(pattern => 
        Math.abs(pattern.timeOfDay - currentHour) <= 1 &&
        (pattern.dayOfWeek === currentDay || Math.abs(pattern.dayOfWeek - currentDay) <= 1)
      )
      .sort((a, b) => b.frequency - a.frequency)
    
    relevantPatterns.slice(0, 3).forEach(pattern => {
      const topQueries = Array.from(pattern.queries.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 2)
        .map(([query]) => query)
      
      topQueries.forEach(query => {
        this.schedulePrefetch(query, 'pattern', { 
          confidence: pattern.frequency,
          timeRelevant: true
        })
      })
    })
  }

  /**
   * Trigger intelligent prefetching based on query context
   */
  triggerIntelligentPrefetch(record) {
    const relatedQueries = this.findRelatedQueries(record.query)
    
    relatedQueries.forEach(relatedQuery => {
      this.schedulePrefetch(relatedQuery, 'related', {
        basedOn: record.query,
        confidence: 0.7
      })
    })
  }

  /**
   * Find queries related to the current query
   */
  findRelatedQueries(query) {
    const related = []
    const lowerQuery = query.toLowerCase()
    
    if (lowerQuery.includes('business') || lowerQuery.includes('overview')) {
      related.push("What's my revenue for today?")
      related.push("Show me today's bookings") 
      related.push("How are my operations?")
    }
    
    if (lowerQuery.includes('booking') || lowerQuery.includes('appointment')) {
      related.push("What's my revenue for today?")
      related.push("Weekly revenue summary")
    }
    
    if (lowerQuery.includes('revenue') || lowerQuery.includes('money')) {
      related.push("Marketing suggestions for growing my business")
      related.push("How to get more customers?")
    }
    
    if (lowerQuery.includes('marketing') || lowerQuery.includes('customer')) {
      related.push("How to improve my operations?")
      related.push("Staff scheduling optimization")
    }
    
    return related.slice(0, 2) // Limit to 2 related queries
  }

  /**
   * Schedule query for prefetching
   */
  schedulePrefetch(query, type = 'common', options = {}) {
    if (!this.isEnabled || this.activePrefetches.size >= this.maxConcurrentPrefetch) {
      return
    }
    
    const prefetchId = this.generatePrefetchId(query, type)
    
    const existing = this.prefetchQueue.get(prefetchId)
    if (existing && Date.now() - existing.lastPrefetched < this.prefetchCooldown) {
      return
    }
    
    const prefetchTask = {
      id: prefetchId,
      query,
      type,
      priority: options.priority || this.calculatePriority(query, type),
      agent: options.agent || this.selectBestAgent(query),
      scheduled: Date.now(),
      lastPrefetched: null,
      attempts: 0,
      maxAttempts: 2,
      ...options
    }
    
    this.prefetchQueue.set(prefetchId, prefetchTask)
    
    this.executePrefetch(prefetchTask)
  }

  /**
   * Execute prefetch operation
   */
  async executePrefetch(task) {
    if (this.activePrefetches.has(task.id)) {
      return
    }
    
    this.activePrefetches.add(task.id)
    
    try {
      console.log(`Prefetching: ${task.query}`)
      
      const { getCacheManager } = await import('./ai-cache-manager.js')
      const { getStreamingClient } = await import('./ai-streaming-client.js')
      
      const cacheManager = getCacheManager()
      const streamingClient = getStreamingClient()
      
      const cached = await cacheManager.getCachedResponse(
        task.query, 
        task.agent, 
        this.generatePrefetchContext()
      )
      
      if (cached) {
        task.lastPrefetched = Date.now()
        this.activePrefetches.delete(task.id)
        return
      }
      
      let fullResponse = ''
      
      await streamingClient.streamChat(
        task.query,
        {
          agentId: task.agent,
          sessionId: `prefetch_${Date.now()}`,
          context: this.generatePrefetchContext()
        },
        (chunk) => {
          fullResponse += chunk
        },
        () => {
          task.lastPrefetched = Date.now()
          task.prefetchCount = (task.prefetchCount || 0) + 1
          console.log(`Prefetch completed: ${task.query}`)
        },
        (error) => {
          console.warn(`Prefetch failed: ${task.query}`, error)
          task.attempts++
          
          if (task.attempts < task.maxAttempts) {
            setTimeout(() => {
              this.executePrefetch(task)
            }, 30000) // 30 second delay
          }
        }
      )
      
    } catch (error) {
      console.error(`Prefetch error for "${task.query}":`, error)
    } finally {
      this.activePrefetches.delete(task.id)
    }
  }

  /**
   * Generate context for prefetch requests
   */
  generatePrefetchContext() {
    return {
      userId: 'prefetch_user',
      shopName: 'Demo Barbershop',
      isPrefetch: true,
      timestamp: Date.now()
    }
  }

  /**
   * Calculate priority for prefetch task
   */
  calculatePriority(query, type) {
    let priority = 1
    
    if (type === 'common') priority = 5
    if (type === 'pattern') priority = 8
    if (type === 'related') priority = 3
    
    if (query.includes('today') || query.includes('now')) {
      priority += 3
    }
    
    if (query.includes('revenue') || query.includes('booking')) {
      priority += 2
    }
    
    return Math.min(priority, 10)
  }

  /**
   * Select best agent for query
   */
  selectBestAgent(query) {
    const lowerQuery = query.toLowerCase()
    
    if (lowerQuery.includes('revenue') || lowerQuery.includes('financial')) {
      return 'elena'
    }
    
    if (lowerQuery.includes('marketing') || lowerQuery.includes('customer')) {
      return 'sophia'
    }
    
    if (lowerQuery.includes('operation') || lowerQuery.includes('staff')) {
      return 'david'
    }
    
    if (lowerQuery.includes('strategy') || lowerQuery.includes('growth')) {
      return 'marcus'
    }
    
    return 'auto'
  }

  /**
   * Generate unique ID for prefetch task
   */
  generatePrefetchId(query, type) {
    const hash = query.toLowerCase().replace(/\s+/g, '_')
    return `${type}_${hash}_${Math.random().toString(36).substr(2, 6)}`
  }

  /**
   * Prefetch common queries during idle time
   */
  prefetchCommonQueries() {
    if (!this.isEnabled) return
    
    const now = Date.now()
    const currentHour = new Date().getHours()
    
    const relevantQueries = Array.from(this.commonQueries.values())
      .filter(query => {
        if (query.lastPrefetched && now - query.lastPrefetched < this.prefetchCooldown) {
          return false
        }
        
        if (query.timeRelevant) {
          return currentHour >= 8 && currentHour <= 20 // Business hours
        }
        
        return true
      })
      .sort((a, b) => b.priority - a.priority)
    
    relevantQueries.slice(0, 3).forEach(query => {
      this.schedulePrefetch(query.query, 'common', {
        priority: query.priority,
        agent: query.agent
      })
    })
  }

  /**
   * Start background prefetching
   */
  startBackgroundPrefetching() {
    setTimeout(() => {
      this.prefetchCommonQueries()
    }, 5000) // Wait 5 seconds after initialization
    
    setInterval(() => {
      if (this.activePrefetches.size < 2) {
        this.prefetchCommonQueries()
      }
    }, 15 * 60 * 1000) // Every 15 minutes
  }

  /**
   * Get prefetch statistics
   */
  getPrefetchStats() {
    const stats = {
      totalQueries: this.commonQueries.size,
      prefetchedQueries: Array.from(this.commonQueries.values())
        .filter(q => q.lastPrefetched).length,
      activePrefetches: this.activePrefetches.size,
      userPatterns: this.userPatterns.size,
      queryHistory: this.queryHistory.length,
      hitRate: 0
    }
    
    const totalPrefetches = Array.from(this.commonQueries.values())
      .reduce((sum, q) => sum + (q.prefetchCount || 0), 0)
    const totalHits = Array.from(this.commonQueries.values())
      .reduce((sum, q) => sum + (q.hitCount || 0), 0)
    
    if (totalPrefetches > 0) {
      stats.hitRate = ((totalHits / totalPrefetches) * 100).toFixed(1) + '%'
    }
    
    return stats
  }

  /**
   * Record prefetch cache hit
   */
  recordPrefetchHit(query) {
    const commonQuery = Array.from(this.commonQueries.values())
      .find(q => q.query.toLowerCase() === query.toLowerCase())
    
    if (commonQuery) {
      commonQuery.hitCount = (commonQuery.hitCount || 0) + 1
    }
  }

  /**
   * Enable/disable prefetching
   */
  setEnabled(enabled) {
    this.isEnabled = enabled
    
    if (enabled) {
      this.startBackgroundPrefetching()
    } else {
      this.activePrefetches.clear()
    }
  }

  /**
   * Clear prefetch queue and patterns
   */
  clear() {
    this.prefetchQueue.clear()
    this.userPatterns.clear()
    this.queryHistory = []
    this.activePrefetches.clear()
  }
}

let prefetchManager = null

/**
 * Get or create prefetch manager instance
 */
export function getPrefetchManager() {
  if (!prefetchManager) {
    prefetchManager = new AIPrefetchManager()
    prefetchManager.startBackgroundPrefetching()
  }
  return prefetchManager
}

export default getPrefetchManager()