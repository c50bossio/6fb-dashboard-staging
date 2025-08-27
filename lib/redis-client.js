/**
 * Redis Client for Client Care Caching
 * 
 * Provides intelligent caching for client care results with:
 * - Smart cache key generation
 * - Automatic expiration management
 * - Cache invalidation strategies
 * - Performance monitoring
 * - Graceful degradation when Redis is unavailable
 */

import Redis from 'ioredis'

let redisClient = null
let cacheStats = {
  hits: 0,
  misses: 0,
  errors: 0,
  lastReset: Date.now()
}

/**
 * Initialize Redis client with configuration
 */
function initRedis() {
  if (redisClient) return redisClient

  try {
    // Configuration based on environment
    const config = {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD,
      db: parseInt(process.env.REDIS_DB || '0'),
      retryDelayOnFailover: 100,
      enableReadyCheck: true,
      maxRetriesPerRequest: 3,
      lazyConnect: true,
      keepAlive: 30000,
      connectTimeout: 10000,
      commandTimeout: 5000
    }

    // Add Redis URL support for production deployment
    if (process.env.REDIS_URL) {
      redisClient = new Redis(process.env.REDIS_URL, {
        retryDelayOnFailover: 100,
        enableReadyCheck: true,
        maxRetriesPerRequest: 3,
        lazyConnect: true,
        keepAlive: 30000,
        connectTimeout: 10000,
        commandTimeout: 5000
      })
    } else {
      redisClient = new Redis(config)
    }

    // Event handlers for monitoring and debugging
    redisClient.on('connect', () => {
      console.log('📶 Redis client connected successfully')
    })

    redisClient.on('ready', () => {
      console.log('🚀 Redis client ready for operations')
    })

    redisClient.on('error', (error) => {
      console.error('❌ Redis client error:', error.message)
      cacheStats.errors++
    })

    redisClient.on('close', () => {
      console.log('🔌 Redis client connection closed')
    })

    redisClient.on('reconnecting', () => {
      console.log('🔄 Redis client reconnecting...')
    })

    return redisClient

  } catch (error) {
    console.error('❌ Failed to initialize Redis client:', error.message)
    return null
  }
}

/**
 * Generate cache key for client care results
 */
export function generateCacheKey(barbershopId, priority = 'all', daysSinceVisit = 60, includeNoShows = true) {
  const keyComponents = [
    'client-care',
    `shop:${barbershopId}`,
    `priority:${priority}`,
    `days:${daysSinceVisit}`,
    `no-shows:${includeNoShows}`
  ]
  
  // Add timestamp bucket for time-sensitive invalidation (15-minute buckets)
  const timeBucket = Math.floor(Date.now() / (15 * 60 * 1000))
  keyComponents.push(`time:${timeBucket}`)
  
  return keyComponents.join(':')
}

/**
 * Get cached client care results
 */
export async function getCachedResults(barbershopId, priority, daysSinceVisit, includeNoShows) {
  if (!redisClient) {
    redisClient = initRedis()
  }
  
  if (!redisClient) {
    console.warn('⚠️ Redis not available, skipping cache lookup')
    return null
  }

  try {
    const cacheKey = generateCacheKey(barbershopId, priority, daysSinceVisit, includeNoShows)
    
    const startTime = Date.now()
    const cachedData = await redisClient.get(cacheKey)
    const lookupTime = Date.now() - startTime

    if (cachedData) {
      cacheStats.hits++
      const data = JSON.parse(cachedData)
      
      // Add cache metadata
      data.cached = {
        hit: true,
        lookup_time_ms: lookupTime,
        cached_at: data.cached_at || new Date().toISOString(),
        expires_in_seconds: await redisClient.ttl(cacheKey)
      }
      
      console.log(`🎯 Cache HIT for ${cacheKey} (${lookupTime}ms)`)
      return data
      
    } else {
      cacheStats.misses++
      console.log(`💨 Cache MISS for ${cacheKey} (${lookupTime}ms)`)
      return null
    }

  } catch (error) {
    cacheStats.errors++
    console.error('❌ Cache lookup error:', error.message)
    return null // Graceful degradation - proceed without cache
  }
}

/**
 * Cache client care results with intelligent expiration
 */
