import { createClient } from '@/lib/supabase/server'

class UsageTrackingService {
  constructor() {
    this.supabase = createClient()
  }

  // Track different types of usage
  async trackBooking(userId) {
    return await this.incrementUsage(userId, 'bookings_per_month', 1)
  }

  async trackAIChat(userId, tokensUsed = 1) {
    return await this.incrementUsage(userId, 'ai_chats_per_month', 1, { tokens_used: tokensUsed })
  }

  async trackStaffAccount(userId, action = 'created') {
    if (action === 'created') {
      return await this.incrementUsage(userId, 'staff_accounts', 1)
    } else if (action === 'deleted') {
      return await this.incrementUsage(userId, 'staff_accounts', -1)
    }
  }

  async trackLocation(userId, action = 'created') {
    if (action === 'created') {
      return await this.incrementUsage(userId, 'locations', 1)
    } else if (action === 'deleted') {
      return await this.incrementUsage(userId, 'locations', -1)
    }
  }

  // Core usage tracking method
  async incrementUsage(userId, resourceType, amount = 1, metadata = {}) {
    try {
      // Call the database function to increment usage
      const { data, error } = await this.supabase.rpc('increment_usage', {
        p_user_id: userId,
        p_resource_type: resourceType,
        p_amount: amount
      })

      if (error) {
        console.error('Error incrementing usage:', error)
        throw error
      }

      // Log the usage event for analytics
      await this.supabase
        .from('analytics_events')
        .insert({
          user_id: userId,
          event_name: 'usage_tracked',
          event_properties: {
            resource_type: resourceType,
            amount: amount,
            new_count: data,
            ...metadata
          }
        })

      return data
    } catch (error) {
      console.error('Usage tracking failed:', error)
      throw error
    }
  }

  // Get current usage for a user
  async getCurrentUsage(userId, resourceType) {
    try {
      const { data, error } = await this.supabase.rpc('get_current_usage', {
        p_user_id: userId,
        p_resource_type: resourceType
      })

      if (error) {
        console.error('Error getting current usage:', error)
        return 0
      }

      return data || 0
    } catch (error) {
      console.error('Failed to get current usage:', error)
      return 0
    }
  }

  // Get all usage data for a user
  async getUserUsage(userId) {
    try {
      const resourceTypes = [
        'bookings_per_month',
        'ai_chats_per_month',
        'staff_accounts',
        'locations'
      ]

      const usage = {}
      
      for (const resourceType of resourceTypes) {
        const current = await this.getCurrentUsage(userId, resourceType)
        const limits = await this.getUserLimits(userId)
        
        usage[resourceType] = {
          current: current,
          limit: limits[resourceType] || -1
        }
      }

      return usage
    } catch (error) {
      console.error('Failed to get user usage:', error)
      return {}
    }
  }

  // Get user's subscription limits
  async getUserLimits(userId) {
    try {
      const { data: profile, error } = await this.supabase
        .from('profiles')
        .select('subscription_plan, subscription_status')
        .eq('id', userId)
        .single()

      if (error) {
        console.error('Error getting user profile:', error)
        return this.getFreePlanLimits()
      }

      if (!profile || profile.subscription_status !== 'active') {
        return this.getFreePlanLimits()
      }

      return this.getPlanLimits(profile.subscription_plan || 'FREE')
    } catch (error) {
      console.error('Failed to get user limits:', error)
      return this.getFreePlanLimits()
    }
  }

  // Plan limits configuration
  getPlanLimits(planId) {
    const plans = {
      FREE: {
        bookings_per_month: 50,
        ai_chats_per_month: 100,
        staff_accounts: 1,
        locations: 1
      },
      BASIC: {
        bookings_per_month: 500,
        ai_chats_per_month: 1000,
        staff_accounts: 5,
        locations: 1
      },
      PROFESSIONAL: {
        bookings_per_month: 2000,
        ai_chats_per_month: 5000,
        staff_accounts: 15,
        locations: 3
      },
      ENTERPRISE: {
        bookings_per_month: -1, // unlimited
        ai_chats_per_month: -1, // unlimited
        staff_accounts: -1,     // unlimited
        locations: -1          // unlimited
      }
    }

    return plans[planId] || plans.FREE
  }

