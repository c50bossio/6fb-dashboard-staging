/**
 * Rule Cache Module
 * 
 * Implements multi-layer caching strategy for booking rules
 * to reduce database queries and improve response times
 */

export class RuleCache {
  constructor(barbershopId) {
    this.barbershopId = barbershopId
    this.memoryCache = new Map()
    this.ttl = 5 * 60 * 1000 // 5 minutes default TTL
    this.sessionStorageKey = `booking-rules-${barbershopId}`
    this.localStorageKey = `booking-rules-backup-${barbershopId}`
  }

  /**
   * Get rules from cache (memory → session → local → null)
   */
  async get() {
    // 1. Check memory cache first (fastest)
    const memoryData = this.getFromMemory()
    if (memoryData) return memoryData

    // 2. Check session storage (survives navigation)
    const sessionData = this.getFromSessionStorage()
    if (sessionData) {
      // Repopulate memory cache
      this.setToMemory(sessionData)
      return sessionData
    }

    // 3. Check local storage (survives browser restart)
    const localData = this.getFromLocalStorage()
    if (localData) {
      // Repopulate higher caches
      this.setToMemory(localData)
      this.setToSessionStorage(localData)
      return localData
    }

    return null
  }

  /**
   * Set rules in all cache layers
   */
  async set(rules) {
    const cacheData = {
      rules,
      timestamp: Date.now(),
      version: rules.metadata?.version || 1
    }

    // Set in all layers
    this.setToMemory(cacheData)
    this.setToSessionStorage(cacheData)
    this.setToLocalStorage(cacheData)

    return true
  }

  /**
   * Check if cache is still valid
   */
  isValid() {
    const memoryData = this.memoryCache.get(this.barbershopId)
    if (!memoryData) return false

    const age = Date.now() - memoryData.timestamp
    return age < this.ttl
  }

  /**
   * Invalidate all cache layers
   */
  async invalidate() {
    // Clear memory cache
    this.memoryCache.delete(this.barbershopId)

    // Clear session storage
    if (typeof window !== 'undefined' && window.sessionStorage) {
      sessionStorage.removeItem(this.sessionStorageKey)
    }

    // Clear local storage
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.removeItem(this.localStorageKey)
    }

