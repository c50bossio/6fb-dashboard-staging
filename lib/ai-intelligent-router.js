/**
 * Intelligent AI Request Router
 * Orchestrates enhanced AI providers, caching, and fallback systems
 */

import { getEnhancedFallbackManager } from './enhanced-ai-provider-fallback.js'
import { getIntelligentCacheManager } from './intelligent-cache-manager.js'
import { callBestAIProvider, classifyBusinessMessage } from './enhanced-ai-providers.js'

// Performance and cost tracking
const PERFORMANCE_METRICS = {
  totalRequests: 0,
  cacheHits: 0,
  providerCalls: 0,
  totalCost: 0,
  totalResponseTime: 0,
  errorRate: 0,
  qualityDistribution: { high: 0, medium: 0, low: 0 }
}

// Request priority levels
const PRIORITY_LEVELS = {
  LOW: 'low',
  NORMAL: 'normal', 
  HIGH: 'high',
  CRITICAL: 'critical'
}

// Cost optimization thresholds
const COST_THRESHOLDS = {
  LOW_BUDGET: 0.001,     // $0.001 per request
  MEDIUM_BUDGET: 0.01,   // $0.01 per request  
  HIGH_BUDGET: 0.05,     // $0.05 per request
  UNLIMITED: Infinity
}

export class IntelligentAIRouter {
  constructor() {
    this.cacheManager = getIntelligentCacheManager()
    this.fallbackManager = getEnhancedFallbackManager()
    this.requestQueue = new Map()
    this.activeRequests = new Set()
    this.rateLimiter = new Map()
    
    // Circuit breaker states for providers
    this.providerHealth = new Map([
      ['openai', { healthy: true, failures: 0, lastFailure: null }],
      ['anthropic', { healthy: true, failures: 0, lastFailure: null }],
      ['gemini', { healthy: true, failures: 0, lastFailure: null }]
    ])
    
    // Request routing strategies
    this.routingStrategies = {
      cost_optimized: this.costOptimizedRouting.bind(this),
      quality_focused: this.qualityFocusedRouting.bind(this),
      speed_focused: this.speedFocusedRouting.bind(this),
      balanced: this.balancedRouting.bind(this)
    }
    
    this.startHealthMonitoring()
  }

  /**
   * Main request processing method with intelligent routing
   */
  async processRequest(message, options = {}) {
    const requestId = this.generateRequestId()
    const startTime = Date.now()
    
    try {
      PERFORMANCE_METRICS.totalRequests++
      
      // Parse and validate request
      const request = this.parseRequest(message, options)
      
      // Check rate limiting
      if (this.isRateLimited(request.userId)) {
        throw new Error('Rate limit exceeded. Please try again in a moment.')
      }
      
      // Try intelligent cache first
      const cachedResult = await this.tryIntelligentCache(request)
      if (cachedResult) {
        PERFORMANCE_METRICS.cacheHits++
        return this.formatResponse(cachedResult, startTime, requestId, 'cache')
      }
      
      // Route to best available provider
      const result = await this.routeToProvider(request)
      
      // Cache successful results
      if (result.success) {
        await this.cacheResult(request, result)
        this.updateProviderHealth(result.provider, true)
      } else {
        this.updateProviderHealth(result.provider, false)
      }
      
      return this.formatResponse(result, startTime, requestId, 'provider')
      
    } catch (error) {
      PERFORMANCE_METRICS.errorRate++
      console.error(`Request ${requestId} failed:`, error)
      
      // Try fallback system
      return await this.handleFailure(message, options, error, startTime, requestId)
    }
  }

  /**
   * Parse and enhance request with context
   */
  parseRequest(message, options) {
    const {
      context = {},
      messageType,
      userId = 'anonymous',
      sessionId = null,
      priority = PRIORITY_LEVELS.NORMAL,
      maxCost = null,
      preferredProviders = [],
      strategy = 'balanced'
    } = options

    // Classify message if type not provided
    const classification = messageType ? 
      { type: messageType, confidence: 0.9 } : 
      classifyBusinessMessage(message)

    return {
      id: this.generateRequestId(),
      message: message.trim(),
      messageType: classification.type,
      confidence: classification.confidence,
      context,
      userId,
      sessionId,
      priority,
      maxCost,
      preferredProviders,
      strategy,
      timestamp: Date.now(),
      barbershop_id: context.barbershop_id || context.shopId
    }
  }

