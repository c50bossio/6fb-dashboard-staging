/**
 * Enhanced AI Provider Fallback System
 * Improved error handling, retry logic, and intelligent provider selection
 */

import { getCacheManager } from './ai-cache-manager.js'
import { callOpenAI, callAnthropic, callGemini, checkAIProvidersHealth } from './ai-providers.js'

// Enhanced error types for better handling
const ERROR_TYPES = {
  RATE_LIMIT: 'rate_limit',
  API_ERROR: 'api_error', 
  NETWORK_ERROR: 'network_error',
  QUOTA_EXCEEDED: 'quota_exceeded',
  AUTHENTICATION: 'authentication',
  TIMEOUT: 'timeout',
  MODEL_OVERLOADED: 'model_overloaded',
  CONTEXT_LENGTH_EXCEEDED: 'context_length_exceeded',
  CONTENT_POLICY_VIOLATION: 'content_policy_violation',
  UNKNOWN: 'unknown'
}

// Enhanced retry configuration
const RETRY_CONFIG = {
  maxRetries: 4,
  baseDelay: 800, // Start with 800ms
  maxDelay: 15000, // Maximum 15 seconds
  backoffMultiplier: 2,
  jitter: 0.1, // Add randomness to prevent thundering herd
  retriableErrors: [
    ERROR_TYPES.RATE_LIMIT,
    ERROR_TYPES.NETWORK_ERROR,
    ERROR_TYPES.TIMEOUT,
    ERROR_TYPES.MODEL_OVERLOADED,
    ERROR_TYPES.API_ERROR
  ]
}

// Provider configurations with enhanced settings
const PROVIDER_CONFIGS = {
  openai: {
    id: 'openai',
    name: 'OpenAI GPT',
    priority: 1,
    timeout: 15000,
    costPerToken: 0.002, // Approximate cost
    capabilities: ['chat', 'analysis', 'code', 'creative'],
    strengths: ['general_purpose', 'coding', 'analysis'],
    weaknesses: ['cost'],
    models: ['gpt-4', 'gpt-5', 'gpt-5-mini']
  },
  anthropic: {
    id: 'anthropic',
    name: 'Anthropic Claude',
    priority: 2,
    timeout: 20000,
    costPerToken: 0.0015,
    capabilities: ['chat', 'analysis', 'reasoning', 'safety'],
    strengths: ['reasoning', 'safety', 'long_context'],
    weaknesses: ['availability'],
    models: ['claude-3-5-sonnet', 'claude-opus-4-1']
  },
  google: {
    id: 'google',
    name: 'Google Gemini',
    priority: 3,
    timeout: 12000,
    costPerToken: 0.001,
    capabilities: ['chat', 'analysis', 'multimodal'],
    strengths: ['cost_effective', 'speed', 'multimodal'],
    weaknesses: ['reasoning_depth'],
    models: ['gemini-2.0-flash-exp', 'gemini-pro']
  }
}

export class EnhancedAIProviderFallback {
  constructor() {
    this.providers = Object.values(PROVIDER_CONFIGS)
    this.cache = getCacheManager()
    this.circuitBreakers = new Map()
    this.metrics = new Map()
    this.healthStatus = new Map()
    this.fallbackResponses = new Map()
    
    // Initialize metrics for each provider
    this.providers.forEach(provider => {
      this.metrics.set(provider.id, {
        totalRequests: 0,
        successfulRequests: 0,
        failedRequests: 0,
        totalResponseTime: 0,
        avgResponseTime: 0,
        totalCost: 0,
        lastUsed: null,
        consecutiveFailures: 0,
        consecutiveSuccesses: 0
      })
      
      this.healthStatus.set(provider.id, {
        isHealthy: true,
        lastHealthCheck: null,
        healthScore: 100,
        isAvailable: true
      })
    })
    
    this.initializeFallbackResponses()
    this.startHealthMonitoring()
  }

  /**
   * Enhanced fallback response system
   */
  initializeFallbackResponses() {
    this.fallbackResponses.set('business_analysis', [
      "I'm experiencing connectivity issues with my advanced AI services. However, I can suggest checking your dashboard analytics for business metrics, or you can ask me a more specific question that I might be able to help with using my basic capabilities.",
      "My full business analysis AI is temporarily unavailable. Try reviewing your recent performance data in the dashboard, or ask me about specific aspects like revenue, bookings, or operations.",
      "While my advanced business AI is reconnecting, you can explore the analytics section for immediate insights, or I can help with basic business questions using my fallback capabilities."
    ])
    
    this.fallbackResponses.set('operational_guidance', [
      "My operational AI advisor is currently limited. For immediate help, check your staff schedules and appointment calendar, or ask about specific operational areas where I might assist with basic guidance.",
      "Operations analysis is temporarily restricted. Consider reviewing your current workflows in the operations dashboard or asking more targeted questions about scheduling, staff, or processes.",
      "Full operational intelligence is reconnecting. Meanwhile, you can check operational metrics in your dashboard or ask specific questions about day-to-day operations."
    ])
    
    // Add more sophisticated fallback categories...
  }

