/**
 * Production Usage Tracking Service
 * Tracks AI, SMS, and Email usage for accurate billing
 */

import { createClient } from '@/lib/supabase/server-client'
import { getTierLimits } from '@/lib/subscription-tiers'

export class UsageTracker {
  static getCurrentPeriod() {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  }

  static getCurrentBillingDate() {
    const now = new Date()
    return new Date(now.getFullYear(), now.getMonth(), 1) // First day of current month
  }

  /**
   * Track a usage event (AI tokens, SMS sent, Email sent)
   */
  static async trackUsage(userId, eventType, quantity, metadata = {}) {
    const cost = this.calculateCost(eventType, quantity)
    const period = this.getCurrentPeriod()
    const billingPeriodDate = this.getCurrentBillingDate()

    const event = {
      userId,
      eventType, // 'ai_tokens', 'sms_sent', 'email_sent'
      quantity,
      cost,
      metadata,
      timestamp: new Date().toISOString(),
      period
    }

    // Log for debugging
    console.log(`📊 [USAGE] ${eventType}: ${quantity} units, $${cost.toFixed(4)} for user ${userId}`)

    try {
      const supabase = await createClient()

      // Store usage event in database
      const { data: usageEvent, error: insertError } = await supabase
        .from('usage_events')
        .insert({
          user_id: userId,
          barbershop_id: null, // We'll set this later when we have barbershop context
          event_type: eventType,
          quantity: quantity,
          cost_usd: cost,
          service_name: metadata.service || null,
          metadata: metadata,
          billing_period: billingPeriodDate
        })
        .select()
        .single()

      if (insertError) {
        console.error('Error storing usage event:', insertError)
        // Return event even if storage failed for debugging
        return { ...event, stored: false, error: insertError.message }
      }

      console.log(`✅ [USAGE] Stored event in database: ${usageEvent.id}`)
      return { ...event, stored: true, eventId: usageEvent.id }

    } catch (error) {
      console.error('Error tracking usage event:', error)
      // Return event even if storage failed
      return { ...event, stored: false, error: error.message }
    }
  }

  /**
   * Calculate cost based on usage type and quantity
   */
  static calculateCost(eventType, quantity) {
    const pricing = {
      ai_tokens: 0.04 / 1000, // $0.04 per 1,000 tokens
      sms_sent: 0.01,         // $0.01 per SMS
      email_sent: 0.001       // $0.001 per email
    }

    return (pricing[eventType] || 0) * quantity
  }

  /**
   * Get current usage for a user
   */
  static async getCurrentUsage(userId) {
    try {
      const supabase = await createClient()
      const currentPeriod = this.getCurrentPeriod()
      const billingPeriodDate = this.getCurrentBillingDate()
      
      // Get user's subscription tier
      const { data: profile } = await supabase
        .from('profiles')
        .select('subscription_tier, created_at')
        .eq('id', userId)
        .single()

      if (!profile) {
        throw new Error('User profile not found')
      }

      // Get tier limits
      const limits = getTierLimits(profile.subscription_tier)
      
      // Get real usage from database for current billing period
      const { data: usageEvents, error: usageError } = await supabase
        .from('usage_events')
        .select('event_type, quantity, cost_usd')
        .eq('user_id', userId)
        .eq('billing_period', billingPeriodDate)

      if (usageError) {
        console.error('Error fetching usage events:', usageError)
        // Fall back to zero usage if there's an error
        var realUsage = { ai_tokens: 0, sms_sent: 0, email_sent: 0 }
        var realCosts = { ai: 0, sms: 0, email: 0 }
      } else {
        // Aggregate usage events by type
        var realUsage = {
          ai_tokens: 0,
          sms_sent: 0, 
          email_sent: 0
        }
        var realCosts = {
          ai: 0,
          sms: 0,
          email: 0
        }

        if (usageEvents && usageEvents.length > 0) {
          usageEvents.forEach(event => {
            if (event.event_type === 'ai_tokens') {
              realUsage.ai_tokens += event.quantity
              realCosts.ai += parseFloat(event.cost_usd)
            } else if (event.event_type === 'sms_sent') {
              realUsage.sms_sent += event.quantity
              realCosts.sms += parseFloat(event.cost_usd)
            } else if (event.event_type === 'email_sent') {
              realUsage.email_sent += event.quantity
              realCosts.email += parseFloat(event.cost_usd)
            }
          })
        }
      }

      return {
        period: currentPeriod,
        usage: {
          ai: {
            tokens: realUsage.ai_tokens,
            limit: limits.aiTokens,
            cost: realCosts.ai,
            percentage: Math.min((realUsage.ai_tokens / limits.aiTokens) * 100, 100)
          },
          sms: {
            messages: realUsage.sms_sent,
            limit: limits.smsCredits,
            cost: realCosts.sms,
            percentage: Math.min((realUsage.sms_sent / limits.smsCredits) * 100, 100)
          },
          email: {
            sent: realUsage.email_sent,
            limit: limits.emailCredits,
            cost: realCosts.email,
            percentage: Math.min((realUsage.email_sent / limits.emailCredits) * 100, 100)
          }
        },
        totals: {
          cost: realCosts.ai + realCosts.sms + realCosts.email,
          subscriptionFee: this.getSubscriptionFee(profile.subscription_tier)
        }
      }
    } catch (error) {
      console.error('Error getting current usage:', error)
      throw error
    }
  }

