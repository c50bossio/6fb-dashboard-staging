/**
 * Unified Compensation Engine with Hierarchical Inheritance + Stripe Integration
 * 
 * Handles shop-level defaults with individual barber overrides
 * Supports commission, booth rent, tiered, and hybrid compensation models
 * Integrates with Stripe for automated payouts and payment processing
 * Single source of truth for all compensation calculations
 */

import { createClient } from '@/lib/supabase/UNIFIED_CLIENT'

class CompensationEngine {
  constructor(barbershopId, barberId = null) {
    this.barbershopId = barbershopId
    this.barberId = barberId
    this.supabase = null
    this.initializeClient()
  }

  initializeClient() {
    if (typeof window !== 'undefined') {
      this.supabase = createClient()
    }
  }

  getSupabase() {
    if (!this.supabase && typeof window !== 'undefined') {
      this.supabase = createClient()
    }
    return this.supabase
  }

  // =======================================================================
  // CORE INHERITANCE LOGIC
  // =======================================================================

  /**
   * Get effective compensation for a barber (shop defaults + overrides merged)
   * @param {string} barberId - Optional barber ID (uses constructor value if not provided)
   * @returns {Object} Merged compensation configuration
   */
  async getEffectiveCompensation(barberId = null) {
    const targetBarberId = barberId || this.barberId
    const supabase = this.getSupabase()
    
    if (!supabase) {
      throw new Error('Supabase client not initialized')
    }

    try {
      if (!targetBarberId) {
        // Return shop defaults only
        return await this.getShopDefaults()
      }

      // Use the effective_compensation view for optimized query
      const { data, error } = await supabase
        .from('effective_compensation')
        .select('*')
        .eq('barbershop_id', this.barbershopId)
        .eq('barber_id', targetBarberId)
        .single()

      if (error && error.code !== 'PGRST116') { // Not found is ok
        throw error
      }

      if (!data) {
        // No override exists, return shop defaults
        return await this.getShopDefaults()
      }

      return {
        ...data,
        _metadata: {
          source: data.compensation_source,
          last_updated: data.last_updated,
          has_override: data.compensation_source !== 'shop_default',
          override_details: data.compensation_source !== 'shop_default' ? {
            reason: data.override_reason,
            approved_by: data.approved_by,
            approved_at: data.approved_at,
            effective_start: data.effective_start_date,
            effective_end: data.effective_end_date,
            is_trial: data.is_trial_period
          } : null
        }
      }
    } catch (error) {
      console.error('Error getting effective compensation:', error)
      throw error
    }
  }

  /**
   * Get shop-level default compensation
   * @returns {Object} Shop default compensation settings
   */
  async getShopDefaults() {
    const supabase = this.getSupabase()
    
    try {
      const { data, error } = await supabase
        .from('shop_compensation_defaults')
        .select('*')
        .eq('barbershop_id', this.barbershopId)
        .single()

      if (error && error.code === 'PGRST116') {
        // No defaults exist, return system defaults
        return this.getSystemDefaults()
      }

      if (error) throw error

      return {
        model_type: data.default_model_type,
        commission_rate: data.default_commission_rate,
        booth_rent_amount: data.default_booth_rent_amount,
        booth_rent_frequency: data.default_booth_rent_frequency,
        tier_structure_id: data.default_tier_structure_id,
        use_marginal_calculation: data.default_use_marginal_calculation,
        hybrid_base_rent: data.default_hybrid_base_rent,
        hybrid_commission_rate: data.default_hybrid_commission_rate,
        hybrid_threshold: data.default_hybrid_threshold,
        product_commission_rate: data.default_product_commission_rate,
        payment_methods: data.default_payment_methods,
        billing_cycle: data.default_billing_cycle,
        payment_due_day: data.default_payment_due_day,
        _metadata: {
          source: 'shop_default',
          last_updated: data.updated_at,
          has_override: false,
          shop_config: {
            apply_to_new_barbers: data.apply_to_new_barbers,
            allow_barber_overrides: data.allow_barber_overrides,
            require_approval_for_overrides: data.require_approval_for_overrides,
            created_by: data.created_by
          }
        }
      }
    } catch (error) {
      console.error('Error getting shop defaults:', error)
      throw error
    }
  }

