/**
 * AI Response Cache Manager using IndexedDB
 * Provides intelligent caching for AI responses with TTL and cleanup
 */

export class AICacheManager {
  constructor() {
    this.dbName = 'ai_response_cache'
    this.dbVersion = 1
    this.storeName = 'responses'
    this.db = null
    this.defaultTTL = 24 * 60 * 60 * 1000 // 24 hours
    this.maxCacheSize = 100 * 1024 * 1024 // 100MB
  }

  /**
   * Initialize IndexedDB connection
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
        resolve(this.db)
      }
      
      request.onupgradeneeded = (event) => {
        const db = event.target.result
        
        const store = db.createObjectStore(this.storeName, { keyPath: 'key' })
        
        store.createIndex('timestamp', 'timestamp', { unique: false })
        store.createIndex('agent', 'agent', { unique: false })
        store.createIndex('hash', 'hash', { unique: false })
        store.createIndex('expiry', 'expiry', { unique: false })
      }
    })
  }

  /**
   * Generate cache key from message and context
   */
  generateCacheKey(message, agent, context = {}) {
    const normalized = {
      message: message.trim().toLowerCase(),
      agent: agent || 'auto',
      context: this.normalizeContext(context)
    }
    
    return this.hashString(JSON.stringify(normalized))
  }

  /**
   * Normalize context for consistent caching
   */
  normalizeContext(context) {
    const { userId, shopName, timeframe, ...relevant } = context
    return {
      userId: userId || 'anonymous',
      shopName: shopName || 'default',
      ...relevant
    }
  }

