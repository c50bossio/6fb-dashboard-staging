'use client'

/**
 * API Optimization utilities for caching, deduplication, and optimistic updates
 * Designed for the 6FB AI Agent System customize page components
 */

// In-memory cache for API responses
const apiCache = new Map()
const pendingRequests = new Map()

// Cache configuration
const CACHE_CONFIG = {
  profiles: { ttl: 5 * 60 * 1000, maxSize: 100 }, // 5 minutes, max 100 entries
  barbershops: { ttl: 10 * 60 * 1000, maxSize: 50 }, // 10 minutes, max 50 entries
  services: { ttl: 30 * 60 * 1000, maxSize: 200 }, // 30 minutes, max 200 entries
  default: { ttl: 2 * 60 * 1000, maxSize: 50 } // 2 minutes, max 50 entries
}

/**
 * Generate cache key from URL and parameters
 */
function getCacheKey(url, params = {}) {
  const paramString = Object.keys(params)
    .sort()
    .map(key => `${key}=${JSON.stringify(params[key])}`)
    .join('&')
  return paramString ? `${url}?${paramString}` : url
}

/**
 * Get cache configuration for a resource type
 */
function getCacheConfig(url) {
  const resourceType = url.split('/')[3] // Extract resource from /api/v1/resource
  return CACHE_CONFIG[resourceType] || CACHE_CONFIG.default
}

/**
 * Check if cache entry is valid
 */
function isCacheValid(entry, config) {
  if (!entry) return false
  return Date.now() - entry.timestamp < config.ttl
}

/**
 * Clean expired cache entries
 */
function cleanExpiredCache() {
  for (const [key, entry] of apiCache.entries()) {
    const url = key.split('?')[0]
    const config = getCacheConfig(url)
    if (!isCacheValid(entry, config)) {
      apiCache.delete(key)
    }
  }
}

/**
 * Enforce cache size limits
 */
function enforceCacheSize() {
  // Group cache entries by resource type
  const typeGroups = new Map()
  
  for (const [key, entry] of apiCache.entries()) {
    const url = key.split('?')[0]
    const resourceType = url.split('/')[3] || 'default'
    
    if (!typeGroups.has(resourceType)) {
      typeGroups.set(resourceType, [])
    }
    typeGroups.get(resourceType).push({ key, entry })
  }

  // Enforce size limits for each type
  for (const [resourceType, entries] of typeGroups.entries()) {
    const config = CACHE_CONFIG[resourceType] || CACHE_CONFIG.default
    
    if (entries.length > config.maxSize) {
      // Sort by timestamp (oldest first) and remove excess
      entries.sort((a, b) => a.entry.timestamp - b.entry.timestamp)
      const toRemove = entries.slice(0, entries.length - config.maxSize)
      
      for (const { key } of toRemove) {
        apiCache.delete(key)
      }
    }
  }
}

/**
 * Optimized fetch with caching and deduplication
 */
export async function optimizedFetch(url, options = {}) {
  const { 
    method = 'GET', 
    cache = true, 
    deduplicate = true,
    ...fetchOptions 
  } = options

  // Only cache GET requests
  if (method !== 'GET') {
    return fetch(url, { method, ...fetchOptions })
  }

  const cacheKey = getCacheKey(url, fetchOptions.params)
  const config = getCacheConfig(url)

  // Check cache first
  if (cache) {
    const cachedEntry = apiCache.get(cacheKey)
    if (isCacheValid(cachedEntry, config)) {
      console.log(`Cache hit for ${cacheKey}`)
      return Promise.resolve(cachedEntry.response.clone())
    }
  }

  // Check for pending request (deduplication)
  if (deduplicate && pendingRequests.has(cacheKey)) {
    console.log(`Deduplicating request for ${cacheKey}`)
    return pendingRequests.get(cacheKey)
  }

  // Make the request
  const requestPromise = fetch(url, { method, ...fetchOptions })
    .then(async response => {
      // Cache successful responses
      if (cache && response.ok) {
        const responseClone = response.clone()
        apiCache.set(cacheKey, {
          response: responseClone,
          timestamp: Date.now()
        })

        // Clean up cache periodically
        if (apiCache.size % 50 === 0) {
          cleanExpiredCache()
          enforceCacheSize()
        }
      }
      
      return response
    })
    .finally(() => {
      // Remove from pending requests
      pendingRequests.delete(cacheKey)
    })

  // Store pending request for deduplication
  if (deduplicate) {
    pendingRequests.set(cacheKey, requestPromise)
  }

  return requestPromise
}