  /**
   * Get system-wide defaults when no shop defaults exist
   * @returns {Object} System default compensation settings
   */
  getSystemDefaults() {
    return {
      model_type: 'commission',
      commission_rate: 0.40, // Shop keeps 40%, barber gets 60%
      booth_rent_amount: 0,
      booth_rent_frequency: 'monthly',
      tier_structure_id: null,
      use_marginal_calculation: true,
      hybrid_base_rent: 0,
      hybrid_commission_rate: 0,
      hybrid_threshold: 0,
      product_commission_rate: 0.10,
      payment_methods: ['balance', 'ach', 'card'],
      billing_cycle: 'monthly',
      payment_due_day: 1,
      _metadata: {
        source: 'system_default',
        last_updated: null,
        has_override: false,
        note: 'No shop defaults configured - using system defaults'
      }
    }
  }

  // =======================================================================
  // COMPENSATION CALCULATIONS
  // =======================================================================

  /**
   * Calculate compensation for given revenue based on effective compensation
   * @param {number} revenue - Revenue amount
   * @param {Object} options - Calculation options
   * @returns {Object} Calculation results
   */
  async calculateCompensation(revenue, options = {}) {
    const compensation = await this.getEffectiveCompensation(options.barberId)
    const amount = parseFloat(revenue) || 0

    const calculation = {
      revenue: amount,
      model_type: compensation.model_type,
      compensation_source: compensation._metadata.source,
      calculated_at: new Date().toISOString()
    }

    switch (compensation.model_type) {
      case 'commission':
        return {
          ...calculation,
          ...this.calculateCommission(amount, compensation)
        }
      
      case 'booth_rent':
        return {
          ...calculation,
          ...this.calculateBoothRent(amount, compensation, options)
        }
      
      case 'tiered':
        return {
          ...calculation,
          ...(await this.calculateTiered(amount, compensation, options))
        }
      
      case 'hybrid':
        return {
          ...calculation,
          ...this.calculateHybrid(amount, compensation, options)
        }
      
      default:
        throw new Error(`Unsupported compensation model: ${compensation.model_type}`)
    }
  }

  /**
   * Calculate simple commission split
   */
  calculateCommission(revenue, compensation) {
    const shopRate = compensation.commission_rate || 0.40
    const barberRate = 1 - shopRate
    
    return {
      shop_earnings: revenue * shopRate,
      barber_earnings: revenue * barberRate,
      shop_rate: shopRate,
      barber_rate: barberRate,
      calculation_method: 'commission_split',
      breakdown: {
        base_revenue: revenue,
        shop_commission: revenue * shopRate,
        barber_commission: revenue * barberRate,
        effective_rate: barberRate
      }
    }
  }

  /**
   * Calculate booth rent model (barber keeps 100% after rent)
   */
  calculateBoothRent(revenue, compensation, options = {}) {
    const rentAmount = compensation.booth_rent_amount || 0
    const frequency = compensation.booth_rent_frequency || 'monthly'
    const period = options.period || 'monthly'
    
    // Convert rent to calculation period
    let periodRent = rentAmount
    if (frequency !== period) {
      periodRent = this.convertRentToPeriod(rentAmount, frequency, period)
    }
    
    const barberEarnings = Math.max(0, revenue - periodRent)
    
    return {
      shop_earnings: Math.min(revenue, periodRent),
      barber_earnings: barberEarnings,
      rent_amount: periodRent,
      rent_frequency: frequency,
      calculation_method: 'booth_rent',
      breakdown: {
        base_revenue: revenue,
        rent_owed: periodRent,
        rent_covered: Math.min(revenue, periodRent),
        barber_keeps: barberEarnings,
        rent_shortfall: Math.max(0, periodRent - revenue)
      }
    }
  }

