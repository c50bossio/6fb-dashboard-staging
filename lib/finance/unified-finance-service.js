/**
 * UNIFIED FINANCE SERVICE
 * Consolidates all financial data fetching into a single, efficient API
 * 
 * Features:
 * - Revenue data from Stripe Connect
 * - Staff compensation and payouts 
 * - Platform usage costs and billing
 * - Unified error handling and caching
 * - Optimized database queries
 */

import { createClient } from '@/lib/supabase/UNIFIED_CLIENT'
import { dbLogger } from '@/lib/logger'

class UnifiedFinanceService {
  constructor() {
    this.supabase = null
    this.cache = new Map()
    this.cacheTimeout = 5 * 60 * 1000 // 5 minutes
  }

  getSupabase() {
    if (!this.supabase) {
      this.supabase = createClient()
    }
    return this.supabase
  }

  /**
   * Get cached data or fetch fresh data
   */
  async getCachedData(key, fetchFunction) {
    const cached = this.cache.get(key)
    const now = Date.now()
    
    if (cached && (now - cached.timestamp) < this.cacheTimeout) {
      return cached.data
    }

    try {
      const data = await fetchFunction()
      this.cache.set(key, { data, timestamp: now })
      return data
    } catch (error) {
      dbLogger.error('Finance service fetch error:', { key, error })
      // Return cached data if available, even if stale
      return cached?.data || null
    }
  }

  /**
   * MAIN FUNCTION: Get all financial data for a user/barbershop
   * @param {string} userId - User ID
   * @param {string} barbershopId - Barbershop ID
   * @returns {Promise<Object>} Complete financial data
   */
  async getFinanceData(userId, barbershopId) {
    const cacheKey = `finance_${userId}_${barbershopId}`
    
    return this.getCachedData(cacheKey, async () => {
      try {
        // Parallel fetch all financial data
        const [revenue, compensation, subscription, quickActions] = await Promise.all([
          this.getRevenueData(barbershopId),
          this.getPayrollData(barbershopId),
          this.getBillingData(userId),
          this.generateQuickActions(userId, barbershopId)
        ])

        return {
          revenue,
          compensation,
          subscription,
          quickActions,
          lastUpdated: new Date().toISOString()
        }
      } catch (error) {
        dbLogger.error('Failed to fetch unified finance data:', error)
        throw error
      }
    })
  }

  /**
   * Get revenue data from Stripe Connect
   * @param {string} barbershopId - Barbershop ID
   * @returns {Promise<Object>} Revenue data
   */
  async getRevenueData(barbershopId) {
    const supabase = this.getSupabase()

    try {
      // Check Stripe Connect status
      const { data: stripeAccount, error: stripeError } = await supabase
        .from('stripe_connected_accounts')
        .select('id, stripe_account_id, charges_enabled, details_submitted')
        .eq('barbershop_id', barbershopId)
        .eq('account_owner_type', 'shop')
        .single()

      if (stripeError && stripeError.code !== 'PGRST116') {
        throw stripeError
      }

      // If no Stripe account connected
      if (!stripeAccount) {
        return {
          connected: false,
          dailyRevenue: 0,
          weeklyRevenue: 0,
          monthlyRevenue: 0,
          growth: { daily: 0, weekly: 0, monthly: 0 },
          paymentMethods: {},
          message: 'Connect Stripe to view revenue data'
        }
      }

      // Get payment data for connected accounts
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

      const { data: recentPayments, error: paymentsError } = await supabase
        .from('payments')
        .select('amount, currency, status, created_at, metadata')
        .eq('stripe_customer_id', stripeAccount.stripe_account_id)
        .eq('status', 'succeeded')
        .gte('created_at', thirtyDaysAgo)
        .order('created_at', { ascending: false })

      if (paymentsError) {
        throw paymentsError
      }

      const payments = recentPayments || []

      // Calculate revenue totals
      const dailyRevenue = this.calculateRevenue(payments, oneDayAgo)
      const weeklyRevenue = this.calculateRevenue(payments, sevenDaysAgo)
      const monthlyRevenue = this.calculateRevenue(payments, thirtyDaysAgo)

      // Calculate growth percentages (comparing to previous periods)
      const growth = await this.calculateGrowthRates(barbershopId, supabase)

      // Payment method statistics
      const paymentMethods = this.analyzePaymentMethods(payments)

      return {
        connected: true,
        stripeEnabled: stripeAccount.charges_enabled,
        detailsSubmitted: stripeAccount.details_submitted,
        dailyRevenue,
        weeklyRevenue,
        monthlyRevenue,
        growth,
        paymentMethods,
        totalTransactions: payments.length
      }
    } catch (error) {
      dbLogger.error('Failed to fetch revenue data:', error)
      return {
        connected: false,
        error: 'Failed to load revenue data',
        dailyRevenue: 0,
        weeklyRevenue: 0,
        monthlyRevenue: 0
      }
    }
  }

