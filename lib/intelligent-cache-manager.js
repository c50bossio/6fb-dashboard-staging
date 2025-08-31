/**
 * Intelligent AI Response Cache Manager
 * Advanced caching with predictive prefetching, context-aware TTL, and cost optimization
 */

export class IntelligentCacheManager {
  constructor() {
    this.dbName = 'intelligent_ai_cache'
    this.dbVersion = 2
    this.storeName = 'responses'
    this.metaStoreName = 'cache_metadata'
    this.db = null
    this.defaultTTL = 30 * 60 * 1000 // 30 minutes
    this.maxCacheSize = 150 * 1024 * 1024 // 150MB
    this.costThreshold = 0.01 // Cache responses that cost more than 1 cent
    this.hitRateTarget = 0.6 // Target 60% cache hit rate
    
    // Predictive caching patterns
    this.accessPatterns = new Map()
    this.userPreferences = new Map()
    this.seasonalPatterns = new Map()
    
    // Cost optimization tracking
    this.costSavings = 0
    this.totalRequests = 0
    this.cacheHits = 0
    
    // Context-aware TTL rules
    this.ttlRules = new Map([
      ['realtime_data', 5 * 60 * 1000], // 5 minutes for real-time data
      ['business_metrics', 15 * 60 * 1000], // 15 minutes for business metrics  
      ['general_advice', 60 * 60 * 1000], // 1 hour for general advice
      ['analytical_insights', 45 * 60 * 1000], // 45 minutes for analysis
      ['recommendations', 2 * 60 * 60 * 1000], // 2 hours for recommendations
      ['static_content', 24 * 60 * 60 * 1000] // 24 hours for static content
    ])
  }

  /**
   * Initialize enhanced IndexedDB with metadata store
   */
  async init() {
    if (this.db) return this.db

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion)
      
      request.onerror = () => {
        console.error('Failed to open IndexedDB:', request.error)
        reject(request.error)
      }
      
      request.onsuccess = () => {
        this.db = request.result
        this.loadMetadata()
        resolve(this.db)
      }
      
