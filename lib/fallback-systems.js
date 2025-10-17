/**
 * Graceful Degradation and Fallback Systems
 * Ensures the application remains functional even when services are unavailable
 */

import { trackError } from './production-monitor'

// Service status cache
let serviceStatusCache = {
  supabase: { status: 'unknown', lastCheck: 0 },
  ai: { status: 'unknown', lastCheck: 0 },
  stripe: { status: 'unknown', lastCheck: 0 },
  monitoring: { status: 'unknown', lastCheck: 0 }
}

const CACHE_DURATION = 30000 // 30 seconds
const RETRY_ATTEMPTS = 3
const RETRY_DELAY = 1000 // 1 second

/**
 * Circuit Breaker Pattern Implementation
 */
class CircuitBreaker {
  constructor(name, options = {}) {
    this.name = name
    this.failureThreshold = options.failureThreshold || 5
    this.resetTimeout = options.resetTimeout || 30000
    this.monitoringWindow = options.monitoringWindow || 60000
    
    this.state = 'CLOSED' // CLOSED, OPEN, HALF_OPEN
    this.failureCount = 0
    this.failures = []
    this.lastFailureTime = null
    this.nextAttemptTime = null
  }

  async execute(operation, fallback) {
    if (this.state === 'OPEN') {
      if (Date.now() < this.nextAttemptTime) {
        // Circuit breaker is OPEN, using fallback
        return await this.executeFallback(fallback)
      } else {
        this.state = 'HALF_OPEN'
      }
    }

    try {
      const result = await operation()
      this.onSuccess()
      return result
    } catch (error) {
      this.onFailure(error)
      return await this.executeFallback(fallback, error)
    }
  }

  onSuccess() {
    this.failureCount = 0
    this.failures = []
    this.state = 'CLOSED'
  }

  onFailure(error) {
    const now = Date.now()
    this.failures.push(now)
    
    // Remove old failures outside the monitoring window
    this.failures = this.failures.filter(time => now - time < this.monitoringWindow)
    
    this.failureCount = this.failures.length
    this.lastFailureTime = now
    
    if (this.failureCount >= this.failureThreshold) {
      this.state = 'OPEN'
      this.nextAttemptTime = now + this.resetTimeout
      
      trackError(error, {
        type: 'circuit_breaker_open',
        service: this.name,
        failureCount: this.failureCount
      })
    }
  }

  async executeFallback(fallback, originalError = null) {
    if (typeof fallback === 'function') {
      return await fallback(originalError)
    }
    return fallback
  }

  getStatus() {
    return {
      name: this.name,
      state: this.state,
      failureCount: this.failureCount,
      lastFailureTime: this.lastFailureTime,
      nextAttemptTime: this.nextAttemptTime
    }
  }
}

// Initialize circuit breakers for different services
const circuitBreakers = {
  supabase: new CircuitBreaker('supabase', { failureThreshold: 3, resetTimeout: 30000 }),
  ai: new CircuitBreaker('ai', { failureThreshold: 5, resetTimeout: 60000 }),
  stripe: new CircuitBreaker('stripe', { failureThreshold: 3, resetTimeout: 45000 }),
  monitoring: new CircuitBreaker('monitoring', { failureThreshold: 10, resetTimeout: 15000 })
}

/**
 * Retry mechanism with exponential backoff
 */
async function withRetry(operation, options = {}) {
  const {
    maxAttempts = RETRY_ATTEMPTS,
    baseDelay = RETRY_DELAY,
    maxDelay = 30000,
    backoffMultiplier = 2
  } = options

  let lastError
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await operation(attempt)
    } catch (error) {
      lastError = error
      
      if (attempt === maxAttempts) {
        break
      }

      const delay = Math.min(baseDelay * Math.pow(backoffMultiplier, attempt - 1), maxDelay)
      if (process.env.NEXT_PUBLIC_DEBUG_FALLBACKS) {
        console.warn(`Operation failed (attempt ${attempt}/${maxAttempts}), retrying in ${delay}ms:`, error.message)
      }
      
      await new Promise(resolve => setTimeout(resolve, delay))
    }
  }

  throw lastError
}

/**
 * Service Health Checks
 */