  /**
   * Initialize current period usage limits for a user (called when needed)
   */
  static async initializeUsageLimits(userId, subscriptionTier) {
    try {
      const supabase = await createClient()
      const currentPeriodStart = this.getCurrentBillingDate()
      const limits = getTierLimits(subscriptionTier)

      // Check if limits already exist for this period
      const { data: existingLimits } = await supabase
        .from('usage_limits')
        .select('id')
        .eq('user_id', userId)
        .eq('period_start', currentPeriodStart)
        .single()

      if (existingLimits) {
        return existingLimits // Already initialized
      }

      // Create new usage limits record for this period
      const { data: newLimits, error } = await supabase
        .from('usage_limits')
        .insert({
          user_id: userId,
          period_start: currentPeriodStart,
          subscription_tier: subscriptionTier,
          ai_tokens_limit: limits.aiTokens,
          sms_limit: limits.smsCredits,
          email_limit: limits.emailCredits,
          ai_tokens_used: 0,
          sms_used: 0,
          email_used: 0
        })
        .select()
        .single()

      if (error) {
        console.error('Error initializing usage limits:', error)
        throw error
      }

      console.log(`✅ [USAGE] Initialized usage limits for user ${userId}, period ${currentPeriodStart}`)
      return newLimits

    } catch (error) {
      console.error('Error initializing usage limits:', error)
      throw error
    }
  }

  /**
   * Get subscription fee based on tier
   */
  static getSubscriptionFee(tier) {
    const fees = {
      FREE: 0,
      INDIVIDUAL: 29,
      PROFESSIONAL: 49,
      ENTERPRISE: 99
    }

    return fees[tier] || 0
  }

  /**
   * Get billing history for a user
   */
  static async getBillingHistory(userId, months = 6) {
    try {
      const supabase = await createClient()
      const history = []
      const now = new Date()

      // Get user subscription tier for fee calculation
      const { data: profile } = await supabase
        .from('profiles')
        .select('subscription_tier')
        .eq('id', userId)
        .single()

      const subscriptionFee = this.getSubscriptionFee(profile?.subscription_tier || 'FREE')

      for (let i = 0; i < months; i++) {
        const periodDate = new Date(now.getFullYear(), now.getMonth() - i, 1)
        const period = `${periodDate.getFullYear()}-${String(periodDate.getMonth() + 1).padStart(2, '0')}`
        
        // Get billing cycle data from database
        const { data: billingCycle } = await supabase
          .from('billing_cycles')
          .select('*')
          .eq('user_id', userId)
          .eq('period_start', periodDate)
          .single()

        if (billingCycle) {
          // Use real data from billing cycle
          history.push({
            period,
            periodDate,
            usage: {
              ai: billingCycle.ai_tokens_used,
              sms: billingCycle.sms_sent,
              email: billingCycle.email_sent
            },
            costs: {
              ai: parseFloat(billingCycle.ai_cost_usd),
              sms: parseFloat(billingCycle.sms_cost_usd),
              email: parseFloat(billingCycle.email_cost_usd)
            },
            totalCost: parseFloat(billingCycle.total_cost_usd),
            subscriptionFee: parseFloat(billingCycle.subscription_fee_usd) || subscriptionFee,
            grandTotal: parseFloat(billingCycle.grand_total_usd)
          })
        } else {
          // No data for this period - use zeros
          history.push({
            period,
            periodDate,
            usage: { ai: 0, sms: 0, email: 0 },
            costs: { ai: 0, sms: 0, email: 0 },
            totalCost: 0,
            subscriptionFee: subscriptionFee,
            grandTotal: subscriptionFee
          })
        }
      }

      return history.reverse() // Oldest first

    } catch (error) {
      console.error('Error getting billing history:', error)
      throw error
    }
  }

  /**
   * Check if user is approaching usage limits
   */
  static async checkUsageLimits(userId) {
    const usage = await this.getCurrentUsage(userId)
    const warnings = []

    Object.entries(usage.usage).forEach(([type, data]) => {
      if (data.percentage >= 90) {
        warnings.push({
          type,
          percentage: data.percentage,
          used: type === 'ai' ? data.tokens : type === 'sms' ? data.messages : data.sent,
          limit: data.limit,
          severity: data.percentage >= 95 ? 'critical' : 'warning'
        })
      }
    })

    return warnings
  }
}

// Export for use in API routes
export default UsageTracker