export async function cacheResults(barbershopId, priority, daysSinceVisit, includeNoShows, data) {
  if (!redisClient) {
    redisClient = initRedis()
  }
  
  if (!redisClient) {
    console.warn('⚠️ Redis not available, skipping cache storage')
    return false
  }

  try {
    const cacheKey = generateCacheKey(barbershopId, priority, daysSinceVisit, includeNoShows)
    
    // Add cache metadata to the data
    const dataWithMeta = {
      ...data,
      cached_at: new Date().toISOString(),
      cache_key: cacheKey
    }
    
    // Smart TTL based on data freshness and priority
    let ttl = 15 * 60 // Default: 15 minutes
    
    // Longer cache for low-priority results (they change less frequently)
    if (priority === 'low') ttl = 30 * 60 // 30 minutes
    
    // Shorter cache for high-priority (more time-sensitive)
    if (priority === 'high') ttl = 5 * 60 // 5 minutes
    
    // Adjust based on result count (fewer results might be more volatile)
    const clientCount = data.clients?.length || 0
    if (clientCount > 20) ttl *= 1.5 // More results = more stable = longer cache
    if (clientCount < 5) ttl *= 0.5 // Fewer results = more volatile = shorter cache
    
    const startTime = Date.now()
    await redisClient.setex(cacheKey, Math.floor(ttl), JSON.stringify(dataWithMeta))
    const storeTime = Date.now() - startTime

    console.log(`💾 Cached results for ${cacheKey} (${clientCount} clients, TTL: ${Math.floor(ttl/60)}min, ${storeTime}ms)`)
    return true

  } catch (error) {
    cacheStats.errors++
    console.error('❌ Cache storage error:', error.message)
    return false
  }
}

/**
 * Invalidate cache when data changes
 */
export async function invalidateClientCareCache(barbershopId, reason = 'data_change') {
  if (!redisClient) {
    redisClient = initRedis()
  }
  
  if (!redisClient) {
    console.warn('⚠️ Redis not available, skipping cache invalidation')
    return false
  }

  try {
    // Find all cache keys for this barbershop
    const pattern = `client-care:shop:${barbershopId}:*`
    const keys = await redisClient.keys(pattern)
    
    if (keys.length > 0) {
      await redisClient.del(...keys)
      console.log(`🗑️ Invalidated ${keys.length} cache entries for shop ${barbershopId} (reason: ${reason})`)
    }
    
    return true

  } catch (error) {
    cacheStats.errors++
    console.error('❌ Cache invalidation error:', error.message)
    return false
  }
}

/**
 * Get cache performance statistics
 */
export function getCacheStats() {
  const now = Date.now()
  const uptimeMs = now - cacheStats.lastReset
  const total = cacheStats.hits + cacheStats.misses
  
  return {
    ...cacheStats,
    uptime_ms: uptimeMs,
    uptime_hours: Math.round((uptimeMs / (1000 * 60 * 60)) * 100) / 100,
    total_requests: total,
    hit_rate: total > 0 ? Math.round((cacheStats.hits / total) * 100) : 0,
    error_rate: total > 0 ? Math.round((cacheStats.errors / total) * 100) : 0,
    redis_connected: redisClient?.status === 'ready'
  }
}

/**
 * Reset cache statistics (for testing/monitoring)
 */
export function resetCacheStats() {
  cacheStats = {
    hits: 0,
    misses: 0,
    errors: 0,
    lastReset: Date.now()
  }
}

/**
 * Health check for Redis connection
 */
export async function healthCheck() {
  if (!redisClient) {
    redisClient = initRedis()
  }
  
  if (!redisClient) {
    return { healthy: false, error: 'Redis client not initialized' }
  }

  try {
    const startTime = Date.now()
    const pong = await redisClient.ping()
    const responseTime = Date.now() - startTime
    
    return {
      healthy: pong === 'PONG',
      response_time_ms: responseTime,
      status: redisClient.status,
      connected: redisClient.status === 'ready'
    }
    
  } catch (error) {
    return {
      healthy: false,
      error: error.message,
      status: redisClient?.status || 'unknown'
    }
  }
}

/**
 * Graceful shutdown
 */
export async function closeRedis() {
  if (redisClient) {
    try {
      await redisClient.quit()
      console.log('👋 Redis client closed gracefully')
    } catch (error) {
      console.error('❌ Error closing Redis client:', error.message)
    }
  }
}

// Auto-initialize on import
if (process.env.NODE_ENV !== 'test') {
  initRedis()
}

// Default export
export default {
  getCachedResults,
  cacheResults,
  invalidateClientCareCache,
  getCacheStats,
  resetCacheStats,
  healthCheck,
  closeRedis,
  generateCacheKey
}