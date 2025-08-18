/**
 * Redis-based Rate Limiter with In-Memory Fallback
 * Provides persistent rate limiting across server restarts and multiple instances
 */

import Redis from 'ioredis'

class RedisRateLimiter {
  constructor() {
    this.redis = null
    this.memoryStore = new Map()
    this.isRedisAvailable = false
    this.connectionAttempts = 0
    this.maxConnectionAttempts = 3
    this.reconnectTimeout = null
    
    this.initializeRedis()
  }

  /**
   * Initialize Redis connection with fallback to memory
   */
  async initializeRedis() {
    if (!process.env.REDIS_URL && !process.env.REDIS_HOST) {
      if (process.env.NODE_ENV === 'development') {
      }
      return
    }

    try {
      const redisConfig = this.getRedisConfig()
      this.redis = new Redis(redisConfig)

      this.redis.on('connect', () => {
        this.isRedisAvailable = true
        this.connectionAttempts = 0
        if (process.env.NODE_ENV === 'development') {
        }
      })

      this.redis.on('error', (error) => {
        this.isRedisAvailable = false
        console.warn('⚠️ Redis connection error, falling back to memory:', error.message)
        this.handleRedisError()
      })

      this.redis.on('close', () => {
        this.isRedisAvailable = false
        if (process.env.NODE_ENV === 'development') {
        }
      })

      await this.redis.ping()
      
    } catch (error) {
      console.warn('⚠️ Failed to initialize Redis, using in-memory rate limiting:', error.message)
      this.isRedisAvailable = false
    }
  }

