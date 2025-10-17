/**
 * Unified Financial Service
 * Single source of truth for all financial operations across the application
 * Handles staff compensation, arrangements, payroll, and financial reporting
 */

import { createClient } from '@/lib/supabase/UNIFIED_CLIENT'

class FinancialService {
  constructor() {
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

  /**
   * Get financial arrangement for a specific barber
   * @param {string} barberId - User ID of the barber
   * @param {string} barbershopId - Barbershop ID
   * @returns {Object} Financial arrangement data
   */
  async getArrangement(barberId, barbershopId) {
    const supabase = this.getSupabase()
    if (!supabase) return { error: 'Client not initialized' }

    try {
      const { data, error } = await supabase
        .from('financial_arrangements')
        .select('*')
        .eq('barber_id', barberId)
        .eq('barbershop_id', barbershopId)
        .eq('is_active', true)
        .single()

      if (error && error.code !== 'PGRST116') { // Not found is ok
        throw error
      }

      return { data, error: null }
    } catch (error) {
      console.error('Error fetching arrangement:', error)
      return { data: null, error: error.message }
    }
  }

  /**
   * Get all financial arrangements for a barbershop
   * @param {string} barbershopId - Barbershop ID
   * @returns {Array} List of financial arrangements
   */
  async getShopArrangements(barbershopId) {
    const supabase = this.getSupabase()
    if (!supabase) return { error: 'Client not initialized' }

    try {
      const { data, error } = await supabase
        .from('financial_arrangements')
        .select('*')
        .eq('barbershop_id', barbershopId)
        .eq('is_active', true)
        .order('created_at', { ascending: false })

      if (error) throw error

      return { data: data || [], error: null }
    } catch (error) {
      console.error('Error fetching shop arrangements:', error)
      return { data: [], error: error.message }
    }
  }

  /**
   * Create or update financial arrangement
   * @param {Object} arrangementData - Financial arrangement details
   * @returns {Object} Created/updated arrangement
   */
  async saveArrangement(arrangementData) {
    const supabase = this.getSupabase()
    if (!supabase) return { error: 'Client not initialized' }

    try {
      // Validate required fields
      if (!arrangementData.barbershop_id || !arrangementData.barber_id) {
        throw new Error('Barbershop ID and Barber ID are required')
      }

      // Check if arrangement exists
      const { data: existing } = await supabase
        .from('financial_arrangements')
        .select('id')
        .eq('barber_id', arrangementData.barber_id)
        .eq('barbershop_id', arrangementData.barbershop_id)
        .single()

      let result
      if (existing) {
        // Update existing arrangement
        const { data, error } = await supabase
          .from('financial_arrangements')
          .update({
            ...arrangementData,
            updated_at: new Date().toISOString()
          })
          .eq('id', existing.id)
          .select()
          .single()

        if (error) throw error
        result = data
      } else {
        // Create new arrangement
        const { data, error } = await supabase
          .from('financial_arrangements')
          .insert({
            ...arrangementData,
            is_active: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .select()
          .single()

        if (error) throw error
        result = data
      }

      // Broadcast update for real-time sync
      this.broadcastUpdate('arrangement_updated', {
        barbershop_id: arrangementData.barbershop_id,
        barber_id: arrangementData.barber_id,
        arrangement: result
      })

      return { data: result, error: null }
    } catch (error) {
      console.error('Error saving arrangement:', error)
      return { data: null, error: error.message }
    }
  }

  /**
   * Build arrangement data from form inputs
   * @param {Object} formData - Form data from UI
   * @returns {Object} Formatted arrangement data for database
   */
  buildArrangementData(formData) {
    const {
      barbershopId,
      barberId,
      financialModel,
      commissionRate,
      boothRentAmount,
      rentFrequency,
      hybridBaseRent,
      hybridThreshold,
      rentDueDay,
      paymentMethod,
      bankAccount,
      routingNumber,
      paymentFrequency,
      stripeAccountId,
      stripeOnboardingComplete
    } = formData

    const arrangementData = {
      barbershop_id: barbershopId,
      barber_id: barberId,
      type: financialModel || 'commission',
      payment_method: paymentMethod,
      payment_frequency: paymentFrequency || 'weekly',
      // Stripe Connect fields
      stripe_account_id: stripeAccountId || null,
      stripe_onboarding_complete: stripeOnboardingComplete || false
    }

    // Add type-specific fields
    switch (financialModel) {
      case 'commission':
        arrangementData.commission_percentage = commissionRate || 60
        break
      
      case 'booth_rent':
        arrangementData.booth_rent_amount = boothRentAmount || 1500
        arrangementData.booth_rent_frequency = rentFrequency || 'monthly'
        arrangementData.rent_due_day = rentDueDay || 1
        break
      
      case 'hybrid':
        arrangementData.commission_percentage = commissionRate || 40
        arrangementData.hybrid_base_rent = hybridBaseRent || 800
        arrangementData.hybrid_revenue_threshold = hybridThreshold || 3000
        arrangementData.rent_due_day = rentDueDay || 1
        break
    }

    // Add payment details if provided (for manual payouts)
    if (bankAccount) {
      arrangementData.bank_account_last4 = bankAccount.slice(-4)
    }
    if (routingNumber) {
      arrangementData.routing_number = routingNumber
    }

    return arrangementData
  }

  /**
   * Calculate commission for a transaction with tier support
   * @param {number} amount - Transaction amount
   * @param {string} barberId - Barber ID
   * @param {string} barbershopId - Barbershop ID
   * @returns {Object} Commission calculation with tier information
   */
  async calculateCommission(amount, barberId, barbershopId) {
    const { data: arrangement, error } = await this.getArrangement(barberId, barbershopId)
    
    if (error || !arrangement) {
      // Default commission if no arrangement found
      return {
        barberAmount: amount * 0.6,
        shopAmount: amount * 0.4,
        commissionRate: 60,
        arrangementType: 'default',
        tierInfo: null
      }
    }

    // Check if barber is using tier system
    if (arrangement.use_tier_system && arrangement.tier_structure_id) {
      const tierCalculation = await this.calculateTieredCommission(amount, barberId, barbershopId, arrangement)
      if (tierCalculation.success) {
        return tierCalculation
      }
      // Fall back to standard calculation if tier calculation fails
    }

    // Standard calculation without tiers
    let amounts = { barberAmount: 0, shopAmount: 0 }

    switch (arrangement.type) {
      case 'commission':
        const rate = arrangement.commission_percentage / 100
        amounts.barberAmount = amount * rate
        amounts.shopAmount = amount * (1 - rate)
        break
      
      case 'booth_rent':
        // Barber keeps 100% minus prorated booth rent
        amounts.barberAmount = amount
        amounts.shopAmount = 0 // Booth rent handled separately
        break
      
      case 'hybrid':
        // Complex calculation based on threshold
        const hybridRate = arrangement.commission_percentage / 100
        amounts.barberAmount = amount * hybridRate
        amounts.shopAmount = amount * (1 - hybridRate)
        // Additional logic for revenue threshold can be added
        break
      
      default:
        amounts.barberAmount = amount * 0.6
        amounts.shopAmount = amount * 0.4
    }

    return {
      barberAmount: amounts.barberAmount,
      shopAmount: amounts.shopAmount,
      commissionRate: arrangement.commission_percentage || 60,
      arrangementType: arrangement.type,
      tierInfo: null
    }
  }

  /**
   * Calculate marginal commission based on progressive tier brackets
   * @param {number} revenue - Revenue amount to calculate commission on
   * @param {Array} tiers - Array of tier objects with min_revenue, max_revenue, commission_percentage
   * @param {Object} currentProgress - Current barber progress data
   * @returns {Object} Marginal commission calculation
   */
  calculateMarginalCommission(revenue, tiers, currentProgress = {}) {
    if (!tiers || tiers.length === 0) {
      return {
        success: false,
        error: 'No tiers provided for calculation'
      }
    }

    // Sort tiers by min_revenue to ensure correct order
    const sortedTiers = [...tiers].sort((a, b) => a.min_revenue - b.min_revenue)
    
    let totalCommission = 0
    let remainingRevenue = revenue
    let currentRevenue = currentProgress.current_period_revenue || 0
    let tierBreakdown = []
    let effectiveTier = sortedTiers[0]

    // Calculate commission using marginal brackets
    for (const tier of sortedTiers) {
      if (remainingRevenue <= 0) break

      const tierMin = tier.min_revenue || 0
      const tierMax = tier.max_revenue || Infinity
      const tierRate = tier.commission_percentage / 100

      // Determine how much of this transaction falls into this bracket
      const relevantMin = Math.max(tierMin, currentRevenue)
      const relevantMax = tierMax
      
      if (relevantMin < relevantMax && currentRevenue + remainingRevenue > tierMin) {
        // Calculate revenue that applies to this bracket for this transaction
        const revenueInBracket = Math.min(
          remainingRevenue,
          relevantMax - Math.max(relevantMin, currentRevenue),
          tierMax - tierMin
        )

        if (revenueInBracket > 0) {
          const bracketCommission = revenueInBracket * tierRate
          totalCommission += bracketCommission
          
          tierBreakdown.push({
            tier_level: tier.tier_level,
            tier_name: tier.name,
            tier_rate: tier.commission_percentage,
            revenue_in_bracket: revenueInBracket,
            commission_earned: bracketCommission,
            bracket_range: `$${tierMin.toLocaleString()} - ${tierMax === Infinity ? 'Unlimited' : '$' + tierMax.toLocaleString()}`
          })

          remainingRevenue -= revenueInBracket
          effectiveTier = tier // Track the highest tier reached
        }
      }
    }

    const effectiveRate = revenue > 0 ? (totalCommission / revenue) * 100 : 0

    return {
      success: true,
      barberAmount: totalCommission,
      shopAmount: revenue - totalCommission,
      effectiveCommissionRate: effectiveRate,
      tierBreakdown: tierBreakdown,
      highestTierReached: effectiveTier,
      calculationMethod: 'marginal'
    }
  }

  /**
   * Calculate tiered commission based on current performance
   * @param {number} amount - Transaction amount
   * @param {string} barberId - Barber ID
   * @param {string} barbershopId - Barbershop ID
   * @param {Object} arrangement - Financial arrangement data
   * @returns {Object} Tiered commission calculation
   */
  async calculateTieredCommission(amount, barberId, barbershopId, arrangement) {
    const supabase = this.getSupabase()
    if (!supabase) return { success: false, error: 'Client not initialized' }

    try {
      // Get tier structure to determine calculation method
      const { data: tierStructure } = await supabase
        .from('commission_tier_structures')
        .select('*')
        .eq('id', arrangement.tier_structure_id)
        .single()

      if (!tierStructure) {
        return { success: false, error: 'Tier structure not found' }
      }

      // Get all tiers for this structure
      const { data: allTiers } = await supabase
        .from('commission_tiers')
        .select('*')
        .eq('structure_id', arrangement.tier_structure_id)
        .order('min_revenue', { ascending: true })

      if (!allTiers || allTiers.length === 0) {
        return { success: false, error: 'No tiers found for structure' }
      }

      // Get or create barber's current progress
      const { data: currentProgress } = await this.getOrCreateBarberProgress(
        barberId, 
        barbershopId, 
        arrangement.tier_structure_id,
        tierStructure
      )

      if (!currentProgress) {
        return { success: false, error: 'Could not get barber progress' }
      }

      // Use marginal calculation if specified
      if (tierStructure.calculation_method === 'marginal') {
        const marginalResult = this.calculateMarginalCommission(amount, allTiers, currentProgress)
        
        if (marginalResult.success) {
          return {
            ...marginalResult,
            arrangementType: arrangement.type,
            tierInfo: {
              currentProgress: currentProgress,
              tierBreakdown: marginalResult.tierBreakdown,
              effectiveRate: marginalResult.effectiveCommissionRate,
              calculationMethod: 'marginal',
              highestTierReached: marginalResult.highestTierReached,
              projectedRevenue: currentProgress.current_period_revenue + amount
            }
          }
        }
      }

      // Fallback to flat tier calculation (legacy method)
      return await this.calculateFlatTierCommission(amount, allTiers, currentProgress, arrangement)

    } catch (error) {
      console.error('Error calculating tiered commission:', error)
      return { success: false, error: error.message }
    }
  }

  /**
   * Legacy flat tier calculation method
   * @param {number} amount - Transaction amount
   * @param {Array} allTiers - All tiers for structure
   * @param {Object} currentProgress - Current barber progress
   * @param {Object} arrangement - Financial arrangement
   * @returns {Object} Flat tier commission result
   */
  async calculateFlatTierCommission(amount, allTiers, currentProgress, arrangement) {
    const projectedRevenue = currentProgress.current_period_revenue + amount

    // Find the highest tier this barber qualifies for
    let applicableTier = allTiers[0]
    for (const tier of allTiers) {
      const tierThreshold = tier.min_revenue || tier.threshold_amount || 0
      if (projectedRevenue >= tierThreshold) {
        applicableTier = tier
      }
    }

    const tierRate = applicableTier.commission_percentage / 100
    const barberAmount = amount * tierRate
    const shopAmount = amount * (1 - tierRate)

    return {
      success: true,
      barberAmount: barberAmount,
      shopAmount: shopAmount,
      commissionRate: applicableTier.commission_percentage,
      effectiveCommissionRate: applicableTier.commission_percentage,
      arrangementType: arrangement.type,
      tierInfo: {
        currentProgress: currentProgress,
        applicableTier: applicableTier,
        calculationMethod: 'flat',
        projectedRevenue: projectedRevenue,
        tierBreakdown: [{
          tier_level: applicableTier.tier_level,
          tier_name: applicableTier.name,
          tier_rate: applicableTier.commission_percentage,
          revenue_in_bracket: amount,
          commission_earned: barberAmount,
          bracket_range: 'All revenue'
        }]
      }
    }
  }

  /**
   * Get or create barber progress record for tier tracking
   * @param {string} barberId - Barber ID
   * @param {string} barbershopId - Barbershop ID
   * @param {string} structureId - Tier structure ID
   * @param {Object} tierStructure - Tier structure configuration
   * @returns {Object} Barber progress data
   */
  async getOrCreateBarberProgress(barberId, barbershopId, structureId, tierStructure) {
    const supabase = this.getSupabase()
    if (!supabase) return { error: 'Client not initialized' }

    try {
      // Calculate current period dates
      const periodDates = this.calculateCurrentPeriod(
        tierStructure.reset_period || 'monthly',
        tierStructure.reset_day || 1
      )

      // Try to get existing progress for current period
      const { data: existingProgress } = await supabase
        .from('barber_tier_progress')
        .select('*')
        .eq('barber_id', barberId)
        .eq('barbershop_id', barbershopId)
        .eq('structure_id', structureId)
        .eq('current_period_start', periodDates.start)
        .single()

      if (existingProgress) {
        return { data: existingProgress, error: null }
      }

      // Create new progress record for this period
      const { data: newProgress, error } = await supabase
        .from('barber_tier_progress')
        .insert({
          barber_id: barberId,
          barbershop_id: barbershopId,
          structure_id: structureId,
          current_period_start: periodDates.start,
          current_period_end: periodDates.end,
          current_period_revenue: 0,
          current_period_bookings: 0,
          tier_revenue_breakdown: {},
          tier_commission_breakdown: {},
          effective_commission_rate: 0
        })
        .select()
        .single()

      if (error) throw error

      return { data: newProgress, error: null }
    } catch (error) {
      console.error('Error getting/creating barber progress:', error)
      return { data: null, error: error.message }
    }
  }

  /**
   * Update barber progress after a transaction with marginal breakdown
   * @param {string} barberId - Barber ID
   * @param {string} barbershopId - Barbershop ID
   * @param {number} transactionAmount - Transaction amount
   * @param {Object} tierInfo - Tier calculation result
   * @returns {Object} Update result
   */
  async updateBarberProgressMarginal(barberId, barbershopId, transactionAmount, tierInfo) {
    const supabase = this.getSupabase()
    if (!supabase) return { error: 'Client not initialized' }

    try {
      const currentProgress = tierInfo.currentProgress
      const tierBreakdown = tierInfo.tierBreakdown || []

      // Update revenue breakdown by tier
      const updatedRevenueBreakdown = { ...currentProgress.tier_revenue_breakdown }
      const updatedCommissionBreakdown = { ...currentProgress.tier_commission_breakdown }

      tierBreakdown.forEach(bracket => {
        const tierKey = `tier_${bracket.tier_level}`
        updatedRevenueBreakdown[tierKey] = (updatedRevenueBreakdown[tierKey] || 0) + bracket.revenue_in_bracket
        updatedCommissionBreakdown[tierKey] = (updatedCommissionBreakdown[tierKey] || 0) + bracket.commission_earned
      })

      // Calculate new totals
      const newRevenue = currentProgress.current_period_revenue + transactionAmount
      const newBookings = currentProgress.current_period_bookings + 1

      // Update progress record
      const { data: updatedProgress, error } = await supabase
        .from('barber_tier_progress')
        .update({
          current_period_revenue: newRevenue,
          current_period_bookings: newBookings,
          tier_revenue_breakdown: updatedRevenueBreakdown,
          tier_commission_breakdown: updatedCommissionBreakdown,
          effective_commission_rate: tierInfo.effectiveRate,
          projected_period_revenue: this.calculateProjectedRevenue({
            ...currentProgress,
            current_period_revenue: newRevenue
          }),
          last_updated: new Date().toISOString()
        })
        .eq('id', currentProgress.id)
        .select()
        .single()

      if (error) throw error

      return { data: updatedProgress, error: null }
    } catch (error) {
      console.error('Error updating barber progress (marginal):', error)
      return { data: null, error: error.message }
    }
  }

  /**
   * Get the threshold for the next tier level
   * @param {Array} allTiers - All tiers in ascending order
   * @param {number} currentLevel - Current tier level
   * @returns {number|null} Next tier threshold or null if at highest tier
   */
  getNextTierThreshold(allTiers, currentLevel) {
    const nextTier = allTiers.find(tier => tier.tier_level === currentLevel + 1)
    return nextTier ? nextTier.threshold_amount : null
  }

  /**
   * Calculate progress percentage to next tier
   * @param {number} currentRevenue - Current period revenue
   * @param {Array} allTiers - All tiers in ascending order
   * @param {number} currentLevel - Current tier level
   * @returns {number} Progress percentage (0-100)
   */
  calculateTierProgress(currentRevenue, allTiers, currentLevel) {
    const currentTier = allTiers.find(tier => tier.tier_level === currentLevel)
    const nextTier = allTiers.find(tier => tier.tier_level === currentLevel + 1)

    if (!nextTier) return 100 // At highest tier

    const rangeStart = currentTier?.threshold_amount || 0
    const rangeEnd = nextTier.threshold_amount
    const progress = ((currentRevenue - rangeStart) / (rangeEnd - rangeStart)) * 100

    return Math.max(0, Math.min(100, progress))
  }

  /**
   * Get financial summary for a barbershop
   * @param {string} barbershopId - Barbershop ID
   * @param {Object} dateRange - Start and end dates
   * @returns {Object} Financial summary
   */
  async getFinancialSummary(barbershopId, dateRange = {}) {
    const supabase = this.getSupabase()
    if (!supabase) return { error: 'Client not initialized' }

    try {
      // Get all arrangements
      const { data: arrangements } = await this.getShopArrangements(barbershopId)

      // Get commission transactions
      let query = supabase
        .from('commission_transactions')
        .select('*')
        .eq('barbershop_id', barbershopId)

      if (dateRange.start) {
        query = query.gte('created_at', dateRange.start)
      }
      if (dateRange.end) {
        query = query.lte('created_at', dateRange.end)
      }

      const { data: transactions, error: txError } = await query

      if (txError) throw txError

      // Calculate totals
      const summary = {
        totalRevenue: 0,
        totalCommissionsPaid: 0,
        totalShopEarnings: 0,
        barberEarnings: {},
        arrangementTypes: {},
        transactionCount: transactions?.length || 0
      }

      transactions?.forEach(tx => {
        summary.totalRevenue += parseFloat(tx.payment_amount || 0)
        summary.totalCommissionsPaid += parseFloat(tx.commission_amount || 0)
        summary.totalShopEarnings += parseFloat(tx.shop_amount || 0)

        // Group by barber
        if (!summary.barberEarnings[tx.barber_id]) {
          summary.barberEarnings[tx.barber_id] = {
            total: 0,
            transactions: 0
          }
        }
        summary.barberEarnings[tx.barber_id].total += parseFloat(tx.commission_amount || 0)
        summary.barberEarnings[tx.barber_id].transactions += 1

        // Count arrangement types
        if (!summary.arrangementTypes[tx.arrangement_type]) {
          summary.arrangementTypes[tx.arrangement_type] = 0
        }
        summary.arrangementTypes[tx.arrangement_type] += 1
      })

      return { data: summary, error: null }
    } catch (error) {
      console.error('Error getting financial summary:', error)
      return { data: null, error: error.message }
    }
  }

  /**
   * Record a commission transaction with tier integration
   * @param {Object} transactionData - Transaction details
   * @returns {Object} Created transaction record with tier information
   */
  async recordTransaction(transactionData) {
    const supabase = this.getSupabase()
    if (!supabase) return { error: 'Client not initialized' }

    try {
      const { amount, barberId, barbershopId, paymentIntentId, metadata } = transactionData

      // Calculate commission split with tier support
      const commission = await this.calculateCommission(amount, barberId, barbershopId)

      // Prepare transaction data with tier information
      const transactionRecord = {
        payment_intent_id: paymentIntentId,
        barbershop_id: barbershopId,
        barber_id: barberId,
        payment_amount: amount,
        commission_amount: commission.barberAmount,
        shop_amount: commission.shopAmount,
        commission_percentage: commission.commissionRate,
        arrangement_type: commission.arrangementType,
        status: 'pending_payout',
        metadata: metadata || {},
        created_at: new Date().toISOString()
      }

      // Add tier information if available
      if (commission.tierInfo) {
        transactionRecord.tier_breakdown = JSON.stringify(commission.tierInfo.tierBreakdown || [])
        transactionRecord.effective_commission_rate = commission.effectiveCommissionRate || commission.commissionRate
        
        // Legacy fields for backwards compatibility
        transactionRecord.tier_id = commission.tierInfo.highestTierReached?.id || commission.tierInfo.applicableTier?.id
        transactionRecord.tier_level = commission.tierInfo.highestTierReached?.tier_level || commission.tierInfo.applicableTier?.tier_level
        transactionRecord.base_commission_rate = commission.tierInfo.currentTier?.commission_percentage
        transactionRecord.tier_commission_rate = commission.tierInfo.highestTierReached?.commission_percentage || commission.tierInfo.applicableTier?.commission_percentage
        transactionRecord.tier_bonus_amount = commission.tierInfo.tierBonus || 0
      }

      // Create transaction record
      const { data, error } = await supabase
        .from('commission_transactions')
        .insert(transactionRecord)
        .select()
        .single()

      if (error) throw error

      // Update barber balance
      await this.updateBarberBalance(barberId, barbershopId, commission.barberAmount)

      // Update tier progress if tier system is active
      if (commission.tierInfo) {
        if (commission.tierInfo.calculationMethod === 'marginal') {
          await this.updateBarberProgressMarginal(
            barberId, 
            barbershopId, 
            amount, 
            commission.tierInfo
          )
        } else {
          // Legacy flat tier progress update
          await this.updateBarberTierProgress(
            barberId, 
            barbershopId, 
            amount, 
            commission.tierInfo
          )
        }
      }

      return { 
        data: {
          ...data,
          tierInfo: commission.tierInfo
        }, 
        error: null 
      }
    } catch (error) {
      console.error('Error recording transaction:', error)
      return { data: null, error: error.message }
    }
  }

  /**
   * Update barber commission balance
   * @param {string} barberId - Barber ID
   * @param {string} barbershopId - Barbershop ID
   * @param {number} amount - Amount to add
   */
  async updateBarberBalance(barberId, barbershopId, amount) {
    const supabase = this.getSupabase()
    if (!supabase) return

    try {
      // Check if balance record exists
      const { data: existing } = await supabase
        .from('barber_commission_balances')
        .select('*')
        .eq('barber_id', barberId)
        .eq('barbershop_id', barbershopId)
        .single()

      if (existing) {
        // Update existing balance
        await supabase
          .from('barber_commission_balances')
          .update({
            pending_amount: existing.pending_amount + amount,
            total_earned: existing.total_earned + amount,
            last_transaction_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('id', existing.id)
      } else {
        // Create new balance record
        await supabase
          .from('barber_commission_balances')
          .insert({
            barber_id: barberId,
            barbershop_id: barbershopId,
            pending_amount: amount,
            total_earned: amount,
            last_transaction_at: new Date().toISOString()
          })
      }
    } catch (error) {
      console.error('Error updating barber balance:', error)
    }
  }

  /**
   * Initialize Stripe Connect account for a barber
   * @param {string} barberId - Barber ID
   * @param {string} barbershopId - Barbershop ID
   * @param {Object} accountData - Account setup data
   * @returns {Object} Stripe account creation result
   */
  async initializeStripeConnect(barberId, barbershopId, accountData) {
    try {
      // Call our API to create Stripe Connect account
      const response = await fetch('/api/stripe/connect/create-account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          barberId,
          barbershopId,
          email: accountData.email,
          businessType: 'individual', // Barbers are typically individuals
          capabilities: {
            card_payments: { requested: true },
            transfers: { requested: true }
          }
        })
      })

      const result = await response.json()
      
      if (!response.ok) {
        throw new Error(result.error || 'Failed to create Stripe account')
      }

      // Save Stripe account ID to financial arrangement
      await this.saveArrangement({
        barbershop_id: barbershopId,
        barber_id: barberId,
        stripe_account_id: result.accountId,
        stripe_onboarding_complete: false
      })

      return { data: result, error: null }
    } catch (error) {
      console.error('Error initializing Stripe Connect:', error)
      return { data: null, error: error.message }
    }
  }

  /**
   * Get Stripe Connect onboarding link
   * @param {string} stripeAccountId - Stripe Connect account ID
   * @param {string} returnUrl - URL to return after onboarding
   * @returns {Object} Onboarding link
   */
  async getStripeOnboardingLink(stripeAccountId, returnUrl) {
    try {
      const response = await fetch('/api/stripe/connect/onboarding-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accountId: stripeAccountId,
          returnUrl: returnUrl || window.location.origin + '/dashboard/financial'
        })
      })

      const result = await response.json()
      
      if (!response.ok) {
        throw new Error(result.error || 'Failed to get onboarding link')
      }

      return { data: result.url, error: null }
    } catch (error) {
      console.error('Error getting onboarding link:', error)
      return { data: null, error: error.message }
    }
  }

  /**
   * Check Stripe Connect account status
   * @param {string} stripeAccountId - Stripe Connect account ID
   * @returns {Object} Account status
   */
  async checkStripeAccountStatus(stripeAccountId) {
    try {
      const response = await fetch(`/api/stripe/connect/account-status?accountId=${stripeAccountId}`)
      const result = await response.json()
      
      if (!response.ok) {
        throw new Error(result.error || 'Failed to check account status')
      }

      return { 
        data: {
          chargesEnabled: result.charges_enabled,
          payoutsEnabled: result.payouts_enabled,
          detailsSubmitted: result.details_submitted,
          requirements: result.requirements
        }, 
        error: null 
      }
    } catch (error) {
      console.error('Error checking Stripe account:', error)
      return { data: null, error: error.message }
    }
  }

  /**
   * Create a payment with automatic split using Stripe Connect
   * @param {Object} paymentData - Payment details
   * @returns {Object} Payment result
   */
  async createSplitPayment(paymentData) {
    const { amount, barberId, barbershopId, customerId, serviceId } = paymentData

    try {
      // Get the barber's financial arrangement
      const { data: arrangement } = await this.getArrangement(barberId, barbershopId)
      
      if (!arrangement?.stripe_account_id) {
        throw new Error('Barber does not have a Stripe Connect account')
      }

      // Calculate commission split
      const commission = await this.calculateCommission(amount, barberId, barbershopId)

      // Create payment with automatic transfer to barber
      const response = await fetch('/api/stripe/payment-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: amount * 100, // Convert to cents
          customerId,
          serviceId,
          // Stripe Connect transfer data
          transferData: {
            destination: arrangement.stripe_account_id,
            amount: Math.floor(commission.barberAmount * 100) // Barber's portion in cents
          },
          metadata: {
            barberId,
            barbershopId,
            commissionRate: commission.commissionRate,
            arrangementType: commission.arrangementType
          }
        })
      })

      const result = await response.json()
      
      if (!response.ok) {
        throw new Error(result.error || 'Payment failed')
      }

      // Record transaction in our database
      await this.recordTransaction({
        amount,
        barberId,
        barbershopId,
        paymentIntentId: result.paymentIntentId,
        metadata: {
          stripeTransferId: result.transferId,
          customerId,
          serviceId
        }
      })

      return { data: result, error: null }
    } catch (error) {
      console.error('Error creating split payment:', error)
      return { data: null, error: error.message }
    }
  }

  /**
   * Process payout for a barber (manual payout for non-Stripe Connect)
   * @param {string} barberId - Barber ID
   * @param {string} barbershopId - Barbershop ID
   * @param {number} amount - Payout amount
   * @returns {Object} Payout result
   */
  async processPayout(barberId, barbershopId, amount) {
    const supabase = this.getSupabase()
    if (!supabase) return { error: 'Client not initialized' }

    try {
      // Get barber balance
      const { data: balance } = await supabase
        .from('barber_commission_balances')
        .select('*')
        .eq('barber_id', barberId)
        .eq('barbershop_id', barbershopId)
        .single()

      if (!balance || balance.pending_amount < amount) {
        throw new Error('Insufficient balance for payout')
      }

      // Update pending transactions to paid
      const { error: txError } = await supabase
        .from('commission_transactions')
        .update({
          status: 'paid_out',
          paid_out_at: new Date().toISOString()
        })
        .eq('barber_id', barberId)
        .eq('barbershop_id', barbershopId)
        .eq('status', 'pending_payout')
        .lte('commission_amount', amount)

      if (txError) throw txError

      // Update balance
      const { error: balanceError } = await supabase
        .from('barber_commission_balances')
        .update({
          pending_amount: balance.pending_amount - amount,
          paid_amount: balance.paid_amount + amount,
          updated_at: new Date().toISOString()
        })
        .eq('id', balance.id)

      if (balanceError) throw balanceError

      return { 
        data: { 
          success: true, 
          paidAmount: amount,
          remainingBalance: balance.pending_amount - amount
        }, 
        error: null 
      }
    } catch (error) {
      console.error('Error processing payout:', error)
      return { data: null, error: error.message }
    }
  }

  /**
   * Subscribe to financial updates
   * @param {string} barbershopId - Barbershop ID
   * @param {Function} callback - Callback for updates
   * @returns {Object} Subscription
   */
  subscribeToUpdates(barbershopId, callback) {
    const supabase = this.getSupabase()
    if (!supabase) return null

    const subscription = supabase
      .channel(`financial_${barbershopId}`)
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'financial_arrangements',
          filter: `barbershop_id=eq.${barbershopId}`
        }, 
        callback
      )
      .on('postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'commission_transactions',
          filter: `barbershop_id=eq.${barbershopId}`
        },
        callback
      )
      .subscribe()

    return subscription
  }

  /**
   * Broadcast financial update to all connected components
   * @param {string} event - Event type
   * @param {Object} data - Event data
   */
  broadcastUpdate(event, data) {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('financial-update', {
        detail: { event, data }
      }))
    }
  }

  /**
   * Get tier structure for a barbershop
   * @param {string} barbershopId - Barbershop ID
   * @param {string} structureId - Optional specific structure ID
   * @returns {Object} Tier structure with tiers
   */
  async getTierStructure(barbershopId, structureId = null) {
    const supabase = this.getSupabase()
    if (!supabase) return { error: 'Client not initialized' }

    try {
      let query = supabase
        .from('commission_tier_structures')
        .select(`
          *,
          tiers:commission_tiers(*)
        `)
        .eq('barbershop_id', barbershopId)
        .eq('is_active', true)

      if (structureId) {
        query = query.eq('id', structureId)
      } else {
        query = query.eq('is_default', true)
      }

      const { data, error } = await query.single()

      if (error && error.code !== 'PGRST116') {
        throw error
      }

      // Sort tiers by level
      if (data && data.tiers) {
        data.tiers.sort((a, b) => a.tier_level - b.tier_level)
      }

      return { data, error: null }
    } catch (error) {
      console.error('Error fetching tier structure:', error)
      return { data: null, error: error.message }
    }
  }

  /**
   * Get barber's current tier assignment and progress
   * @param {string} barberId - Barber ID
   * @param {string} barbershopId - Barbershop ID
   * @returns {Object} Tier assignment with progress data
   */
  async getBarberTierStatus(barberId, barbershopId) {
    const supabase = this.getSupabase()
    if (!supabase) return { error: 'Client not initialized' }

    try {
      const { data: assignment } = await supabase
        .from('barber_tier_assignments')
        .select(`
          *,
          current_tier:commission_tiers(*),
          structure:commission_tier_structures(
            *,
            tiers:commission_tiers(*)
          )
        `)
        .eq('barber_id', barberId)
        .eq('barbershop_id', barbershopId)
        .eq('is_active', true)
        .single()

      if (!assignment) {
        return { data: null, error: 'No tier assignment found' }
      }

      // Sort tiers in structure
      if (assignment.structure?.tiers) {
        assignment.structure.tiers.sort((a, b) => a.tier_level - b.tier_level)
      }

      // Calculate additional progress metrics
      const allTiers = assignment.structure.tiers
      const currentLevel = assignment.current_tier?.tier_level || 1
      
      const progressData = {
        ...assignment,
        nextTierThreshold: this.getNextTierThreshold(allTiers, currentLevel),
        progressToNextTier: this.calculateTierProgress(
          assignment.current_period_revenue, 
          allTiers, 
          currentLevel
        ),
        daysInPeriod: this.calculateDaysInPeriod(
          assignment.current_period_start, 
          assignment.current_period_end
        ),
        daysRemaining: this.calculateDaysRemaining(assignment.current_period_end),
        projectedEndRevenue: this.calculateProjectedRevenue(assignment),
        isOnTrackForNextTier: this.isOnTrackForNextTier(assignment, allTiers)
      }

      return { data: progressData, error: null }
    } catch (error) {
      console.error('Error fetching barber tier status:', error)
      return { data: null, error: error.message }
    }
  }

  /**
   * Update barber tier progress after a transaction
   * @param {string} barberId - Barber ID
   * @param {string} barbershopId - Barbershop ID
   * @param {number} transactionAmount - Amount to add to progress
   * @param {Object} tierInfo - Tier information from commission calculation
   * @returns {Object} Update result
   */
  async updateBarberTierProgress(barberId, barbershopId, transactionAmount, tierInfo) {
    const supabase = this.getSupabase()
    if (!supabase) return { error: 'Client not initialized' }

    try {
      const { data: assignment } = await supabase
        .from('barber_tier_assignments')
        .select('*')
        .eq('barber_id', barberId)
        .eq('barbershop_id', barbershopId)
        .eq('is_active', true)
        .single()

      if (!assignment) {
        return { error: 'No tier assignment found' }
      }

      const newRevenue = assignment.current_period_revenue + transactionAmount
      const newBookings = assignment.current_period_bookings + 1

      // Update tier assignment progress
      const { data: updatedAssignment, error } = await supabase
        .from('barber_tier_assignments')
        .update({
          current_period_revenue: newRevenue,
          current_period_bookings: newBookings,
          current_tier_id: tierInfo?.applicableTier?.id || assignment.current_tier_id,
          daily_avg_revenue: this.calculateDailyAverage(
            newRevenue, 
            assignment.current_period_start
          ),
          projected_period_revenue: this.calculateProjectedRevenue({
            ...assignment,
            current_period_revenue: newRevenue
          }),
          updated_at: new Date().toISOString()
        })
        .eq('id', assignment.id)
        .select()
        .single()

      if (error) throw error

      // Log tier achievement if tier upgraded
      if (tierInfo?.tierUpgrade) {
        await this.logTierAchievement(
          barberId, 
          barbershopId, 
          tierInfo.applicableTier, 
          assignment
        )
      }

      return { data: updatedAssignment, error: null }
    } catch (error) {
      console.error('Error updating tier progress:', error)
      return { data: null, error: error.message }
    }
  }

  /**
   * Create or update tier structure for a barbershop
   * @param {string} barbershopId - Barbershop ID
   * @param {Object} structureData - Tier structure configuration
   * @returns {Object} Created/updated structure
   */
  async saveTierStructure(barbershopId, structureData) {
    const supabase = this.getSupabase()
    if (!supabase) return { error: 'Client not initialized' }

    try {
      const { tiers, ...structure } = structureData
      
      // Save tier structure
      const { data: savedStructure, error: structureError } = await supabase
        .from('commission_tier_structures')
        .upsert({
          ...structure,
          barbershop_id: barbershopId,
          updated_at: new Date().toISOString()
        })
        .select()
        .single()

      if (structureError) throw structureError

      // Save individual tiers
      if (tiers && tiers.length > 0) {
        // Delete existing tiers for this structure
        await supabase
          .from('commission_tiers')
          .delete()
          .eq('structure_id', savedStructure.id)

        // Insert new tiers
        const tiersWithStructureId = tiers.map(tier => ({
          ...tier,
          structure_id: savedStructure.id
        }))

        const { error: tiersError } = await supabase
          .from('commission_tiers')
          .insert(tiersWithStructureId)

        if (tiersError) throw tiersError
      }

      return { data: savedStructure, error: null }
    } catch (error) {
      console.error('Error saving tier structure:', error)
      return { data: null, error: error.message }
    }
  }

  /**
   * Assign barber to tier structure
   * @param {string} barberId - Barber ID
   * @param {string} barbershopId - Barbershop ID
   * @param {string} structureId - Tier structure ID
   * @returns {Object} Assignment result
   */
  async assignBarberToTierStructure(barberId, barbershopId, structureId) {
    const supabase = this.getSupabase()
    if (!supabase) return { error: 'Client not initialized' }

    try {
      // Get the structure to validate it exists
      const { data: structure } = await supabase
        .from('commission_tier_structures')
        .select('*, tiers:commission_tiers(*)')
        .eq('id', structureId)
        .eq('barbershop_id', barbershopId)
        .single()

      if (!structure) {
        throw new Error('Tier structure not found')
      }

      // Get the lowest tier as starting tier
      const startingTier = structure.tiers.sort((a, b) => a.tier_level - b.tier_level)[0]

      // Calculate current period dates
      const periodDates = this.calculateCurrentPeriod(structure.reset_period, structure.reset_day)

      // Create or update tier assignment
      const { data: assignment, error } = await supabase
        .from('barber_tier_assignments')
        .upsert({
          barber_id: barberId,
          barbershop_id: barbershopId,
          structure_id: structureId,
          current_tier_id: startingTier.id,
          current_period_start: periodDates.start,
          current_period_end: periodDates.end,
          current_period_revenue: 0,
          current_period_bookings: 0,
          is_active: true,
          updated_at: new Date().toISOString()
        })
        .select()
        .single()

      if (error) throw error

      // Update financial arrangement to use tier system
      await supabase
        .from('financial_arrangements')
        .update({
          tier_structure_id: structureId,
          use_tier_system: true,
          updated_at: new Date().toISOString()
        })
        .eq('barber_id', barberId)
        .eq('barbershop_id', barbershopId)

      return { data: assignment, error: null }
    } catch (error) {
      console.error('Error assigning barber to tier structure:', error)
      return { data: null, error: error.message }
    }
  }

  /**
   * Helper method to log tier achievements
   */
  async logTierAchievement(barberId, barbershopId, tier, assignment) {
    const supabase = this.getSupabase()
    if (!supabase) return

    try {
      await supabase
        .from('commission_tier_history')
        .insert({
          barber_id: barberId,
          barbershop_id: barbershopId,
          tier_id: tier.id,
          period_start: assignment.current_period_start,
          period_end: assignment.current_period_end,
          achieved_at: new Date().toISOString(),
          period_revenue: assignment.current_period_revenue,
          period_bookings: assignment.current_period_bookings,
          final_tier_level: tier.tier_level,
          avg_commission_rate: tier.commission_percentage
        })
    } catch (error) {
      console.warn('Failed to log tier achievement:', error.message)
    }
  }

  /**
   * Calculate current period dates based on reset configuration
   */
  calculateCurrentPeriod(resetPeriod, resetDay = 1) {
    const now = new Date()
    let period = { start: null, end: null }

    switch (resetPeriod) {
      case 'monthly':
        period.start = new Date(now.getFullYear(), now.getMonth(), resetDay)
        if (period.start > now) {
          period.start.setMonth(period.start.getMonth() - 1)
        }
        period.end = new Date(period.start.getFullYear(), period.start.getMonth() + 1, resetDay - 1)
        break
      case 'quarterly':
        const quarter = Math.floor(now.getMonth() / 3)
        period.start = new Date(now.getFullYear(), quarter * 3, resetDay)
        if (period.start > now) {
          period.start.setMonth(period.start.getMonth() - 3)
        }
        period.end = new Date(period.start.getFullYear(), period.start.getMonth() + 3, resetDay - 1)
        break
      case 'yearly':
        period.start = new Date(now.getFullYear(), 0, resetDay)
        if (period.start > now) {
          period.start.setFullYear(period.start.getFullYear() - 1)
        }
        period.end = new Date(period.start.getFullYear() + 1, 0, resetDay - 1)
        break
      default:
        // Default to monthly
        period.start = new Date(now.getFullYear(), now.getMonth(), 1)
        period.end = new Date(now.getFullYear(), now.getMonth() + 1, 0)
    }

    return {
      start: period.start.toISOString().split('T')[0],
      end: period.end.toISOString().split('T')[0]
    }
  }

  /**
   * Helper methods for tier calculations
   */
  calculateDaysInPeriod(startDate, endDate) {
    const start = new Date(startDate)
    const end = new Date(endDate)
    return Math.ceil((end - start) / (1000 * 60 * 60 * 24))
  }

  calculateDaysRemaining(endDate) {
    const now = new Date()
    const end = new Date(endDate)
    return Math.max(0, Math.ceil((end - now) / (1000 * 60 * 60 * 24)))
  }

  calculateDailyAverage(totalRevenue, startDate) {
    const daysSinceStart = Math.max(1, this.calculateDaysInPeriod(startDate, new Date().toISOString().split('T')[0]))
    return totalRevenue / daysSinceStart
  }

  calculateProjectedRevenue(assignment) {
    const totalDays = this.calculateDaysInPeriod(assignment.current_period_start, assignment.current_period_end)
    const dailyAvg = assignment.daily_avg_revenue || this.calculateDailyAverage(
      assignment.current_period_revenue, 
      assignment.current_period_start
    )
    return dailyAvg * totalDays
  }

  isOnTrackForNextTier(assignment, allTiers) {
    const currentLevel = assignment.current_tier?.tier_level || 1
    const nextTier = allTiers.find(tier => tier.tier_level === currentLevel + 1)
    
    if (!nextTier) return true // Already at highest tier

    const projectedRevenue = this.calculateProjectedRevenue(assignment)
    return projectedRevenue >= nextTier.threshold_amount
  }

  /**
   * Validate financial arrangement data
   * @param {Object} data - Arrangement data to validate
   * @returns {Object} Validation result
   */
  validateArrangement(data) {
    const errors = []

    if (!data.barbershop_id) errors.push('Barbershop ID is required')
    if (!data.barber_id) errors.push('Barber ID is required')
    if (!data.type) errors.push('Arrangement type is required')

    switch (data.type) {
      case 'commission':
        if (!data.commission_percentage || data.commission_percentage < 0 || data.commission_percentage > 100) {
          errors.push('Commission percentage must be between 0 and 100')
        }
        break
      
      case 'booth_rent':
        if (!data.booth_rent_amount || data.booth_rent_amount < 0) {
          errors.push('Booth rent amount must be positive')
        }
        if (!data.booth_rent_frequency) {
          errors.push('Booth rent frequency is required')
        }
        break
      
      case 'hybrid':
        if (!data.commission_percentage || data.commission_percentage < 0 || data.commission_percentage > 100) {
          errors.push('Commission percentage must be between 0 and 100')
        }
        if (!data.hybrid_base_rent || data.hybrid_base_rent < 0) {
          errors.push('Base rent amount must be positive')
        }
        break
    }

    return {
      isValid: errors.length === 0,
      errors
    }
  }

  // ==========================================
  // PRODUCT COMMISSION METHODS
  // ==========================================

  /**
   * Get product commission categories for a barbershop
   * @param {string} barbershopId - Barbershop ID
   * @returns {Object} Product commission categories
   */
  async getProductCommissionCategories(barbershopId) {
    const supabase = this.getSupabase()
    if (!supabase) return { error: 'Client not initialized' }

    try {
      const { data, error } = await supabase
        .from('product_commission_categories')
        .select('*')
        .eq('barbershop_id', barbershopId)
        .eq('is_active', true)
        .order('category_display_name')

      if (error) throw error

      return { data: data || [], error: null }
    } catch (error) {
      console.error('Error fetching product commission categories:', error)
      return { data: [], error: error.message }
    }
  }

  /**
   * Save product commission category configuration
   * @param {string} barbershopId - Barbershop ID
   * @param {Object} categoryData - Category configuration
   * @returns {Object} Saved category
   */
  async saveProductCommissionCategory(barbershopId, categoryData) {
    const supabase = this.getSupabase()
    if (!supabase) return { error: 'Client not initialized' }

    try {
      const { data, error } = await supabase
        .from('product_commission_categories')
        .upsert({
          ...categoryData,
          barbershop_id: barbershopId,
          updated_at: new Date().toISOString()
        })
        .select()
        .single()

      if (error) throw error

      return { data, error: null }
    } catch (error) {
      console.error('Error saving product commission category:', error)
      return { data: null, error: error.message }
    }
  }

  /**
   * Calculate product commission for a sale with tier integration
   * @param {Object} saleData - Product sale data
   * @param {string} barberId - Barber ID
   * @param {string} barbershopId - Barbershop ID
   * @returns {Object} Commission calculation with tier information
   */
  async calculateProductCommission(saleData, barberId, barbershopId) {
    const supabase = this.getSupabase()
    if (!supabase) return { error: 'Client not initialized' }

    try {
      const { lineItems, totalAmount } = saleData

      // Get barber's financial arrangement
      const { data: arrangement } = await this.getArrangement(barberId, barbershopId)
      if (!arrangement) {
        return { error: 'No financial arrangement found for barber' }
      }

      // Get product commission categories
      const { data: categories } = await this.getProductCommissionCategories(barbershopId)
      const categoryMap = new Map(categories.map(cat => [cat.category_name, cat]))

      let totalCommission = 0
      let totalTierContribution = 0
      const commissionBreakdown = []

      // Calculate commission for each product in the sale
      for (const item of lineItems) {
        const { product_id, quantity, unit_price, category } = item
        const itemTotal = quantity * unit_price

        // Determine commission rate for this product
        let commissionRate = arrangement.product_commission_rate || 0.1 // 10% default

        // Check for category-specific rate
        const categoryConfig = categoryMap.get(category)
        if (categoryConfig) {
          commissionRate = categoryConfig.default_commission_rate
        }

        // Check for barber-specific category override
        if (arrangement.product_category_overrides && arrangement.product_category_overrides[category]) {
          commissionRate = arrangement.product_category_overrides[category]
        }

        const itemCommission = itemTotal * commissionRate
        
        // Calculate tier contribution (may be weighted)
        let tierContribution = itemTotal
        if (categoryConfig) {
          tierContribution = itemTotal * (categoryConfig.tier_weight_multiplier || 1.0)
        }
        if (arrangement.product_tier_weight) {
          tierContribution = tierContribution * arrangement.product_tier_weight
        }

        totalCommission += itemCommission
        totalTierContribution += tierContribution

        commissionBreakdown.push({
          product_id,
          category,
          quantity,
          unit_price,
          item_total: itemTotal,
          commission_rate: commissionRate,
          commission_amount: itemCommission,
          tier_contribution: tierContribution
        })
      }

      // Calculate tier adjustments if tier system is active
      let tierInfo = null
      let tierBonus = 0

      if (arrangement.use_tier_system && arrangement.products_count_for_tiers) {
        const tierCalculation = await this.calculateProductTierAdjustment(
          totalTierContribution, 
          barberId, 
          barbershopId, 
          arrangement
        )
        
        if (tierCalculation.success) {
          tierInfo = tierCalculation.tierInfo
          tierBonus = tierCalculation.tierBonus || 0
        }
      }

      const finalCommission = totalCommission + tierBonus
      const shopAmount = totalAmount - finalCommission

      return {
        success: true,
        barberAmount: finalCommission,
        shopAmount: shopAmount,
        baseCommissionAmount: totalCommission,
        tierBonusAmount: tierBonus,
        tierContributionAmount: totalTierContribution,
        commissionBreakdown: commissionBreakdown,
        tierInfo: tierInfo
      }
    } catch (error) {
      console.error('Error calculating product commission:', error)
      return { success: false, error: error.message }
    }
  }

  /**
   * Calculate tier adjustment for product sales
   * @param {number} tierContributionAmount - Amount contributing to tier progress
   * @param {string} barberId - Barber ID
   * @param {string} barbershopId - Barbershop ID
   * @param {Object} arrangement - Financial arrangement
   * @returns {Object} Tier calculation result
   */
  async calculateProductTierAdjustment(tierContributionAmount, barberId, barbershopId, arrangement) {
    const supabase = this.getSupabase()
    if (!supabase) return { success: false, error: 'Client not initialized' }

    try {
      // Get barber's current tier assignment
      const { data: tierAssignment } = await supabase
        .from('barber_tier_assignments')
        .select(`
          *,
          current_tier:commission_tiers(*)
        `)
        .eq('barber_id', barberId)
        .eq('barbershop_id', barbershopId)
        .eq('is_active', true)
        .single()

      if (!tierAssignment) {
        return { success: false, error: 'No tier assignment found' }
      }

      // Get all tiers for this structure
      const { data: allTiers } = await supabase
        .from('commission_tiers')
        .select('*')
        .eq('structure_id', arrangement.tier_structure_id)
        .order('tier_level', { ascending: true })

      if (!allTiers || allTiers.length === 0) {
        return { success: false, error: 'No tiers found for structure' }
      }

      // Calculate what the new combined tier progress will be
      const projectedCombinedRevenue = tierAssignment.combined_tier_progress_amount + tierContributionAmount

      // Find the highest tier this barber qualifies for
      let applicableTier = allTiers[0]
      for (const tier of allTiers) {
        if (projectedCombinedRevenue >= tier.threshold_amount) {
          applicableTier = tier
        } else {
          break
        }
      }

      // Calculate tier bonus for product sales (if tier upgrade occurs)
      let tierBonus = 0
      const currentTierLevel = tierAssignment.current_tier?.tier_level || 1
      const newTierLevel = applicableTier.tier_level

      if (newTierLevel > currentTierLevel) {
        // Product tier upgrade bonus (typically smaller than service bonus)
        tierBonus = tierContributionAmount * 0.01 // 1% bonus for product tier upgrade
      }

      return {
        success: true,
        tierBonus: tierBonus,
        tierInfo: {
          currentTier: tierAssignment.current_tier,
          applicableTier: applicableTier,
          tierUpgrade: newTierLevel > currentTierLevel,
          tierContributionAmount: tierContributionAmount,
          projectedCombinedRevenue: projectedCombinedRevenue,
          nextTierThreshold: this.getNextTierThreshold(allTiers, applicableTier.tier_level),
          progressToNextTier: this.calculateTierProgress(projectedCombinedRevenue, allTiers, applicableTier.tier_level)
        }
      }
    } catch (error) {
      console.error('Error calculating product tier adjustment:', error)
      return { success: false, error: error.message }
    }
  }

  /**
   * Record product commission transactions
   * @param {Object} saleData - Product sale data
   * @param {Object} commissionCalculation - Commission calculation result
   * @param {string} barberId - Barber ID
   * @param {string} barbershopId - Barbershop ID
   * @returns {Object} Transaction records
   */
  async recordProductCommissionTransactions(saleData, commissionCalculation, barberId, barbershopId) {
    const supabase = this.getSupabase()
    if (!supabase) return { error: 'Client not initialized' }

    try {
      const { product_sale_id, lineItems } = saleData
      const { commissionBreakdown, tierInfo, tierBonusAmount } = commissionCalculation

      const transactionRecords = []

      // Create commission transaction for each product
      for (let i = 0; i < commissionBreakdown.length; i++) {
        const item = commissionBreakdown[i]
        const originalItem = lineItems[i]

        const transactionRecord = {
          barbershop_id: barbershopId,
          barber_id: barberId,
          product_sale_id: product_sale_id,
          product_id: item.product_id,
          product_name: originalItem.product_name || 'Product',
          product_category: item.category,
          quantity: item.quantity,
          unit_price: item.unit_price,
          total_sale_amount: item.item_total,
          commission_rate: item.commission_rate,
          base_commission_amount: item.commission_amount,
          tier_weighted_amount: item.tier_contribution,
          total_commission_amount: item.commission_amount,
          shop_amount: item.item_total - item.commission_amount,
          status: 'pending_payout',
          arrangement_type: 'product_commission'
        }

        // Add tier information if available
        if (tierInfo) {
          transactionRecord.tier_id = tierInfo.applicableTier?.id
          transactionRecord.tier_level = tierInfo.applicableTier?.tier_level
          
          // Distribute tier bonus proportionally across products
          if (tierBonusAmount > 0) {
            const bonusPortion = (item.commission_amount / commissionCalculation.baseCommissionAmount) * tierBonusAmount
            transactionRecord.tier_bonus_amount = bonusPortion
            transactionRecord.total_commission_amount += bonusPortion
            transactionRecord.shop_amount -= bonusPortion
          }
        }

        transactionRecords.push(transactionRecord)
      }

      // Insert all transaction records
      const { data, error } = await supabase
        .from('product_commission_transactions')
        .insert(transactionRecords)
        .select()

      if (error) throw error

      // Update product sale with commission information
      await this.updateProductSaleCommissionInfo(
        product_sale_id, 
        data.map(tx => tx.id),
        commissionCalculation.barberAmount,
        tierInfo?.tierContributionAmount || 0
      )

      // Update barber tier progress if applicable
      if (tierInfo) {
        await this.updateBarberProductTierProgress(
          barberId, 
          barbershopId, 
          tierInfo.tierContributionAmount,
          tierInfo
        )
      }

      return { data, error: null }
    } catch (error) {
      console.error('Error recording product commission transactions:', error)
      return { data: null, error: error.message }
    }
  }

  /**
   * Update product sale with commission information
   * @param {string} productSaleId - Product sale ID
   * @param {Array} transactionIds - Commission transaction IDs
   * @param {number} totalCommission - Total barber commission
   * @param {number} tierContribution - Amount contributing to tier progress
   */
  async updateProductSaleCommissionInfo(productSaleId, transactionIds, totalCommission, tierContribution) {
    const supabase = this.getSupabase()
    if (!supabase) return

    try {
      await supabase
        .from('product_sales')
        .update({
          commission_calculated: true,
          commission_transaction_ids: transactionIds,
          total_barber_commission: totalCommission,
          tier_contribution_amount: tierContribution
        })
        .eq('id', productSaleId)
    } catch (error) {
      console.error('Error updating product sale commission info:', error)
    }
  }

  /**
   * Update barber tier progress with product sales
   * @param {string} barberId - Barber ID
   * @param {string} barbershopId - Barbershop ID
   * @param {number} tierContributionAmount - Amount contributing to tier
   * @param {Object} tierInfo - Tier calculation information
   */
  async updateBarberProductTierProgress(barberId, barbershopId, tierContributionAmount, tierInfo) {
    const supabase = this.getSupabase()
    if (!supabase) return

    try {
      const { data: assignment } = await supabase
        .from('barber_tier_assignments')
        .select('*')
        .eq('barber_id', barberId)
        .eq('barbershop_id', barbershopId)
        .eq('is_active', true)
        .single()

      if (!assignment) return

      const newProductRevenue = assignment.current_period_product_revenue + tierContributionAmount
      const newProductSales = assignment.current_period_product_sales + 1
      const newCombinedProgress = assignment.combined_tier_progress_amount + tierContributionAmount

      await supabase
        .from('barber_tier_assignments')
        .update({
          current_period_product_revenue: newProductRevenue,
          current_period_product_sales: newProductSales,
          combined_tier_progress_amount: newCombinedProgress,
          current_tier_id: tierInfo?.applicableTier?.id || assignment.current_tier_id,
          updated_at: new Date().toISOString()
        })
        .eq('id', assignment.id)

      // Log tier achievement if tier upgraded
      if (tierInfo?.tierUpgrade) {
        await this.logTierAchievement(
          barberId, 
          barbershopId, 
          tierInfo.applicableTier, 
          assignment
        )
      }
    } catch (error) {
      console.error('Error updating barber product tier progress:', error)
    }
  }

  /**
   * Process product return/refund and adjust commissions
   * @param {Object} returnData - Return/refund data
   * @returns {Object} Adjustment result
   */
  async processProductReturn(returnData) {
    const supabase = this.getSupabase()
    if (!supabase) return { error: 'Client not initialized' }

    try {
      const { 
        original_product_sale_id, 
        returned_items, 
        adjustment_reason, 
        processed_by,
        barbershopId,
        barberId 
      } = returnData

      // Get original commission transactions
      const { data: originalTransactions } = await supabase
        .from('product_commission_transactions')
        .select('*')
        .eq('product_sale_id', original_product_sale_id)

      if (!originalTransactions || originalTransactions.length === 0) {
        return { error: 'No commission transactions found for this sale' }
      }

      let totalCommissionAdjustment = 0
      let totalTierAdjustment = 0
      const adjustmentRecords = []

      // Process each returned item
      for (const returnedItem of returned_items) {
        const { product_id, quantity_returned, refund_amount } = returnedItem

        // Find the original transaction for this product
        const originalTx = originalTransactions.find(tx => tx.product_id === product_id)
        if (!originalTx) continue

        // Calculate proportional commission adjustment
        const returnRatio = quantity_returned / originalTx.quantity
        const commissionAdjustment = originalTx.total_commission_amount * returnRatio * -1 // Negative for clawback
        const tierAdjustment = (originalTx.tier_weighted_amount || 0) * returnRatio * -1

        totalCommissionAdjustment += commissionAdjustment
        totalTierAdjustment += tierAdjustment

        adjustmentRecords.push({
          barbershop_id: barbershopId,
          barber_id: barberId,
          original_commission_transaction_id: originalTx.id,
          original_product_sale_id: original_product_sale_id,
          adjustment_type: 'return',
          adjustment_reason: adjustment_reason,
          commission_adjustment_amount: commissionAdjustment,
          tier_progress_adjustment: tierAdjustment,
          quantity_returned: quantity_returned,
          refund_amount: refund_amount,
          processed_by: processed_by,
          processed: true,
          processed_at: new Date().toISOString()
        })
      }

      // Insert adjustment records
      const { data: adjustments, error } = await supabase
        .from('product_commission_adjustments')
        .insert(adjustmentRecords)
        .select()

      if (error) throw error

      // Update barber balance
      await this.updateBarberBalance(barberId, barbershopId, totalCommissionAdjustment)

      // Update tier progress if there's a tier adjustment
      if (Math.abs(totalTierAdjustment) > 0) {
        await this.adjustBarberTierProgress(barberId, barbershopId, totalTierAdjustment)
      }

      return { 
        data: {
          adjustments,
          total_commission_adjustment: totalCommissionAdjustment,
          total_tier_adjustment: totalTierAdjustment
        }, 
        error: null 
      }
    } catch (error) {
      console.error('Error processing product return:', error)
      return { data: null, error: error.message }
    }
  }

  /**
   * Adjust barber tier progress for returns/corrections
   * @param {string} barberId - Barber ID
   * @param {string} barbershopId - Barbershop ID
   * @param {number} adjustmentAmount - Adjustment amount (can be negative)
   */
  async adjustBarberTierProgress(barberId, barbershopId, adjustmentAmount) {
    const supabase = this.getSupabase()
    if (!supabase) return

    try {
      const { data: assignment } = await supabase
        .from('barber_tier_assignments')
        .select('*')
        .eq('barber_id', barberId)
        .eq('barbershop_id', barbershopId)
        .eq('is_active', true)
        .single()

      if (!assignment) return

      const newCombinedProgress = Math.max(0, assignment.combined_tier_progress_amount + adjustmentAmount)
      const newProductRevenue = Math.max(0, assignment.current_period_product_revenue + adjustmentAmount)

      await supabase
        .from('barber_tier_assignments')
        .update({
          current_period_product_revenue: newProductRevenue,
          combined_tier_progress_amount: newCombinedProgress,
          updated_at: new Date().toISOString()
        })
        .eq('id', assignment.id)
    } catch (error) {
      console.error('Error adjusting barber tier progress:', error)
    }
  }

  /**
   * Get comprehensive commission summary including products and services
   * @param {string} barbershopId - Barbershop ID
   * @param {Object} dateRange - Date range filter
   * @returns {Object} Comprehensive commission summary
   */
  async getComprehensiveCommissionSummary(barbershopId, dateRange = {}) {
    const supabase = this.getSupabase()
    if (!supabase) return { error: 'Client not initialized' }

    try {
      // Get service commissions
      const serviceQuery = supabase
        .from('commission_transactions')
        .select('*')
        .eq('barbershop_id', barbershopId)

      if (dateRange.start) serviceQuery.gte('created_at', dateRange.start)
      if (dateRange.end) serviceQuery.lte('created_at', dateRange.end)

      const { data: serviceTransactions } = await serviceQuery

      // Get product commissions
      const productQuery = supabase
        .from('product_commission_transactions')
        .select('*')
        .eq('barbershop_id', barbershopId)

      if (dateRange.start) productQuery.gte('created_at', dateRange.start)
      if (dateRange.end) productQuery.lte('created_at', dateRange.end)

      const { data: productTransactions } = await productQuery

      // Calculate comprehensive summary
      const summary = {
        service_commissions: {
          total_revenue: 0,
          total_commission: 0,
          transaction_count: 0,
          barber_breakdown: {}
        },
        product_commissions: {
          total_revenue: 0,
          total_commission: 0,
          transaction_count: 0,
          barber_breakdown: {},
          category_breakdown: {}
        },
        combined_totals: {
          total_revenue: 0,
          total_commission: 0,
          total_shop_earnings: 0,
          transaction_count: 0,
          barber_breakdown: {}
        },
        tier_impact: {
          total_tier_bonuses: 0,
          tier_upgrades_count: 0
        }
      }

      // Process service transactions
      serviceTransactions?.forEach(tx => {
        const amount = parseFloat(tx.payment_amount || 0)
        const commission = parseFloat(tx.commission_amount || 0)
        
        summary.service_commissions.total_revenue += amount
        summary.service_commissions.total_commission += commission
        summary.service_commissions.transaction_count += 1

        if (!summary.service_commissions.barber_breakdown[tx.barber_id]) {
          summary.service_commissions.barber_breakdown[tx.barber_id] = {
            revenue: 0,
            commission: 0,
            count: 0
          }
        }
        summary.service_commissions.barber_breakdown[tx.barber_id].revenue += amount
        summary.service_commissions.barber_breakdown[tx.barber_id].commission += commission
        summary.service_commissions.barber_breakdown[tx.barber_id].count += 1

        if (tx.tier_bonus_amount) {
          summary.tier_impact.total_tier_bonuses += parseFloat(tx.tier_bonus_amount)
        }
      })

      // Process product transactions
      productTransactions?.forEach(tx => {
        const amount = parseFloat(tx.total_sale_amount || 0)
        const commission = parseFloat(tx.total_commission_amount || 0)
        
        summary.product_commissions.total_revenue += amount
        summary.product_commissions.total_commission += commission
        summary.product_commissions.transaction_count += 1

        // Barber breakdown
        if (!summary.product_commissions.barber_breakdown[tx.barber_id]) {
          summary.product_commissions.barber_breakdown[tx.barber_id] = {
            revenue: 0,
            commission: 0,
            count: 0
          }
        }
        summary.product_commissions.barber_breakdown[tx.barber_id].revenue += amount
        summary.product_commissions.barber_breakdown[tx.barber_id].commission += commission
        summary.product_commissions.barber_breakdown[tx.barber_id].count += 1

        // Category breakdown
        const category = tx.product_category || 'uncategorized'
        if (!summary.product_commissions.category_breakdown[category]) {
          summary.product_commissions.category_breakdown[category] = {
            revenue: 0,
            commission: 0,
            count: 0
          }
        }
        summary.product_commissions.category_breakdown[category].revenue += amount
        summary.product_commissions.category_breakdown[category].commission += commission
        summary.product_commissions.category_breakdown[category].count += 1

        if (tx.tier_bonus_amount) {
          summary.tier_impact.total_tier_bonuses += parseFloat(tx.tier_bonus_amount)
        }
      })

      // Calculate combined totals
      summary.combined_totals.total_revenue = summary.service_commissions.total_revenue + summary.product_commissions.total_revenue
      summary.combined_totals.total_commission = summary.service_commissions.total_commission + summary.product_commissions.total_commission
      summary.combined_totals.total_shop_earnings = summary.combined_totals.total_revenue - summary.combined_totals.total_commission
      summary.combined_totals.transaction_count = summary.service_commissions.transaction_count + summary.product_commissions.transaction_count

      // Combine barber breakdowns
      const allBarberIds = new Set([
        ...Object.keys(summary.service_commissions.barber_breakdown),
        ...Object.keys(summary.product_commissions.barber_breakdown)
      ])

      allBarberIds.forEach(barberId => {
        const serviceData = summary.service_commissions.barber_breakdown[barberId] || { revenue: 0, commission: 0, count: 0 }
        const productData = summary.product_commissions.barber_breakdown[barberId] || { revenue: 0, commission: 0, count: 0 }
        
        summary.combined_totals.barber_breakdown[barberId] = {
          total_revenue: serviceData.revenue + productData.revenue,
          total_commission: serviceData.commission + productData.commission,
          service_revenue: serviceData.revenue,
          service_commission: serviceData.commission,
          product_revenue: productData.revenue,
          product_commission: productData.commission,
          total_transactions: serviceData.count + productData.count
        }
      })

      return { data: summary, error: null }
    } catch (error) {
      console.error('Error getting comprehensive commission summary:', error)
      return { data: null, error: error.message }
    }
  }

  /**
   * Get real-time financial metrics for a barbershop
   * @param {string} barbershopId - Barbershop ID
   * @param {Object} dateRange - Date range filter
   * @returns {Object} Real-time financial metrics
   */
  async getRealtimeFinancialMetrics(barbershopId, dateRange = {}) {
    const supabase = this.getSupabase()
    if (!supabase) return { error: 'Client not initialized' }

    try {
      const today = new Date().toISOString().split('T')[0]
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

      // Get service commission metrics
      const serviceQuery = supabase
        .from('commission_transactions')
        .select('payment_amount, commission_amount, shop_amount, created_at, barber_id')
        .eq('barbershop_id', barbershopId)
        .gte('created_at', dateRange.start || thirtyDaysAgo)
        .lte('created_at', dateRange.end || today)

      const { data: serviceTransactions } = await serviceQuery

      // Get product commission metrics
      const productQuery = supabase
        .from('product_commission_transactions')
        .select('total_sale_amount, total_commission_amount, shop_amount, created_at, barber_id')
        .eq('barbershop_id', barbershopId)
        .gte('created_at', dateRange.start || thirtyDaysAgo)
        .lte('created_at', dateRange.end || today)

      const { data: productTransactions } = await productQuery

      // Get current barber balances
      const { data: balances } = await supabase
        .from('barber_commission_balances')
        .select('barber_id, pending_amount, paid_amount, total_earned')
        .eq('barbershop_id', barbershopId)

      // Calculate real-time metrics
      const metrics = {
        today: {
          service_revenue: 0,
          service_commission: 0,
          product_revenue: 0,
          product_commission: 0,
          total_revenue: 0,
          total_commission: 0,
          shop_earnings: 0,
          transaction_count: 0
        },
        period: {
          service_revenue: 0,
          service_commission: 0,
          product_revenue: 0,
          product_commission: 0,
          total_revenue: 0,
          total_commission: 0,
          shop_earnings: 0,
          transaction_count: 0
        },
        balances: {
          total_pending: 0,
          total_paid: 0,
          total_earned: 0,
          barber_breakdown: {}
        }
      }

      // Process service transactions
      serviceTransactions?.forEach(tx => {
        const amount = parseFloat(tx.payment_amount || 0)
        const commission = parseFloat(tx.commission_amount || 0)
        const shopAmount = parseFloat(tx.shop_amount || 0)
        const txDate = new Date(tx.created_at).toDateString()
        const isToday = txDate === new Date().toDateString()

        if (isToday) {
          metrics.today.service_revenue += amount
          metrics.today.service_commission += commission
          metrics.today.total_revenue += amount
          metrics.today.total_commission += commission
          metrics.today.shop_earnings += shopAmount
          metrics.today.transaction_count += 1
        }

        metrics.period.service_revenue += amount
        metrics.period.service_commission += commission
        metrics.period.total_revenue += amount
        metrics.period.total_commission += commission
        metrics.period.shop_earnings += shopAmount
        metrics.period.transaction_count += 1
      })

      // Process product transactions
      productTransactions?.forEach(tx => {
        const amount = parseFloat(tx.total_sale_amount || 0)
        const commission = parseFloat(tx.total_commission_amount || 0)
        const shopAmount = parseFloat(tx.shop_amount || 0)
        const txDate = new Date(tx.created_at).toDateString()
        const isToday = txDate === new Date().toDateString()

        if (isToday) {
          metrics.today.product_revenue += amount
          metrics.today.product_commission += commission
          metrics.today.total_revenue += amount
          metrics.today.total_commission += commission
          metrics.today.shop_earnings += shopAmount
          metrics.today.transaction_count += 1
        }

        metrics.period.product_revenue += amount
        metrics.period.product_commission += commission
        metrics.period.total_revenue += amount
        metrics.period.total_commission += commission
        metrics.period.shop_earnings += shopAmount
        metrics.period.transaction_count += 1
      })

      // Process balances
      balances?.forEach(balance => {
        metrics.balances.total_pending += parseFloat(balance.pending_amount || 0)
        metrics.balances.total_paid += parseFloat(balance.paid_amount || 0)
        metrics.balances.total_earned += parseFloat(balance.total_earned || 0)
        
        metrics.balances.barber_breakdown[balance.barber_id] = {
          pending: parseFloat(balance.pending_amount || 0),
          paid: parseFloat(balance.paid_amount || 0),
          earned: parseFloat(balance.total_earned || 0)
        }
      })

      return { data: metrics, error: null }
    } catch (error) {
      console.error('Error getting realtime financial metrics:', error)
      return { data: null, error: error.message }
    }
  }

  /**
   * Get tier progression analytics
   * @param {string} barbershopId - Barbershop ID
   * @param {Object} dateRange - Date range filter
   * @returns {Object} Tier progression data
   */
  async getTierProgressionAnalytics(barbershopId, dateRange = {}) {
    const supabase = this.getSupabase()
    if (!supabase) return { error: 'Client not initialized' }

    try {
      // Get tier history with barber information
      let historyQuery = supabase
        .from('commission_tier_history')
        .select(`
          *,
          commission_tiers(name, tier_level, commission_percentage, color_code),
          profiles(full_name, first_name, last_name)
        `)
        .eq('barbershop_id', barbershopId)
        .order('achieved_at', { ascending: false })

      if (dateRange.start) historyQuery = historyQuery.gte('achieved_at', dateRange.start)
      if (dateRange.end) historyQuery = historyQuery.lte('achieved_at', dateRange.end)

      const { data: tierHistory, error: historyError } = await historyQuery
      if (historyError) throw historyError

      // Get current tier assignments
      const { data: currentAssignments } = await supabase
        .from('barber_tier_assignments')
        .select(`
          *,
          current_tier:commission_tiers(name, tier_level, commission_percentage, color_code),
          profiles(full_name, first_name, last_name)
        `)
        .eq('barbershop_id', barbershopId)
        .eq('is_active', true)

      // Calculate tier progression statistics
      const analytics = {
        total_achievements: tierHistory?.length || 0,
        unique_barbers: new Set(tierHistory?.map(h => h.barber_id) || []).size,
        tier_distribution: {},
        progression_velocity: {},
        performance_trends: []
      }

      // Analyze tier distribution
      tierHistory?.forEach(history => {
        const tierLevel = history.commission_tiers?.tier_level || history.final_tier_level
        const tierName = history.commission_tiers?.name || `Tier ${tierLevel}`
        
        if (!analytics.tier_distribution[tierLevel]) {
          analytics.tier_distribution[tierLevel] = {
            tier_level: tierLevel,
            tier_name: tierName,
            achievement_count: 0,
            unique_barbers: new Set(),
            total_revenue: 0,
            avg_revenue: 0
          }
        }
        
        analytics.tier_distribution[tierLevel].achievement_count += 1
        analytics.tier_distribution[tierLevel].unique_barbers.add(history.barber_id)
        analytics.tier_distribution[tierLevel].total_revenue += history.period_revenue || 0
      })

      // Calculate averages
      Object.values(analytics.tier_distribution).forEach(tier => {
        tier.unique_barber_count = tier.unique_barbers.size
        tier.avg_revenue = tier.achievement_count > 0 ? tier.total_revenue / tier.achievement_count : 0
        delete tier.unique_barbers // Remove Set object for JSON serialization
      })

      return { data: { analytics, tier_history: tierHistory, current_assignments: currentAssignments }, error: null }
    } catch (error) {
      console.error('Error getting tier progression analytics:', error)
      return { data: null, error: error.message }
    }
  }

  /**
   * Initialize default product commission categories for a barbershop
   * @param {string} barbershopId - Barbershop ID
   * @returns {Object} Initialization result
   */
  async initializeDefaultProductCategories(barbershopId) {
    const defaultCategories = [
      {
        category_name: 'hair_care',
        category_display_name: 'Hair Care Products',
        category_description: 'Shampoos, conditioners, hair treatments',
        default_commission_rate: 0.15, // 15%
        tier_weight_multiplier: 0.8
      },
      {
        category_name: 'styling',
        category_display_name: 'Styling Products',
        category_description: 'Pomades, gels, sprays, styling tools',
        default_commission_rate: 0.12, // 12%
        tier_weight_multiplier: 0.7
      },
      {
        category_name: 'beard_care',
        category_display_name: 'Beard Care',
        category_description: 'Beard oils, balms, combs, trimmers',
        default_commission_rate: 0.18, // 18%
        tier_weight_multiplier: 0.9
      },
      {
        category_name: 'tools',
        category_display_name: 'Professional Tools',
        category_description: 'Clippers, scissors, combs, brushes',
        default_commission_rate: 0.08, // 8%
        tier_weight_multiplier: 0.5
      },
      {
        category_name: 'accessories',
        category_display_name: 'Accessories',
        category_description: 'Towels, capes, aftercare items',
        default_commission_rate: 0.10, // 10%
        tier_weight_multiplier: 0.6
      }
    ]

    const results = []
    for (const category of defaultCategories) {
      const result = await this.saveProductCommissionCategory(barbershopId, category)
      results.push(result)
    }

    return { data: results, error: null }
  }
}

// Export singleton instance
const financialService = new FinancialService()
export default financialService

// Named exports for specific functions
export {
  financialService as FinancialService,
  financialService
}