/**
 * Unified Stripe Account Management System
 * Single source of truth for all Stripe Connect operations across BookedBarber platform
 * 
 * Consolidates 5 disconnected Stripe implementations into unified system:
 * - Onboarding (FinancialSetupEnhanced.js) 
 * - Settings (PaymentProcessingSettings.js)
 * - Dashboard Alerts (PaymentSetupAlert.js)
 * - POS Terminal Setup (StripeTerminalSetup.tsx)
 * - Financial Service (financial-service.js)
 */

import { createClient } from '@/lib/supabase/client'

export class UnifiedStripeManager {
  constructor() {
    this.supabase = null
    this.cache = new Map()
    this.subscribers = new Set()
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

  // ==========================================
  // UNIFIED STATUS MANAGEMENT
  // ==========================================

  /**
   * Get comprehensive Stripe status for a barbershop
   * Consolidates all previous status checking into single method
   * @param {string} barbershopId - Barbershop ID
   * @param {boolean} forceRefresh - Skip cache and fetch fresh data
   * @returns {Object} Unified Stripe status
   */
  async getUnifiedStatus(barbershopId, forceRefresh = false) {
    const cacheKey = `status_${barbershopId}`
    
    if (!forceRefresh && this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey)
      if (Date.now() - cached.timestamp < 30000) { // 30 second cache
        return cached.data
      }
    }

    const supabase = this.getSupabase()
    if (!supabase) return { error: 'Client not initialized' }

    try {
      // Get Stripe Connect account information
      const { data: connectAccount, error: connectError } = await supabase
        .from('stripe_connected_accounts')
        .select(`
          *,
          barbershops(name, owner_id)
        `)
        .eq('barbershop_id', barbershopId)
        .single()

      // Get terminal configuration status
      const { data: terminalConfig } = await supabase
        .from('stripe_terminal_config')
        .select('*')
        .eq('barbershop_id', barbershopId)
        .single()

      // Get financial arrangements that use Stripe Connect
      const { data: financialArrangements } = await supabase
        .from('financial_arrangements')
        .select('*')
        .eq('barbershop_id', barbershopId)
        .not('stripe_account_id', 'is', null)

      // Calculate unified status
      const status = this.calculateUnifiedStatus({
        connectAccount,
        terminalConfig,
        financialArrangements,
        connectError
      })

      // Cache result
      this.cache.set(cacheKey, {
        data: status,
        timestamp: Date.now()
      })

      // Notify subscribers
      this.notifySubscribers('status_updated', { barbershopId, status })

      return status

    } catch (error) {
      console.error('Error getting unified Stripe status:', error)
      return {
        overall_status: 'error',
        error: error.message,
        connect_account: null,
        terminal_setup: null,
        financial_integration: null,
        setup_progress: null,
        next_steps: ['Contact support']
      }
    }
  }

