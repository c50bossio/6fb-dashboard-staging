/**
 * Google My Business API Rate Limiter
 * Implements rate limiting and quota management for GMB API compliance
 */

// Initialize Redis client (fallback to in-memory for development)
// Note: Redis is not compatible with Edge Runtime, so we use in-memory only
let redis = null

/**
 * Rate limiting configuration based on Google My Business API limits
 * - Standard quota: 1000 requests per day per project
 * - Burst limit: 100 requests per minute per project
 * - Per-location limits: 50 requests per minute per location
 */
const RATE_LIMITS = {
  // Global project limits
  DAILY_QUOTA: {
    limit: 1000,
    window: 24 * 60 * 60, // 24 hours in seconds
    key: 'gmb:quota:daily'
  },
  
  // Burst protection
  MINUTE_BURST: {
    limit: 100,
    window: 60, // 1 minute in seconds  
    key: 'gmb:burst:minute'
  },
  
  // Per-location limits
  LOCATION_MINUTE: {
    limit: 50,
    window: 60, // 1 minute in seconds
    keyPrefix: 'gmb:location:'
  },
  
  // OAuth token refresh limits
  TOKEN_REFRESH: {
    limit: 10,
    window: 60 * 60, // 1 hour in seconds
    keyPrefix: 'gmb:token:'
  }
}

/**
 * In-memory fallback for development environments without Redis
 */
class InMemoryRateLimiter {
  constructor() {
    this.store = new Map()
    this.timers = new Map()
  }

  async get(key) {
    const data = this.store.get(key)
    if (!data) return null
    
    if (Date.now() > data.expiry) {
      this.store.delete(key)
      if (this.timers.has(key)) {
        clearTimeout(this.timers.get(key))
        this.timers.delete(key)
      }
      return null
    }
    
    return data.value
  }

  async setex(key, seconds, value) {
    const expiry = Date.now() + (seconds * 1000)
    this.store.set(key, { value, expiry })
    
    // Set cleanup timer
    if (this.timers.has(key)) {
      clearTimeout(this.timers.get(key))
    }
    
    const timer = setTimeout(() => {
      this.store.delete(key)
      this.timers.delete(key)
    }, seconds * 1000)
    
    this.timers.set(key, timer)
  }

  async incr(key) {
    const current = await this.get(key)
    const newValue = (current || 0) + 1
    
    // Keep existing expiry if it exists
    const data = this.store.get(key)
    if (data) {
      this.store.set(key, { value: newValue, expiry: data.expiry })
    }
    
    return newValue
  }

  async ttl(key) {
    const data = this.store.get(key)
    if (!data) return -2
    
    const remaining = Math.max(0, data.expiry - Date.now())
    return Math.ceil(remaining / 1000)
  }
}

const memoryLimiter = new InMemoryRateLimiter()

/**
 * Check if request is within rate limits
 */
export async function checkRateLimit(type, identifier = null) {
  const client = redis || memoryLimiter
  
  try {
    let config
    let key
    
    switch (type) {
      case 'DAILY_QUOTA':
        config = RATE_LIMITS.DAILY_QUOTA
        key = config.key
        break
        
      case 'MINUTE_BURST':
        config = RATE_LIMITS.MINUTE_BURST
        key = config.key
        break
        
      case 'LOCATION_MINUTE':
        if (!identifier) throw new Error('Location identifier required for location rate limiting')
        config = RATE_LIMITS.LOCATION_MINUTE
        key = `${config.keyPrefix}${identifier}`
        break
        
      case 'TOKEN_REFRESH':
        if (!identifier) throw new Error('User/barbershop identifier required for token refresh limiting')
        config = RATE_LIMITS.TOKEN_REFRESH
        key = `${config.keyPrefix}${identifier}`
        break
        
      default:
        throw new Error(`Unknown rate limit type: ${type}`)
    }
    
    // Get current count
    const current = await client.get(key) || 0
    const currentCount = parseInt(current)
    
    // Check if limit exceeded
    if (currentCount >= config.limit) {
      const ttl = await client.ttl(key)
      return {
        allowed: false,
        limit: config.limit,
        remaining: 0,
        resetTime: Date.now() + (ttl * 1000),
        retryAfter: ttl
      }
    }
    
    // Increment counter
    const newCount = await client.incr(key)
    
    // Set expiry if this is the first request in the window
    if (newCount === 1) {
      await client.setex(key, config.window, 1)
    }
    
    return {
      allowed: true,
      limit: config.limit,
      remaining: Math.max(0, config.limit - newCount),
      resetTime: Date.now() + (config.window * 1000),
      retryAfter: 0
    }
    
  } catch (error) {
    console.error('Rate limiting error:', error)
    // Fail open - allow request but log error
    return {
      allowed: true,
      limit: 0,
      remaining: 0,
      resetTime: Date.now(),
      retryAfter: 0,
      error: error.message
    }
  }
}