  /**
   * Try intelligent cache with multiple strategies
   */
  async tryIntelligentCache(request) {
    try {
      // Try exact cache match first
      let cachedResult = await this.cacheManager.getIntelligentCache(
        request.message, 
        request.messageType, 
        request.context
      )
      
      if (cachedResult) {
        return {
          success: true,
          response: cachedResult.response,
          provider: cachedResult.provider,
          model: cachedResult.model,
          fromCache: true,
          cacheType: cachedResult.cacheType,
          cost: 0,
          quality: 'cached'
        }
      }
      
      return null
    } catch (error) {
      console.warn('Cache lookup failed:', error)
      return null
    }
  }

  /**
   * Route request to optimal provider based on strategy
   */
  async routeToProvider(request) {
    const strategy = this.routingStrategies[request.strategy] || this.routingStrategies.balanced
    return await strategy(request)
  }

  /**
   * Cost-optimized routing strategy
   */
  async costOptimizedRouting(request) {
    // Try cheapest providers first
    const providerOrder = [
      { provider: 'gemini', maxCost: 0.001 },
      { provider: 'anthropic', maxCost: 0.002 },
      { provider: 'openai', maxCost: 0.005 }
    ]
    
    for (const { provider, maxCost } of providerOrder) {
      if (request.maxCost && maxCost > request.maxCost) continue
      if (!this.isProviderHealthy(provider)) continue
      
      try {
        const result = await this.callProvider(provider, request)
        if (result.success) {
          return result
        }
      } catch (error) {
        console.warn(`Cost-optimized routing failed for ${provider}:`, error.message)
        continue
      }
    }
    
    throw new Error('All cost-optimized providers failed')
  }

  /**
   * Quality-focused routing strategy  
   */
  async qualityFocusedRouting(request) {
    // Route based on message type and provider strengths
    const qualityProviders = {
      'business_coach': ['anthropic', 'openai', 'gemini'],
      'financial_advisor': ['anthropic', 'openai', 'gemini'], 
      'marketing_expert': ['openai', 'gemini', 'anthropic'],
      'customer_service': ['openai', 'anthropic', 'gemini']
    }
    
    const providers = qualityProviders[request.messageType] || ['anthropic', 'openai', 'gemini']
    
    for (const provider of providers) {
      if (!this.isProviderHealthy(provider)) continue
      
      try {
        const result = await this.callProvider(provider, request)
        if (result.success && result.quality !== 'low') {
          return result
        }
      } catch (error) {
        console.warn(`Quality-focused routing failed for ${provider}:`, error.message)
        continue
      }
    }
    
    throw new Error('All quality-focused providers failed')
  }

  /**
   * Speed-focused routing strategy
   */
  async speedFocusedRouting(request) {
    // Try fastest providers first based on recent performance
    const providerLatency = Array.from(this.providerHealth.entries())
      .filter(([_, health]) => health.healthy)
      .sort((a, b) => (a[1].avgLatency || 5000) - (b[1].avgLatency || 5000))
      .map(([provider, _]) => provider)
    
    for (const provider of providerLatency) {
      try {
        const result = await this.callProvider(provider, request)
        if (result.success) {
          return result
        }
      } catch (error) {
        console.warn(`Speed-focused routing failed for ${provider}:`, error.message)
        continue
      }
    }
    
    throw new Error('All speed-focused providers failed')
  }

  /**
   * Balanced routing strategy
   */
  async balancedRouting(request) {
    // Use the enhanced fallback manager's intelligent selection
    try {
      const result = await this.fallbackManager.processRequest(request.message, {
        context: request.context,
        messageType: request.messageType,
        userId: request.userId,
        sessionId: request.sessionId,
        priority: request.priority,
        maxCost: request.maxCost,
        preferredProviders: request.preferredProviders
      })
      
      return {
        success: true,
        ...result,
        strategy: 'balanced'
      }
    } catch (error) {
      return {
        success: false,
        error: error.message
      }
    }
  }