      request.onupgradeneeded = (event) => {
        const db = event.target.result
        
        // Main responses store
        if (!db.objectStoreNames.contains(this.storeName)) {
          const responseStore = db.createObjectStore(this.storeName, { keyPath: 'key' })
          
          responseStore.createIndex('timestamp', 'timestamp', { unique: false })
          responseStore.createIndex('expiry', 'expiry', { unique: false })
          responseStore.createIndex('lastAccessed', 'lastAccessed', { unique: false })
          responseStore.createIndex('userId', 'userId', { unique: false })
          responseStore.createIndex('messageType', 'messageType', { unique: false })
          responseStore.createIndex('cost', 'cost', { unique: false })
          responseStore.createIndex('accessCount', 'accessCount', { unique: false })
          responseStore.createIndex('contextHash', 'contextHash', { unique: false })
        }
        
        // Metadata store for analytics and optimization
        if (!db.objectStoreNames.contains(this.metaStoreName)) {
          const metaStore = db.createObjectStore(this.metaStoreName, { keyPath: 'id' })
          metaStore.createIndex('type', 'type', { unique: false })
          metaStore.createIndex('timestamp', 'timestamp', { unique: false })
        }
      }
    })
  }

  /**
   * Enhanced cache key generation with semantic understanding
   */
  generateIntelligentCacheKey(message, messageType, context = {}) {
    const normalized = this.normalizeForCaching(message, messageType, context)
    const semanticSignature = this.generateSemanticSignature(normalized)
    return this.hashString(JSON.stringify(semanticSignature))
  }

  /**
   * Normalize message for semantic similarity detection
   */
  normalizeForCaching(message, messageType, context) {
    // Remove time-sensitive elements for better cache hits
    const timePattern = /\b(today|yesterday|this week|this month|last week|last month|current|recent)\b/gi
    const normalizedMessage = message
      .toLowerCase()
      .replace(timePattern, '[TIME_REFERENCE]')
      .replace(/\d{4}-\d{2}-\d{2}/, '[DATE]') // Replace specific dates
      .replace(/\$[\d,]+\.?\d*/, '[AMOUNT]') // Replace specific amounts
      .trim()

    return {
      message: normalizedMessage,
      messageType: messageType || 'general',
      userId: context.userId || 'anonymous',
      barbershopId: context.barbershopId || context.barbershop_id || 'default',
      businessContext: this.extractBusinessContext(context)
    }
  }

  /**
   * Extract relevant business context for caching
   */
  extractBusinessContext(context) {
    return {
      shopSize: context.staff_count > 10 ? 'large' : context.staff_count > 3 ? 'medium' : 'small',
      businessType: context.business_type || 'barbershop',
      location: context.location ? 'set' : 'unset'
    }
  }

  /**
   * Generate semantic signature for better cache matching
   */
  generateSemanticSignature(normalized) {
    const keywords = this.extractKeywords(normalized.message)
    return {
      ...normalized,
      keywords: keywords.sort(), // Sorted for consistency
      intent: this.classifyIntent(normalized.message),
      complexity: this.assessComplexity(normalized.message)
    }
  }

  /**
   * Extract meaningful keywords from message
   */
  extractKeywords(message) {
    const stopWords = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'how', 'what', 'why', 'when', 'where', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'can', 'may', 'might'])
    
    return message
      .split(/\W+/)
      .filter(word => word.length > 2 && !stopWords.has(word))
      .slice(0, 10) // Limit to top 10 keywords
  }

  /**
   * Classify user intent for better caching
   */
  classifyIntent(message) {
    if (/\b(revenue|profit|financial|money|sales|income)\b/.test(message)) {
      return 'financial_query'
    } else if (/\b(booking|appointment|schedule|calendar)\b/.test(message)) {
      return 'scheduling_query'
    } else if (/\b(staff|employee|barber|team)\b/.test(message)) {
      return 'staff_query'
    } else if (/\b(customer|client|satisfaction|feedback)\b/.test(message)) {
      return 'customer_query'
    } else if (/\b(marketing|promotion|advertising|growth)\b/.test(message)) {
      return 'marketing_query'
    }
    return 'general_query'
  }

  /**
   * Assess query complexity for TTL optimization
   */
  assessComplexity(message) {
    const complexityIndicators = [
      /\banalyz/i, /\bcompare/i, /\bforecast/i, /\bpredict/i,
      /\boptimize/i, /\bstrateg/i, /\btrend/i, /\binsight/i
    ]
    
    const matches = complexityIndicators.filter(pattern => pattern.test(message))
    
    if (matches.length >= 3) return 'high'
    if (matches.length >= 1) return 'medium'
    return 'low'
  }

  /**
   * Intelligent cache retrieval with fuzzy matching
   */
  async getIntelligentCache(message, messageType, context = {}) {
    try {
      await this.init()
      
      // Try exact match first
      const exactKey = this.generateIntelligentCacheKey(message, messageType, context)
      let result = await this.getExactCacheMatch(exactKey)
      
      if (result) {
        this.recordCacheHit(exactKey, 'exact')
        return result
      }
      
      // Try semantic similarity matching
      result = await this.findSemanticMatch(message, messageType, context)
      
      if (result) {
        this.recordCacheHit(result.key, 'semantic')
        return result
      }
      
      this.recordCacheMiss(message, messageType, context)
      return null
      
    } catch (error) {
      console.warn('Intelligent cache retrieval error:', error)
      return null
    }
  }

  /**
   * Get exact cache match
   */
  async getExactCacheMatch(key) {
    const transaction = this.db.transaction([this.storeName], 'readonly')
    const store = transaction.objectStore(this.storeName)
    const request = store.get(key)
    
    return new Promise((resolve) => {
      request.onsuccess = () => {
        const result = request.result
        
        if (!result) {
          resolve(null)
          return
        }
        
        if (Date.now() > result.expiry) {
          this.deleteExpiredResponse(key)
          resolve(null)
          return
        }
        
        // Update access patterns
        this.updateAccessCount(key)
        
        resolve({
          response: result.response,
          provider: result.provider,
          model: result.model,
          timestamp: result.timestamp,
          fromCache: true,
          cacheType: 'exact',
          accessCount: result.accessCount + 1,
          costSaved: result.originalCost || 0
        })
      }
      
      request.onerror = () => resolve(null)
    })
  }

  /**
   * Find semantically similar cached responses
   */
  async findSemanticMatch(message, messageType, context) {
    const transaction = this.db.transaction([this.storeName], 'readonly')
    const store = transaction.objectStore(this.storeName)
    const messageTypeIndex = store.index('messageType')
    const request = messageTypeIndex.getAll(messageType)
    
    return new Promise((resolve) => {
      request.onsuccess = () => {
        const results = request.result
        const now = Date.now()
        
        // Filter valid (non-expired) entries
        const validResults = results.filter(entry => entry.expiry > now)
        
        if (validResults.length === 0) {
          resolve(null)
          return
        }
        
        // Find best semantic match
        const targetSignature = this.generateSemanticSignature(
          this.normalizeForCaching(message, messageType, context)
        )
        
        let bestMatch = null
        let bestScore = 0
        
        for (const entry of validResults) {
          if (!entry.semanticSignature) continue
          
          const score = this.calculateSemanticSimilarity(targetSignature, entry.semanticSignature)
          
          if (score > bestScore && score > 0.75) { // 75% similarity threshold
            bestMatch = entry
            bestScore = score
          }
        }
        
        if (bestMatch) {
          this.updateAccessCount(bestMatch.key)
          resolve({
            response: bestMatch.response,
            provider: bestMatch.provider,
            model: bestMatch.model,
            timestamp: bestMatch.timestamp,
            fromCache: true,
            cacheType: 'semantic',
            similarityScore: bestScore,
            accessCount: bestMatch.accessCount + 1,
            costSaved: bestMatch.originalCost || 0,
            key: bestMatch.key
          })
        } else {
          resolve(null)
        }
      }
      
      request.onerror = () => resolve(null)
    })
  }

  /**
   * Calculate semantic similarity between signatures
   */
  calculateSemanticSimilarity(sig1, sig2) {
    // Intent match weight: 40%
    const intentMatch = sig1.intent === sig2.intent ? 0.4 : 0

    // Keyword overlap weight: 40%
    const keywordOverlap = this.calculateKeywordOverlap(sig1.keywords, sig2.keywords) * 0.4

    // Context similarity weight: 20%
    const contextSimilarity = this.calculateContextSimilarity(sig1.businessContext, sig2.businessContext) * 0.2

    return intentMatch + keywordOverlap + contextSimilarity
  }

  /**
   * Calculate keyword overlap ratio
   */
  calculateKeywordOverlap(keywords1, keywords2) {
    if (keywords1.length === 0 || keywords2.length === 0) return 0
    
    const set1 = new Set(keywords1)
    const set2 = new Set(keywords2)
    const intersection = new Set([...set1].filter(x => set2.has(x)))
    const union = new Set([...set1, ...set2])
    
    return intersection.size / union.size
  }

  /**
   * Calculate context similarity
   */
  calculateContextSimilarity(ctx1, ctx2) {
    let matches = 0
    let total = 0
    
    for (const key in ctx1) {
      total++
      if (ctx1[key] === ctx2[key]) {
        matches++
      }
    }
    
    return total > 0 ? matches / total : 1
  }

  /**
   * Enhanced cache storage with predictive prefetching
   */
  async cacheIntelligentResponse(message, messageType, response, context = {}, options = {}) {
    try {
      await this.init()
      
      const {
        provider = 'unknown',
        model = 'unknown',
        cost = 0,
        responseTime = 0,
        quality = 'medium'
      } = options

      // Only cache responses worth caching
      if (!this.shouldCache(response, cost, quality)) {
        return false
      }

      const key = this.generateIntelligentCacheKey(message, messageType, context)
      const now = Date.now()
      const ttl = this.calculateIntelligentTTL(message, messageType, context, response)
      
      const semanticSignature = this.generateSemanticSignature(
        this.normalizeForCaching(message, messageType, context)
      )

      const cacheEntry = {
        key,
        contextHash: this.hashString(JSON.stringify(context)),
        message: message.trim(),
        messageType: messageType || 'general',
        response,
        provider,
        model,
        originalCost: cost,
        responseTime,
        quality,
        userId: context.userId || 'anonymous',
        barbershopId: context.barbershopId || context.barbershop_id || 'default',
        semanticSignature,
        timestamp: now,
        lastAccessed: now,
        accessCount: 0,
        expiry: now + ttl,
        size: this.calculateSize(response),
        cacheReason: this.determineCacheReason(cost, quality, messageType)
      }
      
      await this.ensureCacheSpace(cacheEntry.size)
      
      const transaction = this.db.transaction([this.storeName], 'readwrite')
      const store = transaction.objectStore(this.storeName)
      
      return new Promise((resolve) => {
        const request = store.put(cacheEntry)
        
        request.onsuccess = () => {
          // Update access patterns for predictive caching
          this.updateAccessPatterns(messageType, context)
          
          // Trigger predictive prefetching if conditions are met
          this.considerPredictivePrefetch(message, messageType, context)
          
          resolve(true)
        }
        
        request.onerror = () => {
          console.warn('Intelligent cache write error:', request.error)
          resolve(false)
        }
      })
      
    } catch (error) {
      console.warn('Intelligent cache storage error:', error)
      return false
    }
  }

  /**
   * Determine if response should be cached
   */
  shouldCache(response, cost, quality) {
    // Cache high-cost responses
    if (cost > this.costThreshold) return true
    
    // Cache high-quality responses
    if (quality === 'high') return true
    
    // Cache substantial responses
    if (response.length > 200) return true
    
    // Skip caching error responses or very short responses
    if (response.length < 50 || response.toLowerCase().includes('error')) return false
    
    return true
  }

  /**
   * Calculate intelligent TTL based on content and context
   */
  calculateIntelligentTTL(message, messageType, context, response) {
    // Start with base TTL for message type
    let ttl = this.ttlRules.get(this.classifyContentType(response)) || this.defaultTTL
    
    // Adjust based on content freshness requirements
    if (this.containsTimeReference(message)) {
      ttl = Math.min(ttl, 10 * 60 * 1000) // Max 10 minutes for time-sensitive queries
    }
    
    // Adjust based on response specificity
    if (this.isHighlySpecific(response)) {
      ttl *= 0.5 // Reduce TTL for specific responses
    }
    
    // Adjust based on user behavior patterns
    const userPattern = this.accessPatterns.get(context.userId)
    if (userPattern && userPattern.averageQueryInterval < ttl) {
      ttl = Math.max(ttl * 0.7, userPattern.averageQueryInterval * 1.5)
    }
    
    return Math.max(5 * 60 * 1000, Math.min(ttl, 24 * 60 * 60 * 1000)) // Min 5 minutes, max 24 hours
  }

  /**
   * Classify content type for TTL rules
   */
  classifyContentType(response) {
    const lowerResponse = response.toLowerCase()
    
    if (lowerResponse.includes('current') || lowerResponse.includes('today') || lowerResponse.includes('now')) {
      return 'realtime_data'
    } else if (lowerResponse.includes('revenue') || lowerResponse.includes('sales') || lowerResponse.includes('profit')) {
      return 'business_metrics'
    } else if (lowerResponse.includes('recommend') || lowerResponse.includes('suggest') || lowerResponse.includes('should')) {
      return 'recommendations'
    } else if (lowerResponse.includes('analysis') || lowerResponse.includes('insight') || lowerResponse.includes('trend')) {
      return 'analytical_insights'
    }
    
    return 'general_advice'
  }

  /**
   * Check if message contains time references
   */
  containsTimeReference(message) {
    const timePatterns = [
      /\b(today|yesterday|tomorrow)\b/i,
      /\b(this|last|next)\s+(week|month|year|quarter)\b/i,
      /\b(current|recent|latest)\b/i,
      /\d{4}-\d{2}-\d{2}/,
      /\d{1,2}\/\d{1,2}\/\d{4}/
    ]
    
    return timePatterns.some(pattern => pattern.test(message))
  }

  /**
   * Check if response is highly specific
   */
  isHighlySpecific(response) {
    const specificIndicators = [
      /\$[\d,]+\.?\d*/, // Specific dollar amounts
      /\d+%/, // Specific percentages
      /\b\d{1,2}\/\d{1,2}\/\d{4}\b/, // Specific dates
      /\b(exactly|specifically|precisely)\b/i
    ]
    
    return specificIndicators.some(pattern => pattern.test(response))
  }

  /**
   * Update access patterns for predictive caching
   */
  updateAccessPatterns(messageType, context) {
    const userId = context.userId || 'anonymous'
    const now = Date.now()
    
    if (!this.accessPatterns.has(userId)) {
      this.accessPatterns.set(userId, {
        messageTypes: new Map(),
        lastAccess: now,
        queryCount: 0,
        averageQueryInterval: 0,
        preferredTimes: []
      })
    }
    
    const pattern = this.accessPatterns.get(userId)
    
    // Update message type frequency
    const typeCount = pattern.messageTypes.get(messageType) || 0
    pattern.messageTypes.set(messageType, typeCount + 1)
    
    // Update timing patterns
    if (pattern.lastAccess) {
      const interval = now - pattern.lastAccess
      pattern.averageQueryInterval = (pattern.averageQueryInterval + interval) / 2
    }
    
    pattern.lastAccess = now
    pattern.queryCount++
    
    // Track preferred access times
    const hour = new Date(now).getHours()
    pattern.preferredTimes.push(hour)
    if (pattern.preferredTimes.length > 50) {
      pattern.preferredTimes = pattern.preferredTimes.slice(-50) // Keep last 50 access times
    }
  }

  /**
   * Consider predictive prefetching
   */
  considerPredictivePrefetch(message, messageType, context) {
    const userId = context.userId || 'anonymous'
    const pattern = this.accessPatterns.get(userId)
    
    if (!pattern || pattern.queryCount < 10) return // Need sufficient history
    
    // Find commonly asked follow-up questions
    const followUpQuestions = this.predictFollowUpQuestions(messageType, message)
    
    if (followUpQuestions.length > 0) {
      // Delay prefetching to avoid blocking current request
      setTimeout(() => {
        this.prefetchLikelyQuestions(followUpQuestions, context)
      }, 1000)
    }
  }

  /**
   * Predict likely follow-up questions
   */
  predictFollowUpQuestions(messageType, message) {
    const followUpMap = {
      'financial_query': [
        'How can I improve my revenue?',
        'What are my biggest expenses?',
        'Show me profit trends'
      ],
      'scheduling_query': [
        'How to reduce no-shows?',
        'What are my peak hours?',
        'Staff scheduling optimization'
      ],
      'customer_query': [
        'How to improve customer retention?',
        'Customer satisfaction strategies',
        'Loyalty program ideas'
      ],
      'marketing_query': [
        'Social media best practices',
        'Local marketing strategies',
        'Customer acquisition cost'
      ]
    }
    
    const intent = this.classifyIntent(message)
    return followUpMap[intent] || []
  }

  /**
   * Prefetch likely questions
   */
  async prefetchLikelyQuestions(questions, context) {
    // This would integrate with the AI provider to prefetch responses
    // For now, just log the intent
    console.log('Prefetching likely questions:', questions)
  }

  /**
   * Enhanced cache statistics with cost analysis
   */
  async getIntelligentCacheStats() {
    try {
      await this.init()
      
      const transaction = this.db.transaction([this.storeName], 'readonly')
      const store = transaction.objectStore(this.storeName)
      const request = store.getAll()
      
      return new Promise((resolve) => {
        request.onsuccess = () => {
          const entries = request.result
          const now = Date.now()
          
          const stats = {
            totalEntries: entries.length,
            validEntries: entries.filter(e => e.expiry >= now).length,
            expiredEntries: entries.filter(e => e.expiry < now).length,
            totalSize: entries.reduce((sum, e) => sum + (e.size || 0), 0),
            
            // Cost analysis
            totalCostSaved: entries.reduce((sum, e) => sum + (e.originalCost || 0) * (e.accessCount || 0), 0),
            avgCostPerResponse: entries.reduce((sum, e) => sum + (e.originalCost || 0), 0) / entries.length,
            
            // Access patterns
            totalAccesses: entries.reduce((sum, e) => sum + (e.accessCount || 0), 0),
            avgAccessCount: entries.reduce((sum, e) => sum + (e.accessCount || 0), 0) / entries.length,
            
            // Cache efficiency
            hitRate: this.totalRequests > 0 ? this.cacheHits / this.totalRequests : 0,
            
            // Quality distribution
            qualityDistribution: this.analyzeQualityDistribution(entries),
            
            // Message type distribution
            messageTypeDistribution: this.analyzeMessageTypeDistribution(entries),
            
            // Provider usage
            providerUsage: this.analyzeProviderUsage(entries),
            
            // Performance metrics
            performanceMetrics: {
              avgResponseTime: entries.reduce((sum, e) => sum + (e.responseTime || 0), 0) / entries.length,
              cacheSpaceUtilization: (this.getTotalSize(entries) / this.maxCacheSize) * 100
            }
          }
          
          resolve(stats)
        }
        
        request.onerror = () => {
          resolve({
            error: 'Failed to generate cache statistics',
            totalEntries: 0,
            costSaved: 0,
            hitRate: 0
          })
        }
      })
    } catch (error) {
      console.warn('Cache stats error:', error)
      return null
    }
  }

  /**
   * Record cache hit for analytics
   */
  recordCacheHit(key, type) {
    this.cacheHits++
    this.totalRequests++
  }

  /**
   * Record cache miss for analytics
   */
  recordCacheMiss(message, messageType, context) {
    this.totalRequests++
  }

  /**
   * Helper methods for statistics
   */
  analyzeQualityDistribution(entries) {
    const distribution = { high: 0, medium: 0, low: 0 }
    entries.forEach(entry => {
      const quality = entry.quality || 'medium'
      distribution[quality] = (distribution[quality] || 0) + 1
    })
    return distribution
  }

  analyzeMessageTypeDistribution(entries) {
    const distribution = {}
    entries.forEach(entry => {
      const type = entry.messageType || 'unknown'
      distribution[type] = (distribution[type] || 0) + 1
    })
    return distribution
  }

  analyzeProviderUsage(entries) {
    const usage = {}
    entries.forEach(entry => {
      const provider = entry.provider || 'unknown'
      usage[provider] = (usage[provider] || 0) + 1
    })
    return usage
  }

  getTotalSize(entries) {
    return entries.reduce((sum, entry) => sum + (entry.size || 0), 0)
  }

  /**
   * Utility methods
   */
  hashString(str) {
    let hash = 0
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36)
  }

  calculateSize(response) {
    return new Blob([JSON.stringify(response)]).size
  }

  determineCacheReason(cost, quality, messageType) {
    if (cost > this.costThreshold) return 'high_cost'
    if (quality === 'high') return 'high_quality'
    if (['business_metrics', 'analytical_insights'].includes(messageType)) return 'complex_analysis'
    return 'standard'
  }
}

// Export singleton instance
let intelligentCacheManager = null

export function getIntelligentCacheManager() {
  if (!intelligentCacheManager) {
    intelligentCacheManager = new IntelligentCacheManager()
  }
  return intelligentCacheManager
}

export default getIntelligentCacheManager()