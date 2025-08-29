/**
 * Context-Aware Cache Manager
 * Intelligent caching system that understands business context and relationships
 * Optimized for barbershop management system with role-based data access
 */

class ContextAwareCache {
  constructor() {
    this.cache = new Map()
    this.metadata = new Map() // Stores cache metadata (ttl, dependencies, etc.)
    
    // Cache configuration by data type and context
    this.cacheConfig = {
      // Static/slow-changing data
      barbershops: { ttl: 30 * 60 * 1000, priority: 'high' }, // 30 minutes
      staff: { ttl: 10 * 60 * 1000, priority: 'high' }, // 10 minutes
      services: { ttl: 15 * 60 * 1000, priority: 'medium' }, // 15 minutes
      
      // Dynamic data
      appointments: { ttl: 2 * 60 * 1000, priority: 'high' }, // 2 minutes
      availability: { ttl: 1 * 60 * 1000, priority: 'medium' }, // 1 minute
      
      // Analytics and computed data
      analytics: { ttl: 5 * 60 * 1000, priority: 'low' }, // 5 minutes
      metrics: { ttl: 3 * 60 * 1000, priority: 'low' }, // 3 minutes
      
      // Context-specific data
      contextualData: { ttl: 2 * 60 * 1000, priority: 'high' }, // 2 minutes
    }
    
    // Data relationships for smart invalidation
    this.dependencies = {
      staff: ['contextualData', 'appointments', 'availability'],
      barbershops: ['contextualData', 'staff'],
      appointments: ['analytics', 'metrics'],
      services: ['appointments', 'analytics']
    }
  }

  /**
   * Generate context-aware cache key
   * @param {string} dataType - Type of data being cached
   * @param {Object} context - Current context information
   * @param {Object} params - Additional parameters
   * @returns {string} Unique cache key
   */
  generateCacheKey(dataType, context, params = {}) {
    const keyParts = [
      dataType,
      context?.locationId || 'no-location',
      context?.contextType || 'no-type', 
      context?.userId || 'no-user',
      context?.role || 'no-role'
    ]
    
    // Add parameter-based key parts
    if (params.timeRange) {
      keyParts.push(`${params.timeRange.start}-${params.timeRange.end}`)
    }
    
    if (params.filters) {
      keyParts.push(JSON.stringify(params.filters))
    }
    
    return keyParts.join(':')
  }

  /**
   * Get cached data with context awareness
   * @param {string} dataType - Type of data
   * @param {Object} context - Current context
   * @param {Object} params - Additional parameters
   * @returns {Object|null} Cached data or null if not found/expired
   */
  get(dataType, context, params = {}) {
    const key = this.generateCacheKey(dataType, context, params)
    const cached = this.cache.get(key)
    const meta = this.metadata.get(key)
    
    if (!cached || !meta) {
      return null
    }
    
    // Check if expired
    if (Date.now() > meta.expiresAt) {
      this.cache.delete(key)
      this.metadata.delete(key)
      return null
    }
    
    // Update access time for LRU logic
    meta.lastAccessed = Date.now()
    meta.accessCount = (meta.accessCount || 0) + 1
    
    console.log(`🎯 Cache HIT: ${key} (${meta.accessCount} accesses)`)
    return cached
  }

  /**
   * Store data in context-aware cache
   * @param {string} dataType - Type of data
   * @param {Object} context - Current context
   * @param {any} data - Data to cache
   * @param {Object} params - Additional parameters
   */
  set(dataType, context, data, params = {}) {
    const key = this.generateCacheKey(dataType, context, params)
    const config = this.cacheConfig[dataType] || { ttl: 5 * 60 * 1000, priority: 'medium' }
    
    // Store the data
    this.cache.set(key, data)
    
    // Store metadata
    this.metadata.set(key, {
      dataType,
      context: { ...context },
      params: { ...params },
      cachedAt: Date.now(),
      expiresAt: Date.now() + config.ttl,
      lastAccessed: Date.now(),
      accessCount: 1,
      priority: config.priority,
      dependencies: this.dependencies[dataType] || []
    })
    
    console.log(`💾 Cache SET: ${key} (TTL: ${config.ttl}ms)`)
    
    // Clean up old entries if cache is getting large
    if (this.cache.size > 100) {
      this.cleanup()
    }
  }

  /**
   * Invalidate cache entries based on data type and relationships
   * @param {string} dataType - Type of data that changed
   * @param {Object} context - Context of the change
   */
  invalidate(dataType, context = {}) {
    const keysToDelete = []
    
    // Find all keys that should be invalidated
    for (const [key, meta] of this.metadata.entries()) {
      // Direct match - invalidate exact data type
      if (meta.dataType === dataType) {
        // Context-specific invalidation
        if (context.locationId && meta.context.locationId !== context.locationId) {
          continue // Different location, don't invalidate
        }
        
        keysToDelete.push(key)
        continue
      }
      
      // Dependency-based invalidation
      if (meta.dependencies.includes(dataType)) {
        // Check if context overlap requires invalidation
        if (this.shouldInvalidateByContext(meta.context, context)) {
          keysToDelete.push(key)
        }
      }
    }
    
    // Delete identified keys
    keysToDelete.forEach(key => {
      this.cache.delete(key)
      this.metadata.delete(key)
      console.log(`🗑️ Cache INVALIDATED: ${key}`)
    })
    
    console.log(`🔄 Invalidated ${keysToDelete.length} cache entries for ${dataType}`)
  }

