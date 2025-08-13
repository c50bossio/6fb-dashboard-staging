/**
 * Advanced caching manager for API responses and data
 */

class CacheManager {
  constructor() {
    this.memoryCache = new Map()
    this.cacheTimestamps = new Map()
    this.pendingRequests = new Map()
    this.initIndexedDB()
  }

  // Initialize IndexedDB for persistent caching
  async initIndexedDB() {
    if (typeof window === 'undefined' || !('indexedDB' in window)) {
      return
    }

    return new Promise((resolve, reject) => {
      const request = indexedDB.open('AppCache', 1)
      
      request.onerror = () => reject(request.error)
      request.onsuccess = () => {
        this.db = request.result
        resolve(this.db)
      }
      
      request.onupgradeneeded = (event) => {
        const db = event.target.result
        
        if (!db.objectStoreNames.contains('cache')) {
          db.createObjectStore('cache', { keyPath: 'key' })
        }
        
        if (!db.objectStoreNames.contains('metadata')) {
          db.createObjectStore('metadata', { keyPath: 'key' })
        }
      }
    })
  }

  // Generate cache key from request parameters
  getCacheKey(url, options = {}) {
    const { method = 'GET', body, params } = options
    const keyParts = [method, url]
    
    if (params) {
      keyParts.push(JSON.stringify(params))
    }
    
    if (body) {
      keyParts.push(JSON.stringify(body))
    }
    
    return keyParts.join(':')
  }

  // Memory cache operations
  setMemoryCache(key, data, ttl = 300000) { // 5 minutes default
    this.memoryCache.set(key, data)
    this.cacheTimestamps.set(key, Date.now() + ttl)
    
    // Cleanup expired entries periodically
    if (this.memoryCache.size > 100) {
      this.cleanupMemoryCache()
    }
  }

  getMemoryCache(key) {
    const timestamp = this.cacheTimestamps.get(key)
    
    if (!timestamp || Date.now() > timestamp) {
      this.memoryCache.delete(key)
      this.cacheTimestamps.delete(key)
      return null
    }
    
    return this.memoryCache.get(key)
  }

  cleanupMemoryCache() {
    const now = Date.now()
    
    for (const [key, timestamp] of this.cacheTimestamps.entries()) {
      if (now > timestamp) {
        this.memoryCache.delete(key)
        this.cacheTimestamps.delete(key)
      }
    }
  }

  // IndexedDB operations
  async setIndexedDBCache(key, data, ttl = 86400000) { // 24 hours default
    if (!this.db) return
    
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['cache', 'metadata'], 'readwrite')
      
      transaction.objectStore('cache').put({ key, data })
      transaction.objectStore('metadata').put({ 
        key, 
        timestamp: Date.now() + ttl 
      })
      
