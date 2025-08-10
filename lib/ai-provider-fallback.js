/**
 * AI Provider Fallback System
 * Implements graceful degradation when AI services are unavailable
 */

export class AIProviderFallback {
  constructor() {
    this.providers = [
      {
        id: 'primary',
        name: 'Primary AI Service',
        endpoint: '/api/ai/chat',
        priority: 1,
        timeout: 5000,
        retryCount: 2,
        status: 'unknown',
        lastCheck: null,
        responseTime: null,
        errorCount: 0,
        successCount: 0
      },
      {
        id: 'secondary',
        name: 'Secondary AI Service', 
        endpoint: '/api/ai/fallback',
        priority: 2,
        timeout: 8000,
        retryCount: 1,
        status: 'unknown',
        lastCheck: null,
        responseTime: null,
        errorCount: 0,
        successCount: 0
      },
      {
        id: 'local',
        name: 'Local Responses',
        endpoint: null,
        priority: 3,
        timeout: 100,
        retryCount: 0,
        status: 'healthy',
        lastCheck: Date.now(),
        responseTime: 50,
        errorCount: 0,
        successCount: 100
      }
    ]
    
    this.circuitBreakers = new Map()
    this.healthCheckInterval = null
    this.listeners = new Map()
    this.fallbackResponses = new Map()
    this.isHealthChecking = false
    
    // Initialize fallback responses
    this.initializeFallbackResponses()
    
    // Start health monitoring
    this.startHealthChecking()
  }

  /**
   * Initialize predefined fallback responses
   */
  initializeFallbackResponses() {
    const responses = new Map([
      // Business queries
      ['business', [
        "I understand you're asking about your business. While I'm currently having connectivity issues with my advanced AI services, I can still help with basic information. Could you be more specific about what business aspect you'd like to discuss?",
        "I'm experiencing some technical difficulties connecting to my full AI capabilities right now. However, I can still assist with general business questions. What specific area would you like help with?",
        "My AI services are temporarily limited, but I'm here to help! For detailed business analysis, you might want to try again in a few minutes when my full capabilities return."
      ]],
      
      // Booking queries  
      ['booking', [
        "I can see you're asking about bookings. Currently, my connection to the booking system AI is limited. For immediate booking needs, please check your calendar directly or contact your team.",
        "Booking assistance is temporarily limited due to AI service connectivity. You can view existing bookings in your dashboard or create new ones manually.",
        "I'm having trouble accessing the full booking AI system right now. Basic booking functions should still work through the main calendar interface."
      ]],
      
      // Revenue/financial queries
      ['revenue', [
        "I understand you're asking about revenue metrics. My financial AI analysis is currently offline, but you can view basic reports in the analytics section of your dashboard.",
        "Revenue analysis requires my advanced AI services which are temporarily unavailable. Try checking the reports section for current financial data.",
        "Financial AI services are experiencing connectivity issues. For urgent revenue questions, please check your financial dashboard directly."
      ]],
      
      // Marketing queries
      ['marketing', [
        "Marketing strategy assistance is limited while my AI services reconnect. For immediate needs, consider reviewing your current campaigns in the marketing dashboard.",
        "My marketing AI advisor is temporarily offline. You can still access your campaign performance data and basic insights through the main dashboard.",
        "Marketing analysis requires full AI connectivity which is currently restored. Check back soon or review existing marketing data in your dashboard."
      ]],
      
      // Operations queries
      ['operations', [
        "Operations analysis is limited due to AI service connectivity. For immediate operational needs, check your dashboard metrics or contact your team directly.",
        "My operations AI is experiencing connectivity issues. Basic operational data is still available through your main dashboard interface.",
        "Operations intelligence is temporarily limited. For urgent matters, please use the manual reporting features or try again shortly."
      ]],
      
      // General/default responses
      ['default', [
        "I'm currently experiencing limited connectivity to my advanced AI services. I can still help with basic questions, or you can try again in a few minutes when full service resumes.",
        "My AI capabilities are temporarily reduced due to service connectivity. For complex questions, please try again shortly, or I can help with simpler requests right now.",
        "I'm running in fallback mode due to AI service limitations. While I wait for full connectivity to return, I can assist with basic information or you can explore your dashboard directly.",
        "Technical difficulties are limiting my AI responses right now. You can still use the main dashboard features, or try asking me again in a few minutes.",
        "I'm having trouble connecting to my full AI services. For detailed analysis, please check back soon. In the meantime, I can help with basic questions or direct you to relevant dashboard sections."
      ]]
    ])
    
    this.fallbackResponses = responses
  }