/**
 * Comprehensive rate limit check for GMB API requests
 */
export async function checkGMBRateLimit(barbershopId, locationId = null) {
  const checks = []
  
  // Check daily quota
  checks.push(checkRateLimit('DAILY_QUOTA'))
  
  // Check burst limits
  checks.push(checkRateLimit('MINUTE_BURST'))
  
  // Check location-specific limits if location provided
  if (locationId) {
    checks.push(checkRateLimit('LOCATION_MINUTE', locationId))
  }
  
  const results = await Promise.all(checks)
  
  // Find the most restrictive limit
  const blocked = results.find(result => !result.allowed)
  if (blocked) {
    return blocked
  }
  
  // Return the most restrictive remaining limit
  const mostRestrictive = results.reduce((min, current) => 
    current.remaining < min.remaining ? current : min
  )
  
  return mostRestrictive
}

/**
 * Log API usage for audit compliance
 */
export async function logGMBApiUsage({
  barbershopId,
  userId,
  endpoint,
  method = 'GET',
  locationId = null,
  success = true,
  responseTime = null,
  rateLimitInfo = null
}) {
  const client = redis || memoryLimiter
  
  const logEntry = {
    timestamp: new Date().toISOString(),
    barbershop_id: barbershopId,
    user_id: userId,
    endpoint,
    method,
    location_id: locationId,
    success,
    response_time_ms: responseTime,
    rate_limit_info: rateLimitInfo,
    ip_address: null, // Will be added by the API route
    user_agent: null  // Will be added by the API route
  }
  
  try {
    // Store in daily log bucket for audit compliance
    const dateKey = new Date().toISOString().split('T')[0]
    const logKey = `gmb:audit:${dateKey}`
    
    // Development logging to console
    // In production, should integrate with external logging service
    console.log('GMB API Usage:', logEntry)
    
    // Update usage statistics
    const statsKey = `gmb:stats:${dateKey}:${barbershopId}`
    await client.incr(statsKey)
    
  } catch (error) {
    console.error('Failed to log GMB API usage:', error)
  }
}

/**
 * Get current usage statistics for a barbershop
 */
export async function getGMBUsageStats(barbershopId, days = 7) {
  const client = redis || memoryLimiter
  
  try {
    const stats = []
    const today = new Date()
    
    for (let i = 0; i < days; i++) {
      const date = new Date(today)
      date.setDate(date.getDate() - i)
      const dateKey = date.toISOString().split('T')[0]
      const statsKey = `gmb:stats:${dateKey}:${barbershopId}`
      
      const count = await client.get(statsKey) || 0
      stats.push({
        date: dateKey,
        requests: parseInt(count)
      })
    }
    
    return stats.reverse() // Return chronological order
    
  } catch (error) {
    console.error('Failed to get GMB usage stats:', error)
    return []
  }
}

/**
 * Check if barbershop is approaching quota limits
 */
export async function checkQuotaHealth(barbershopId) {
  try {
    const dailyLimit = await checkRateLimit('DAILY_QUOTA')
    const burstLimit = await checkRateLimit('MINUTE_BURST')
    const usageStats = await getGMBUsageStats(barbershopId, 1)
    
    const todayUsage = usageStats[0]?.requests || 0
    const dailyUtilization = (RATE_LIMITS.DAILY_QUOTA.limit - dailyLimit.remaining) / RATE_LIMITS.DAILY_QUOTA.limit
    
    return {
      healthy: dailyUtilization < 0.8, // Alert if over 80% of quota used
      daily_utilization: dailyUtilization,
      daily_remaining: dailyLimit.remaining,
      burst_remaining: burstLimit.remaining,
      today_requests: todayUsage,
      warnings: dailyUtilization > 0.8 ? ['Approaching daily quota limit'] : []
    }
    
  } catch (error) {
    console.error('Failed to check quota health:', error)
    return {
      healthy: false,
      error: error.message
    }
  }
}