  /**
   * Calculate unified status from all Stripe components
   * @private
   */
  calculateUnifiedStatus({ connectAccount, terminalConfig, financialArrangements, connectError }) {
    const status = {
      overall_status: 'not_started', // not_started, in_progress, completed, error
      connect_account: {
        exists: !!connectAccount,
        account_id: connectAccount?.stripe_account_id || null,
        charges_enabled: connectAccount?.charges_enabled || false,
        payouts_enabled: connectAccount?.payouts_enabled || false,
        details_submitted: connectAccount?.details_submitted || false,
        requirements_due: connectAccount?.requirements_due || [],
        onboarding_completed: false
      },
      terminal_setup: {
        configured: !!terminalConfig?.terminal_configured,
        location_id: terminalConfig?.location_id || null,
        reader_configured: !!terminalConfig?.reader_id,
        test_mode: terminalConfig?.test_mode !== false
      },
      financial_integration: {
        arrangements_with_stripe: financialArrangements?.length || 0,
        split_payments_enabled: false,
        commission_automation: false
      },
      setup_progress: {
        connect_setup: 0,
        terminal_setup: 0,
        financial_integration: 0,
        overall: 0
      },
      capabilities: {
        online_payments: false,
        in_person_payments: false,
        automatic_splits: false,
        direct_payouts: false
      },
      next_steps: [],
      last_updated: new Date().toISOString()
    }

    // No account exists
    if (!connectAccount) {
      status.overall_status = 'not_started'
      status.next_steps = [
        'Create Stripe Connect account',
        'Complete onboarding process',
        'Configure payment settings'
      ]
      return status
    }

    // Calculate Connect setup progress
    let connectProgress = 0
    if (connectAccount.stripe_account_id) connectProgress += 25
    if (connectAccount.details_submitted) connectProgress += 25
    if (connectAccount.charges_enabled) connectProgress += 25
    if (connectAccount.payouts_enabled) connectProgress += 25

    status.setup_progress.connect_setup = connectProgress
    status.connect_account.onboarding_completed = connectProgress === 100

    // Calculate Terminal setup progress
    let terminalProgress = 0
    if (terminalConfig?.location_id) terminalProgress += 50
    if (terminalConfig?.terminal_configured) terminalProgress += 50

    status.setup_progress.terminal_setup = terminalProgress

    // Calculate Financial integration progress
    let financialProgress = 0
    if (financialArrangements?.length > 0) financialProgress += 50
    if (connectAccount.charges_enabled && connectAccount.payouts_enabled) financialProgress += 50

    status.setup_progress.financial_integration = financialProgress
    status.financial_integration.split_payments_enabled = financialProgress >= 50
    status.financial_integration.commission_automation = financialProgress === 100

    // Calculate overall progress
    const overallProgress = Math.round(
      (status.setup_progress.connect_setup + 
       status.setup_progress.terminal_setup + 
       status.setup_progress.financial_integration) / 3
    )
    status.setup_progress.overall = overallProgress

    // Determine capabilities
    status.capabilities.online_payments = connectAccount.charges_enabled
    status.capabilities.in_person_payments = connectAccount.charges_enabled && terminalConfig?.terminal_configured
    status.capabilities.automatic_splits = financialArrangements?.length > 0
    status.capabilities.direct_payouts = connectAccount.payouts_enabled

    // Determine overall status
    if (overallProgress === 0) {
      status.overall_status = 'not_started'
    } else if (overallProgress === 100) {
      status.overall_status = 'completed'
    } else {
      status.overall_status = 'in_progress'
    }

    // Generate next steps
    status.next_steps = this.generateNextSteps(status)

    return status
  }

  /**
   * Generate contextual next steps based on current status
   * @private
   */
  generateNextSteps(status) {
    const steps = []

    // Connect account steps
    if (!status.connect_account.exists) {
      steps.push('Create Stripe Connect account')
    } else if (!status.connect_account.details_submitted) {
      steps.push('Complete Stripe onboarding')
    } else if (!status.connect_account.charges_enabled) {
      steps.push('Verify business information with Stripe')
    } else if (!status.connect_account.payouts_enabled) {
      steps.push('Complete bank account verification')
    }

    // Terminal steps
    if (status.connect_account.charges_enabled && !status.terminal_setup.configured) {
      steps.push('Set up Stripe Terminal for in-person payments')
    }

    // Financial integration steps
    if (status.connect_account.payouts_enabled && status.financial_integration.arrangements_with_stripe === 0) {
      steps.push('Configure automatic payment splits')
    }

    // Default completion message
    if (steps.length === 0 && status.overall_status === 'completed') {
      steps.push('All payment systems configured successfully')
    }

    return steps
  }

  // ==========================================
  // UNIFIED SETUP ORCHESTRATION
  // ==========================================