  /**
   * Enhanced request processing with intelligent routing
   */
  async processRequest(message, options = {}) {
    const {
      context = {},
      messageType = 'general',
      userId = null,
      sessionId = null,
      priority = 'normal',
      maxCost = null,
      preferredProviders = []
    } = options

    // Check cache first with enhanced key generation
    const cacheKey = this.generateEnhancedCacheKey(message, context, messageType)
    const cachedResponse = await this.cache.getCachedResponse(message, messageType, context)
    
    if (cachedResponse) {
      return {
        ...cachedResponse,
        source: 'cache',
        cost: 0,
        responseTime: 0
      }
    }

    // Select optimal provider based on message type and current conditions
    const providerSequence = this.selectOptimalProviders(messageType, preferredProviders, maxCost)
    
    let lastError = null
    let totalCost = 0
    
    for (const provider of providerSequence) {
      try {
        const result = await this.tryProviderWithRetry(provider, message, options)
        
        if (result.success) {
          // Cache successful response
          await this.cache.cacheResponse(message, messageType, result.response, context, this.calculateCacheTTL(result))
          
          // Update metrics
          this.updateSuccessMetrics(provider.id, result.responseTime, result.cost)
          
          return {
            response: result.response,
            provider: provider.id,
            model: result.model,
            responseTime: result.responseTime,
            cost: result.cost,
            fromCache: false,
            quality: result.quality || 'good'
          }
        }
        
        totalCost += result.cost || 0
        lastError = result.error
        
      } catch (error) {
        lastError = error
        this.updateErrorMetrics(provider.id, error)
      }
    }

    // All providers failed - return intelligent fallback
    console.warn('All AI providers failed, using fallback response')
    return await this.generateIntelligentFallback(message, messageType, context, lastError)
  }

  /**
   * Try provider with enhanced retry logic
   */
  async tryProviderWithRetry(provider, message, options, retryCount = 0) {
    const startTime = Date.now()
    
    try {
      // Check circuit breaker
      if (this.isCircuitBreakerOpen(provider.id)) {
        throw new Error(`Circuit breaker open for ${provider.id}`)
      }

      // Check provider health
      if (!this.isProviderHealthy(provider.id)) {
        throw new Error(`Provider ${provider.id} is unhealthy`)
      }

      const result = await this.callProvider(provider, message, options)
      
      if (result.success) {
        this.closeCircuitBreaker(provider.id)
        return {
          success: true,
          response: result.response,
          model: result.model,
          responseTime: Date.now() - startTime,
          cost: this.calculateCost(provider, result),
          quality: this.assessResponseQuality(result.response)
        }
      }

      throw new Error(result.error || 'Provider call failed')
      
    } catch (error) {
      const errorType = this.classifyError(error)
      const responseTime = Date.now() - startTime
      
      // Determine if we should retry
      if (this.shouldRetry(errorType, retryCount)) {
        const delay = this.calculateRetryDelay(retryCount)
        console.log(`Retrying ${provider.id} after ${delay}ms (attempt ${retryCount + 1}/${RETRY_CONFIG.maxRetries})`)
        
        await this.sleep(delay)
        return await this.tryProviderWithRetry(provider, message, options, retryCount + 1)
      }

      // Update circuit breaker
      this.recordProviderError(provider.id, errorType)
      
      return {
        success: false,
        error: error.message,
        errorType,
        responseTime,
        cost: 0
      }
    }
  }

  /**
   * Enhanced provider calling with better error handling
   */
  async callProvider(provider, message, options) {
    const { context = {}, messageType = 'general' } = options
    
    try {
      let result
      
      switch (provider.id) {
        case 'openai':
          result = await callOpenAI(message, messageType, context)
          break
        case 'anthropic':
          result = await callAnthropic(message, messageType, context)
          break
        case 'google':
          result = await callGemini(message, messageType, context)
          break
        default:
          throw new Error(`Unknown provider: ${provider.id}`)
      }

      return {
        success: true,
        response: result.response,
        model: result.model,
        tokensUsed: result.tokens_used || 0,
        confidence: result.confidence || 0.8
      }
      
    } catch (error) {
      return {
        success: false,
        error: error.message
      }
    }
  }

