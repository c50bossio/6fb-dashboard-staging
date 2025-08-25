/**
 * Unified Financial Service
 * Single source of truth for all financial operations across the application
 * Handles staff compensation, arrangements, payroll, and financial reporting
 */

import { createClient } from '@/lib/supabase/client'

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
   * Calculate commission for a transaction
   * @param {number} amount - Transaction amount
   * @param {string} barberId - Barber ID
   * @param {string} barbershopId - Barbershop ID
   * @returns {Object} Commission calculation
   */
  async calculateCommission(amount, barberId, barbershopId) {
    const { data: arrangement, error } = await this.getArrangement(barberId, barbershopId)
    
    if (error || !arrangement) {
      // Default commission if no arrangement found
      return {
        barberAmount: amount * 0.6,
        shopAmount: amount * 0.4,
        commissionRate: 60,
        arrangementType: 'default'
      }
    }

    let barberAmount, shopAmount

    switch (arrangement.type) {
      case 'commission':
        const rate = arrangement.commission_percentage / 100
        barberAmount = amount * rate
        shopAmount = amount * (1 - rate)
        break
      
      case 'booth_rent':
        // Barber keeps 100% minus prorated booth rent
        barberAmount = amount
        shopAmount = 0 // Booth rent handled separately
        break
      
      case 'hybrid':
        // Complex calculation based on threshold
        const hybridRate = arrangement.commission_percentage / 100
        barberAmount = amount * hybridRate
        shopAmount = amount * (1 - hybridRate)
        // Additional logic for revenue threshold can be added
        break
      
      default:
        barberAmount = amount * 0.6
        shopAmount = amount * 0.4
    }

    return {
      barberAmount,
      shopAmount,
      commissionRate: arrangement.commission_percentage || 60,
      arrangementType: arrangement.type
    }
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
   * Record a commission transaction
   * @param {Object} transactionData - Transaction details
   * @returns {Object} Created transaction record
   */
  async recordTransaction(transactionData) {
    const supabase = this.getSupabase()
    if (!supabase) return { error: 'Client not initialized' }

    try {
      const { amount, barberId, barbershopId, paymentIntentId, metadata } = transactionData

      // Calculate commission split
      const commission = await this.calculateCommission(amount, barberId, barbershopId)

      // Create transaction record
      const { data, error } = await supabase
        .from('commission_transactions')
        .insert({
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
        })
        .select()
        .single()

      if (error) throw error

      // Update barber balance
      await this.updateBarberBalance(barberId, barbershopId, commission.barberAmount)

      return { data, error: null }
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
}

// Export singleton instance
const financialService = new FinancialService()
export default financialService

// Named exports for specific functions
export {
  financialService as FinancialService,
  financialService
}