  /**
   * Orchestrate complete Stripe setup for a barbershop
   * Replaces fragmented setup across multiple components
   * @param {string} barbershopId - Barbershop ID
   * @param {Object} setupConfig - Setup configuration options
   * @returns {Object} Setup orchestration result
   */
  async orchestrateSetup(barbershopId, setupConfig = {}) {
    const {
      email,
      businessType = 'individual',
      enableTerminal = true,
      enableSplitPayments = true,
      returnUrl
    } = setupConfig

    const supabase = this.getSupabase()
    if (!supabase) return { error: 'Client not initialized' }

    try {
      // Get current status
      const currentStatus = await this.getUnifiedStatus(barbershopId, true)
      
      const orchestrationResult = {
        barbershop_id: barbershopId,
        steps_completed: [],
        steps_failed: [],
        current_status: currentStatus,
        next_action: null,
        setup_url: null
      }

      // Step 1: Create Connect account if needed
      if (!currentStatus.connect_account.exists) {
        const createResult = await this.createConnectAccount(barbershopId, {
          email,
          businessType,
          returnUrl
        })

        if (createResult.error) {
          orchestrationResult.steps_failed.push({
            step: 'create_connect_account',
            error: createResult.error
          })
          return orchestrationResult
        }

        orchestrationResult.steps_completed.push('create_connect_account')
        orchestrationResult.next_action = 'complete_onboarding'
        orchestrationResult.setup_url = createResult.onboarding_url
        return orchestrationResult
      }

      // Step 2: Check onboarding completion
      if (!currentStatus.connect_account.onboarding_completed) {
        const onboardingResult = await this.getOnboardingUrl(
          currentStatus.connect_account.account_id,
          returnUrl
        )

        if (onboardingResult.error) {
          orchestrationResult.steps_failed.push({
            step: 'get_onboarding_url',
            error: onboardingResult.error
          })
          return orchestrationResult
        }

        orchestrationResult.next_action = 'complete_onboarding'
        orchestrationResult.setup_url = onboardingResult.url
        return orchestrationResult
      }

      // Step 3: Configure Terminal if requested and account is ready
      if (enableTerminal && 
          currentStatus.capabilities.online_payments && 
          !currentStatus.terminal_setup.configured) {
        
        const terminalResult = await this.configureTerminal(barbershopId, {
          account_id: currentStatus.connect_account.account_id
        })

        if (terminalResult.error) {
          orchestrationResult.steps_failed.push({
            step: 'configure_terminal',
            error: terminalResult.error
          })
        } else {
          orchestrationResult.steps_completed.push('configure_terminal')
        }
      }

      // Step 4: Configure Split Payments if requested
      if (enableSplitPayments && 
          currentStatus.capabilities.direct_payouts && 
          currentStatus.financial_integration.arrangements_with_stripe === 0) {
        
        const splitResult = await this.configureSplitPayments(barbershopId, {
          account_id: currentStatus.connect_account.account_id
        })

        if (splitResult.error) {
          orchestrationResult.steps_failed.push({
            step: 'configure_split_payments',
            error: splitResult.error
          })
        } else {
          orchestrationResult.steps_completed.push('configure_split_payments')
        }
      }

      // Update final status
      orchestrationResult.current_status = await this.getUnifiedStatus(barbershopId, true)

      if (orchestrationResult.current_status.overall_status === 'completed') {
        orchestrationResult.next_action = 'setup_complete'
      }

      return orchestrationResult

    } catch (error) {
      console.error('Error orchestrating Stripe setup:', error)
      return {
        error: error.message,
        barbershop_id: barbershopId
      }
    }
  }