async function checkServiceHealth(serviceName) {
  const cached = serviceStatusCache[serviceName]
  const now = Date.now()

  // Return cached result if still fresh
  if (cached && (now - cached.lastCheck) < CACHE_DURATION) {
    return cached.status
  }

  try {
    let isHealthy = false

    switch (serviceName) {
      case 'supabase':
        isHealthy = await checkSupabaseHealth()
        break
      case 'ai':
        isHealthy = await checkAIHealth()
        break
      case 'stripe':
        isHealthy = await checkStripeHealth()
        break
      case 'monitoring':
        isHealthy = await checkMonitoringHealth()
        break
      default:
        throw new Error(`Unknown service: ${serviceName}`)
    }

    const status = isHealthy ? 'healthy' : 'degraded'
    serviceStatusCache[serviceName] = { status, lastCheck: now }
    return status

  } catch (error) {
    if (process.env.NEXT_PUBLIC_DEBUG_FALLBACKS) {
      console.error(`Health check failed for ${serviceName}:`, error)
    }
    serviceStatusCache[serviceName] = { status: 'unavailable', lastCheck: now }
    return 'unavailable'
  }
}

async function checkSupabaseHealth() {
  const response = await fetch('/api/health/supabase', { 
    signal: AbortSignal.timeout(5000) 
  })
  return response.ok
}

async function checkAIHealth() {
  const response = await fetch('/api/health/ai', { 
    signal: AbortSignal.timeout(10000) 
  })
  return response.ok
}

async function checkStripeHealth() {
  const response = await fetch('/api/health/stripe', { 
    signal: AbortSignal.timeout(5000) 
  })
  return response.ok
}

async function checkMonitoringHealth() {
  const response = await fetch('/api/monitoring?type=health', { 
    signal: AbortSignal.timeout(3000) 
  })
  return response.ok
}

/**
 * Fallback Data Providers
 */
const fallbackData = {
  // Default shop data when Supabase is unavailable
  defaultShop: {
    id: 'fallback-shop',
    name: 'Demo Barbershop',
    address: '123 Main St, Demo City',
    phone: '(555) 123-4567',
    email: 'demo@bookedbarber.com'
  },

  // Default services when database is unavailable
  defaultServices: [
    { id: 1, name: 'Haircut', duration: 30, price: 25 },
    { id: 2, name: 'Beard Trim', duration: 15, price: 15 },
    { id: 3, name: 'Shampoo', duration: 10, price: 10 }
  ],

  // Default AI responses when AI service is down
  defaultAIResponses: {
    greeting: "I'm currently experiencing technical difficulties, but I'm here to help! Please try again in a few minutes or contact our support team.",
    booking: "I'd love to help you book an appointment, but I'm having some technical issues right now. Please try the booking form or call us directly.",
    general: "I'm sorry, but I'm experiencing some technical difficulties at the moment. Please try again shortly or reach out to our support team for immediate assistance."
  },

  // Fallback payment methods when Stripe is unavailable
  fallbackPaymentMessage: "Online payments are temporarily unavailable. Please pay in-store or try again later."
}

/**
 * Graceful Database Operations
 */
export async function withFallback(operation, fallbackValue = null, serviceName = 'supabase') {
  const circuitBreaker = circuitBreakers[serviceName]
  
  if (!circuitBreaker) {
    return await operation()
  }

  return await circuitBreaker.execute(operation, fallbackValue)
}

export async function safeSupabaseQuery(operation, fallbackValue = []) {
  return await withRetry(async () => {
    return await withFallback(operation, fallbackValue, 'supabase')
  }, { maxAttempts: 2 })
}

/**
 * Graceful AI Operations
 */
export async function safeAIRequest(operation, context = {}) {
  const circuitBreaker = circuitBreakers.ai
  
  const fallback = (error) => {
    trackError(error, { type: 'ai_fallback', context })
    
    const responseType = context.type || 'general'
    return {
      content: fallbackData.defaultAIResponses[responseType] || fallbackData.defaultAIResponses.general,
      isFallback: true,
      error: error?.message
    }
  }

  return await circuitBreaker.execute(operation, fallback)
}

/**
 * Graceful Payment Operations
 */
export async function safeStripeOperation(operation) {
  const circuitBreaker = circuitBreakers.stripe
  
  const fallback = (error) => {
    trackError(error, { type: 'stripe_fallback' })
    
    return {
      success: false,
      message: fallbackData.fallbackPaymentMessage,
      isServiceUnavailable: true,
      error: error?.message
    }
  }

  return await circuitBreaker.execute(operation, fallback)
}

/**
 * Graceful Monitoring Operations
 */
export async function safeMonitoringOperation(operation, fallbackValue = null) {
  const circuitBreaker = circuitBreakers.monitoring
  
  const fallback = (error) => {
    // Silent fallback for monitoring failures
    if (process.env.NEXT_PUBLIC_DEBUG_FALLBACKS) {
      console.warn('Monitoring operation failed, using fallback:', error?.message)
    }
    return fallbackValue
  }

  return await circuitBreaker.execute(operation, fallback)
}

/**
 * System Status Dashboard Data
 */