  /**
   * Get staff compensation data
   * @param {string} barbershopId - Barbershop ID
   * @returns {Promise<Object>} Payroll data
   */
  async getPayrollData(barbershopId) {
    const supabase = this.getSupabase()

    try {
      // Get all active staff members
      const { data: staff, error: staffError } = await supabase
        .from('barbershop_staff')
        .select(`
          id,
          user_id,
          profiles!user_id(full_name, first_name, last_name),
          role,
          status,
          hire_date
        `)
        .eq('barbershop_id', barbershopId)
        .eq('status', 'active')

      if (staffError) {
        throw staffError
      }

      if (!staff || staff.length === 0) {
        return {
          totalStaff: 0,
          pendingPayouts: 0,
          totalCommissions: 0,
          staffDetails: [],
          message: 'No active staff members found'
        }
      }

      // Get financial arrangements for each staff member
      const staffIds = staff.map(s => s.user_id)
      const { data: arrangements, error: arrangementsError } = await supabase
        .from('financial_arrangements')
        .select('*')
        .eq('barbershop_id', barbershopId)
        .in('barber_id', staffIds)
        .eq('is_active', true)

      if (arrangementsError) {
        throw arrangementsError
      }

      // Calculate pending payouts and commissions
      let totalCommissions = 0
      let pendingPayouts = 0

      const staffDetails = staff.map(staffMember => {
        const arrangement = arrangements?.find(a => a.barber_id === staffMember.user_id)
        const commissionBalance = arrangement?.commission_balance || 0
        const pendingPayout = arrangement?.pending_payout || 0

        totalCommissions += commissionBalance
        pendingPayouts += pendingPayout

        return {
          id: staffMember.id,
          userId: staffMember.user_id,
          name: staffMember.profiles?.full_name || 
                `${staffMember.profiles?.first_name || ''} ${staffMember.profiles?.last_name || ''}`.trim() || 
                'Unnamed Staff',
          role: staffMember.role,
          hireDate: staffMember.hire_date,
          commissionBalance: commissionBalance,
          pendingPayout: pendingPayout,
          commissionRate: arrangement?.commission_rate || 0,
          paymentProcessing: arrangement?.payment_processing_arrangement || 'shop_processes'
        }
      })

      return {
        totalStaff: staff.length,
        pendingPayouts: pendingPayouts,
        totalCommissions: totalCommissions,
        staffDetails: staffDetails.sort((a, b) => b.commissionBalance - a.commissionBalance)
      }
    } catch (error) {
      dbLogger.error('Failed to fetch payroll data:', error)
      return {
        totalStaff: 0,
        pendingPayouts: 0,
        totalCommissions: 0,
        staffDetails: [],
        error: 'Failed to load payroll data'
      }
    }
  }

