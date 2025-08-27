/**
 * Master Subscription Service
 * Single source of truth for all subscription operations
 * Consolidates fragmented subscription systems into unified service
 */

import { createClient } from '@/lib/supabase/client'
import { createServiceClient } from '@/lib/supabase/service'

/**
 * Subscription Service Class
 * Handles all subscription-related operations with unified data model
 */
export class SubscriptionService {
  constructor(options = {}) {
    this.useServiceClient = options.useServiceClient || false
    this.cache = new Map()
    this.cacheTimeout = 5 * 60 * 1000 // 5 minutes
  }

  /**
   * Get Supabase client (regular or service client)
   */
  getClient() {
    return this.useServiceClient ? createServiceClient() : createClient()
  }

  /**
   * Get subscription for a user or barbershop
   * @param {Object} params - Parameters
   * @param {string} params.userId - User ID (for individual subscriptions)
   * @param {string} params.barbershopId - Barbershop ID (for business subscriptions)
   * @param {boolean} params.includeUsage - Include usage data
   * @returns {Promise<Object|null>} Subscription data or null
   */
  async getSubscription({ userId = null, barbershopId = null, includeUsage = false }) {
    try {
      if (!userId && !barbershopId) {
        throw new Error('Either userId or barbershopId must be provided')
      }

      const cacheKey = `subscription-${userId || barbershopId}-${includeUsage}`
      
      // Check cache first
      if (this.cache.has(cacheKey)) {
        const cached = this.cache.get(cacheKey)
        if (Date.now() - cached.timestamp < this.cacheTimeout) {
          return cached.data
        }
      }

      const supabase = this.getClient()

      // Build query
      let query = supabase
        .from('active_subscriptions')
        .select('*')

      if (userId) {
        query = query.eq('user_id', userId)
      } else {
        query = query.eq('barbershop_id', barbershopId)
      }

      const { data: subscription, error } = await query.maybeSingle()

      if (error) {
        console.error('getSubscription: Database error:', error)
        throw new Error(`Subscription lookup failed: ${error.message}`)
      }

      // Add usage data if requested
      let subscriptionWithUsage = subscription
      if (subscription && includeUsage) {
        const usage = await this.getCurrentUsage(subscription.id)
        subscriptionWithUsage = { ...subscription, usage }
      }

      // Cache the result
      this.cache.set(cacheKey, {
        data: subscriptionWithUsage,
        timestamp: Date.now()
      })

      return subscriptionWithUsage

    } catch (error) {
      console.error('getSubscription: Error:', error)
      return null
    }
  }

  /**
   * Check if user/barbershop has active subscription
   * @param {Object} params - Parameters
   * @returns {Promise<boolean>} True if has active subscription
   */
  async hasActiveSubscription(params) {
    const subscription = await this.getSubscription(params)
    return subscription && ['active', 'trialing'].includes(subscription.status)
  }

  /**
   * Get subscription tier information
   * @param {string} tierName - Tier name (trial, basic, professional, etc.)
   * @returns {Promise<Object|null>} Tier information
   */
  async getSubscriptionTier(tierName) {
    try {
      const supabase = this.getClient()

      const { data: tier, error } = await supabase
        .from('subscription_tiers')
        .select('*')
        .eq('tier_name', tierName)
        .eq('is_active', true)
        .single()

      if (error) {
        console.error('getSubscriptionTier: Database error:', error)
        return null
      }

      return tier

    } catch (error) {
      console.error('getSubscriptionTier: Error:', error)
      return null
    }
  }

  /**
   * Get all available subscription tiers
   * @returns {Promise<Array>} Array of subscription tiers
   */
  async getAllSubscriptionTiers() {
    try {
      const supabase = this.getClient()

      const { data: tiers, error } = await supabase
        .from('subscription_tiers')
        .select('*')
        .eq('is_active', true)
        .order('sort_order', { ascending: true })

      if (error) {
        console.error('getAllSubscriptionTiers: Database error:', error)
        return []
      }

      return tiers || []

    } catch (error) {
      console.error('getAllSubscriptionTiers: Error:', error)
      return []
    }
  }