  /**
   * Calculate tiered commission with marginal brackets
   */
  async calculateTiered(revenue, compensation, options = {}) {
    if (!compensation.tier_structure_id) {
      throw new Error('Tier structure ID required for tiered compensation')
    }

    // Get tier structure
    const tierConfig = await this.getTierConfig(compensation.tier_structure_id)
    if (!tierConfig) {
      throw new Error('Tier structure not found')
    }

    const tiers = tierConfig.tiers || []
    const useMarginal = compensation.use_marginal_calculation !== false

    if (useMarginal) {
      return this.calculateMarginalTiers(revenue, tiers)
    } else {
      return this.calculateFlatTiers(revenue, tiers)
    }
  }

  /**
   * Calculate marginal tier system (like tax brackets)
   */
  calculateMarginalTiers(revenue, tiers) {
    const breakdown = []
    let totalCommission = 0
    let remainingRevenue = revenue

    // Sort tiers by minimum revenue
    const sortedTiers = tiers.sort((a, b) => (a.min || 0) - (b.min || 0))

    for (const tier of sortedTiers) {
      if (remainingRevenue <= 0) break

      const tierMin = tier.min || 0
      const tierMax = tier.max || Infinity
      const tierRate = (tier.rate || 0) / 100 // Convert percentage to decimal

      // Calculate revenue in this bracket
      const revenueInBracket = Math.max(0, Math.min(remainingRevenue, tierMax - Math.max(tierMin, revenue - remainingRevenue)))
      
      if (revenueInBracket > 0) {
        const commissionInBracket = revenueInBracket * tierRate
        totalCommission += commissionInBracket

        breakdown.push({
          tier_name: tier.name,
          tier_level: tier.level || breakdown.length + 1,
          min_revenue: tierMin,
          max_revenue: tier.max,
          rate: tier.rate,
          revenue_in_bracket: revenueInBracket,
          commission_earned: commissionInBracket
        })
      }
    }

    const effectiveRate = revenue > 0 ? totalCommission / revenue : 0

    return {
      shop_earnings: revenue - totalCommission,
      barber_earnings: totalCommission,
      effective_rate: effectiveRate,
      calculation_method: 'marginal_tiers',
      tier_breakdown: breakdown,
      breakdown: {
        base_revenue: revenue,
        total_commission: totalCommission,
        effective_commission_rate: effectiveRate,
        tiers_applied: breakdown.length
      }
    }
  }

  /**
   * Calculate flat tier system (single rate based on total revenue)
   */
  calculateFlatTiers(revenue, tiers) {
    // Find applicable tier
    const sortedTiers = tiers.sort((a, b) => (b.min || 0) - (a.min || 0))
    const applicableTier = sortedTiers.find(tier => revenue >= (tier.min || 0))
    
    if (!applicableTier) {
      // No tier applies, use 0% commission
      return {
        shop_earnings: revenue,
        barber_earnings: 0,
        effective_rate: 0,
        calculation_method: 'flat_tiers',
        applied_tier: null,
        breakdown: {
          base_revenue: revenue,
          no_tier_qualified: true
        }
      }
    }

    const tierRate = (applicableTier.rate || 0) / 100
    const commission = revenue * tierRate

    return {
      shop_earnings: revenue - commission,
      barber_earnings: commission,
      effective_rate: tierRate,
      calculation_method: 'flat_tiers',
      applied_tier: {
        name: applicableTier.name,
        level: applicableTier.level,
        min_revenue: applicableTier.min,
        max_revenue: applicableTier.max,
        rate: applicableTier.rate
      },
      breakdown: {
        base_revenue: revenue,
        tier_rate: applicableTier.rate,
        commission_earned: commission
      }
    }
  }