  /**
   * Get platform billing and usage data
   * @param {string} userId - User ID
   * @returns {Promise<Object>} Billing data
   */
  async getBillingData(userId) {
    const supabase = this.getSupabase()

    try {
      // Get user subscription status
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('subscription_status, subscription_plan, subscription_current_period_end, trial_ends_at')
        .eq('id', userId)
        .single()

      if (profileError) {
        throw profileError
      }

      // Get current month usage
      const monthStart = new Date()
      monthStart.setDate(1)
      monthStart.setHours(0, 0, 0, 0)

      const { data: usage, error: usageError } = await supabase
        .from('usage_tracking')
        .select('resource_type, count')
        .eq('user_id', userId)
        .gte('period_start', monthStart.toISOString())

      if (usageError) {
        throw usageError
      }

      // Get current month payments/invoices
      const { data: monthlyInvoices, error: invoicesError } = await supabase
        .from('payments')
        .select('amount, description, status')
        .eq('user_id', userId)
        .gte('created_at', monthStart.toISOString())

      if (invoicesError) {
        throw invoicesError
      }

      // Calculate usage costs
      const usageCosts = this.calculateUsageCosts(usage || [])
      const monthToDateCharges = (monthlyInvoices || [])
        .filter(invoice => invoice.status === 'succeeded')
        .reduce((sum, invoice) => sum + (invoice.amount || 0), 0) / 100 // Convert from cents

      // Check for billing alerts
      const alerts = this.generateBillingAlerts(profile, usageCosts, monthToDateCharges)

      return {
        subscriptionStatus: profile?.subscription_status || 'free',
        subscriptionPlan: profile?.subscription_plan || 'free',
        periodEnd: profile?.subscription_current_period_end,
        trialEnd: profile?.trial_ends_at,
        monthToDateCharges: monthToDateCharges,
        usageCosts,
        alerts,
        usage: usage || []
      }
    } catch (error) {
      dbLogger.error('Failed to fetch billing data:', error)
      return {
        subscriptionStatus: 'unknown',
        error: 'Failed to load billing data',
        monthToDateCharges: 0,
        usageCosts: { total: 0 },
        alerts: []
      }
    }
  }

  /**
   * Generate context-aware quick actions
   * @param {string} userId - User ID  
   * @param {string} barbershopId - Barbershop ID
   * @returns {Promise<Array>} Quick action items
   */
  async generateQuickActions(userId, barbershopId) {
    try {
      const actions = []

      // Check if Stripe needs setup
      const supabase = this.getSupabase()
      const { data: stripeAccount } = await supabase
        .from('stripe_connected_accounts')
        .select('charges_enabled, details_submitted')
        .eq('barbershop_id', barbershopId)
        .eq('account_owner_type', 'shop')
        .single()

      if (!stripeAccount) {
        actions.push({
          id: 'setup-stripe',
          title: 'Connect Stripe Account',
          description: 'Start accepting payments from customers',
          priority: 'high',
          action: '/shop/settings/payments'
        })
      } else if (!stripeAccount.details_submitted) {
        actions.push({
          id: 'complete-stripe',
          title: 'Complete Stripe Setup',
          description: 'Finish payment account configuration',
          priority: 'high',
          action: '/shop/settings/payments'
        })
      }

      // Check for pending payouts
      const { data: arrangements } = await supabase
        .from('financial_arrangements')
        .select('pending_payout, barber_id, profiles!barber_id(full_name)')
        .eq('barbershop_id', barbershopId)
        .gt('pending_payout', 0)

      if (arrangements?.length > 0) {
        const totalPending = arrangements.reduce((sum, arr) => sum + (arr.pending_payout || 0), 0)
        actions.push({
          id: 'process-payouts',
          title: `Process Staff Payouts`,
          description: `${formatCurrency(totalPending)} pending for ${arrangements.length} staff`,
          priority: 'medium',
          action: '/shop/staff/payroll'
        })
      }

      return actions.sort((a, b) => {
        const priority = { high: 3, medium: 2, low: 1 }
        return priority[b.priority] - priority[a.priority]
      })
    } catch (error) {
      dbLogger.error('Failed to generate quick actions:', error)
      return []
    }
  }

  /**
   * Helper: Calculate revenue for a time period
   */
  calculateRevenue(payments, fromDate) {
    return payments
      .filter(payment => new Date(payment.created_at) >= new Date(fromDate))
      .reduce((sum, payment) => sum + (payment.amount || 0), 0) / 100 // Convert from cents
  }