  /**
   * Check if cache entry should be invalidated based on context overlap
   * @param {Object} cachedContext - Context of cached data
   * @param {Object} changeContext - Context of the change
   * @returns {boolean} Whether to invalidate
   */
  shouldInvalidateByContext(cachedContext, changeContext) {
    // If no change context provided, invalidate everything
    if (!changeContext.locationId && !changeContext.userId) {
      return true
    }
    
    // Location-based invalidation
    if (changeContext.locationId && cachedContext.locationId === changeContext.locationId) {
      return true
    }
    
    // User-based invalidation (for personal data)
    if (changeContext.userId && cachedContext.userId === changeContext.userId) {
      return true
    }
    
    return false
  }

  /**
   * Preload likely next contexts based on user behavior
   * @param {Object} currentContext - Current active context
   * @param {Function} dataLoader - Function to load data
   */
  async preloadPredictedContexts(currentContext, dataLoader) {
    const predictions = this.getPredictedContexts(currentContext)
    
    for (const predictedContext of predictions) {
      // Only preload if not already cached
      const key = this.generateCacheKey('contextualData', predictedContext)
      if (!this.cache.has(key)) {
        try {
          console.log(`🔮 Preloading context: ${predictedContext.displayName}`)
          const data = await dataLoader(predictedContext)
          this.set('contextualData', predictedContext, data)
        } catch (error) {
          console.warn(`⚠️ Preload failed for ${predictedContext.displayName}:`, error)
        }
      }
    }
  }

  /**
   * Get predicted next contexts based on current context and usage patterns
   * @param {Object} currentContext - Current active context
   * @returns {Array} Array of predicted contexts
   */
  getPredictedContexts(currentContext) {
    const predictions = []
    
    // Same location, different context types
    if (currentContext.contextType === 'executive') {
      // Executive users likely to switch to manager view
      predictions.push({
        ...currentContext,
        contextType: 'manager',
        displayName: `${currentContext.locationName} - Manager Dashboard`,
        primaryView: 'shop-calendar'
      })
    } else if (currentContext.contextType === 'manager') {
      // Managers likely to check personal schedule or executive overview
      predictions.push(
        {
          ...currentContext,
          contextType: 'personal',
          displayName: `${currentContext.locationName} - My Schedule`,
          primaryView: 'my-schedule'
        },
        {
          ...currentContext,
          contextType: 'executive',
          displayName: `${currentContext.locationName} - Executive Dashboard`,
          primaryView: 'analytics'
        }
      )
    }
    
    return predictions.slice(0, 2) // Limit predictions to avoid over-preloading
  }

  /**
   * Clean up expired and least-used cache entries
   */
  cleanup() {
    const now = Date.now()
    const entriesToDelete = []
    
    // Find expired and least used entries
    for (const [key, meta] of this.metadata.entries()) {
      // Remove expired entries
      if (now > meta.expiresAt) {
        entriesToDelete.push({ key, reason: 'expired' })
        continue
      }
      
      // Remove least accessed low-priority items if cache is full
      if (this.cache.size > 80 && meta.priority === 'low' && meta.accessCount < 2) {
        entriesToDelete.push({ key, reason: 'low-usage' })
      }
    }
    
    // Sort by least recently accessed for final cleanup
    const sortedEntries = Array.from(this.metadata.entries())
      .sort(([,a], [,b]) => a.lastAccessed - b.lastAccessed)
    
    // Remove oldest entries if still over limit
    const overLimit = this.cache.size - 50 // Target size
    if (overLimit > 0) {
      for (let i = 0; i < Math.min(overLimit, sortedEntries.length); i++) {
        const [key] = sortedEntries[i]
        if (!entriesToDelete.find(e => e.key === key)) {
          entriesToDelete.push({ key, reason: 'lru' })
        }
      }
    }
    
    // Delete identified entries
    entriesToDelete.forEach(({ key, reason }) => {
      this.cache.delete(key)
      this.metadata.delete(key)
      console.log(`🧹 Cache CLEANUP: ${key} (${reason})`)
    })
    
    if (entriesToDelete.length > 0) {
      console.log(`🧹 Cleaned up ${entriesToDelete.length} cache entries`)
    }
  }

  /**
   * Get cache statistics for monitoring
   * @returns {Object} Cache statistics
   */
  getStats() {
    const stats = {
      size: this.cache.size,
      hitRate: 0,
      typeBreakdown: {},
      priorities: { high: 0, medium: 0, low: 0 }
    }
    
    let totalAccesses = 0
    
    for (const [key, meta] of this.metadata.entries()) {
      // Type breakdown
      stats.typeBreakdown[meta.dataType] = (stats.typeBreakdown[meta.dataType] || 0) + 1
      
      // Priority breakdown
      stats.priorities[meta.priority] = (stats.priorities[meta.priority] || 0) + 1
      
      // Hit rate calculation
      totalAccesses += meta.accessCount || 0
    }
    
    // Simple hit rate estimate (entries with multiple accesses)
    const multiAccessEntries = Array.from(this.metadata.values()).filter(m => m.accessCount > 1).length
    stats.hitRate = this.cache.size > 0 ? (multiAccessEntries / this.cache.size) * 100 : 0
    
    return stats
  }

  /**
   * Clear all cache entries
   */
  clear() {
    this.cache.clear()
    this.metadata.clear()
    console.log('🗑️ Cache cleared')
  }
}

// Export singleton instance
export default new ContextAwareCache()