  /**
   * Intelligent provider selection based on context
   */
  selectOptimalProviders(messageType, preferredProviders = [], maxCost = null) {
    let providers = [...this.providers]
    
    // Filter by preferred providers if specified
    if (preferredProviders.length > 0) {
      const preferred = providers.filter(p => preferredProviders.includes(p.id))
      const others = providers.filter(p => !preferredProviders.includes(p.id))
      providers = [...preferred, ...others]
    }
    
    // Filter by cost constraints
    if (maxCost !== null) {
      providers = providers.filter(p => p.costPerToken <= maxCost)
    }
    
    // Sort by health score and suitability for message type
    providers.sort((a, b) => {
      const aScore = this.calculateProviderScore(a, messageType)
      const bScore = this.calculateProviderScore(b, messageType)
      return bScore - aScore
    })
    
    return providers.filter(p => this.isProviderAvailable(p.id))
  }

  /**
   * Calculate provider score for message type
   */
  calculateProviderScore(provider, messageType) {
    const health = this.healthStatus.get(provider.id)
    const metrics = this.metrics.get(provider.id)
    
    let score = health.healthScore
    
    // Adjust for message type suitability
    if (messageType === 'business_coach' && provider.strengths.includes('reasoning')) {
      score += 20
    } else if (messageType === 'financial_advisor' && provider.strengths.includes('analysis')) {
      score += 15
    } else if (messageType === 'marketing_expert' && provider.strengths.includes('creative')) {
      score += 10
    }
    
    // Adjust for recent performance
    if (metrics.consecutiveFailures > 2) {
      score -= 30
    } else if (metrics.consecutiveSuccesses > 5) {
      score += 10
    }
    
    // Adjust for response time
    if (metrics.avgResponseTime < 2000) {
      score += 5
    } else if (metrics.avgResponseTime > 10000) {
      score -= 10
    }
    
    return Math.max(0, score)
  }

  /**
   * Enhanced error classification
   */
  classifyError(error) {
    const message = error.message.toLowerCase()
    
    if (message.includes('rate limit') || message.includes('429')) {
      return ERROR_TYPES.RATE_LIMIT
    } else if (message.includes('timeout') || message.includes('aborted')) {
      return ERROR_TYPES.TIMEOUT
    } else if (message.includes('quota') || message.includes('insufficient')) {
      return ERROR_TYPES.QUOTA_EXCEEDED
    } else if (message.includes('auth') || message.includes('401') || message.includes('403')) {
      return ERROR_TYPES.AUTHENTICATION
    } else if (message.includes('overloaded') || message.includes('503')) {
      return ERROR_TYPES.MODEL_OVERLOADED
    } else if (message.includes('context') || message.includes('token limit')) {
      return ERROR_TYPES.CONTEXT_LENGTH_EXCEEDED
    } else if (message.includes('network') || message.includes('connection')) {
      return ERROR_TYPES.NETWORK_ERROR
    } else if (message.includes('content policy') || message.includes('safety')) {
      return ERROR_TYPES.CONTENT_POLICY_VIOLATION
    }
    
    return ERROR_TYPES.UNKNOWN
  }

  /**
   * Enhanced retry logic
   */
  shouldRetry(errorType, retryCount) {
    return retryCount < RETRY_CONFIG.maxRetries && 
           RETRY_CONFIG.retriableErrors.includes(errorType)
  }

  /**
   * Calculate retry delay with jitter
   */
  calculateRetryDelay(retryCount) {
    const baseDelay = RETRY_CONFIG.baseDelay * Math.pow(RETRY_CONFIG.backoffMultiplier, retryCount)
    const jitter = baseDelay * RETRY_CONFIG.jitter * Math.random()
    return Math.min(baseDelay + jitter, RETRY_CONFIG.maxDelay)
  }

  /**
   * Generate intelligent fallback response
   */
  async generateIntelligentFallback(message, messageType, context, lastError) {
    const category = this.categorizeFallbackResponse(message, messageType)
    const responses = this.fallbackResponses.get(category) || this.fallbackResponses.get('default')
    
    if (!responses || responses.length === 0) {
      return {
        response: "I'm experiencing technical difficulties with my AI services. Please try again in a few moments, or check your dashboard for immediate access to your business data.",
        provider: 'fallback',
        fromCache: false,
        cost: 0,
        responseTime: 100,
        suggestion: "Try accessing your dashboard directly for immediate business insights."
      }
    }

    const randomResponse = responses[Math.floor(Math.random() * responses.length)]
    
    return {
      response: randomResponse,
      provider: 'fallback',
      fromCache: false,
      cost: 0,
      responseTime: 100,
      category,
      lastError: lastError?.message,
      suggestion: this.generateActionableSuggestion(category, context)
    }
  }