  /**
   * Get appropriate response with fallback handling
   */
  async getResponse(message, options = {}) {
    const { context, agent, sessionId, retryAttempt = 0 } = options
    
    try {
      // Get available provider
      const provider = await this.getAvailableProvider()
      
      if (!provider) {
        throw new Error('No providers available')
      }
      
      // Try primary/secondary providers
      if (provider.id !== 'local') {
        const response = await this.tryProvider(provider, message, options)
        if (response) {
          this.recordSuccess(provider.id)
          return {
            response: response.content || response,
            provider: provider.id,
            fromFallback: false,
            responseTime: provider.responseTime
          }
        }
      }
      
      // Fallback to local responses
      return await this.getLocalFallbackResponse(message, options)
      
    } catch (error) {
      console.error('AI Provider fallback error:', error)
      return await this.getLocalFallbackResponse(message, options)
    }
  }

  /**
   * Try a specific provider
   */
  async tryProvider(provider, message, options) {
    const startTime = Date.now()
    
    try {
      // Check circuit breaker
      if (this.isCircuitBreakerOpen(provider.id)) {
        throw new Error(`Circuit breaker open for ${provider.id}`)
      }
      
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), provider.timeout)
      
      const response = await fetch(provider.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message,
          ...options
        }),
        signal: controller.signal
      })
      
      clearTimeout(timeoutId)
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }
      
      const data = await response.json()
      const responseTime = Date.now() - startTime
      
      // Update provider metrics
      provider.responseTime = responseTime
      provider.lastCheck = Date.now()
      provider.status = 'healthy'
      
      return data
      
    } catch (error) {
      const responseTime = Date.now() - startTime
      provider.responseTime = responseTime
      provider.lastCheck = Date.now()
      provider.status = 'unhealthy'
      
      this.recordError(provider.id)
      throw error
    }
  }

  /**
   * Get local fallback response
   */
  async getLocalFallbackResponse(message, options) {
    const responseCategory = this.categorizeMessage(message)
    const responses = this.fallbackResponses.get(responseCategory) || this.fallbackResponses.get('default')
    const randomResponse = responses[Math.floor(Math.random() * responses.length)]
    
    // Add slight delay to simulate processing
    await new Promise(resolve => setTimeout(resolve, 100 + Math.random() * 200))
    
    return {
      response: randomResponse,
      provider: 'local',
      fromFallback: true,
      responseTime: 150,
      category: responseCategory,
      suggestion: this.getSuggestionForCategory(responseCategory)
    }
  }

  /**
   * Categorize message to select appropriate fallback
   */
  categorizeMessage(message) {
    const lowerMessage = message.toLowerCase()
    
    if (lowerMessage.includes('booking') || lowerMessage.includes('appointment') || lowerMessage.includes('schedule')) {
      return 'booking'
    }
    
    if (lowerMessage.includes('revenue') || lowerMessage.includes('money') || lowerMessage.includes('profit') || lowerMessage.includes('financial')) {
      return 'revenue'
    }
    
    if (lowerMessage.includes('marketing') || lowerMessage.includes('campaign') || lowerMessage.includes('promotion') || lowerMessage.includes('customer acquisition')) {
      return 'marketing'
    }
    
    if (lowerMessage.includes('operation') || lowerMessage.includes('staff') || lowerMessage.includes('efficiency') || lowerMessage.includes('workflow')) {
      return 'operations'
    }
    
    if (lowerMessage.includes('business') || lowerMessage.includes('company') || lowerMessage.includes('performance')) {
      return 'business'
    }
    
    return 'default'
  }

  /**
   * Get helpful suggestion for category
   */
  getSuggestionForCategory(category) {
    const suggestions = {
      booking: "Try checking the Calendar section for current bookings and scheduling options.",
      revenue: "Visit the Analytics dashboard for financial reports and revenue metrics.", 
      marketing: "Check the Marketing section for campaign performance and customer insights.",
      operations: "Review the Operations dashboard for staff management and workflow analytics.",
      business: "Explore the main Dashboard for comprehensive business overview and metrics.",
      default: "Navigate through the main dashboard sections for detailed information and tools."
    }
    
    return suggestions[category] || suggestions.default
  }

  /**
   * Get the best available provider
   */
  async getAvailableProvider() {
    // Sort providers by priority and health status
    const availableProviders = this.providers
      .filter(p => p.status !== 'unhealthy' && !this.isCircuitBreakerOpen(p.id))
      .sort((a, b) => a.priority - b.priority)
    
    if (availableProviders.length === 0) {
      // Return local fallback as last resort
      return this.providers.find(p => p.id === 'local')
    }
    
    return availableProviders[0]
  }

  /**
   * Circuit breaker management
   */
  isCircuitBreakerOpen(providerId) {
    const breaker = this.circuitBreakers.get(providerId)
    if (!breaker) return false
    
    // Check if cooldown period has passed
    if (Date.now() - breaker.lastFailure > breaker.cooldownPeriod) {
      this.circuitBreakers.delete(providerId)
      return false
    }
    
    return breaker.isOpen
  }

  recordError(providerId) {
    const provider = this.providers.find(p => p.id === providerId)
    if (provider) {
      provider.errorCount++
    }
    
    let breaker = this.circuitBreakers.get(providerId)
    if (!breaker) {
      breaker = {
        failureCount: 0,
        isOpen: false,
        lastFailure: null,
        cooldownPeriod: 30000 // 30 seconds
      }
      this.circuitBreakers.set(providerId, breaker)
    }
    
    breaker.failureCount++
    breaker.lastFailure = Date.now()
    
    // Open circuit breaker after 3 failures
    if (breaker.failureCount >= 3) {
      breaker.isOpen = true
      console.warn(`Circuit breaker opened for provider: ${providerId}`)
      this.emit('circuit-breaker-opened', { providerId })
    }
  }

  recordSuccess(providerId) {
    const provider = this.providers.find(p => p.id === providerId)
    if (provider) {
      provider.successCount++
      provider.errorCount = Math.max(0, provider.errorCount - 1)
    }
    
    // Reset circuit breaker on success
    const breaker = this.circuitBreakers.get(providerId)
    if (breaker) {
      breaker.failureCount = 0
      breaker.isOpen = false
    }
  }

  /**
   * Start periodic health checking
   */
  startHealthChecking() {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval)
    }
    
    this.healthCheckInterval = setInterval(() => {
      this.performHealthChecks()
    }, 30000) // Every 30 seconds
  }

  /**
   * Perform health checks on all providers
   */
  async performHealthChecks() {
    if (this.isHealthChecking) return
    
    this.isHealthChecking = true
    
    try {
      const checks = this.providers
        .filter(p => p.id !== 'local')
        .map(provider => this.healthCheckProvider(provider))
      
      await Promise.allSettled(checks)
      
    } catch (error) {
      console.error('Health check error:', error)
    } finally {
      this.isHealthChecking = false
    }
  }

  /**
   * Health check individual provider
   */
  async healthCheckProvider(provider) {
    try {
      const startTime = Date.now()
      
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 5000)
      
      const response = await fetch(provider.endpoint.replace('/chat', '/health'), {
        method: 'GET',
        signal: controller.signal
      })
      
      clearTimeout(timeoutId)
      
      const responseTime = Date.now() - startTime
      provider.responseTime = responseTime
      provider.lastCheck = Date.now()
      provider.status = response.ok ? 'healthy' : 'degraded'
      
      this.emit('provider-health-updated', { 
        providerId: provider.id, 
        status: provider.status,
        responseTime 
      })
      
    } catch (error) {
      provider.status = 'unhealthy'
      provider.lastCheck = Date.now()
      
      this.emit('provider-health-updated', { 
        providerId: provider.id, 
        status: 'unhealthy',
        error: error.message
      })
    }
  }

  /**
   * Get current provider statuses
   */
  getProviderStatuses() {
    return this.providers.map(provider => ({
      ...provider,
      circuitBreakerOpen: this.isCircuitBreakerOpen(provider.id),
      healthScore: this.calculateHealthScore(provider)
    }))
  }

  /**
   * Calculate health score for provider
   */
  calculateHealthScore(provider) {
    const total = provider.successCount + provider.errorCount
    if (total === 0) return 100
    
    const successRate = (provider.successCount / total) * 100
    const responseTimePenalty = Math.max(0, (provider.responseTime - 1000) / 100) // Penalty for >1s response
    
    return Math.max(0, Math.min(100, successRate - responseTimePenalty))
  }

  /**
   * Event emitter functionality
   */
  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, [])
    }
    this.listeners.get(event).push(callback)
  }

  emit(event, data) {
    if (this.listeners.has(event)) {
      this.listeners.get(event).forEach(callback => {
        try {
          callback(data)
        } catch (error) {
          console.error(`Error in event listener for ${event}:`, error)
        }
      })
    }
  }

  /**
   * Cleanup resources
   */
  destroy() {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval)
    }
    
    this.listeners.clear()
    this.circuitBreakers.clear()
  }
}

// Singleton instance
let fallbackManager = null

/**
 * Get or create fallback manager instance
 */
export function getFallbackManager() {
  if (!fallbackManager) {
    fallbackManager = new AIProviderFallback()
  }
  return fallbackManager
}

// Export default instance
export default getFallbackManager()