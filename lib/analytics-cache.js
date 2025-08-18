/**
 * Intelligent Analytics Cache System
 * Provides smart caching for expensive analytics queries with automatic invalidation
 */

class AnalyticsCache {
  constructor() {
    this.cache = new Map()
    this.cacheTimestamps = new Map()
    this.cacheHits = 0
    this.cacheMisses = 0
    
    this.config = {
      defaultTTL: 5 * 60 * 1000, // 5 minutes for general analytics
      revenueTTL: 2 * 60 * 1000,  // 2 minutes for revenue data (more critical)
      customerTTL: 10 * 60 * 1000, // 10 minutes for customer data (changes less)
      predictiveTTL: 30 * 60 * 1000, // 30 minutes for AI predictions (expensive)
      maxCacheSize: 100, // Maximum number of cached items
    }
    
    this.startCleanupInterval()
  }

  /**
   * Generate cache key from parameters
   */
  generateKey(type, params = {}) {
    const sortedParams = Object.keys(params)
      .sort()
      .reduce((result, key) => {
        result[key] = params[key]
        return result
      }, {})
    
    return `${type}:${JSON.stringify(sortedParams)}`
  }

  /**
   * Get TTL based on data type
   */
  getTTL(type) {
    if (type.includes('revenue')) return this.config.revenueTTL
    if (type.includes('customer')) return this.config.customerTTL
    if (type.includes('predictive') || type.includes('forecast')) return this.config.predictiveTTL
    return this.config.defaultTTL
  }

  /**
   * Check if cache entry is expired
   */
  isExpired(key) {
    const timestamp = this.cacheTimestamps.get(key)
    if (!timestamp) return true
    
    const ttl = this.getTTL(key.split(':')[0])
    return Date.now() - timestamp > ttl
  }

  /**
   * Get cached data if available and not expired
   */
  get(type, params = {}) {
    const key = this.generateKey(type, params)
    
    if (this.cache.has(key) && !this.isExpired(key)) {
      this.cacheHits++
      const data = this.cache.get(key)
      
      console.log('📈 Cache HIT:', {
        key: key.substring(0, 50) + '...',
        age: Math.round((Date.now() - this.cacheTimestamps.get(key)) / 1000) + 's',
        hitRate: this.getHitRate()
      })
      
      return {
        data,
        cached: true,
        timestamp: this.cacheTimestamps.get(key),
        age: Date.now() - this.cacheTimestamps.get(key)
      }
    }
    
    this.cacheMisses++
    return null
  }

  /**
   * Set cached data
   */
  set(type, params = {}, data) {
    const key = this.generateKey(type, params)
    
    if (this.cache.size >= this.config.maxCacheSize) {
      this.evictOldest()
    }
    
    this.cache.set(key, data)
    this.cacheTimestamps.set(key, Date.now())
    
      key: key.substring(0, 50) + '...',
      size: this.cache.size,
      ttl: Math.round(this.getTTL(type) / 1000) + 's'
    })
  }

  /**
   * Invalidate cache entries by type or pattern
   */
  invalidate(typeOrPattern) {
    let invalidated = 0
    
    for (const [key] of this.cache) {
      if (key.startsWith(typeOrPattern)) {
        this.cache.delete(key)
        this.cacheTimestamps.delete(key)
        invalidated++
      }
    }
    
    if (invalidated > 0) {
    }
    
    return invalidated
  }

  /**
   * Evict oldest cache entry
   */
  evictOldest() {
    let oldestKey = null
    let oldestTime = Date.now()
    
    for (const [key, timestamp] of this.cacheTimestamps) {
      if (timestamp < oldestTime) {
        oldestTime = timestamp
        oldestKey = key
      }
    }
    
    if (oldestKey) {
      this.cache.delete(oldestKey)
      this.cacheTimestamps.delete(oldestKey)
    }
  }

  /**
   * Clean up expired entries
   */
  cleanup() {
    let cleanedUp = 0
    const now = Date.now()
    
    for (const [key, timestamp] of this.cacheTimestamps) {
      if (this.isExpired(key)) {
        this.cache.delete(key)
        this.cacheTimestamps.delete(key)
        cleanedUp++
      }
    }
    
    if (cleanedUp > 0) {
    }
    
    return cleanedUp
  }

  /**
   * Start automatic cleanup interval
   */
  startCleanupInterval() {
    setInterval(() => {
      this.cleanup()
    }, 2 * 60 * 1000)
  }

  /**
   * Get cache hit rate
   */
  getHitRate() {
    const total = this.cacheHits + this.cacheMisses
    return total > 0 ? Math.round((this.cacheHits / total) * 100) : 0
  }

  /**
   * Get cache statistics
   */
  getStats() {
    return {
      size: this.cache.size,
      hits: this.cacheHits,
      misses: this.cacheMisses,
      hitRate: this.getHitRate() + '%',
      maxSize: this.config.maxCacheSize,
      types: Array.from(this.cache.keys()).map(key => key.split(':')[0])
    }
  }

  /**
   * Clear all cache
   */
  clear() {
    const size = this.cache.size
    this.cache.clear()
    this.cacheTimestamps.clear()
  }
}

const analyticsCache = new AnalyticsCache()

/**
 * Wrapper function for caching analytics queries
 */
export async function cacheQuery(type, params, queryFunction) {
  try {
    const cached = analyticsCache.get(type, params)
    if (cached) {
      return {
        ...cached.data,
        _cache: {
          hit: true,
          age: cached.age,
          timestamp: cached.timestamp
        }
      }
    }
    
    const startTime = Date.now()
    const result = await queryFunction()
    const queryTime = Date.now() - startTime
    
    analyticsCache.set(type, params, result)
    
    
    return {
      ...result,
      _cache: {
        hit: false,
        queryTime,
        cached: true
      }
    }
    
  } catch (error) {
    console.error(`❌ Cache query error for ${type}:`, error)
    throw error
  }
}

/**
 * Invalidate cache when data changes
 */
export function invalidateCache(pattern) {
  return analyticsCache.invalidate(pattern)
}

/**
 * Get cache statistics
 */
export function getCacheStats() {
  return analyticsCache.getStats()
}

export default analyticsCache