  /**
   * Call specific provider with enhanced error handling
   */
  async callProvider(provider, request) {
    const startTime = Date.now()
    
    try {
      const result = await callBestAIProvider(
        request.message,
        request.messageType,
        request.context
      )
      
      const responseTime = Date.now() - startTime
      this.updateProviderLatency(provider, responseTime)
      
      return {
        success: true,
        response: result.response,
        provider: result.provider,
        model: result.model,
        cost: this.estimateCost(result),
        quality: result.quality,
        responseTime,
        tokens_used: result.tokens_used,
        confidence: result.confidence
      }
    } catch (error) {
      const responseTime = Date.now() - startTime
      this.updateProviderLatency(provider, responseTime)
      
      return {
        success: false,
        error: error.message,
        provider,
        responseTime
      }
    }
  }

  /**
   * Cache successful results intelligently
   */
  async cacheResult(request, result) {
    try {
      const shouldCache = result.cost > 0.001 || // Cost threshold
                         result.quality === 'high' || // High quality
                         result.responseTime > 3000  // Slow responses
      
      if (shouldCache) {
        await this.cacheManager.cacheIntelligentResponse(
          request.message,
          request.messageType,
          result.response,
          request.context,
          {
            provider: result.provider,
            model: result.model,
            cost: result.cost,
            responseTime: result.responseTime,
            quality: result.quality
          }
        )
      }
    } catch (error) {
      console.warn('Failed to cache result:', error)
    }
  }

  /**
   * Handle request failures with fallback
   */
  async handleFailure(message, options, originalError, startTime, requestId) {
    try {
      // Try the fallback manager
      const fallbackResult = await this.fallbackManager.generateIntelligentFallback(
        message,
        options.messageType || 'general',
        options.context || {},
        originalError
      )
      
      return this.formatResponse(fallbackResult, startTime, requestId, 'fallback')
    } catch (fallbackError) {
      // Ultimate fallback
      return this.formatResponse({
        success: false,
        response: "I'm experiencing technical difficulties. Please try again in a moment or contact support if the issue persists.",
        provider: 'system',
        fromCache: false,
        cost: 0,
        error: originalError.message
      }, startTime, requestId, 'error')
    }
  }

  /**
   * Format unified response structure
   */
  formatResponse(result, startTime, requestId, source) {
    const responseTime = Date.now() - startTime
    PERFORMANCE_METRICS.totalResponseTime += responseTime
    
    if (result.quality) {
      PERFORMANCE_METRICS.qualityDistribution[result.quality]++
    }
    
    if (result.cost) {
      PERFORMANCE_METRICS.totalCost += result.cost
    }
    
    return {
      id: requestId,
      response: result.response,
      provider: result.provider || 'unknown',
      model: result.model,
      source, // 'cache', 'provider', 'fallback', 'error'
      fromCache: result.fromCache || false,
      cost: result.cost || 0,
      responseTime,
      quality: result.quality || 'unknown',
      confidence: result.confidence || 0.5,
      timestamp: Date.now(),
      
      // Additional metadata
      cacheType: result.cacheType,
      similarityScore: result.similarityScore,
      tokens_used: result.tokens_used,
      strategy: result.strategy || 'unknown',
      
      // Error information if applicable
      error: result.error,
      suggestion: result.suggestion
    }
  }

  /**
   * Rate limiting check
   */
  isRateLimited(userId) {
    const now = Date.now()
    const userLimits = this.rateLimiter.get(userId) || { requests: 0, windowStart: now }
    
    // Reset window if needed (1 minute windows)
    if (now - userLimits.windowStart > 60000) {
      userLimits.requests = 0
      userLimits.windowStart = now
    }
    
    // Check limits (30 requests per minute)
    if (userLimits.requests >= 30) {
      return true
    }
    
    userLimits.requests++
    this.rateLimiter.set(userId, userLimits)
    return false
  }