  /**
   * Get Redis configuration from environment variables
   */
  getRedisConfig() {
    if (process.env.REDIS_URL) {
      return {
        host: process.env.REDIS_URL,
        retryDelayOnFailover: 100,
        retryDelayOnClusterDown: 300,
        retryDelayOnError: 100,
        maxRetriesPerRequest: 3,
        lazyConnect: true
      }
    }

    return {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT) || 6379,
      password: process.env.REDIS_PASSWORD || undefined,
      db: parseInt(process.env.REDIS_DB) || 0,
      retryDelayOnFailover: 100,
      retryDelayOnClusterDown: 300,
      retryDelayOnError: 100,
      maxRetriesPerRequest: 3,
      lazyConnect: true
    }
  }

  /**
   * Handle Redis connection errors with reconnection logic
   */
  handleRedisError() {
    if (this.connectionAttempts >= this.maxConnectionAttempts) {
      console.warn('⚠️ Max Redis reconnection attempts reached, using in-memory rate limiting')
      return
    }

    this.connectionAttempts++
    
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout)
    }

    const delay = Math.pow(2, this.connectionAttempts) * 1000
    
    this.reconnectTimeout = setTimeout(() => {
      this.initializeRedis()
    }, delay)
  }

  /**
   * Check if request is rate limited
   * @param {string} key - Rate limit key (e.g., "ip:endpoint")
   * @param {number} limit - Maximum requests allowed
   * @param {number} windowMs - Time window in milliseconds
   * @returns {Promise<Object>} Rate limit result
   */
  async isRateLimited(key, limit = 60, windowMs = 60000) {
    const now = Date.now()
    const windowStart = Math.floor(now / windowMs) * windowMs
    const redisKey = `rate_limit:${key}:${windowStart}`

    try {
      if (this.isRedisAvailable && this.redis) {
        return await this.checkRedisRateLimit(redisKey, limit, windowMs)
      } else {
        return this.checkMemoryRateLimit(key, limit, windowMs)
      }
    } catch (error) {
      console.warn('⚠️ Rate limit check failed, falling back to memory:', error.message)
      return this.checkMemoryRateLimit(key, limit, windowMs)
    }
  }

  /**
   * Check rate limit using Redis
   */
  async checkRedisRateLimit(redisKey, limit, windowMs) {
    const pipeline = this.redis.pipeline()
    
    pipeline.incr(redisKey)
    
    pipeline.expire(redisKey, Math.ceil(windowMs / 1000))
    
    const results = await pipeline.exec()
    const count = results[0][1] // Get the incremented value

    const isLimited = count > limit
    const resetTime = Date.now() + windowMs

    return {
      isLimited,
      count,
      limit,
      resetTime,
      remaining: Math.max(0, limit - count),
      source: 'redis'
    }
  }

  /**
   * Check rate limit using in-memory storage
   */
  checkMemoryRateLimit(key, limit, windowMs) {
    const now = Date.now()

    if (!this.memoryStore.has(key)) {
      this.memoryStore.set(key, { count: 1, resetTime: now + windowMs })
      return {
        isLimited: false,
        count: 1,
        limit,
        resetTime: now + windowMs,
        remaining: limit - 1,
        source: 'memory'
      }
    }

    const data = this.memoryStore.get(key)

    if (now > data.resetTime) {
      this.memoryStore.set(key, { count: 1, resetTime: now + windowMs })
      return {
        isLimited: false,
        count: 1,
        limit,
        resetTime: now + windowMs,
        remaining: limit - 1,
        source: 'memory'
      }
    }

    const isLimited = data.count >= limit
    
    if (!isLimited) {
      data.count++
    }

    return {
      isLimited,
      count: data.count,
      limit,
      resetTime: data.resetTime,
      remaining: Math.max(0, limit - data.count),
      source: 'memory'
    }
  }

  /**
   * Clear rate limit for a specific key
   * @param {string} key - Rate limit key to clear
   */
  async clearRateLimit(key) {
    try {
      if (this.isRedisAvailable && this.redis) {
        const pattern = `rate_limit:${key}:*`
        const keys = await this.redis.keys(pattern)
        if (keys.length > 0) {
          await this.redis.del(...keys)
        }
      }
      
      this.memoryStore.delete(key)
      
      return true
    } catch (error) {
      console.warn('⚠️ Failed to clear rate limit:', error.message)
      return false
    }
  }

  /**
   * Get rate limit status for a key
   * @param {string} key - Rate limit key
   * @param {number} limit - Maximum requests allowed
   * @param {number} windowMs - Time window in milliseconds
   * @returns {Promise<Object>} Current rate limit status
   */
  async getRateLimitStatus(key, limit = 60, windowMs = 60000) {
    const now = Date.now()
    const windowStart = Math.floor(now / windowMs) * windowMs
    const redisKey = `rate_limit:${key}:${windowStart}`

    try {
      if (this.isRedisAvailable && this.redis) {
        const count = await this.redis.get(redisKey) || 0
        const ttl = await this.redis.ttl(redisKey)
        const resetTime = ttl > 0 ? now + (ttl * 1000) : now + windowMs

        return {
          count: parseInt(count),
          limit,
          resetTime,
          remaining: Math.max(0, limit - parseInt(count)),
          source: 'redis'
        }
      } else {
        const data = this.memoryStore.get(key)
        if (!data) {
          return {
            count: 0,
            limit,
            resetTime: now + windowMs,
            remaining: limit,
            source: 'memory'
          }
        }

        return {
          count: data.count,
          limit,
          resetTime: data.resetTime,
          remaining: Math.max(0, limit - data.count),
          source: 'memory'
        }
      }
    } catch (error) {
      console.warn('⚠️ Failed to get rate limit status:', error.message)
      return {
        count: 0,
        limit,
        resetTime: now + windowMs,
        remaining: limit,
        source: 'error'
      }
    }
  }

  /**
   * Clean up expired entries from memory store
   */
  cleanupMemoryStore() {
    const now = Date.now()
    for (const [key, data] of this.memoryStore.entries()) {
      if (now > data.resetTime) {
        this.memoryStore.delete(key)
      }
    }
  }

  /**
   * Get connection status
   */
  getStatus() {
    return {
      redisAvailable: this.isRedisAvailable,
      connectionAttempts: this.connectionAttempts,
      memoryEntries: this.memoryStore.size,
      source: this.isRedisAvailable ? 'redis' : 'memory'
    }
  }

  /**
   * Gracefully close Redis connection
   */
  async close() {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout)
    }

    if (this.redis) {
      await this.redis.quit()
    }

    this.memoryStore.clear()
  }
}

const rateLimiter = new RedisRateLimiter()

setInterval(() => {
  rateLimiter.cleanupMemoryStore()
}, 5 * 60 * 1000)

export default rateLimiter