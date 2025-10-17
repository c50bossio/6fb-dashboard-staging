/**
 * Webhook Security Manager
 * Provides signature verification, rate limiting, and security logging
 */

import crypto from 'crypto'

class WebhookSecurity {
  constructor() {
    // Rate limiting cache: IP -> { count, resetTime }
    this.rateLimitCache = new Map()
    // Request tracking for replay attack prevention
    this.requestCache = new Map()
    // Configuration
    this.config = {
      rateLimit: {
        requests: 100,  // Max requests per window
        windowMs: 60000 // 1 minute window
      },
      replayProtection: {
        windowMs: 300000 // 5 minute replay window
      }
    }
  }

  /**
   * Verify Stripe webhook signature
   */
  verifyStripeSignature(payload, signature, secret) {
    if (!signature || !secret) {
      return { 
        valid: false, 
        error: 'Missing signature or secret',
        code: 'MISSING_CREDENTIALS'
      }
    }

    try {
      // Stripe signature format: t=timestamp,v1=signature
      const elements = signature.split(',')
      const timestamp = elements.find(e => e.startsWith('t='))?.slice(2)
      const sig = elements.find(e => e.startsWith('v1='))?.slice(3)

      if (!timestamp || !sig) {
        return { 
          valid: false, 
          error: 'Invalid signature format',
          code: 'INVALID_FORMAT'
        }
      }

      // Check timestamp to prevent replay attacks (5 minute tolerance)
      const currentTime = Math.floor(Date.now() / 1000)
      const timeDiff = currentTime - parseInt(timestamp)
      if (timeDiff > 300) {
        return { 
          valid: false, 
          error: 'Timestamp too old',
          code: 'TIMESTAMP_TOO_OLD'
        }
      }

      // Compute expected signature
      const signedPayload = `${timestamp}.${payload}`
      const expectedSig = crypto
        .createHmac('sha256', secret)
        .update(signedPayload)
        .digest('hex')

      // Compare signatures
      const valid = crypto.timingSafeEqual(
        Buffer.from(sig),
        Buffer.from(expectedSig)
      )

      return { valid, timestamp }
    } catch (error) {
      return { 
        valid: false, 
        error: error.message,
        code: 'VERIFICATION_ERROR'
      }
    }
  }

  /**
   * Verify Twilio webhook signature
   */
  verifyTwilioSignature(authToken, twilioSignature, url, params) {
    if (!authToken || !twilioSignature) {
      return { 
        valid: false, 
        error: 'Missing auth token or signature'
      }
    }

    try {
      // Sort parameters alphabetically
      const sortedParams = Object.keys(params)
        .sort()
        .map(key => `${key}${params[key]}`)
        .join('')

      // Create the string to sign
      const dataToSign = url + sortedParams

      // Generate signature
      const expectedSignature = crypto
        .createHmac('sha256', authToken)
        .update(dataToSign)
        .digest('base64')

      // Compare signatures
      const valid = crypto.timingSafeEqual(
        Buffer.from(twilioSignature),
        Buffer.from(expectedSignature)
      )

      return { valid }
    } catch (error) {
      return { 
        valid: false, 
        error: error.message
      }
    }
  }

  /**
   * Check rate limiting for an IP
   */
  checkRateLimit(clientIp) {
    const now = Date.now()
    const limit = this.config.rateLimit.requests
    const window = this.config.rateLimit.windowMs

    // Get or create rate limit entry
    let entry = this.rateLimitCache.get(clientIp)
    
    if (!entry || now > entry.resetTime) {
      // New window
      entry = {
        count: 1,
        resetTime: now + window
      }
      this.rateLimitCache.set(clientIp, entry)
      return { 
        allowed: true, 
        requestCount: 1,
        limit,
        resetTime: entry.resetTime
      }
    }

    // Increment counter
    entry.count++
    
    if (entry.count > limit) {
      return { 
        allowed: false, 
        requestCount: entry.count,
        limit,
        resetTime: entry.resetTime
      }
    }

    return { 
      allowed: true, 
      requestCount: entry.count,
      limit,
      resetTime: entry.resetTime
    }
  }

  /**
   * Check for replay attacks using event ID
   */
  checkReplayAttack(eventId) {
    if (!eventId) return { isReplay: false }

    const now = Date.now()
    const window = this.config.replayProtection.windowMs

    // Clean old entries
    for (const [id, timestamp] of this.requestCache.entries()) {
      if (now - timestamp > window) {
        this.requestCache.delete(id)
      }
    }

    // Check if we've seen this event
    if (this.requestCache.has(eventId)) {
      return { 
        isReplay: true, 
        originalTimestamp: this.requestCache.get(eventId)
      }
    }

    // Store event ID
    this.requestCache.set(eventId, now)
    return { isReplay: false }
  }

  /**
   * Validate webhook payload structure
   */
  validateWebhookPayload(payload) {
    const errors = []

    // Check required fields
    if (!payload || typeof payload !== 'object') {
      errors.push('Payload must be an object')
    }

    if (payload && !payload.id) {
      errors.push('Missing event ID')
    }

    if (payload && !payload.type) {
      errors.push('Missing event type')
    }

    return {
      valid: errors.length === 0,
      errors
    }
  }

  /**
   * Get security headers for responses
   */
  getSecurityHeaders() {
    return {
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'X-XSS-Protection': '1; mode=block',
      'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      'Pragma': 'no-cache'
    }
  }

  /**
   * Log security events (placeholder - integrate with your logging system)
   */
  async logSecurityEvent(eventType, details, severity = 'info') {
    console.log(`[WEBHOOK SECURITY ${severity.toUpperCase()}] ${eventType}:`, {
      timestamp: new Date().toISOString(),
      ...details
    })
    
    // TODO: Integrate with Sentry or other monitoring service
    // if (severity === 'error' || severity === 'warning') {
    //   Sentry.captureMessage(`Webhook Security: ${eventType}`, severity)
    // }
  }

  /**
   * Clean up old cache entries
   */
  cleanup() {
    const now = Date.now()
    
    // Clean rate limit cache
    for (const [ip, entry] of this.rateLimitCache.entries()) {
      if (now > entry.resetTime) {
        this.rateLimitCache.delete(ip)
      }
    }

    // Clean request cache
    const replayWindow = this.config.replayProtection.windowMs
    for (const [id, timestamp] of this.requestCache.entries()) {
      if (now - timestamp > replayWindow) {
        this.requestCache.delete(id)
      }
    }
  }
}

const webhookSecurity = new WebhookSecurity()

// Run cleanup every minute
if (typeof setInterval !== 'undefined') {
  setInterval(() => webhookSecurity.cleanup(), 60000)
}

export default webhookSecurity