      transaction.oncomplete = () => resolve()
      transaction.onerror = () => reject(transaction.error)
    })
  }

  async getIndexedDBCache(key) {
    if (!this.db) return null
    
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['cache', 'metadata'], 'readonly')
      const cacheRequest = transaction.objectStore('cache').get(key)
      const metaRequest = transaction.objectStore('metadata').get(key)
      
      transaction.oncomplete = () => {
        const metadata = metaRequest.result
        
        if (!metadata || Date.now() > metadata.timestamp) {
          this.deleteIndexedDBCache(key)
          resolve(null)
        } else {
          resolve(cacheRequest.result?.data)
        }
      }
      
      transaction.onerror = () => reject(transaction.error)
    })
  }

  async deleteIndexedDBCache(key) {
    if (!this.db) return
    
    const transaction = this.db.transaction(['cache', 'metadata'], 'readwrite')
    transaction.objectStore('cache').delete(key)
    transaction.objectStore('metadata').delete(key)
  }

  // Request deduplication
  async dedupeFetch(url, options = {}) {
    const cacheKey = this.getCacheKey(url, options)
    
    // Check if request is already pending
    if (this.pendingRequests.has(cacheKey)) {
      return this.pendingRequests.get(cacheKey)
    }
    
    // Check memory cache first
    const memoryData = this.getMemoryCache(cacheKey)
    if (memoryData) {
      return Promise.resolve(memoryData)
    }
    
    // Check IndexedDB cache
    const indexedData = await this.getIndexedDBCache(cacheKey)
    if (indexedData) {
      // Promote to memory cache for faster access
      this.setMemoryCache(cacheKey, indexedData, 300000)
      return indexedData
    }
    
    // Make the actual request
    const requestPromise = fetch(url, options)
      .then(response => {
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`)
        }
        return response.json()
      })
      .then(data => {
        // Cache the successful response
        this.setMemoryCache(cacheKey, data)
        this.setIndexedDBCache(cacheKey, data)
        this.pendingRequests.delete(cacheKey)
        return data
      })
      .catch(error => {
        this.pendingRequests.delete(cacheKey)
        throw error
      })
    
    this.pendingRequests.set(cacheKey, requestPromise)
    return requestPromise
  }

  // Cache invalidation
  invalidate(pattern) {
    // Invalidate memory cache
    for (const key of this.memoryCache.keys()) {
      if (key.includes(pattern)) {
        this.memoryCache.delete(key)
        this.cacheTimestamps.delete(key)
      }
    }
    
    // Invalidate IndexedDB cache
    if (this.db) {
      const transaction = this.db.transaction(['cache', 'metadata'], 'readwrite')
      const cacheStore = transaction.objectStore('cache')
      const metaStore = transaction.objectStore('metadata')
      
      const request = cacheStore.openCursor()
      request.onsuccess = (event) => {
        const cursor = event.target.result
        if (cursor) {
          if (cursor.key.includes(pattern)) {
            cacheStore.delete(cursor.key)
            metaStore.delete(cursor.key)
          }
          cursor.continue()
        }
      }
    }
  }

  // Prefetch data
  async prefetch(urls, options = {}) {
    const promises = urls.map(url => 
      this.dedupeFetch(url, options).catch(err => {
        console.warn(`Prefetch failed for ${url}:`, err)
        return null
      })
    )
    
    return Promise.all(promises)
  }

  // Clear all caches
  async clearAll() {
    // Clear memory cache
    this.memoryCache.clear()
    this.cacheTimestamps.clear()
    this.pendingRequests.clear()
    
    // Clear IndexedDB
    if (this.db) {
      const transaction = this.db.transaction(['cache', 'metadata'], 'readwrite')
      transaction.objectStore('cache').clear()
      transaction.objectStore('metadata').clear()
    }
  }

  // Get cache statistics
  getStats() {
    return {
      memoryCacheSize: this.memoryCache.size,
      pendingRequests: this.pendingRequests.size,
      timestamps: this.cacheTimestamps.size
    }
  }
}

// Singleton instance
const cacheManager = new CacheManager()

// React hook for using cache
export function useCache(url, options = {}) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  
  useEffect(() => {
    let cancelled = false
    
    const fetchData = async () => {
      try {
        setLoading(true)
        const result = await cacheManager.dedupeFetch(url, options)
        if (!cancelled) {
          setData(result)
          setError(null)
        }
      } catch (err) {
        if (!cancelled) {
          setError(err)
          setData(null)
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }
    
    fetchData()
    
    return () => {
      cancelled = true
    }
  }, [url, JSON.stringify(options)])
  
  const refetch = useCallback(() => {
    cacheManager.invalidate(url)
    setLoading(true)
    return cacheManager.dedupeFetch(url, options)
      .then(result => {
        setData(result)
        setError(null)
        return result
      })
      .catch(err => {
        setError(err)
        throw err
      })
      .finally(() => {
        setLoading(false)
      })
  }, [url, options])
  
  return { data, loading, error, refetch }
}

// SWR-like data fetching hook
export function useSWRCache(key, fetcher, options = {}) {
  const {
    refreshInterval = 0,
    revalidateOnFocus = true,
    revalidateOnReconnect = true,
    dedupingInterval = 2000,
    fallbackData = null
  } = options
  
  const [data, setData] = useState(fallbackData)
  const [error, setError] = useState(null)
  const [isValidating, setIsValidating] = useState(false)
  
  const revalidate = useCallback(async () => {
    if (isValidating) return
    
    setIsValidating(true)
    try {
      const result = await fetcher(key)
      setData(result)
      setError(null)
      cacheManager.setMemoryCache(key, result)
      return result
    } catch (err) {
      setError(err)
      throw err
    } finally {
      setIsValidating(false)
    }
  }, [key, fetcher, isValidating])
  
  useEffect(() => {
    // Initial fetch
    const cachedData = cacheManager.getMemoryCache(key)
    if (cachedData) {
      setData(cachedData)
    } else {
      revalidate()
    }
    
    // Set up refresh interval
    let intervalId
    if (refreshInterval > 0) {
      intervalId = setInterval(revalidate, refreshInterval)
    }
    
    // Revalidate on focus
    const handleFocus = () => {
      if (revalidateOnFocus) {
        revalidate()
      }
    }
    
    // Revalidate on reconnect
    const handleOnline = () => {
      if (revalidateOnReconnect) {
        revalidate()
      }
    }
    
    window.addEventListener('focus', handleFocus)
    window.addEventListener('online', handleOnline)
    
    return () => {
      if (intervalId) clearInterval(intervalId)
      window.removeEventListener('focus', handleFocus)
      window.removeEventListener('online', handleOnline)
    }
  }, [key, refreshInterval, revalidateOnFocus, revalidateOnReconnect])
  
  return {
    data,
    error,
    isValidating,
    mutate: revalidate
  }
}

import { useState, useEffect, useCallback } from 'react'

export default cacheManager
export { CacheManager }