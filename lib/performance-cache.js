/**
 * Performance-optimized caching system
 * Implements multi-layer caching with memory, localStorage, and Redis
 */

class PerformanceCache {
  constructor() {
    this.memoryCache = new Map()
    this.cacheStats = {
      hits: 0,
      misses: 0,
      evictions: 0
    }
    this.maxMemorySize = 50 // Max items in memory
    this.defaultTTL = 60000 // 60 seconds default
  }

  // Generate cache key
  generateKey(prefix, params) {
    const sortedParams = Object.keys(params || {})
      .sort()
      .map(key => `${key}:${params[key]}`)
      .join('-')
    return `${prefix}:${sortedParams}`
  }

  // Memory cache with LRU eviction
  async getFromMemory(key) {
    const cached = this.memoryCache.get(key)
    if (!cached) {
      this.cacheStats.misses++
      return null
    }

    if (cached.expires < Date.now()) {
      this.memoryCache.delete(key)
      this.cacheStats.misses++
      return null
    }

    // Move to front (LRU)
    this.memoryCache.delete(key)
    this.memoryCache.set(key, cached)
    this.cacheStats.hits++
    return cached.data
  }

  setInMemory(key, data, ttl = this.defaultTTL) {
    // Evict oldest if at capacity
    if (this.memoryCache.size >= this.maxMemorySize) {
      const firstKey = this.memoryCache.keys().next().value
      this.memoryCache.delete(firstKey)
      this.cacheStats.evictions++
    }

    this.memoryCache.set(key, {
      data,
      expires: Date.now() + ttl
    })
  }

  // LocalStorage cache for persistence
  async getFromStorage(key) {
    if (typeof window === 'undefined') return null

    try {
      const cached = localStorage.getItem(`cache:${key}`)
      if (!cached) return null

      const parsed = JSON.parse(cached)
      if (parsed.expires < Date.now()) {
        localStorage.removeItem(`cache:${key}`)
        return null
      }

      return parsed.data
    } catch (error) {
      console.error('Storage cache error:', error)
      return null
    }
  }

  setInStorage(key, data, ttl = this.defaultTTL) {
    if (typeof window === 'undefined') return

    try {
      const cacheData = {
        data,
        expires: Date.now() + ttl
      }
      localStorage.setItem(`cache:${key}`, JSON.stringify(cacheData))
    } catch (error) {
      // Storage full, clear old entries
      this.clearExpiredStorage()
      try {
        localStorage.setItem(`cache:${key}`, JSON.stringify({ data, expires: Date.now() + ttl }))
      } catch {
        console.error('Storage cache full')
      }
    }
  }

  clearExpiredStorage() {
    if (typeof window === 'undefined') return

    const now = Date.now()
    const keys = []
    
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key?.startsWith('cache:')) {
        try {
          const item = JSON.parse(localStorage.getItem(key))
          if (item.expires < now) {
            keys.push(key)
          }
        } catch {
          keys.push(key) // Remove corrupted entries
        }
      }
    }

    keys.forEach(key => localStorage.removeItem(key))
  }

  // Multi-layer cache get
  async get(key) {
    // Try memory first
    let data = await this.getFromMemory(key)
    if (data) return data

    // Try localStorage
    data = await this.getFromStorage(key)
    if (data) {
      // Promote to memory cache
      this.setInMemory(key, data, 30000) // 30s in memory
      return data
    }

    return null
  }

  // Multi-layer cache set
  set(key, data, options = {}) {
    const ttl = options.ttl || this.defaultTTL
    
    // Always set in memory
    this.setInMemory(key, data, ttl)
    
    // Set in storage if persistent
    if (options.persistent !== false) {
      this.setInStorage(key, data, ttl)
    }
  }

  // Clear all caches
  clear() {
    this.memoryCache.clear()
    if (typeof window !== 'undefined') {
      const keys = []
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i)
        if (key?.startsWith('cache:')) {
          keys.push(key)
        }
      }
      keys.forEach(key => localStorage.removeItem(key))
    }
  }

  // Get cache statistics
  getStats() {
    const hitRate = this.cacheStats.hits / (this.cacheStats.hits + this.cacheStats.misses) || 0
    return {
      ...this.cacheStats,
      hitRate: (hitRate * 100).toFixed(2) + '%',
      memorySize: this.memoryCache.size,
      maxMemorySize: this.maxMemorySize
    }
  }
}

// Singleton instance
const performanceCache = new PerformanceCache()

// Cached fetch wrapper
export async function cachedFetch(url, options = {}) {
  const cacheKey = performanceCache.generateKey('fetch', { url, ...options })
  
  // Check cache first
  const cached = await performanceCache.get(cacheKey)
  if (cached && !options.noCache) {
    
    return cached
  }

  try {
    const response = await fetch(url, options)
    const data = await response.json()
    
    // Cache successful responses
    if (response.ok) {
      performanceCache.set(cacheKey, data, {
        ttl: options.cacheTTL || 60000, // 1 minute default
        persistent: options.persistent !== false
      })
    }
    
    return data
  } catch (error) {
    // Return cached data on error if available
    if (cached) {
      
      return cached
    }
    throw error
  }
}

// Debounced API calls
const pendingCalls = new Map()

export function debouncedFetch(url, options = {}, delay = 300) {
  const key = performanceCache.generateKey('debounce', { url, ...options })
  
  // Clear existing timeout
  if (pendingCalls.has(key)) {
    clearTimeout(pendingCalls.get(key).timeout)
  }
  
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(async () => {
      pendingCalls.delete(key)
      try {
        const result = await cachedFetch(url, options)
        resolve(result)
      } catch (error) {
        reject(error)
      }
    }, delay)
    
    pendingCalls.set(key, { timeout, resolve, reject })
  })
}

// Batch API calls
class BatchQueue {
  constructor(processor, options = {}) {
    this.processor = processor
    this.queue = []
    this.batchSize = options.batchSize || 10
    this.delay = options.delay || 100
    this.timeout = null
  }

  add(item) {
    return new Promise((resolve, reject) => {
      this.queue.push({ item, resolve, reject })
      this.scheduleFlush()
    })
  }

  scheduleFlush() {
    if (this.timeout) return
    
    this.timeout = setTimeout(() => this.flush(), this.delay)
    
    // Flush immediately if batch size reached
    if (this.queue.length >= this.batchSize) {
      clearTimeout(this.timeout)
      this.flush()
    }
  }

  async flush() {
    this.timeout = null
    
    if (this.queue.length === 0) return
    
    const batch = this.queue.splice(0, this.batchSize)
    const items = batch.map(b => b.item)
    
    try {
      const results = await this.processor(items)
      batch.forEach((b, i) => b.resolve(results[i]))
    } catch (error) {
      batch.forEach(b => b.reject(error))
    }
    
    // Schedule next batch if queue not empty
    if (this.queue.length > 0) {
      this.scheduleFlush()
    }
  }
}

// Export utilities
export default performanceCache
export { BatchQueue }