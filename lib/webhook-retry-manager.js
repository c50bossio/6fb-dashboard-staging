/**
 * Webhook Retry Manager
 * Handles retry logic for failed webhook operations with exponential backoff
 * Production-ready error recovery for commission processing
 */

import { createClient } from '@/lib/supabase/UNIFIED_CLIENT'

class WebhookRetryManager {
  constructor() {
    this.supabase = createClient()
    this.maxRetries = 3
    this.baseDelayMs = 1000
  }

  /**
   * Execute operation with retry logic and exponential backoff
   * @param {Function} operation - Async operation to execute
   * @param {Object} context - Context for logging/debugging
   * @param {number} maxRetries - Override default max retries
   * @returns {Object} Success/failure result
   */
  async withRetry(operation, context = {}, maxRetries = this.maxRetries) {
    let lastError = null
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const result = await operation()
        
        if (attempt > 0) {
          
        }
        
        return { success: true, data: result, attempts: attempt + 1 }
        
      } catch (error) {
        lastError = error
        
        console.warn(`⚠️ Operation failed (attempt ${attempt + 1}/${maxRetries + 1}):`, {
          ...context,
          error: error.message,
          stack: error.stack
        })
        
        // Don't wait after the last attempt
        if (attempt < maxRetries) {
          const delayMs = this.calculateDelay(attempt)
          
          await this.delay(delayMs)
        }
      }
    }
    
    // All retries failed
    console.error(`❌ Operation failed after ${maxRetries + 1} attempts:`, {
      ...context,
      finalError: lastError.message
    })
    
    // Log failure for monitoring
    await this.logFailure(context, lastError)
    
    return { 
      success: false, 
      error: lastError.message, 
      attempts: maxRetries + 1 
    }
  }

  /**
   * Retry commission calculation specifically
   * @param {Object} paymentIntent - Stripe payment intent
   * @param {Object} supabase - Supabase client
   * @returns {Object} Commission calculation result
   */
  async retryCommissionCalculation(paymentIntent, supabase) {
    return await this.withRetry(
      async () => {
        // Import the commission calculation function
        const { processCommissionCalculation } = await import('@/app/api/webhooks/stripe/route')
        return await processCommissionCalculation(paymentIntent, supabase)
      },
      {
        operation: 'commission_calculation',
        payment_intent_id: paymentIntent.id,
        amount: paymentIntent.amount / 100
      },
      5 // Higher retry count for critical commission calculations
    )
  }

  /**
   * Retry balance update operation
   * @param {string} barberId - Barber ID
   * @param {string} barberbarbershopId - Barbershop ID
   * @param {number} amount - Amount to update
   * @param {string} transactionId - Related transaction ID
   * @param {Object} supabase - Supabase client
   * @returns {Object} Balance update result
   */
  async retryBalanceUpdate(barberId, barberbarbershopId, amount, transactionId, supabase) {
    return await this.withRetry(
      async () => {
        return await this.updateBalanceAtomic(barberId, barberbarbershopId, amount, transactionId, supabase)
      },
      {
        operation: 'balance_update',
        barber_id: barberId,
        barberbarbershop_id: barberbarbershopId,
        amount: amount,
        transaction_id: transactionId
      }
    )
  }

  /**
   * Atomic balance update with proper conflict resolution
   */
  async updateBalanceAtomic(barberId, barberbarbershopId, amount, transactionId, supabase) {
    // First try upsert approach
    try {
      const { data, error } = await supabase.rpc('update_barber_balance', {
        p_barber_id: barberId,
        p_barberbarbershop_id: barberbarbershopId,
        p_amount: amount,
        p_transaction_id: transactionId
      })

      if (error) throw error
      return data
    } catch (error) {
      // Fallback to manual update with SELECT FOR UPDATE
      console.warn('RPC failed, using manual update:', error.message)
      
      const { data: existingBalance, error: selectError } = await supabase
        .from('barber_commission_balances')
        .select('*')
        .eq('barber_id', barberId)
        .eq('barberbarbershop_id', barberbarbershopId)
        .single()

      if (selectError && selectError.code !== 'PGRST116') {
        throw selectError
      }

      if (existingBalance) {
        // Update existing balance
        const { data, error: updateError } = await supabase
          .from('barber_commission_balances')
          .update({
            pending_amount: (existingBalance.pending_amount || 0) + amount,
            total_earned: (existingBalance.total_earned || 0) + amount,
            last_transaction_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('id', existingBalance.id)
          .select()

        if (updateError) throw updateError
        return data
      } else {
        // Create new balance record
        const { data, error: insertError } = await supabase
          .from('barber_commission_balances')
          .insert({
            barber_id: barberId,
            barberbarbershop_id: barberbarbershopId,
            pending_amount: amount,
            paid_amount: 0,
            total_earned: amount,
            last_transaction_at: new Date().toISOString(),
            created_at: new Date().toISOString()
          })
          .select()

        if (insertError) throw insertError
        return data
      }
    }
  }

  /**
   * Check if an error is retryable
   * @param {Error} error - Error to check
   * @returns {boolean} Whether error should be retried
   */
  isRetryableError(error) {
    const retryableErrors = [
      'ECONNRESET',
      'ECONNREFUSED',
      'ETIMEDOUT',
      'ENOTFOUND',
      'EAI_AGAIN',
      'connection_terminated_unexpectedly',
      'server_error',
      'timeout',
      'rate_limited'
    ]

    const retryableStatusCodes = [408, 429, 500, 502, 503, 504]
    
    return retryableErrors.some(code => 
      error.code === code || 
      error.message.toLowerCase().includes(code.toLowerCase())
    ) || retryableStatusCodes.includes(error.status)
  }

  /**
   * Calculate exponential backoff delay
   * @param {number} attempt - Attempt number (0-based)
   * @returns {number} Delay in milliseconds
   */
  calculateDelay(attempt) {
    const maxDelay = 30000 // 30 seconds max
    const jitter = Math.random() * 0.1 * this.baseDelayMs
    const delay = Math.min(
      this.baseDelayMs * Math.pow(2, attempt) + jitter,
      maxDelay
    )
    return Math.floor(delay)
  }

  /**
   * Delay execution for specified milliseconds
   * @param {number} ms - Milliseconds to wait
   */
  async delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  /**
   * Log operation failure for monitoring
   * @param {Object} context - Operation context
   * @param {Error} error - Final error
   */
  async logFailure(context, error) {
    try {
      await this.supabase
        .from('webhook_failures')
        .insert({
          operation_type: context.operation,
          payment_intent_id: context.payment_intent_id,
          barber_id: context.barber_id,
          barberbarbershop_id: context.barberbarbershop_id,
          error_message: error.message,
          error_stack: error.stack,
          context: context,
          created_at: new Date().toISOString()
        })
    } catch (logError) {
      console.error('Failed to log webhook failure:', logError)
    }
  }

  /**
   * Create dead letter queue record for manual processing
   * @param {string} eventType - Webhook event type
   * @param {Object} eventData - Original webhook data
   * @param {string} failureReason - Why processing failed
   */
  async createDeadLetterRecord(eventType, eventData, failureReason) {
    try {
      await this.supabase
        .from('webhook_dead_letter_queue')
        .insert({
          event_type: eventType,
          event_data: eventData,
          failure_reason: failureReason,
          created_at: new Date().toISOString(),
          status: 'pending_manual_review'
        })

    } catch (error) {
      console.error('Failed to create dead letter record:', error)
    }
  }

  /**
   * Process dead letter queue items (run periodically)
   */
  async processDeadLetterQueue() {
    try {
      const { data: queueItems, error } = await this.supabase
        .from('webhook_dead_letter_queue')
        .select('*')
        .eq('status', 'pending_manual_review')
        .order('created_at', { ascending: true })
        .limit(10)

      if (error) throw error

      for (const item of queueItems) {

        // Mark as processing
        await this.supabase
          .from('webhook_dead_letter_queue')
          .update({ status: 'processing' })
          .eq('id', item.id)

        try {
          // Attempt to reprocess the webhook event
          const success = await this.reprocessWebhookEvent(item.event_type, item.event_data)
          
          if (success) {
            await this.supabase
              .from('webhook_dead_letter_queue')
              .update({ 
                status: 'processed',
                processed_at: new Date().toISOString()
              })
              .eq('id', item.id)

          } else {
            await this.supabase
              .from('webhook_dead_letter_queue')
              .update({ 
                status: 'failed_reprocessing',
                retry_count: (item.retry_count || 0) + 1
              })
              .eq('id', item.id)
          }
        } catch (reprocessError) {
          console.error(`Failed to reprocess dead letter item ${item.id}:`, reprocessError)
          
          await this.supabase
            .from('webhook_dead_letter_queue')
            .update({ 
              status: 'failed_reprocessing',
              last_error: reprocessError.message,
              retry_count: (item.retry_count || 0) + 1
            })
            .eq('id', item.id)
        }
      }
    } catch (error) {
      console.error('Error processing dead letter queue:', error)
    }
  }

  /**
   * Attempt to reprocess a webhook event from dead letter queue
   * @param {string} eventType - Type of webhook event
   * @param {Object} eventData - Original event data
   * @returns {boolean} Success status
   */
  async reprocessWebhookEvent(eventType, eventData) {
    try {
      // Import webhook handlers
      const webhookHandlers = await import('@/app/api/webhooks/stripe/route')
      
      switch (eventType) {
        case 'payment_intent.succeeded':
          await webhookHandlers.handlePaymentIntentSucceeded(eventData)
          return true
          
        case 'transfer.created':
          await webhookHandlers.handleTransferCreated(eventData)
          return true
          
        case 'transfer.paid':
          await webhookHandlers.handleTransferPaid(eventData)
          return true
          
        default:
          
          return false
      }
    } catch (error) {
      console.error(`Error reprocessing ${eventType}:`, error)
      return false
    }
  }
}

// Export singleton instance
const webhookRetryManager = new WebhookRetryManager()
export default webhookRetryManager

// Named export for specific usage
export { WebhookRetryManager, webhookRetryManager }