    return true
  }

  /**
   * Get from memory cache
   */
  getFromMemory() {
    const data = this.memoryCache.get(this.barbershopId)
    if (!data) return null

    const age = Date.now() - data.timestamp
    if (age > this.ttl) {
      this.memoryCache.delete(this.barbershopId)
      return null
    }

    return data.rules
  }

  /**
   * Set to memory cache
   */
  setToMemory(data) {
    this.memoryCache.set(this.barbershopId, {
      rules: data.rules || data,
      timestamp: data.timestamp || Date.now()
    })
  }

  /**
   * Get from session storage
   */
  getFromSessionStorage() {
    if (typeof window === 'undefined' || !window.sessionStorage) {
      return null
    }

    try {
      const stored = sessionStorage.getItem(this.sessionStorageKey)
      if (!stored) return null

      const data = JSON.parse(stored)
      const age = Date.now() - data.timestamp

      // Session storage has longer TTL (30 minutes)
      if (age > 30 * 60 * 1000) {
        sessionStorage.removeItem(this.sessionStorageKey)
        return null
      }

      return data.rules
    } catch (error) {
      console.error('Failed to read from session storage:', error)
      return null
    }
  }

  /**
   * Set to session storage
   */
  setToSessionStorage(data) {
    if (typeof window === 'undefined' || !window.sessionStorage) {
      return
    }

    try {
      const cacheData = {
        rules: data.rules || data,
        timestamp: data.timestamp || Date.now(),
        version: data.version || 1
      }
      sessionStorage.setItem(this.sessionStorageKey, JSON.stringify(cacheData))
    } catch (error) {
      console.error('Failed to write to session storage:', error)
    }
  }

  /**
   * Get from local storage
   */
  getFromLocalStorage() {
    if (typeof window === 'undefined' || !window.localStorage) {
      return null
    }

    try {
      const stored = localStorage.getItem(this.localStorageKey)
      if (!stored) return null

      const data = JSON.parse(stored)
      const age = Date.now() - data.timestamp

      // Local storage has even longer TTL (24 hours)
      if (age > 24 * 60 * 60 * 1000) {
        localStorage.removeItem(this.localStorageKey)
        return null
      }

      return data.rules
    } catch (error) {
      console.error('Failed to read from local storage:', error)
      return null
    }
  }

  /**
   * Set to local storage
   */
  setToLocalStorage(data) {
    if (typeof window === 'undefined' || !window.localStorage) {
      return
    }

    try {
      const cacheData = {
        rules: data.rules || data,
        timestamp: data.timestamp || Date.now(),
        version: data.version || 1
      }
      localStorage.setItem(this.localStorageKey, JSON.stringify(cacheData))
    } catch (error) {
      console.error('Failed to write to local storage:', error)
    }
  }

  /**
   * Preload cache with rules
   */
  async preload(rules) {
    return this.set(rules)
  }

  /**
   * Get cache statistics
   */
  getStats() {
    const memoryData = this.memoryCache.get(this.barbershopId)
    const hasSession = typeof window !== 'undefined' && 
                      window.sessionStorage && 
                      sessionStorage.getItem(this.sessionStorageKey)
    const hasLocal = typeof window !== 'undefined' && 
                    window.localStorage && 
                    localStorage.getItem(this.localStorageKey)

    return {
      memoryCache: {
        exists: !!memoryData,
        age: memoryData ? Date.now() - memoryData.timestamp : null,
        valid: this.isValid()
      },
      sessionCache: {
        exists: !!hasSession
      },
      localCache: {
        exists: !!hasLocal
      }
    }
  }

  /**
   * Clear old cache entries (garbage collection)
   */
  static clearOldCaches() {
    if (typeof window === 'undefined') return

    const now = Date.now()
    const maxAge = 7 * 24 * 60 * 60 * 1000 // 7 days

    // Clear old session storage entries
    if (window.sessionStorage) {
      for (let i = 0; i < sessionStorage.length; i++) {
        const key = sessionStorage.key(i)
        if (key && key.startsWith('booking-rules-')) {
          try {
            const data = JSON.parse(sessionStorage.getItem(key))
            if (data && now - data.timestamp > maxAge) {
              sessionStorage.removeItem(key)
            }
          } catch (error) {
            // Invalid data, remove it
            sessionStorage.removeItem(key)
          }
        }
      }
    }

    // Clear old local storage entries
    if (window.localStorage) {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i)
        if (key && key.startsWith('booking-rules-backup-')) {
          try {
            const data = JSON.parse(localStorage.getItem(key))
            if (data && now - data.timestamp > maxAge) {
              localStorage.removeItem(key)
            }
          } catch (error) {
            // Invalid data, remove it
            localStorage.removeItem(key)
          }
        }
      }
    }
  }

  /**
   * Warm cache by preloading rules
   */
  async warmCache(supabase) {
    try {
      const { data: ruleData, error } = await supabase
        .from('booking_rules_v2')
        .select('*')
        .eq('barbershop_id', this.barbershopId)
        .eq('is_active', true)
        .single()

      if (!error && ruleData) {
        await this.set(ruleData)
        return true
      }
    } catch (error) {
      console.error('Failed to warm cache:', error)
    }
    return false
  }

  /**
   * Set custom TTL for this cache instance
   */
  setTTL(ttlMs) {
    this.ttl = ttlMs
  }

  /**
   * Get remaining TTL for current cache
   */
  getRemainingTTL() {
    const memoryData = this.memoryCache.get(this.barbershopId)
    if (!memoryData) return 0

    const age = Date.now() - memoryData.timestamp
    const remaining = this.ttl - age

    return Math.max(0, remaining)
  }
}

// Export singleton cache manager for cross-component sharing
class CacheManager {
  constructor() {
    this.caches = new Map()
  }

  getCache(barbershopId) {
    if (!this.caches.has(barbershopId)) {
      this.caches.set(barbershopId, new RuleCache(barbershopId))
    }
    return this.caches.get(barbershopId)
  }

  invalidateAll() {
    for (const cache of this.caches.values()) {
      cache.invalidate()
    }
    this.caches.clear()
  }

  getStats() {
    const stats = {}
    for (const [barbershopId, cache] of this.caches.entries()) {
      stats[barbershopId] = cache.getStats()
    }
    return stats
  }
}

// Create and export singleton instance
export const cacheManager = new CacheManager()

export default RuleCache