  /**
   * Helper: Calculate growth rates
   */
  async calculateGrowthRates(barbershopId, supabase) {
    try {
      // This is a simplified growth calculation
      // In production, you'd want more sophisticated period comparisons
      const sixtyDaysAgo = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString()
      const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString()
      const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()

      // Get historical data for growth comparison
      const { data: historicalPayments } = await supabase
        .from('payments')
        .select('amount, created_at')
        .gte('created_at', sixtyDaysAgo)
        .eq('status', 'succeeded')

      if (!historicalPayments?.length) {
        return { daily: 0, weekly: 0, monthly: 0 }
      }

      // Calculate previous period revenues for comparison
      const prevDailyRevenue = this.calculateRevenue(historicalPayments, twoDaysAgo) - 
                              this.calculateRevenue(historicalPayments, new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      
      const currentDailyRevenue = this.calculateRevenue(historicalPayments, new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())

      const dailyGrowth = prevDailyRevenue > 0 ? 
        ((currentDailyRevenue - prevDailyRevenue) / prevDailyRevenue) * 100 : 0

      return {
        daily: Math.round(dailyGrowth * 100) / 100,
        weekly: 0, // Simplified for demo
        monthly: 0 // Simplified for demo
      }
    } catch (error) {
      dbLogger.error('Failed to calculate growth rates:', error)
      return { daily: 0, weekly: 0, monthly: 0 }
    }
  }

  /**
   * Helper: Analyze payment methods
   */
  analyzePaymentMethods(payments) {
    const methods = {}
    
    payments.forEach(payment => {
      const method = payment.metadata?.payment_method || 'card'
      methods[method] = (methods[method] || 0) + 1
    })

    return methods
  }

  /**
   * Helper: Calculate usage costs
   */
  calculateUsageCosts(usage) {
    const costs = {
      ai_tokens: 0,
      sms_messages: 0,
      email_sends: 0,
      total: 0
    }

    // Pricing structure (example rates)
    const rates = {
      ai_chats: 0.02, // $0.02 per chat
      sms_messages: 0.05, // $0.05 per SMS
      email_sends: 0.01 // $0.01 per email
    }

    usage.forEach(item => {
      if (rates[item.resource_type]) {
        const cost = item.count * rates[item.resource_type]
        costs[item.resource_type] = cost
        costs.total += cost
      }
    })

    return costs
  }

  /**
   * Helper: Generate billing alerts
   */
  generateBillingAlerts(profile, usageCosts, monthCharges) {
    const alerts = []

    // High usage alert
    if (usageCosts.total > 50) {
      alerts.push({
        type: 'warning',
        title: 'High Usage This Month',
        message: `Current usage charges: ${formatCurrency(usageCosts.total)}`
      })
    }

    // Trial expiring alert
    if (profile?.trial_ends_at) {
      const trialEnd = new Date(profile.trial_ends_at)
      const daysLeft = Math.ceil((trialEnd - new Date()) / (1000 * 60 * 60 * 24))
      
      if (daysLeft <= 7 && daysLeft > 0) {
        alerts.push({
          type: 'info',
          title: 'Trial Ending Soon',
          message: `Your trial expires in ${daysLeft} days`
        })
      }
    }

    return alerts
  }
}

// Utility functions
export function formatCurrency(amount, currency = 'USD') {
  if (typeof amount !== 'number') amount = 0
  
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency
  }).format(amount)
}

export function calculateCommission(amount, rate) {
  if (typeof amount !== 'number' || typeof rate !== 'number') return 0
  return amount * (rate / 100)
}

export function getPayoutSchedule(arrangement) {
  const schedules = {
    daily: 'Daily at 6 PM',
    weekly: 'Fridays at 6 PM', 
    bi_weekly: 'Every other Friday',
    monthly: '1st of each month'
  }
  
  return schedules[arrangement?.payout_schedule] || 'Manual payout'
}

// Export singleton instance
const financeService = new UnifiedFinanceService()
export default financeService

/**
 * Main export function for easy usage
 * @param {string} userId - User ID
 * @param {string} barbershopId - Barbershop ID
 * @returns {Promise<Object>} Complete financial data
 */
export async function getFinanceData(userId, barbershopId) {
  return financeService.getFinanceData(userId, barbershopId)
}

/**
 * Get only revenue data
 */
export async function getRevenueData(barbershopId) {
  return financeService.getRevenueData(barbershopId)
}

/**
 * Get only payroll data
 */
export async function getPayrollData(barbershopId) {
  return financeService.getPayrollData(barbershopId)
}

/**
 * Get only billing data
 */
export async function getBillingData(userId) {
  return financeService.getBillingData(userId)
}