  /**
   * Calculate hybrid model (base rent + commission on excess)
   */
  calculateHybrid(revenue, compensation, options = {}) {
    const baseRent = compensation.hybrid_base_rent || 0
    const commissionRate = compensation.hybrid_commission_rate || 0
    const threshold = compensation.hybrid_threshold || baseRent
    
    let shopEarnings = baseRent
    let barberEarnings = 0
    
    // If revenue exceeds threshold, apply commission to excess
    if (revenue > threshold) {
      const excessRevenue = revenue - threshold
      const commission = excessRevenue * (commissionRate / 100)
      
      shopEarnings = baseRent + commission
      barberEarnings = excessRevenue - commission
    } else if (revenue > baseRent) {
      // Revenue covers some rent but doesn't reach commission threshold
      barberEarnings = revenue - baseRent
    }
    
    // Ensure shop doesn't earn more than total revenue
    shopEarnings = Math.min(shopEarnings, revenue)
    barberEarnings = revenue - shopEarnings
    
    return {
      shop_earnings: shopEarnings,
      barber_earnings: barberEarnings,
      base_rent: baseRent,
      commission_rate: commissionRate,
      threshold: threshold,
      calculation_method: 'hybrid',
      breakdown: {
        base_revenue: revenue,
        base_rent: baseRent,
        excess_revenue: Math.max(0, revenue - threshold),
        commission_on_excess: Math.max(0, (revenue - threshold) * (commissionRate / 100)),
        rent_covered: Math.min(revenue, baseRent)
      }
    }
  }

  // =======================================================================
  // SHOP DEFAULTS MANAGEMENT
  // =======================================================================

  /**
   * Create or update shop default compensation
   * @param {Object} defaults - Shop default settings
   * @param {string} userId - ID of user making the change
   * @returns {Object} Updated shop defaults
   */
  async saveShopDefaults(defaults, userId) {
    const supabase = this.getSupabase()
    
    try {
      const shopDefaultsData = {
        barbershop_id: this.barbershopId,
        default_model_type: defaults.model_type,
        default_commission_rate: defaults.commission_rate,
        default_booth_rent_amount: defaults.booth_rent_amount,
        default_booth_rent_frequency: defaults.booth_rent_frequency,
        default_tier_structure_id: defaults.tier_structure_id,
        default_use_marginal_calculation: defaults.use_marginal_calculation,
        default_hybrid_base_rent: defaults.hybrid_base_rent,
        default_hybrid_commission_rate: defaults.hybrid_commission_rate,
        default_hybrid_threshold: defaults.hybrid_threshold,
        default_product_commission_rate: defaults.product_commission_rate,
        default_payment_methods: defaults.payment_methods,
        default_billing_cycle: defaults.billing_cycle,
        default_payment_due_day: defaults.payment_due_day,
        apply_to_new_barbers: defaults.apply_to_new_barbers,
        allow_barber_overrides: defaults.allow_barber_overrides,
        require_approval_for_overrides: defaults.require_approval_for_overrides,
        last_modified_by: userId,
        updated_at: new Date().toISOString()
      }

      // Check if defaults exist
      const { data: existing } = await supabase
        .from('shop_compensation_defaults')
        .select('id')
        .eq('barbershop_id', this.barbershopId)
        .single()

      let result
      if (existing) {
        // Update existing defaults
        const { data, error } = await supabase
          .from('shop_compensation_defaults')
          .update(shopDefaultsData)
          .eq('id', existing.id)
          .select()
          .single()
          
        if (error) throw error
        result = data
      } else {
        // Create new defaults
        shopDefaultsData.created_by = userId
        shopDefaultsData.created_at = new Date().toISOString()
        
        const { data, error } = await supabase
          .from('shop_compensation_defaults')
          .insert(shopDefaultsData)
          .select()
          .single()
          
        if (error) throw error
        result = data
      }

      // If apply_to_new_barbers is true, update existing barbers without overrides
      if (defaults.apply_to_new_barbers) {
        await this.applyDefaultsToExistingBarbers(userId)
      }

      return { data: result, error: null }
    } catch (error) {
      console.error('Error saving shop defaults:', error)
      return { data: null, error: error.message }
    }
  }

