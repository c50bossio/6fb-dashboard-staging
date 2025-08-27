/**
 * Webhook Security Manager
 * Enhanced security for Stripe webhook processing with rate limiting,
 * signature verification, and request validation
 */

import crypto from 'crypto'
import { createClient } from '@/lib/supabase/server'

class WebhookSecurity {
  constructor() {
    this.requestCache = new Map()
    this.rateLimitWindow = 60000 // 1 minute
    this.maxRequestsPerWindow = 100
    this.signatureMaxAge = 300 // 5 minutes
  }

  /**
   * Verify Stripe webhook signature with enhanced security
   * @param {string} payload - Raw request body
   * @param {string} signature - Stripe signature header
   * @param {string} secret - Webhook endpoint secret
   * @returns {Object} Verification result
   */
  verifyStripeSignature(payload, signature, secret) {
    try {
      if (!signature || !secret) {
        return {
          valid: false,
          error: 'Missing signature or secret',
          code: 'MISSING_CREDENTIALS'
        }
      }

      const elements = signature.split(',')
      const signatureObj = {}
      
      for (const element of elements) {
        const [key, value] = element.split('=')
        if (key && value) {
          signatureObj[key] = value
        }
      }

      if (!signatureObj.t || !signatureObj.v1) {
        return {
          valid: false,
          error: 'Invalid signature format',
          code: 'INVALID_FORMAT'
        }
      }

      const timestamp = parseInt(signatureObj.t)
      const currentTime = Math.floor(Date.now() / 1000)

      // Check timestamp to prevent replay attacks
      if (Math.abs(currentTime - timestamp) > this.signatureMaxAge) {
        return {
          valid: false,
          error: 'Signature timestamp too old',
          code: 'TIMESTAMP_TOO_OLD',
          age: currentTime - timestamp
        }
      }

      // Verify the signature
      const expectedSignature = crypto
        .createHmac('sha256', secret)
        .update(`${timestamp}.${payload}`)
        .digest('hex')

      const providedSignature = signatureObj.v1

      // Use constant-time comparison to prevent timing attacks
      const isValid = crypto.timingSafeEqual(
        Buffer.from(expectedSignature),
        Buffer.from(providedSignature)
      )

      if (!isValid) {
        return {
          valid: false,
          error: 'Signature verification failed',
          code: 'SIGNATURE_MISMATCH'
        }
      }

      return {
        valid: true,
        timestamp: timestamp,
        age: currentTime - timestamp
      }

    } catch (error) {
      return {
        valid: false,
        error: `Signature verification error: ${error.message}`,
        code: 'VERIFICATION_ERROR'
      }
    }
  }

  /**
   * Rate limiting for webhook endpoints
   * @param {string} clientIp - Client IP address
   * @returns {Object} Rate limit result
   */
  checkRateLimit(clientIp) {
    const now = Date.now()
    const windowStart = now - this.rateLimitWindow
    
    // Clean old entries
    for (const [ip, requests] of this.requestCache.entries()) {
      const filteredRequests = requests.filter(timestamp => timestamp > windowStart)
      if (filteredRequests.length === 0) {
        this.requestCache.delete(ip)
      } else {
        this.requestCache.set(ip, filteredRequests)
      }
    }

    // Check current IP
    const requests = this.requestCache.get(clientIp) || []
    const recentRequests = requests.filter(timestamp => timestamp > windowStart)

    if (recentRequests.length >= this.maxRequestsPerWindow) {
      return {
        allowed: false,
        limit: this.maxRequestsPerWindow,
        windowMs: this.rateLimitWindow,
        requestCount: recentRequests.length,
        resetTime: windowStart + this.rateLimitWindow
      }
    }

    // Add current request
    recentRequests.push(now)
    this.requestCache.set(clientIp, recentRequests)

    return {
      allowed: true,
      limit: this.maxRequestsPerWindow,
      windowMs: this.rateLimitWindow,
      requestCount: recentRequests.length,
      remaining: this.maxRequestsPerWindow - recentRequests.length
    }
  }

  /**
   * Validate webhook payload structure
   * @param {Object} event - Parsed webhook event
   * @returns {Object} Validation result
   */
  validateWebhookPayload(event) {
    const errors = []

    // Basic structure validation
    if (!event || typeof event !== 'object') {
      errors.push('Event must be a valid object')
    }

    if (!event.id || typeof event.id !== 'string') {
      errors.push('Event ID is required and must be a string')
    }

    if (!event.type || typeof event.type !== 'string') {
      errors.push('Event type is required and must be a string')
    }

    if (!event.data || typeof event.data !== 'object') {
      errors.push('Event data is required and must be an object')
    }

    if (!event.created || typeof event.created !== 'number') {
      errors.push('Event created timestamp is required and must be a number')
    }

    // Check for suspicious patterns
    if (event.id && event.id.length > 100) {
      errors.push('Event ID is suspiciously long')
    }

    if (event.type && !event.type.match(/^[a-z_]+\.[a-z_]+$/)) {
      errors.push('Event type format is invalid')
    }

    // Validate specific event types
    switch (event.type) {
      case 'payment_intent.succeeded':
      case 'payment_intent.payment_failed':
        if (!event.data.object || event.data.object.object !== 'payment_intent') {
          errors.push('Payment intent event must contain payment_intent object')
        }
        break

      case 'transfer.created':
      case 'transfer.paid':
      case 'transfer.failed':
      case 'transfer.reversed':
        if (!event.data.object || event.data.object.object !== 'transfer') {
          errors.push('Transfer event must contain transfer object')
        }
        break
    }

    return {
      valid: errors.length === 0,
      errors: errors
    }
  }