  /**
   * Provider health management
   */
  isProviderHealthy(provider) {
    const health = this.providerHealth.get(provider)
    if (!health) return false
    
    // Circuit breaker logic
    const circuitBreakerThreshold = 5
    const circuitBreakerTimeout = 300000 // 5 minutes
    
    if (health.failures >= circuitBreakerThreshold) {
      if (Date.now() - health.lastFailure < circuitBreakerTimeout) {
        return false
      } else {
        // Reset circuit breaker
        health.failures = 0
        health.healthy = true
      }
    }
    
    return health.healthy
  }

  updateProviderHealth(provider, success) {
    const health = this.providerHealth.get(provider)
    if (!health) return
    
    if (success) {
      health.healthy = true
      health.failures = Math.max(0, health.failures - 1)
    } else {
      health.failures++
      health.lastFailure = Date.now()
      if (health.failures >= 3) {
        health.healthy = false
      }
    }
  }

  updateProviderLatency(provider, latency) {
    const health = this.providerHealth.get(provider)
    if (health) {
      health.avgLatency = health.avgLatency ? 
        (health.avgLatency + latency) / 2 : 
        latency
    }
  }

  /**
   * Health monitoring
   */
  startHealthMonitoring() {
    // Health checks every 5 minutes
    setInterval(() => {
      this.performHealthChecks()
    }, 300000)
    
    // Cleanup old rate limit entries every 10 minutes
    setInterval(() => {
      this.cleanupRateLimiters()
    }, 600000)
  }

  async performHealthChecks() {
    // This would integrate with provider health check methods
    console.log('Performing health checks...')
  }

  cleanupRateLimiters() {
    const now = Date.now()
    for (const [userId, limits] of this.rateLimiter.entries()) {
      if (now - limits.windowStart > 300000) { // 5 minutes
        this.rateLimiter.delete(userId)
      }
    }
  }

  /**
   * Cost estimation
   */
  estimateCost(result) {
    const costPerProvider = {
      openai: 0.002,
      anthropic: 0.0015,
      gemini: 0.001
    }
    
    const baseCost = costPerProvider[result.provider] || 0.002
    return baseCost * ((result.tokens_used || 500) / 1000)
  }

  /**
   * Utility methods
   */
  generateRequestId() {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  /**
   * Get system performance metrics
   */
  getPerformanceMetrics() {
    const avgResponseTime = PERFORMANCE_METRICS.totalRequests > 0 ?
      PERFORMANCE_METRICS.totalResponseTime / PERFORMANCE_METRICS.totalRequests : 0
    
    const cacheHitRate = PERFORMANCE_METRICS.totalRequests > 0 ?
      PERFORMANCE_METRICS.cacheHits / PERFORMANCE_METRICS.totalRequests : 0
    
    return {
      ...PERFORMANCE_METRICS,
      avgResponseTime,
      cacheHitRate,
      costPerRequest: PERFORMANCE_METRICS.totalRequests > 0 ?
        PERFORMANCE_METRICS.totalCost / PERFORMANCE_METRICS.totalRequests : 0,
      providerHealth: Object.fromEntries(this.providerHealth)
    }
  }

  /**
   * Reset performance metrics
   */
  resetMetrics() {
    Object.keys(PERFORMANCE_METRICS).forEach(key => {
      if (typeof PERFORMANCE_METRICS[key] === 'number') {
        PERFORMANCE_METRICS[key] = 0
      } else if (typeof PERFORMANCE_METRICS[key] === 'object') {
        Object.keys(PERFORMANCE_METRICS[key]).forEach(subKey => {
          PERFORMANCE_METRICS[key][subKey] = 0
        })
      }
    })
  }
}

// Export singleton instance
let intelligentRouter = null

export function getIntelligentRouter() {
  if (!intelligentRouter) {
    intelligentRouter = new IntelligentAIRouter()
  }
  return intelligentRouter
}

export default getIntelligentRouter()