  // =======================================================================
  // BARBER OVERRIDE MANAGEMENT
  // =======================================================================

  /**
   * Create compensation override for specific barber
   * @param {string} barberId - Barber ID
   * @param {Object} overrides - Override settings
   * @param {string} requestedBy - User ID who requested
   * @param {Object} options - Additional options
   * @returns {Object} Created override
   */
  async createBarberOverride(barberId, overrides, requestedBy, options = {}) {
    const supabase = this.getSupabase()
    
    try {
      // Deactivate existing override if exists
      await supabase
        .from('barber_compensation_overrides')
        .update({ is_active: false })
        .eq('barbershop_id', this.barbershopId)
        .eq('barber_id', barberId)
        .eq('is_active', true)

      const overrideData = {
        barbershop_id: this.barbershopId,
        barber_id: barberId,
        use_shop_defaults: overrides.use_shop_defaults !== false,
        override_model_type: overrides.model_type,
        override_commission_rate: overrides.commission_rate,
        override_booth_rent_amount: overrides.booth_rent_amount,
        override_booth_rent_frequency: overrides.booth_rent_frequency,
        override_tier_structure_id: overrides.tier_structure_id,
        override_use_marginal_calculation: overrides.use_marginal_calculation,
        override_hybrid_base_rent: overrides.hybrid_base_rent,
        override_hybrid_commission_rate: overrides.hybrid_commission_rate,
        override_hybrid_threshold: overrides.hybrid_threshold,
        override_product_commission_rate: overrides.product_commission_rate,
        override_payment_methods: overrides.payment_methods,
        override_billing_cycle: overrides.billing_cycle,
        override_payment_due_day: overrides.payment_due_day,
        override_reason: options.reason,
        requested_by: requestedBy,
        effective_start_date: options.start_date || new Date().toISOString().split('T')[0],
        effective_end_date: options.end_date,
        is_trial_period: options.is_trial || false,
        trial_review_date: options.trial_review_date,
        is_pending_approval: options.require_approval || false,
        notes: options.notes,
        is_active: true
      }

      const { data, error } = await supabase
        .from('barber_compensation_overrides')
        .insert(overrideData)
        .select()
        .single()

      if (error) throw error

      return { data, error: null }
    } catch (error) {
      console.error('Error creating barber override:', error)
      return { data: null, error: error.message }
    }
  }

  // =======================================================================
  // STRIPE PAYMENT INTEGRATION
  // =======================================================================