  /**
   * Simple string hash function
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

  /**
   * Check if response is cached and valid
   */
  async getCachedResponse(message, agent, context = {}) {
    try {
      await this.init()
      const key = this.generateCacheKey(message, agent, context)
      
      const transaction = this.db.transaction([this.storeName], 'readonly')
      const store = transaction.objectStore(this.storeName)
      const request = store.get(key)
      
      return new Promise((resolve, reject) => {
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
          
          this.updateLastAccessed(key)
          
          resolve({
            response: result.response,
            agent: result.agent,
            timestamp: result.timestamp,
            fromCache: true
          })
        }
        
        request.onerror = () => {
          console.warn('Cache read error:', request.error)
          resolve(null)
        }
      })
      
    } catch (error) {
      console.warn('Cache get error:', error)
      return null
    }
  }

  /**
   * Cache AI response
   */
  async cacheResponse(message, agent, response, context = {}, customTTL = null) {
    try {
      await this.init()
      
      const key = this.generateCacheKey(message, agent, context)
      const now = Date.now()
      const ttl = customTTL || this.defaultTTL
      
      const cacheEntry = {
        key,
        hash: key,
        message: message.trim(),
        agent: agent || 'auto',
        response,
        context: this.normalizeContext(context),
        timestamp: now,
        lastAccessed: now,
        expiry: now + ttl,
        size: this.calculateSize(response)
      }
      
      await this.ensureCacheSpace(cacheEntry.size)
      
      const transaction = this.db.transaction([this.storeName], 'readwrite')
      const store = transaction.objectStore(this.storeName)
      
      return new Promise((resolve, reject) => {
        const request = store.put(cacheEntry)
        
        request.onsuccess = () => {
          resolve(true)
        }
        
        request.onerror = () => {
          console.warn('Cache write error:', request.error)
          resolve(false)
        }
      })
      
    } catch (error) {
      console.warn('Cache set error:', error)
      return false
    }
  }

  /**
   * Update last accessed timestamp
   */
  async updateLastAccessed(key) {
    try {
      const transaction = this.db.transaction([this.storeName], 'readwrite')
      const store = transaction.objectStore(this.storeName)
      const getRequest = store.get(key)
      
      getRequest.onsuccess = () => {
        const entry = getRequest.result
        if (entry) {
          entry.lastAccessed = Date.now()
          store.put(entry)
        }
      }
    } catch (error) {
      console.warn('Failed to update last accessed:', error)
    }
  }

  /**
   * Calculate approximate size of response
   */
  calculateSize(response) {
    return new Blob([JSON.stringify(response)]).size
  }

  /**
   * Ensure cache has space for new entry
   */
  async ensureCacheSpace(requiredSize) {
    const currentSize = await this.getCurrentCacheSize()
    
    if (currentSize + requiredSize > this.maxCacheSize) {
      const spaceToFree = (currentSize + requiredSize) - this.maxCacheSize + (10 * 1024 * 1024) // Extra 10MB
      await this.freeCacheSpace(spaceToFree)
    }
  }

  /**
   * Get current cache size
   */
  async getCurrentCacheSize() {
    try {
      const transaction = this.db.transaction([this.storeName], 'readonly')
      const store = transaction.objectStore(this.storeName)
      const request = store.getAll()
      
      return new Promise((resolve) => {
        request.onsuccess = () => {
          const entries = request.result
          const totalSize = entries.reduce((sum, entry) => sum + (entry.size || 0), 0)
          resolve(totalSize)
        }
        
        request.onerror = () => {
          resolve(0)
        }
      })
    } catch (error) {
      return 0
    }
  }

  /**
   * Free cache space by removing oldest entries
   */
  async freeCacheSpace(spaceToFree) {
    try {
      const transaction = this.db.transaction([this.storeName], 'readwrite')
      const store = transaction.objectStore(this.storeName)
      const index = store.index('lastAccessed')
      const request = index.openCursor()
      
      let freedSpace = 0
      
      return new Promise((resolve) => {
        request.onsuccess = (event) => {
          const cursor = event.target.result
          
          if (cursor && freedSpace < spaceToFree) {
            const entry = cursor.value
            freedSpace += entry.size || 0
            cursor.delete()
            cursor.continue()
          } else {
            resolve(freedSpace)
          }
        }
        
        request.onerror = () => {
          resolve(freedSpace)
        }
      })
    } catch (error) {
      console.warn('Cache cleanup error:', error)
      return 0
    }
  }

  /**
   * Delete expired response
   */
  async deleteExpiredResponse(key) {
    try {
      const transaction = this.db.transaction([this.storeName], 'readwrite')
      const store = transaction.objectStore(this.storeName)
      store.delete(key)
    } catch (error) {
      console.warn('Failed to delete expired response:', error)
    }
  }

  /**
   * Clean up expired responses
   */
  async cleanupExpired() {
    try {
      await this.init()
      
      const transaction = this.db.transaction([this.storeName], 'readwrite')
      const store = transaction.objectStore(this.storeName)
      const index = store.index('expiry')
      const now = Date.now()
      
      const range = IDBKeyRange.upperBound(now)
      const request = index.openCursor(range)
      
      let deletedCount = 0
      
      return new Promise((resolve) => {
        request.onsuccess = (event) => {
          const cursor = event.target.result
          
          if (cursor) {
            cursor.delete()
            deletedCount++
            cursor.continue()
          } else {
            console.log(`Cleaned up ${deletedCount} expired cache entries`)
            resolve(deletedCount)
          }
        }
        
        request.onerror = () => {
          resolve(deletedCount)
        }
      })
    } catch (error) {
      console.warn('Cleanup error:', error)
      return 0
    }
  }

  /**
   * Get cache statistics
   */
  async getCacheStats() {
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
            totalSize: entries.reduce((sum, entry) => sum + (entry.size || 0), 0),
            expiredEntries: entries.filter(entry => entry.expiry < now).length,
            validEntries: entries.filter(entry => entry.expiry >= now).length,
            avgResponseTime: 0, // Could track this
            hitRate: 0, // Could track this
            oldestEntry: entries.reduce((oldest, entry) => 
              !oldest || entry.timestamp < oldest.timestamp ? entry : oldest, null
            ),
            newestEntry: entries.reduce((newest, entry) => 
              !newest || entry.timestamp > newest.timestamp ? entry : newest, null
            )
          }
          
          resolve(stats)
        }
        
        request.onerror = () => {
          resolve({
            totalEntries: 0,
            totalSize: 0,
            expiredEntries: 0,
            validEntries: 0,
            avgResponseTime: 0,
            hitRate: 0,
            oldestEntry: null,
            newestEntry: null
          })
        }
      })
    } catch (error) {
      console.warn('Stats error:', error)
      return null
    }
  }

  /**
   * Clear entire cache
   */
  async clearCache() {
    try {
      await this.init()
      
      const transaction = this.db.transaction([this.storeName], 'readwrite')
      const store = transaction.objectStore(this.storeName)
      
      return new Promise((resolve) => {
        const request = store.clear()
        
        request.onsuccess = () => {
          console.log('Cache cleared successfully')
          resolve(true)
        }
        
        request.onerror = () => {
          console.warn('Cache clear error:', request.error)
          resolve(false)
        }
      })
    } catch (error) {
      console.warn('Cache clear error:', error)
      return false
    }
  }

  /**
   * Prefetch common responses
   */
  async prefetchCommonResponses() {
    const commonQueries = [
      { message: 'How is my business doing?', agent: 'auto' },
      { message: 'Show me today\'s bookings', agent: 'auto' },
      { message: 'What are my revenue numbers?', agent: 'auto' },
      { message: 'Marketing suggestions?', agent: 'sophia' },
      { message: 'How to improve operations?', agent: 'david' }
    ]

    for (const query of commonQueries) {
      try {
        const cached = await this.getCachedResponse(query.message, query.agent)
        if (!cached) {
          console.log(`Prefetching: ${query.message}`)
        }
      } catch (error) {
        console.warn('Prefetch error:', error)
      }
    }
  }
}

let cacheManager = null

/**
 * Get or create cache manager instance
 */
export function getCacheManager() {
  if (!cacheManager) {
    cacheManager = new AICacheManager()
  }
  return cacheManager
}

if (typeof window !== 'undefined') {
  window.addEventListener('load', async () => {
    try {
      const manager = getCacheManager()
      await manager.cleanupExpired()
      
      setInterval(() => {
        manager.cleanupExpired()
      }, 60 * 60 * 1000) // Every hour
    } catch (error) {
      console.warn('Cache auto-cleanup failed:', error)
    }
  })
}

export default getCacheManager()