  /**
   * Generate enhanced cache key
   */
  generateEnhancedCacheKey(message, context, messageType) {
    const normalized = {
      message: message.trim().toLowerCase(),
      messageType,
      userId: context.userId || 'anonymous',
      barbershopId: context.barbershopId || context.barbershop_id || 'default'
    }
    return JSON.stringify(normalized)
  }

  /**
   * Calculate cache TTL based on response characteristics
   */
  calculateCacheTTL(result) {
    // Dynamic insights should have shorter TTL
    if (result.response.includes('today') || result.response.includes('current')) {
      return 300000 // 5 minutes
    }
    
    // General advice can be cached longer
    if (result.response.includes('recommend') || result.response.includes('suggest')) {
      return 3600000 // 1 hour
    }
    
    // Default TTL
    return 1800000 // 30 minutes
  }

  /**
   * Enhanced metrics tracking
   */
  updateSuccessMetrics(providerId, responseTime, cost) {
    const metrics = this.metrics.get(providerId)
    if (!metrics) return
    
    metrics.totalRequests++
    metrics.successfulRequests++
    metrics.consecutiveFailures = 0
    metrics.consecutiveSuccesses++
    metrics.totalResponseTime += responseTime
    metrics.avgResponseTime = metrics.totalResponseTime / metrics.successfulRequests
    metrics.totalCost += cost || 0
    metrics.lastUsed = Date.now()
  }

  updateErrorMetrics(providerId, error) {
    const metrics = this.metrics.get(providerId)
    if (!metrics) return
    
    metrics.totalRequests++
    metrics.failedRequests++
    metrics.consecutiveSuccesses = 0
    metrics.consecutiveFailures++
  }

  /**
   * Health monitoring and circuit breaker management
   */
  startHealthMonitoring() {
    // Check provider health every 2 minutes
    setInterval(() => {
      this.checkProviderHealth()
    }, 120000)
    
    // Reset circuit breakers every 5 minutes
    setInterval(() => {
      this.attemptCircuitBreakerReset()
    }, 300000)
  }

  async checkProviderHealth() {
    try {
      const healthResults = await checkAIProvidersHealth()
      
      for (const [providerId, result] of Object.entries(healthResults)) {
        const health = this.healthStatus.get(providerId)
        if (health) {
          health.isHealthy = result.healthy
          health.isAvailable = result.available
          health.lastHealthCheck = Date.now()
          health.healthScore = result.healthy ? 
            Math.min(100, health.healthScore + 5) : 
            Math.max(0, health.healthScore - 20)
        }
      }
    } catch (error) {
      console.error('Health check failed:', error)
    }
  }

  /**
   * Utility methods
   */
  isProviderHealthy(providerId) {
    const health = this.healthStatus.get(providerId)
    return health && health.isHealthy && health.healthScore > 30
  }

  isProviderAvailable(providerId) {
    const health = this.healthStatus.get(providerId)
    return health && health.isAvailable && !this.isCircuitBreakerOpen(providerId)
  }

  isCircuitBreakerOpen(providerId) {
    const breaker = this.circuitBreakers.get(providerId)
    return breaker && breaker.isOpen && (Date.now() - breaker.openedAt) < breaker.cooldownPeriod
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  calculateCost(provider, result) {
    return (result.tokensUsed || 0) * (provider.costPerToken || 0)
  }

  assessResponseQuality(response) {
    // Simple quality assessment based on response characteristics
    if (response.length < 50) return 'low'
    if (response.includes('specific') && response.includes('recommend')) return 'high'
    return 'medium'
  }

  /**
   * Get comprehensive system status
   */
  getSystemStatus() {
    return {
      providers: Array.from(this.metrics.entries()).map(([id, metrics]) => ({
        id,
        ...PROVIDER_CONFIGS[id],
        ...metrics,
        health: this.healthStatus.get(id),
        circuitBreakerOpen: this.isCircuitBreakerOpen(id)
      })),
      totalRequests: Array.from(this.metrics.values()).reduce((sum, m) => sum + m.totalRequests, 0),
      totalCost: Array.from(this.metrics.values()).reduce((sum, m) => sum + m.totalCost, 0),
      avgResponseTime: this.calculateOverallAvgResponseTime()
    }
  }

  calculateOverallAvgResponseTime() {
    const metrics = Array.from(this.metrics.values())
    const totalTime = metrics.reduce((sum, m) => sum + m.totalResponseTime, 0)
    const totalRequests = metrics.reduce((sum, m) => sum + m.successfulRequests, 0)
    return totalRequests > 0 ? totalTime / totalRequests : 0
  }
}

// Export singleton instance
let enhancedFallbackManager = null

export function getEnhancedFallbackManager() {
  if (!enhancedFallbackManager) {
    enhancedFallbackManager = new EnhancedAIProviderFallback()
  }
  return enhancedFallbackManager
}

export default getEnhancedFallbackManager()