  /**
   * Process compensation payment via Stripe
   * @param {string} barberId - Barber to pay
   * @param {number} amount - Payment amount
   * @param {Object} options - Payment options
   * @returns {Object} Payment result
   */
  async processCompensationPayment(barberId, amount, options = {}) {
    try {
      // Get barber's Stripe account info
      const barberStripeInfo = await this.getBarberStripeAccount(barberId)
      if (!barberStripeInfo) {
        throw new Error('Barber must have Stripe Connect account to receive payments')
      }

      // Get shop's Stripe account (platform account)
      const shopStripeInfo = await this.getShopStripeAccount()
      if (!shopStripeInfo) {
        throw new Error('Shop must have Stripe Connect account configured')
      }

      // Create Stripe transfer
      const paymentData = {
        amount: Math.round(amount * 100), // Convert to cents
        currency: 'usd',
        destination: barberStripeInfo.stripe_account_id,
        transfer_group: `compensation_${this.barbershopId}_${Date.now()}`,
        metadata: {
          barbershop_id: this.barbershopId,
          barber_id: barberId,
          payment_type: 'compensation',
          period: options.period || 'manual',
          calculation_id: options.calculation_id
        }
      }

      // Call Stripe API via our backend
      const response = await fetch('/api/stripe/compensation/transfer', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(paymentData)
      })

      const result = await response.json()
      
      if (!response.ok) {
        throw new Error(result.error || 'Payment failed')
      }

      // Record payment in our database
      await this.recordCompensationPayment({
        barbershop_id: this.barbershopId,
        barber_id: barberId,
        amount: amount,
        stripe_transfer_id: result.transfer_id,
        status: 'completed',
        payment_method: 'stripe_transfer',
        period_start: options.period_start,
        period_end: options.period_end,
        metadata: {
          effective_rate: options.effective_rate,
          model_type: options.model_type,
          calculation_breakdown: options.breakdown
        }
      })

      return {
        success: true,
        transfer_id: result.transfer_id,
        amount: amount,
        barber_id: barberId,
        payment_method: 'stripe_transfer'
      }
    } catch (error) {
      console.error('Error processing compensation payment:', error)
      return {
        success: false,
        error: error.message
      }
    }
  }

  /**
   * Set up automatic compensation payouts
   * @param {string} barberId - Barber ID
   * @param {Object} schedule - Payout schedule
   * @returns {Object} Setup result
   */
  async setupAutomaticPayouts(barberId, schedule) {
    const supabase = this.getSupabase()
    
    try {
      // Get effective compensation for validation
      const compensation = await this.getEffectiveCompensation(barberId)
      
      const payoutConfig = {
        barbershop_id: this.barbershopId,
        barber_id: barberId,
        is_active: true,
        
        // Schedule configuration
        payout_frequency: schedule.frequency, // 'weekly', 'biweekly', 'monthly'
        payout_day: schedule.day, // Day of week/month
        minimum_payout_amount: schedule.minimum_amount || 50,
        
        // Payment method
        payment_method: 'stripe_transfer',
        
        // Compensation model reference
        compensation_model: compensation.model_type,
        auto_calculate: true,
        
        // Metadata
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }

      const { data, error } = await supabase
        .from('automatic_payout_schedules')
        .upsert(payoutConfig, {
          onConflict: 'barbershop_id,barber_id',
          ignoreDuplicates: false
        })
        .select()
        .single()

      if (error) throw error

      return {
        success: true,
        schedule: data,
        message: `Automatic payouts set up for ${schedule.frequency} on ${schedule.day}`
      }
    } catch (error) {
      console.error('Error setting up automatic payouts:', error)
      return {
        success: false,
        error: error.message
      }
    }
  }

  /**
   * Calculate period compensation and prepare for payout
   * @param {string} barberId - Barber ID
   * @param {Date} periodStart - Period start date
   * @param {Date} periodEnd - Period end date
   * @returns {Object} Compensation calculation ready for payout
   */
  async calculatePeriodCompensation(barberId, periodStart, periodEnd) {
    const supabase = this.getSupabase()
    
    try {
      // Get all appointments/transactions for the period
      const { data: transactions, error } = await supabase
        .from('appointments')
        .select(`
          *,
          services!inner (price, duration_minutes),
          transactions!inner (total_amount, payment_status)
        `)
        .eq('barber_id', barberId)
        .eq('barbershop_id', this.barbershopId)
        .gte('appointment_date', periodStart.toISOString().split('T')[0])
        .lte('appointment_date', periodEnd.toISOString().split('T')[0])
        .eq('status', 'completed')
        .eq('transactions.payment_status', 'completed')

      if (error) throw error

      // Calculate total revenue for period
      const totalRevenue = transactions.reduce((sum, apt) => 
        sum + parseFloat(apt.transactions[0]?.total_amount || 0), 0)

      // Get compensation calculation
      const compensationCalc = await this.calculateCompensation(totalRevenue, { barberId })

      // Add period details
      return {
        ...compensationCalc,
        period: {
          start: periodStart.toISOString().split('T')[0],
          end: periodEnd.toISOString().split('T')[0],
          total_appointments: transactions.length,
          total_revenue: totalRevenue,
          average_booking_value: totalRevenue / (transactions.length || 1)
        },
        transactions: transactions,
        ready_for_payout: compensationCalc.barber_earnings > 0,
        payout_amount: compensationCalc.barber_earnings
      }
    } catch (error) {
      console.error('Error calculating period compensation:', error)
      throw error
    }
  }

  /**
   * Get barber's Stripe Connect account details
   */
  async getBarberStripeAccount(barberId) {
    const supabase = this.getSupabase()
    
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('stripe_account_id')
        .eq('id', barberId)
        .single()

      if (error) throw error

      if (!data?.stripe_account_id) {
        return null
      }

      // Verify account status with Stripe
      const stripeStatus = await this.verifyStripeAccount(data.stripe_account_id)
      
      return {
        stripe_account_id: data.stripe_account_id,
        account_status: stripeStatus.status,
        charges_enabled: stripeStatus.charges_enabled,
        payouts_enabled: stripeStatus.payouts_enabled
      }
    } catch (error) {
      console.error('Error getting barber Stripe account:', error)
      return null
    }
  }

  /**
   * Get shop's Stripe Connect account details
   */
  async getShopStripeAccount() {
    const supabase = this.getSupabase()
    
    try {
      const { data, error } = await supabase
        .from('barbershops')
        .select(`
          *,
          stripe_accounts (
            account_id,
            onboarding_completed,
            charges_enabled,
            payouts_enabled
          )
        `)
        .eq('id', this.barbershopId)
        .single()

      if (error) throw error

      return data.stripe_accounts?.[0] || null
    } catch (error) {
      console.error('Error getting shop Stripe account:', error)
      return null
    }
  }

  /**
   * Verify Stripe account status
   */
  async verifyStripeAccount(accountId) {
    try {
      const response = await fetch(`/api/stripe/verify-account/${accountId}`)
      const result = await response.json()
      
      if (!response.ok) {
        throw new Error(result.error)
      }
      
      return result
    } catch (error) {
      console.error('Error verifying Stripe account:', error)
      return {
        status: 'unknown',
        charges_enabled: false,
        payouts_enabled: false
      }
    }
  }

  /**
   * Record compensation payment in database
   */
  async recordCompensationPayment(paymentData) {
    const supabase = this.getSupabase()
    
    try {
      const { data, error } = await supabase
        .from('compensation_payments')
        .insert({
          ...paymentData,
          created_at: new Date().toISOString()
        })
        .select()
        .single()

      if (error) throw error
      return data
    } catch (error) {
      console.error('Error recording compensation payment:', error)
      throw error
    }
  }

  /**
   * Get payment history for barber
   * @param {string} barberId - Barber ID
   * @param {Object} options - Query options
   * @returns {Array} Payment history
   */
  async getPaymentHistory(barberId, options = {}) {
    const supabase = this.getSupabase()
    
    try {
      let query = supabase
        .from('compensation_payments')
        .select('*')
        .eq('barbershop_id', this.barbershopId)
        .order('created_at', { ascending: false })

      if (barberId) {
        query = query.eq('barber_id', barberId)
      }

      if (options.limit) {
        query = query.limit(options.limit)
      }

      if (options.start_date) {
        query = query.gte('period_start', options.start_date)
      }

      if (options.end_date) {
        query = query.lte('period_end', options.end_date)
      }

      const { data, error } = await query

      if (error) throw error
      return { data: data || [], error: null }
    } catch (error) {
      console.error('Error getting payment history:', error)
      return { data: [], error: error.message }
    }
  }

  /**
   * Handle booth rent collection via Stripe
   * @param {string} barberId - Barber ID
   * @param {number} rentAmount - Rent amount to collect
   * @param {Object} options - Collection options
   * @returns {Object} Collection result
   */
  async collectBoothRent(barberId, rentAmount, options = {}) {
    try {
      // Get barber's payment method on file
      const barberPaymentInfo = await this.getBarberPaymentMethod(barberId)
      if (!barberPaymentInfo) {
        throw new Error('Barber must have payment method on file for booth rent')
      }

      // Create payment intent for booth rent collection
      const paymentData = {
        amount: Math.round(rentAmount * 100), // Convert to cents
        currency: 'usd',
        customer: barberPaymentInfo.stripe_customer_id,
        payment_method: barberPaymentInfo.default_payment_method,
        confirm: true,
        description: `Booth rent - ${options.period || 'Monthly'}`,
        metadata: {
          barbershop_id: this.barbershopId,
          barber_id: barberId,
          payment_type: 'booth_rent',
          period: options.period || 'monthly',
          due_date: options.due_date
        }
      }

      const response = await fetch('/api/stripe/collect-booth-rent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(paymentData)
      })

      const result = await response.json()
      
      if (!response.ok) {
        throw new Error(result.error || 'Rent collection failed')
      }

      // Record rent payment
      await this.recordRentPayment({
        barbershop_id: this.barbershopId,
        barber_id: barberId,
        amount: rentAmount,
        stripe_payment_intent_id: result.payment_intent_id,
        status: result.status,
        period: options.period,
        due_date: options.due_date
      })

      return {
        success: true,
        payment_intent_id: result.payment_intent_id,
        amount: rentAmount,
        status: result.status
      }
    } catch (error) {
      console.error('Error collecting booth rent:', error)
      return {
        success: false,
        error: error.message
      }
    }
  }

  /**
   * Get barber's payment method for rent collection
   */
  async getBarberPaymentMethod(barberId) {
    const supabase = this.getSupabase()
    
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('stripe_customer_id')
        .eq('id', barberId)
        .single()

      if (error || !data?.stripe_customer_id) {
        return null
      }

      // Get customer's default payment method from Stripe
      const response = await fetch(`/api/stripe/customer-payment-methods/${data.stripe_customer_id}`)
      const result = await response.json()
      
      if (!response.ok) {
        return null
      }

      return {
        stripe_customer_id: data.stripe_customer_id,
        default_payment_method: result.default_payment_method,
        payment_methods: result.payment_methods
      }
    } catch (error) {
      console.error('Error getting barber payment method:', error)
      return null
    }
  }

  // =======================================================================
  // UTILITY METHODS
  // =======================================================================

  /**
   * Get tier configuration
   */
  async getTierConfig(tierConfigId) {
    const supabase = this.getSupabase()
    
    try {
      const { data, error } = await supabase
        .from('compensation_tier_configs')
        .select('*')
        .eq('id', tierConfigId)
        .single()

      if (error) throw error
      return data
    } catch (error) {
      console.error('Error getting tier config:', error)
      return null
    }
  }

  /**
   * Convert rent amount between different periods
   */
  convertRentToPeriod(amount, fromPeriod, toPeriod) {
    const periods = {
      'daily': 1,
      'weekly': 7,
      'monthly': 30
    }
    
    const fromDays = periods[fromPeriod] || 30
    const toDays = periods[toPeriod] || 30
    
    return (amount / fromDays) * toDays
  }

  /**
   * Apply shop defaults to existing barbers without overrides
   */
  async applyDefaultsToExistingBarbers(userId) {
    // This would create override records with use_shop_defaults = true
    // for barbers who don't have any compensation arrangement
    // Implementation depends on business logic requirements
  }

  /**
   * Get all barbers and their effective compensation
   * @returns {Array} List of barbers with compensation details
   */
  async getAllBarberCompensation() {
    const supabase = this.getSupabase()
    
    try {
      const { data, error } = await supabase
        .from('effective_compensation')
        .select(`
          *,
          barber:profiles!barber_id (
            id,
            full_name,
            email,
            avatar_url
          )
        `)
        .eq('barbershop_id', this.barbershopId)

      if (error) throw error
      return { data: data || [], error: null }
    } catch (error) {
      console.error('Error getting all barber compensation:', error)
      return { data: [], error: error.message }
    }
  }
}

export default CompensationEngine

// Convenience factory function
export function createCompensationEngine(barbershopId, barberId = null) {
  return new CompensationEngine(barbershopId, barberId)
}