  getFreePlanLimits() {
    return this.getPlanLimits('FREE')
  }

  // Check if user can perform an action based on limits
  async checkUsageLimit(userId, resourceType, requestedAmount = 1) {
    try {
      const currentUsage = await this.getCurrentUsage(userId, resourceType)
      const limits = await this.getUserLimits(userId)
      const limit = limits[resourceType]

      // Unlimited usage
      if (limit === -1) {
        return {
          allowed: true,
          currentUsage: currentUsage,
          limit: limit,
          remaining: -1
        }
      }

      // Check if the requested amount would exceed the limit
      const wouldExceed = (currentUsage + requestedAmount) > limit
      
      return {
        allowed: !wouldExceed,
        currentUsage: currentUsage,
        limit: limit,
        remaining: limit - currentUsage,
        overageAmount: wouldExceed ? (currentUsage + requestedAmount - limit) : 0
      }
    } catch (error) {
      console.error('Error checking usage limit:', error)
      return {
        allowed: false,
        error: error.message
      }
    }
  }

  // Usage-based billing calculation
  async calculateOverageCharges(userId, period = 'current_month') {
    try {
      const usage = await this.getUserUsage(userId)
      const limits = await this.getUserLimits(userId)
      
      const overages = {}
      let totalOverageCharge = 0

      // Overage rates per unit (in cents)
      const overageRates = {
        bookings_per_month: 10, // $0.10 per booking over limit
        ai_chats_per_month: 5,  // $0.05 per AI chat over limit
        staff_accounts: 500,    // $5.00 per staff account over limit
        locations: 1000        // $10.00 per location over limit
      }

      for (const [resourceType, userUsage] of Object.entries(usage)) {
        const limit = limits[resourceType]
        
        // Skip if unlimited
        if (limit === -1) continue
        
        const overage = Math.max(0, userUsage.current - limit)
        
        if (overage > 0) {
          const charge = overage * (overageRates[resourceType] || 0)
          overages[resourceType] = {
            overage: overage,
            rate: overageRates[resourceType],
            charge: charge
          }
          totalOverageCharge += charge
        }
      }

      return {
        period: period,
        overages: overages,
        totalCharge: totalOverageCharge,
        currency: 'usd'
      }
    } catch (error) {
      console.error('Error calculating overage charges:', error)
      return {
        period: period,
        overages: {},
        totalCharge: 0,
        error: error.message
      }
    }
  }

  // Reset usage for a new billing period (called by cron job)
  async resetUsageForNewPeriod(userId, periodStart, periodEnd) {
    try {
      // Archive current usage
      const currentUsage = await this.getUserUsage(userId)
      
      // Store historical usage
      await this.supabase
        .from('usage_history')
        .insert({
          user_id: userId,
          period_start: periodStart,
          period_end: periodEnd,
          usage_data: currentUsage,
          created_at: new Date().toISOString()
        })

      // Reset counters for new period (this would be handled by the database function)
      // The increment_usage function automatically handles period boundaries
      
      return { success: true }
    } catch (error) {
      console.error('Error resetting usage for new period:', error)
      throw error
    }
  }

  // Middleware function to track and validate usage
  async usageMiddleware(userId, resourceType, requestedAmount = 1) {
    const check = await this.checkUsageLimit(userId, resourceType, requestedAmount)
    
    if (!check.allowed) {
      const error = new Error(`Usage limit exceeded for ${resourceType}. Current: ${check.currentUsage}, Limit: ${check.limit}`)
      error.type = 'USAGE_LIMIT_EXCEEDED'
      error.details = check
      throw error
    }

    // Track the usage after validation
    await this.incrementUsage(userId, resourceType, requestedAmount)
    
    return check
  }
}

export default UsageTrackingService

// Export singleton instance
export const usageTracker = new UsageTrackingService()