/**
 * Invalidate cache entries by pattern
 */
export function invalidateCache(pattern) {
  const regex = new RegExp(pattern)
  const keysToDelete = []

  for (const key of apiCache.keys()) {
    if (regex.test(key)) {
      keysToDelete.push(key)
    }
  }

  keysToDelete.forEach(key => apiCache.delete(key))
  console.log(`Invalidated ${keysToDelete.length} cache entries matching pattern: ${pattern}`)
}

/**
 * Clear all cache
 */
export function clearCache() {
  apiCache.clear()
  pendingRequests.clear()
  console.log('Cache cleared')
}

/**
 * Get cache statistics
 */
export function getCacheStats() {
  const stats = {
    totalEntries: apiCache.size,
    pendingRequests: pendingRequests.size,
    byResourceType: {},
    memoryUsage: 0
  }

  for (const [key, entry] of apiCache.entries()) {
    const url = key.split('?')[0]
    const resourceType = url.split('/')[3] || 'default'
    
    if (!stats.byResourceType[resourceType]) {
      stats.byResourceType[resourceType] = { count: 0, avgAge: 0 }
    }
    
    stats.byResourceType[resourceType].count++
    stats.byResourceType[resourceType].avgAge += Date.now() - entry.timestamp
  }

  // Calculate average ages
  for (const type of Object.keys(stats.byResourceType)) {
    stats.byResourceType[type].avgAge /= stats.byResourceType[type].count
  }

  return stats
}

/**
 * Optimistic update manager
 */
export class OptimisticUpdateManager {
  constructor() {
    this.pendingUpdates = new Map()
    this.rollbackData = new Map()
  }

  /**
   * Apply optimistic update
   */
  applyUpdate(key, optimisticData, rollbackData) {
    // Store rollback data
    this.rollbackData.set(key, rollbackData)
    
    // Apply optimistic update to cache
    const cacheKey = getCacheKey(key)
    const existingEntry = apiCache.get(cacheKey)
    
    if (existingEntry) {
      // Update cached response with optimistic data
      const updatedResponse = new Response(
        JSON.stringify(optimisticData),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        }
      )
      
      apiCache.set(cacheKey, {
        response: updatedResponse,
        timestamp: Date.now(),
        optimistic: true
      })
    }

    console.log(`Applied optimistic update for ${key}`)
  }

  /**
   * Confirm optimistic update (remove from pending)
   */
  confirmUpdate(key, serverData) {
    this.rollbackData.delete(key)
    
    // Update cache with server data
    const cacheKey = getCacheKey(key)
    const entry = apiCache.get(cacheKey)
    
    if (entry && entry.optimistic) {
      const serverResponse = new Response(
        JSON.stringify(serverData),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        }
      )
      
      apiCache.set(cacheKey, {
        response: serverResponse,
        timestamp: Date.now(),
        optimistic: false
      })
    }

    console.log(`Confirmed optimistic update for ${key}`)
  }

  /**
   * Rollback optimistic update
   */
  rollbackUpdate(key) {
    const rollbackData = this.rollbackData.get(key)
    if (!rollbackData) return

    const cacheKey = getCacheKey(key)
    const rollbackResponse = new Response(
      JSON.stringify(rollbackData),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    )
    
    apiCache.set(cacheKey, {
      response: rollbackResponse,
      timestamp: Date.now(),
      optimistic: false
    })

    this.rollbackData.delete(key)
    console.log(`Rolled back optimistic update for ${key}`)
  }

  /**
   * Check if update is pending
   */
  isPending(key) {
    return this.rollbackData.has(key)
  }
}