  /**
   * Create a new subscription
   * @param {Object} subscriptionData - Subscription data
   * @returns {Promise<Object>} Created subscription
   */
  async createSubscription(subscriptionData) {
    try {
      const {
        userId = null,
        barbershopId = null,
        tier,
        stripeSubscriptionId = null,
        stripeCustomerId = null,
        trialDays = 14
      } = subscriptionData

      if (!userId && !barbershopId) {
        throw new Error('Either userId or barbershopId must be provided')
      }

      // Get tier information
      const tierInfo = await this.getSubscriptionTier(tier)
      if (!tierInfo) {
        throw new Error(`Invalid subscription tier: ${tier}`)
      }

      const supabase = this.getClient()

      // Calculate trial period
      const trialStartDate = new Date()
      const trialEndDate = new Date()
      trialEndDate.setDate(trialEndDate.getDate() + trialDays)

      const subscriptionRecord = {
        user_id: userId,
        barbershop_id: barbershopId,
        tier: tier,
        status: stripeSubscriptionId ? 'active' : 'trialing',
        price_per_month: tierInfo.monthly_price,
        
        // Set limits based on tier
        max_staff: tierInfo.max_staff,
        max_services: tierInfo.max_services,
        max_appointments_per_month: tierInfo.max_appointments_per_month,
        max_locations: tierInfo.max_locations,
        ai_quota_per_month: tierInfo.ai_quota_per_month,
        sms_quota_per_month: tierInfo.sms_quota_per_month,
        email_quota_per_month: tierInfo.email_quota_per_month,
        
        // Set features based on tier
        has_analytics: tierInfo.features.includes('basic_analytics') || tierInfo.features.includes('advanced_analytics'),
        has_marketing_tools: tierInfo.features.includes('marketing_tools') || tierInfo.features.includes('advanced_marketing'),
        has_api_access: tierInfo.features.includes('api_access'),
        has_white_label: tierInfo.features.includes('white_label'),
        has_multi_location: tierInfo.features.includes('multi_location'),
        has_advanced_reporting: tierInfo.features.includes('advanced_reporting'),
        
        // Stripe integration
        stripe_subscription_id: stripeSubscriptionId,
        stripe_customer_id: stripeCustomerId,
        stripe_product_id: tierInfo.stripe_product_id,
        
        // Trial settings
        trial_start_date: trialStartDate.toISOString(),
        trial_end_date: trialEndDate.toISOString(),
        
        // Billing periods
        current_period_start: new Date().toISOString(),
        current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        
        started_at: new Date().toISOString()
      }

      const { data: subscription, error } = await supabase
        .from('subscriptions')
        .insert(subscriptionRecord)
        .select()
        .single()

      if (error) {
        console.error('createSubscription: Database error:', error)
        throw new Error(`Failed to create subscription: ${error.message}`)
      }

      // Clear relevant caches
      this.clearCache(userId, barbershopId)

      console.log(`✅ Created subscription for ${userId ? 'user' : 'barbershop'}: ${userId || barbershopId}`)
      return subscription

    } catch (error) {
      console.error('createSubscription: Error:', error)
      throw error
    }
  }

  /**
   * Update subscription
   * @param {string} subscriptionId - Subscription ID to update
   * @param {Object} updates - Fields to update
   * @returns {Promise<Object>} Updated subscription
   */
  async updateSubscription(subscriptionId, updates) {
    try {
      const supabase = this.getClient()

      const { data: subscription, error } = await supabase
        .from('subscriptions')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', subscriptionId)
        .select()
        .single()

      if (error) {
        console.error('updateSubscription: Database error:', error)
        throw new Error(`Failed to update subscription: ${error.message}`)
      }

      // Clear cache
      this.cache.clear()

      return subscription

    } catch (error) {
      console.error('updateSubscription: Error:', error)
      throw error
    }
  }

  /**
   * Cancel subscription
   * @param {string} subscriptionId - Subscription ID to cancel
   * @param {string} reason - Cancellation reason
   * @returns {Promise<Object>} Canceled subscription
   */
  async cancelSubscription(subscriptionId, reason = null) {
    try {
      const canceledAt = new Date().toISOString()
      
      const updates = {
        status: 'canceled',
        canceled_at: canceledAt,
        ended_at: canceledAt,
        notes: reason ? `Canceled: ${reason}` : 'Canceled by user'
      }

      return await this.updateSubscription(subscriptionId, updates)

    } catch (error) {
      console.error('cancelSubscription: Error:', error)
      throw error
    }
  }

  /**
   * Get current usage for subscription
   * @param {string} subscriptionId - Subscription ID
   * @returns {Promise<Object>} Current usage data
   */
  async getCurrentUsage(subscriptionId) {
    try {
      const supabase = this.getClient()

      const { data: usage, error } = await supabase
        .from('subscription_usage')
        .select('*')
        .eq('subscription_id', subscriptionId)
        .lte('usage_period_start', new Date().toISOString())
        .gte('usage_period_end', new Date().toISOString())
        .maybeSingle()

      if (error && error.code !== 'PGRST116') {
        console.error('getCurrentUsage: Database error:', error)
        return null
      }

      return usage || {
        appointments_created: 0,
        staff_members_active: 0,
        services_active: 0,
        ai_requests: 0,
        sms_sent: 0,
        emails_sent: 0,
        api_calls: 0
      }

    } catch (error) {
      console.error('getCurrentUsage: Error:', error)
      return null
    }
  }

