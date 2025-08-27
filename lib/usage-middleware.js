/**
 * Usage Tracking Middleware
 * Automatically tracks AI, SMS, and email usage throughout the application
 */

import UsageTracker from './usage-tracker'

/**
 * Track AI usage (tokens consumed)
 */
export async function trackAIUsage(userId, provider, tokens, metadata = {}) {
  try {

    await UsageTracker.trackUsage(userId, 'ai_tokens', tokens, {
      provider,
      ...metadata,
      timestamp: new Date().toISOString()
    })
    
    // Check for usage warnings
    const warnings = await UsageTracker.checkUsageLimits(userId)
    if (warnings.length > 0) {
      console.warn(`⚠️ [AI USAGE WARNING] User ${userId}:`, warnings)
      // TODO: Send notification to user about approaching limits
    }
    
    return { success: true, warnings }
  } catch (error) {
    console.error('Failed to track AI usage:', error)
    // Don't throw - usage tracking failures shouldn't break the app
    return { success: false, error: error.message }
  }
}

/**
 * Track SMS usage (messages sent)
 */
export async function trackSMSUsage(userId, recipient, messageType = 'general', metadata = {}) {
  try {
     || 'unknown'} (${messageType})`)
    
    await UsageTracker.trackUsage(userId, 'sms_sent', 1, {
      messageType,
      recipient: recipient?.slice(-4), // Only store last 4 digits for privacy
      ...metadata,
      timestamp: new Date().toISOString()
    })
    
    // Check for usage warnings
    const warnings = await UsageTracker.checkUsageLimits(userId)
    if (warnings.length > 0) {
      console.warn(`⚠️ [SMS USAGE WARNING] User ${userId}:`, warnings)
      // TODO: Send notification to user about approaching limits
    }
    
    return { success: true, warnings }
  } catch (error) {
    console.error('Failed to track SMS usage:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Track Email usage (emails sent)
 */
export async function trackEmailUsage(userId, recipient, emailType = 'general', metadata = {}) {
  try {
    `)
    
    await UsageTracker.trackUsage(userId, 'email_sent', 1, {
      emailType,
      recipient: recipient?.split('@')[1], // Only store domain for privacy
      ...metadata,
      timestamp: new Date().toISOString()
    })
    
    // Check for usage warnings
    const warnings = await UsageTracker.checkUsageLimits(userId)
    if (warnings.length > 0) {
      console.warn(`⚠️ [EMAIL USAGE WARNING] User ${userId}:`, warnings)
      // TODO: Send notification to user about approaching limits
    }
    
    return { success: true, warnings }
  } catch (error) {
    console.error('Failed to track email usage:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Enhanced fetch wrapper that tracks API usage
 */
export function createTrackedFetch(userId) {
  return async function trackedFetch(url, options = {}) {
    const originalFetch = global.fetch
    
    try {
      // Make the request
      const response = await originalFetch(url, options)
      
      // Track usage based on the API endpoint
      if (url.includes('openai.com/v1/chat/completions')) {
        // OpenAI API call - we'll track this when we get the response
        const responseClone = response.clone()
        const data = await responseClone.json()
        
        if (data.usage?.total_tokens) {
          await trackAIUsage(userId, 'openai', data.usage.total_tokens, {
            model: data.model,
            prompt_tokens: data.usage.prompt_tokens,
            completion_tokens: data.usage.completion_tokens
          })
        }
      } else if (url.includes('anthropic.com')) {
        // Anthropic API call - estimate tokens
        const responseClone = response.clone()
        const data = await responseClone.json()
        
        // Estimate tokens (Anthropic doesn't always return usage)
        const estimatedTokens = Math.ceil((JSON.stringify(data).length + (options.body?.length || 0)) / 4)
        await trackAIUsage(userId, 'anthropic', estimatedTokens, {
          model: 'claude-3-sonnet',
          estimated: true
        })
      }
      
      return response
    } catch (error) {
      console.error('Tracked fetch error:', error)
      throw error
    }
  }
}

/**
 * Middleware for Next.js API routes to track usage
 */
export function withUsageTracking(handler) {
  return async function trackedHandler(req, res) {
    // Store original methods
    const originalSend = res.send
    const originalJson = res.json
    
    // Get user ID from session/auth
    let userId = null
    
    // Try to get userId from various sources
    if (req.session?.user?.id) {
      userId = req.session.user.id
    } else if (req.user?.id) {
      userId = req.user.id
    }
    
    // Enhance response methods to track usage
    res.send = function(data) {
      // Track API response if needed
      return originalSend.call(this, data)
    }
    
    res.json = function(data) {
      // Track specific API responses
      if (userId && req.url.includes('/ai/')) {
        // AI API response - track usage if tokens info available
        if (data.usage?.tokens) {
          trackAIUsage(userId, 'api', data.usage.tokens, {
            endpoint: req.url,
            method: req.method
          })
        }
      }
      
      return originalJson.call(this, data)
    }
    
    // Add userId to request for easy access
    req.userId = userId
    
    return handler(req, res)
  }
}

/**
 * React Hook for frontend usage tracking
 */
export function useUsageTracking() {
  const trackUsage = async (eventType, quantity, metadata = {}) => {
    try {
      const response = await fetch('/api/v1/billing/current', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventType,
          quantity,
          metadata
        })
      })
      
      if (!response.ok) {
        throw new Error(`Failed to track usage: ${response.status}`)
      }
      
      const data = await response.json()
      return data
    } catch (error) {
      console.error('Usage tracking error:', error)
      return { success: false, error: error.message }
    }
  }
  
  return {
    trackAI: (tokens, metadata) => trackUsage('ai_tokens', tokens, metadata),
    trackSMS: (count, metadata) => trackUsage('sms_sent', count, metadata),
    trackEmail: (count, metadata) => trackUsage('email_sent', count, metadata)
  }
}

/**
 * Utility to check if user is approaching usage limits
 */
export async function checkUsageLimitsForUser(userId) {
  try {
    const warnings = await UsageTracker.checkUsageLimits(userId)
    
    if (warnings.length > 0) {

      // Return formatted warnings for UI display
      return warnings.map(warning => ({
        type: warning.type,
        percentage: warning.percentage,
        used: warning.used,
        limit: warning.limit,
        severity: warning.severity,
        message: `${warning.type.toUpperCase()}: ${warning.percentage.toFixed(1)}% of limit used (${warning.used.toLocaleString()}/${warning.limit.toLocaleString()})`
      }))
    }
    
    return []
  } catch (error) {
    console.error('Error checking usage limits:', error)
    return []
  }
}

export default {
  trackAIUsage,
  trackSMSUsage,
  trackEmailUsage,
  createTrackedFetch,
  withUsageTracking,
  useUsageTracking,
  checkUsageLimitsForUser
}