// Global optimistic update manager instance
export const optimisticUpdater = new OptimisticUpdateManager()

/**
 * Enhanced fetch with optimistic updates
 */
export async function optimisticFetch(url, options = {}) {
  const { 
    optimisticData, 
    rollbackData,
    onOptimistic,
    onSuccess,
    onError,
    ...fetchOptions 
  } = options

  const key = url

  try {
    // Apply optimistic update if provided
    if (optimisticData) {
      optimisticUpdater.applyUpdate(key, optimisticData, rollbackData)
      if (onOptimistic) onOptimistic(optimisticData)
    }

    // Make the actual request
    const response = await optimizedFetch(url, fetchOptions)
    
    if (response.ok) {
      const serverData = await response.json()
      
      // Confirm optimistic update
      if (optimisticData) {
        optimisticUpdater.confirmUpdate(key, serverData)
      }
      
      if (onSuccess) onSuccess(serverData)
      return response
    } else {
      throw new Error(`Request failed with status ${response.status}`)
    }

  } catch (error) {
    // Rollback optimistic update on error
    if (optimisticData) {
      optimisticUpdater.rollbackUpdate(key)
    }
    
    if (onError) onError(error)
    throw error
  }
}

/**
 * Batch request utility
 */
export async function batchRequests(requests, options = {}) {
  const { 
    maxConcurrent = 5, 
    delayBetweenBatches = 0,
    onProgress 
  } = options

  const results = []
  
  for (let i = 0; i < requests.length; i += maxConcurrent) {
    const batch = requests.slice(i, i + maxConcurrent)
    const batchPromises = batch.map(request => 
      optimizedFetch(request.url, request.options)
        .catch(error => ({ error, request }))
    )
    
    const batchResults = await Promise.all(batchPromises)
    results.push(...batchResults)
    
    if (onProgress) {
      onProgress(i + batch.length, requests.length)
    }
    
    // Delay between batches if specified
    if (delayBetweenBatches > 0 && i + maxConcurrent < requests.length) {
      await new Promise(resolve => setTimeout(resolve, delayBetweenBatches))
    }
  }
  
  return results
}

/**
 * Request retry utility with exponential backoff
 */
export async function retryRequest(url, options = {}, maxRetries = 3) {
  const { retryDelay = 1000, backoffMultiplier = 2 } = options
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await optimizedFetch(url, options)
    } catch (error) {
      if (attempt === maxRetries) throw error
      
      const delay = retryDelay * Math.pow(backoffMultiplier, attempt)
      console.log(`Request failed (attempt ${attempt + 1}/${maxRetries + 1}), retrying in ${delay}ms`)
      
      await new Promise(resolve => setTimeout(resolve, delay))
    }
  }
}

// Export cache management utilities
export const cacheManager = {
  get: (key) => apiCache.get(getCacheKey(key)),
  set: (key, data) => apiCache.set(getCacheKey(key), {
    response: new Response(JSON.stringify(data)),
    timestamp: Date.now()
  }),
  delete: (key) => apiCache.delete(getCacheKey(key)),
  clear: clearCache,
  invalidate: invalidateCache,
  stats: getCacheStats
}

// Cleanup on page unload
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    // Clear sensitive data from cache
    for (const [key] of apiCache.entries()) {
      if (key.includes('password') || key.includes('token') || key.includes('secret')) {
        apiCache.delete(key)
      }
    }
  })
}

export default {
  optimizedFetch,
  optimisticFetch,
  OptimisticUpdateManager,
  optimisticUpdater,
  batchRequests,
  retryRequest,
  cacheManager,
  invalidateCache,
  clearCache,
  getCacheStats
}