  /**
   * Track usage for subscription
   * @param {string} subscriptionId - Subscription ID
   * @param {Object} usage - Usage data to increment
   * @returns {Promise<boolean>} Success status
   */
  async trackUsage(subscriptionId, usage) {
    try {
      const supabase = this.getClient()

      // Get current month period
      const now = new Date()
      const periodStart = new Date(now.getFullYear(), now.getMonth(), 1)
      const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59)

      // Upsert usage record
      const { error } = await supabase
        .from('subscription_usage')
        .upsert({
          subscription_id: subscriptionId,
          usage_period_start: periodStart.toISOString(),
          usage_period_end: periodEnd.toISOString(),
          ...usage
        }, {
          onConflict: 'subscription_id,usage_period_start,usage_period_end'
        })

      if (error) {
        console.error('trackUsage: Database error:', error)
        return false
      }

      return true

    } catch (error) {
      console.error('trackUsage: Error:', error)
      return false
    }
  }

  /**
   * Check if subscription has exceeded limits
   * @param {string} subscriptionId - Subscription ID
   * @returns {Promise<Object>} Limit check results
   */
  async checkLimits(subscriptionId) {
    try {
      const supabase = this.getClient()

      const { data: result, error } = await supabase
        .from('subscription_usage_summary')
        .select('*')
        .eq('subscription_id', subscriptionId)
        .single()

      if (error) {
        console.error('checkLimits: Database error:', error)
        return { withinLimits: true, warnings: [] }
      }

      const warnings = []
      let withinLimits = true

      // Check appointment limits
      if (result.appointments_usage_percent > 80) {
        warnings.push(`Appointment usage: ${result.appointments_usage_percent.toFixed(1)}%`)
      }
      if (result.appointments_usage_percent > 100) {
        withinLimits = false
      }

      // Check AI usage limits
      if (result.ai_usage_percent > 80) {
        warnings.push(`AI usage: ${result.ai_usage_percent.toFixed(1)}%`)
      }
      if (result.ai_usage_percent > 100) {
        withinLimits = false
      }

      return { withinLimits, warnings, usage: result }

    } catch (error) {
      console.error('checkLimits: Error:', error)
      return { withinLimits: true, warnings: [] }
    }
  }

  /**
   * Clear cache for specific user/barbershop
   * @param {string} userId - User ID
   * @param {string} barbershopId - Barbershop ID
   */
  clearCache(userId = null, barbershopId = null) {
    const identifier = userId || barbershopId
    if (identifier) {
      // Remove all cache entries for this identifier
      for (const [key] of this.cache.entries()) {
        if (key.includes(identifier)) {
          this.cache.delete(key)
        }
      }
    } else {
      // Clear all cache
      this.cache.clear()
    }
  }

  /**
   * Migrate existing subscription data from fragmented system
   * @returns {Promise<Object>} Migration results
   */
  async migrateExistingSubscriptions() {
    try {
      const supabase = this.getClient()

      // Call the database migration function
      const { data, error } = await supabase.rpc('migrate_existing_subscriptions')

      if (error) {
        console.error('migrateExistingSubscriptions: Database error:', error)
        throw new Error(`Migration failed: ${error.message}`)
      }

      console.log('Migration result:', data)
      return { success: true, message: data }

    } catch (error) {
      console.error('migrateExistingSubscriptions: Error:', error)
      return { success: false, error: error.message }
    }
  }

  /**
   * Validate subscription data integrity
   * @returns {Promise<Array>} Validation results
   */
  async validateIntegrity() {
    try {
      const supabase = this.getClient()

      const { data, error } = await supabase.rpc('validate_subscription_integrity')

      if (error) {
        console.error('validateIntegrity: Database error:', error)
        return []
      }

      return data || []

    } catch (error) {
      console.error('validateIntegrity: Error:', error)
      return []
    }
  }
}

// Export singleton instance
const subscriptionService = new SubscriptionService()
export default subscriptionService

// Export class for testing and custom instances
export { SubscriptionService }

// Export convenience functions
export const getSubscription = (params) => subscriptionService.getSubscription(params)
export const hasActiveSubscription = (params) => subscriptionService.hasActiveSubscription(params)
export const getAllSubscriptionTiers = () => subscriptionService.getAllSubscriptionTiers()
export const createSubscription = (data) => subscriptionService.createSubscription(data)
export const trackUsage = (id, usage) => subscriptionService.trackUsage(id, usage)