export function getSystemStatus() {
  return {
    services: Object.keys(serviceStatusCache).map(service => ({
      name: service,
      status: serviceStatusCache[service].status,
      lastCheck: serviceStatusCache[service].lastCheck
    })),
    circuitBreakers: Object.values(circuitBreakers).map(cb => cb.getStatus()),
    fallbacksActive: Object.values(circuitBreakers).some(cb => cb.state === 'OPEN')
  }
}

/**
 * Emergency Mode Functions
 */
export function enterEmergencyMode() {
  if (process.env.NEXT_PUBLIC_DEBUG_FALLBACKS) {
    console.warn('🚨 ENTERING EMERGENCY MODE - All services will use fallbacks')
  }
  
  // Force all circuit breakers to OPEN state
  Object.values(circuitBreakers).forEach(cb => {
    cb.state = 'OPEN'
    cb.nextAttemptTime = Date.now() + 300000 // 5 minutes
  })
  
  // Clear service status cache to force fallback usage
  serviceStatusCache = Object.keys(serviceStatusCache).reduce((acc, key) => {
    acc[key] = { status: 'emergency', lastCheck: Date.now() }
    return acc
  }, {})
  
  trackError(new Error('Emergency mode activated'), {
    type: 'emergency_mode',
    timestamp: new Date().toISOString()
  })
}

export function exitEmergencyMode() {
  if (process.env.NEXT_PUBLIC_DEBUG_FALLBACKS) {
    console.info('✅ EXITING EMERGENCY MODE - Restoring normal operations')
  }
  
  // Reset all circuit breakers
  Object.values(circuitBreakers).forEach(cb => {
    cb.state = 'CLOSED'
    cb.failureCount = 0
    cb.failures = []
    cb.nextAttemptTime = null
  })
  
  // Clear service status cache to trigger fresh health checks
  serviceStatusCache = Object.keys(serviceStatusCache).reduce((acc, key) => {
    acc[key] = { status: 'unknown', lastCheck: 0 }
    return acc
  }, {})
}

/**
 * Degraded Mode Operations
 */
export function getDegradedModeFeatures() {
  const status = getSystemStatus()
  const degradedFeatures = []
  
  status.services.forEach(service => {
    switch (service.name) {
      case 'ai':
        if (service.status !== 'healthy') {
          degradedFeatures.push({
            feature: 'AI Chat',
            status: 'limited',
            message: 'AI responses may be delayed or use fallback messages'
          })
        }
        break
      case 'stripe':
        if (service.status !== 'healthy') {
          degradedFeatures.push({
            feature: 'Online Payments',
            status: 'unavailable',
            message: 'Please pay in-store or try again later'
          })
        }
        break
      case 'supabase':
        if (service.status !== 'healthy') {
          degradedFeatures.push({
            feature: 'Real-time Data',
            status: 'limited',
            message: 'Some data may not update in real-time'
          })
        }
        break
    }
  })
  
  return degradedFeatures
}

/**
 * Initialize fallback systems
 */
export function initializeFallbackSystems() {
  // Initialize fallback systems silently unless debug enabled
  if (process.env.NEXT_PUBLIC_DEBUG_FALLBACKS) {
    console.log('🛡️  Initializing fallback systems...')
  }
  
  // Set up periodic health checks
  setInterval(async () => {
    for (const serviceName of Object.keys(serviceStatusCache)) {
      await checkServiceHealth(serviceName)
    }
  }, 60000) // Check every minute
  
  // Set up system status monitoring
  if (typeof window !== 'undefined') {
    window.addEventListener('online', () => {
      if (process.env.NEXT_PUBLIC_DEBUG_FALLBACKS) {
        console.log('🌐 Network restored, resetting circuit breakers')
      }
      Object.values(circuitBreakers).forEach(cb => {
        if (cb.state === 'OPEN') {
          cb.state = 'HALF_OPEN'
        }
      })
    })
    
    window.addEventListener('offline', () => {
      if (process.env.NEXT_PUBLIC_DEBUG_FALLBACKS) {
        console.warn('📡 Network lost, entering graceful degradation mode')
      }
    })
  }
  
  if (process.env.NEXT_PUBLIC_DEBUG_FALLBACKS) {
    console.log('✅ Fallback systems initialized')
  }
}

// Default exports for easy importing
export default {
  withFallback,
  safeSupabaseQuery,
  safeAIRequest,
  safeStripeOperation,
  safeMonitoringOperation,
  getSystemStatus,
  enterEmergencyMode,
  exitEmergencyMode,
  getDegradedModeFeatures,
  initializeFallbackSystems,
  circuitBreakers,
  fallbackData
}