  /**
   * Detect potential replay attacks
   * @param {string} eventId - Stripe event ID
   * @param {number} timestamp - Event timestamp
   * @returns {Promise<Object>} Replay check result
   */
  async checkReplayAttack(eventId, timestamp) {
    try {
      const supabase = createClient()
      
      // Check if we've already processed this event
      const { data: existingEvent, error } = await supabase
        .from('processed_webhook_events')
        .select('id, processed_at')
        .eq('stripe_event_id', eventId)
        .single()

      if (error && error.code !== 'PGRST116') { // PGRST116 = not found
        throw error
      }

      if (existingEvent) {
        return {
          isReplay: true,
          originalProcessedAt: existingEvent.processed_at,
          message: 'Event has already been processed'
        }
      }

      // Record this event as processed
      await supabase
        .from('processed_webhook_events')
        .insert({
          stripe_event_id: eventId,
          event_timestamp: new Date(timestamp * 1000).toISOString(),
          processed_at: new Date().toISOString()
        })

      return {
        isReplay: false,
        message: 'Event recorded as new'
      }

    } catch (error) {
      console.error('Error checking replay attack:', error)
      return {
        isReplay: false,
        error: error.message,
        message: 'Unable to verify replay status, proceeding with caution'
      }
    }
  }

  /**
   * Sanitize webhook event data to prevent injection attacks
   * @param {Object} event - Webhook event
   * @returns {Object} Sanitized event
   */
  sanitizeWebhookEvent(event) {
    const sanitized = JSON.parse(JSON.stringify(event)) // Deep clone

    // Recursively sanitize string values
    const sanitizeValue = (value) => {
      if (typeof value === 'string') {
        // Remove potentially dangerous characters
        return value
          .replace(/[<>]/g, '') // Remove HTML tags
          .replace(/javascript:/gi, '') // Remove javascript: URLs
          .replace(/on\w+=/gi, '') // Remove event handlers
          .trim()
      } else if (Array.isArray(value)) {
        return value.map(sanitizeValue)
      } else if (value && typeof value === 'object') {
        const sanitizedObj = {}
        for (const [key, val] of Object.entries(value)) {
          // Sanitize both keys and values
          const cleanKey = typeof key === 'string' ? key.replace(/[^a-zA-Z0-9_]/g, '') : key
          sanitizedObj[cleanKey] = sanitizeValue(val)
        }
        return sanitizedObj
      }
      return value
    }

    return sanitizeValue(sanitized)
  }

  /**
   * Log security events for monitoring
   * @param {string} eventType - Type of security event
   * @param {Object} details - Event details
   * @param {string} severity - Severity level
   */
  async logSecurityEvent(eventType, details, severity = 'info') {
    try {
      const supabase = createClient()
      
      await supabase
        .from('webhook_security_logs')
        .insert({
          event_type: eventType,
          severity: severity,
          details: details,
          created_at: new Date().toISOString()
        })

      `)

    } catch (error) {
      console.error('Failed to log security event:', error)
    }
  }

  /**
   * Get security headers for webhook response
   * @returns {Object} Security headers
   */
  getSecurityHeaders() {
    return {
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'X-XSS-Protection': '1; mode=block',
      'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
      'Content-Security-Policy': "default-src 'none'",
      'Referrer-Policy': 'no-referrer',
      'Cache-Control': 'no-store, no-cache, must-revalidate, private'
    }
  }

  /**
   * Clean up old processed events and security logs
   * @param {number} daysToKeep - Number of days to retain data
   */
  async cleanupOldRecords(daysToKeep = 30) {
    try {
      const supabase = createClient()
      const cutoffDate = new Date()
      cutoffDate.setDate(cutoffDate.getDate() - daysToKeep)

      // Clean up processed webhook events
      const { error: eventsError } = await supabase
        .from('processed_webhook_events')
        .delete()
        .lt('processed_at', cutoffDate.toISOString())

      if (eventsError) {
        console.error('Error cleaning up processed events:', eventsError)
      }

      // Clean up security logs
      const { error: logsError } = await supabase
        .from('webhook_security_logs')
        .delete()
        .lt('created_at', cutoffDate.toISOString())

      if (logsError) {
        console.error('Error cleaning up security logs:', logsError)
      }

    } catch (error) {
      console.error('Error during security cleanup:', error)
    }
  }
}

// Export singleton instance
const webhookSecurity = new WebhookSecurity()
export default webhookSecurity

// Named exports
export { WebhookSecurity, webhookSecurity }