  /**
   * Create Stripe Connect account
   * Consolidates account creation logic from multiple components
   */
  async createConnectAccount(barbershopId, accountConfig) {
    try {
      const response = await fetch('/api/stripe/unified/create-account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          barbershop_id: barbershopId,
          ...accountConfig
        })
      })

      const result = await response.json()
      
      if (!response.ok) {
        throw new Error(result.error || 'Failed to create Connect account')
      }

      // Invalidate cache
      this.cache.delete(`status_${barbershopId}`)

      return {
        account_id: result.account_id,
        onboarding_url: result.onboarding_url,
        error: null
      }

    } catch (error) {
      console.error('Error creating Connect account:', error)
      return { error: error.message }
    }
  }

  /**
   * Get onboarding URL for existing account
   */
  async getOnboardingUrl(accountId, returnUrl) {
    try {
      const response = await fetch('/api/stripe/unified/onboarding-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          account_id: accountId,
          return_url: returnUrl || `${window.location.origin}/dashboard/settings#payments`
        })
      })

      const result = await response.json()
      
      if (!response.ok) {
        throw new Error(result.error || 'Failed to get onboarding URL')
      }

      return { url: result.url, error: null }

    } catch (error) {
      console.error('Error getting onboarding URL:', error)
      return { error: error.message }
    }
  }

  /**
   * Configure Terminal for in-person payments
   */
  async configureTerminal(barbershopId, config) {
    try {
      const response = await fetch('/api/stripe/unified/configure-terminal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          barbershop_id: barbershopId,
          ...config
        })
      })

      const result = await response.json()
      
      if (!response.ok) {
        throw new Error(result.error || 'Failed to configure Terminal')
      }

      // Invalidate cache
      this.cache.delete(`status_${barbershopId}`)

      return { data: result, error: null }

    } catch (error) {
      console.error('Error configuring Terminal:', error)
      return { error: error.message }
    }
  }

  /**
   * Configure automatic split payments
   */
  async configureSplitPayments(barbershopId, config) {
    try {
      const response = await fetch('/api/stripe/unified/configure-splits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          barbershop_id: barbershopId,
          ...config
        })
      })

      const result = await response.json()
      
      if (!response.ok) {
        throw new Error(result.error || 'Failed to configure split payments')
      }

      // Invalidate cache
      this.cache.delete(`status_${barbershopId}`)

      return { data: result, error: null }

    } catch (error) {
      console.error('Error configuring split payments:', error)
      return { error: error.message }
    }
  }

  // ==========================================
  // HEALTH & VERIFICATION
  // ==========================================

  /**
   * Comprehensive health check for all Stripe systems
   * @param {string} barbershopId - Barbershop ID
   * @returns {Object} Complete health status
   */
  async performHealthCheck(barbershopId) {
    try {
      const response = await fetch(`/api/stripe/unified/health?barbershop_id=${barbershopId}`)
      const result = await response.json()
      
      if (!response.ok) {
        throw new Error(result.error || 'Health check failed')
      }

      // Update cache with fresh health data
      this.cache.set(`status_${barbershopId}`, {
        data: result.status,
        timestamp: Date.now()
      })

      return { data: result, error: null }

    } catch (error) {
      console.error('Error performing health check:', error)
      return { error: error.message }
    }
  }

  /**
   * Verify Stripe account status with live API call
   */
  async verifyAccountStatus(accountId) {
    try {
      const response = await fetch(`/api/stripe/unified/verify-account?account_id=${accountId}`)
      const result = await response.json()
      
      if (!response.ok) {
        throw new Error(result.error || 'Account verification failed')
      }

      return { data: result, error: null }

    } catch (error) {
      console.error('Error verifying account status:', error)
      return { error: error.message }
    }
  }

  // ==========================================
  // STATE MANAGEMENT & SUBSCRIPTIONS
  // ==========================================

  /**
   * Subscribe to status updates
   * @param {Function} callback - Callback for status updates
   * @returns {Function} Unsubscribe function
   */
  subscribe(callback) {
    this.subscribers.add(callback)
    
    return () => {
      this.subscribers.delete(callback)
    }
  }

  /**
   * Notify all subscribers of updates
   * @private
   */
  notifySubscribers(event, data) {
    this.subscribers.forEach(callback => {
      try {
        callback(event, data)
      } catch (error) {
        console.error('Error in subscriber callback:', error)
      }
    })
  }

  /**
   * Clear cache for a specific barbershop
   */
  invalidateCache(barbershopId) {
    this.cache.delete(`status_${barbershopId}`)
  }

  /**
   * Clear all cached data
   */
  clearAllCache() {
    this.cache.clear()
  }

  // ==========================================
  // UTILITY METHODS
  // ==========================================

  /**
   * Check if setup is complete for a barbershop
   * @param {string} barbershopId - Barbershop ID
   * @returns {boolean} True if setup is complete
   */
  async isSetupComplete(barbershopId) {
    const status = await this.getUnifiedStatus(barbershopId)
    return status.overall_status === 'completed'
  }

  /**
   * Get setup progress percentage
   * @param {string} barbershopId - Barbershop ID
   * @returns {number} Progress percentage (0-100)
   */
  async getSetupProgress(barbershopId) {
    const status = await this.getUnifiedStatus(barbershopId)
    return status.setup_progress?.overall || 0
  }

  /**
   * Get human-readable status message
   * @param {string} barbershopId - Barbershop ID
   * @returns {string} Status message
   */
  async getStatusMessage(barbershopId) {
    const status = await this.getUnifiedStatus(barbershopId)
    
    switch (status.overall_status) {
      case 'not_started':
        return 'Payment setup not started'
      case 'in_progress':
        return `Payment setup ${status.setup_progress.overall}% complete`
      case 'completed':
        return 'All payment systems configured'
      case 'error':
        return `Setup error: ${status.error}`
      default:
        return 'Unknown status'
    }
  }

  /**
   * Check if specific capability is available
   * @param {string} barbershopId - Barbershop ID  
   * @param {string} capability - Capability name
   * @returns {boolean} True if capability is available
   */
  async hasCapability(barbershopId, capability) {
    const status = await this.getUnifiedStatus(barbershopId)
    return status.capabilities[capability] || false
  }

  // ==========================================
  // MIGRATION & COMPATIBILITY
  // ==========================================

  /**
   * Migrate existing fragmented setup to unified system
   * @param {string} barbershopId - Barbershop ID
   * @returns {Object} Migration result
   */
  async migrateExistingSetup(barbershopId) {
    const supabase = this.getSupabase()
    if (!supabase) return { error: 'Client not initialized' }

    try {
      // This method would consolidate existing setup data
      // from multiple tables into unified tracking
      
      const migrationResult = {
        migrated: false,
        unified_status: null,
        legacy_data_preserved: true
      }

      // Get current unified status to establish baseline
      const status = await this.getUnifiedStatus(barbershopId, true)
      migrationResult.unified_status = status

      // Mark as migrated if we have any Stripe data
      if (status.connect_account.exists) {
        migrationResult.migrated = true
      }

      return { data: migrationResult, error: null }

    } catch (error) {
      console.error('Error migrating existing setup:', error)
      return { error: error.message }
    }
  }

  /**
   * Get legacy component compatibility status
   * @param {string} component - Component name
   * @returns {Object} Compatibility information
   */
  getLegacyCompatibility(component) {
    const compatibility = {
      'FinancialSetupEnhanced': {
        status: 'compatible',
        notes: 'Can use getUnifiedStatus() instead of direct API calls'
      },
      'PaymentProcessingSettings': {
        status: 'compatible', 
        notes: 'Should migrate to use unified state management'
      },
      'PaymentSetupAlert': {
        status: 'compatible',
        notes: 'Can use isSetupComplete() for dismissal logic'
      },
      'StripeTerminalSetup': {
        status: 'enhanced',
        notes: 'Integrated with Connect account status checking'
      },
      'FinancialService': {
        status: 'enhanced',
        notes: 'Extended with unified status integration'
      }
    }

    return compatibility[component] || {
      status: 'unknown',
      notes: 'Component not recognized'
    }
  }
}

// Export singleton instance
const unifiedStripeManager = new UnifiedStripeManager()
export default unifiedStripeManager

// Named exports
export {
  UnifiedStripeManager,
  unifiedStripeManager
}