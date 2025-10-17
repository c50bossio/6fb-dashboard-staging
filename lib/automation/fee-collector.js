'use client'

import logger from '@/lib/logger'
import { createClient } from '@/lib/supabase/server'

/**
 * Fee Collection Automation Service
 * 
 * Handles automatic collection of no-show fees including:
 * - Retry logic with exponential backoff
 * - Fallback to manual collection when automated fails
 * - Payment attempt tracking and audit trails
 * - Integration with Stripe payment methods
 */
export class FeeCollectionService {
  constructor(orchestrator) {
    this.orchestrator = orchestrator
    this.retryQueue = new Map()
    this.processingLock = new Set()
    this.maxRetries = 5
    this.baseDelayMs = 1000 * 60 * 60 // 1 hour base delay
  }

  async initialize() {
    logger.info('[FeeCollectionService] Initializing fee collection service')
    
    // Load any pending retries from database
    await this.loadPendingRetries()
    
    logger.info('[FeeCollectionService] Fee collection service initialized')
  }

  /**
   * Process a no-show fee for an appointment
   */
  async processNoShowFee(data) {
    const { appointmentId, barbershopId, clientId, settings } = data
    
    if (this.processingLock.has(appointmentId)) {
      logger.warn(`[FeeCollectionService] Already processing fee for appointment ${appointmentId}`)
      return
    }

    this.processingLock.add(appointmentId)

    try {
      logger.info(`[FeeCollectionService] Processing no-show fee for appointment ${appointmentId}`)

      // Get appointment and client details
      const appointmentData = await this.getAppointmentDetails(appointmentId)
      if (!appointmentData) {
        throw new Error('Appointment not found')
      }

      // Calculate fee using no-show policy engine
      const feeAmount = await this.calculateNoShowFee(appointmentData)
      if (feeAmount <= 0) {
        logger.info(`[FeeCollectionService] No fee required for appointment ${appointmentId}`)
        return { success: true, reason: 'No fee required' }
      }

      // Check if fee collection requires confirmation
      if (settings.requireConfirmation) {
        await this.requestFeeConfirmation(appointmentData, feeAmount, settings)
        return { success: true, reason: 'Awaiting fee confirmation' }
      }

      // Attempt automatic fee collection
      const result = await this.attemptFeeCollection(appointmentData, feeAmount, settings)
      
      if (result.success) {
        logger.info(`[FeeCollectionService] Successfully collected $${feeAmount} for appointment ${appointmentId}`)
        await this.recordSuccessfulCollection(appointmentData, feeAmount, result)
      } else {
        logger.warn(`[FeeCollectionService] Fee collection failed for appointment ${appointmentId}:`, result.error)
        await this.handleCollectionFailure(appointmentData, feeAmount, settings, result.error)
      }

      return result

    } catch (error) {
      logger.error(`[FeeCollectionService] Error processing no-show fee:`, error)
      await this.handleCollectionFailure(appointmentData, 0, settings, error.message)
      return { success: false, error: error.message }
      
    } finally {
      this.processingLock.delete(appointmentId)
    }
  }

  /**
   * Get detailed appointment information needed for fee processing
   */
  async getAppointmentDetails(appointmentId) {
    try {
      const supabase = await createClient()
      
      const { data, error } = await supabase
        .from('appointments')
        .select(`
          id,
          client_id,
          barber_id,
          barbershop_id,
          service_id,
          appointment_date,
          start_time,
          end_time,
          price,
          status,
          no_show_fee_applied,
          no_show_fee_amount,
          clients (
            id,
            email,
            phone,
            first_name,
            last_name,
            no_show_strikes,
            stripe_customer_id,
            created_at
          ),
          services (
            id,
            name,
            price,
            duration
          ),
          barbershops (
            id,
            name,
            stripe_account_id
          )
        `)
        .eq('id', appointmentId)
        .single()

      if (error) {
        logger.error(`[FeeCollectionService] Error fetching appointment details:`, error)
        return null
      }

      return data

    } catch (error) {
      logger.error(`[FeeCollectionService] Error in getAppointmentDetails:`, error)
      return null
    }
  }

  /**
   * Calculate no-show fee using the enhanced no-show policy
   */
  async calculateNoShowFee(appointmentData) {
    try {
      // Import the no-show policy engine
      const { EnhancedNoShowPolicy } = await import('@/lib/booking-rules-engine/EnhancedNoShowPolicy')
      
      // Get business rules for this barbershop
      const supabase = await createClient()
      const { data: businessSettings } = await supabase
        .from('business_settings')
        .select('booking_rules')
        .eq('user_id', appointmentData.barbershops?.owner_id)
        .single()

      const rules = businessSettings?.booking_rules || {}
      const policyEngine = new EnhancedNoShowPolicy(rules)

      // Prepare client data for policy engine
      const client = {
        noShowStrikes: appointmentData.clients?.no_show_strikes || 0,
        totalBookings: await this.getClientBookingCount(appointmentData.client_id),
        loyaltyMonths: this.calculateLoyaltyMonths(appointmentData.clients?.created_at),
        totalSpent: await this.getClientTotalSpent(appointmentData.client_id)
      }

      // Prepare appointment data for policy engine
      const appointment = {
        servicePrice: appointmentData.price || appointmentData.services?.price || 50,
        serviceDuration: appointmentData.services?.duration || 60,
        date: appointmentData.appointment_date
      }

      // Calculate penalty
      const penaltyResult = policyEngine.calculateNoShowPenalty(appointment, client)
      
      logger.debug(`[FeeCollectionService] Fee calculation result:`, {
        appointmentId: appointmentData.id,
        shouldCharge: penaltyResult.shouldChargeFee,
        amount: penaltyResult.feeAmount,
        reasoning: penaltyResult.reasoning
      })

      return penaltyResult.shouldChargeFee ? penaltyResult.feeAmount : 0

    } catch (error) {
      logger.error(`[FeeCollectionService] Error calculating no-show fee:`, error)
      // Fallback to basic fee
      return appointmentData.services?.price * 0.5 || 25
    }
  }

  /**
   * Attempt to collect the fee using stored payment methods
   */
  async attemptFeeCollection(appointmentData, feeAmount, settings) {
    try {
      const client = appointmentData.clients
      
      if (!client?.stripe_customer_id) {
        return {
          success: false,
          error: 'No payment method on file',
          shouldRetry: false
        }
      }

      // Get Stripe customer and payment methods
      const stripe = await this.getStripeClient(appointmentData.barbershops?.stripe_account_id)
      if (!stripe) {
        return {
          success: false,
          error: 'Stripe not configured',
          shouldRetry: false
        }
      }

      // Get customer's payment methods
      const paymentMethods = await stripe.paymentMethods.list({
        customer: client.stripe_customer_id,
        type: 'card'
      })

      if (!paymentMethods.data?.length) {
        return {
          success: false,
          error: 'No valid payment methods found',
          shouldRetry: false
        }
      }

      // Attempt payment with the primary payment method
      const primaryPaymentMethod = paymentMethods.data[0]
      
      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(feeAmount * 100), // Convert to cents
        currency: 'usd',
        customer: client.stripe_customer_id,
        payment_method: primaryPaymentMethod.id,
        confirm: true,
        description: `No-show fee for appointment on ${appointmentData.appointment_date}`,
        metadata: {
          appointment_id: appointmentData.id,
          barbershop_id: appointmentData.barbershop_id,
          client_id: client.id,
          fee_type: 'no_show'
        },
        return_url: `${process.env.NEXT_PUBLIC_BASE_URL}/dashboard/payments`,
        automatic_payment_methods: { enabled: true }
      })

      if (paymentIntent.status === 'succeeded') {
        return {
          success: true,
          paymentIntentId: paymentIntent.id,
          amountCharged: feeAmount
        }
      } else {
        return {
          success: false,
          error: `Payment not completed: ${paymentIntent.status}`,
          shouldRetry: paymentIntent.status === 'requires_action',
          paymentIntentId: paymentIntent.id
        }
      }

    } catch (error) {
      logger.error(`[FeeCollectionService] Error attempting fee collection:`, error)
      
      const isRetriableError = this.isRetriableStripeError(error)
      
      return {
        success: false,
        error: error.message,
        shouldRetry: isRetriableError,
        stripeError: error.code
      }
    }
  }

  /**
   * Handle fee collection failure and set up retries if appropriate
   */
  async handleCollectionFailure(appointmentData, feeAmount, settings, errorMessage) {
    try {
      const appointmentId = appointmentData.id
      
      // Record the failure
      await this.recordCollectionFailure(appointmentData, feeAmount, errorMessage)

      // Check if we should retry
      const shouldRetry = this.shouldRetryCollection(errorMessage, settings)
      
      if (shouldRetry) {
        await this.scheduleRetry(appointmentId, feeAmount, settings, 1)
        logger.info(`[FeeCollectionService] Scheduled retry for appointment ${appointmentId}`)
      } else if (settings.fallbackToManual) {
        await this.fallbackToManualCollection(appointmentData, feeAmount)
        logger.info(`[FeeCollectionService] Fallback to manual collection for appointment ${appointmentId}`)
      }

      // Send manager notification if enabled
      if (settings.notifyOnFailure) {
        await this.notifyManagerOfFailure(appointmentData, feeAmount, errorMessage)
      }

    } catch (error) {
      logger.error(`[FeeCollectionService] Error handling collection failure:`, error)
    }
  }

  /**
   * Schedule a retry attempt for failed fee collection
   */
  async scheduleRetry(appointmentId, feeAmount, settings, attemptNumber) {
    if (attemptNumber > (settings.retryAttempts || 3)) {
      logger.info(`[FeeCollectionService] Max retry attempts reached for appointment ${appointmentId}`)
      return
    }

    const delayHours = settings.retryDelay || 24
    const delayMs = delayHours * 60 * 60 * 1000
    const retryAt = new Date(Date.now() + delayMs)

    // Store retry information
    this.retryQueue.set(appointmentId, {
      appointmentId,
      feeAmount,
      settings,
      attemptNumber,
      retryAt,
      lastError: null
    })

    // Save to database for persistence
    await this.saveRetryToDatabase(appointmentId, feeAmount, settings, attemptNumber, retryAt)
  }

  /**
   * Process all pending retries
   */
  async processRetries() {
    const now = new Date()
    const retriesToProcess = []

    // Find retries that are ready to process
    for (const [appointmentId, retryInfo] of this.retryQueue) {
      if (retryInfo.retryAt <= now) {
        retriesToProcess.push(retryInfo)
      }
    }

    if (retriesToProcess.length === 0) {
      return
    }

    logger.info(`[FeeCollectionService] Processing ${retriesToProcess.length} fee collection retries`)

    for (const retryInfo of retriesToProcess) {
      try {
        // Remove from retry queue
        this.retryQueue.delete(retryInfo.appointmentId)
        
        // Attempt collection again
        const appointmentData = await this.getAppointmentDetails(retryInfo.appointmentId)
        if (!appointmentData) {
          logger.warn(`[FeeCollectionService] Appointment not found for retry: ${retryInfo.appointmentId}`)
          continue
        }

        const result = await this.attemptFeeCollection(appointmentData, retryInfo.feeAmount, retryInfo.settings)
        
        if (result.success) {
          logger.info(`[FeeCollectionService] Retry successful for appointment ${retryInfo.appointmentId}`)
          await this.recordSuccessfulCollection(appointmentData, retryInfo.feeAmount, result)
          await this.clearRetryFromDatabase(retryInfo.appointmentId)
        } else {
          logger.warn(`[FeeCollectionService] Retry failed for appointment ${retryInfo.appointmentId}`)
          await this.handleRetryFailure(retryInfo, result.error)
        }

      } catch (error) {
        logger.error(`[FeeCollectionService] Error processing retry for appointment ${retryInfo.appointmentId}:`, error)
      }
    }
  }

  /**
   * Handle retry failure - either schedule another retry or give up
   */
  async handleRetryFailure(retryInfo, errorMessage) {
    const nextAttemptNumber = retryInfo.attemptNumber + 1
    const maxRetries = retryInfo.settings.retryAttempts || 3

    if (nextAttemptNumber <= maxRetries) {
      // Schedule another retry with exponential backoff
      const delayHours = (retryInfo.settings.retryDelay || 24) * Math.pow(2, retryInfo.attemptNumber - 1)
      const delayMs = Math.min(delayHours * 60 * 60 * 1000, 7 * 24 * 60 * 60 * 1000) // Max 7 days
      const retryAt = new Date(Date.now() + delayMs)

      this.retryQueue.set(retryInfo.appointmentId, {
        ...retryInfo,
        attemptNumber: nextAttemptNumber,
        retryAt,
        lastError: errorMessage
      })

      await this.saveRetryToDatabase(retryInfo.appointmentId, retryInfo.feeAmount, retryInfo.settings, nextAttemptNumber, retryAt)
      
      logger.info(`[FeeCollectionService] Scheduled retry ${nextAttemptNumber}/${maxRetries} for appointment ${retryInfo.appointmentId}`)
    } else {
      // Give up and fallback to manual if configured
      logger.info(`[FeeCollectionService] All retry attempts exhausted for appointment ${retryInfo.appointmentId}`)
      
      if (retryInfo.settings.fallbackToManual) {
        const appointmentData = await this.getAppointmentDetails(retryInfo.appointmentId)
        if (appointmentData) {
          await this.fallbackToManualCollection(appointmentData, retryInfo.feeAmount)
        }
      }

      await this.clearRetryFromDatabase(retryInfo.appointmentId)
    }
  }

  /**
   * Fallback to manual fee collection
   */
  async fallbackToManualCollection(appointmentData, feeAmount) {
    try {
      const supabase = await createClient()

      // Create a manual collection task
      await supabase
        .from('fee_collection_tasks')
        .insert({
          appointment_id: appointmentData.id,
          client_id: appointmentData.client_id,
          barbershop_id: appointmentData.barbershop_id,
          fee_amount: feeAmount,
          fee_type: 'no_show',
          collection_method: 'manual',
          status: 'pending',
          reason: 'Automatic collection failed',
          created_at: new Date().toISOString()
        })

      // Create notification for staff
      await supabase
        .from('notifications')
        .insert({
          barbershop_id: appointmentData.barbershop_id,
          type: 'fee_collection_required',
          title: 'Manual Fee Collection Required',
          message: `No-show fee of $${feeAmount} requires manual collection`,
          metadata: {
            appointment_id: appointmentData.id,
            client_name: `${appointmentData.clients?.first_name} ${appointmentData.clients?.last_name}`,
            fee_amount: feeAmount
          },
          created_at: new Date().toISOString()
        })

      logger.info(`[FeeCollectionService] Created manual collection task for appointment ${appointmentData.id}`)

    } catch (error) {
      logger.error(`[FeeCollectionService] Error creating manual collection task:`, error)
    }
  }

  /**
   * Record successful fee collection
   */
  async recordSuccessfulCollection(appointmentData, feeAmount, result) {
    try {
      const supabase = await createClient()

      // Update appointment with fee information
      await supabase
        .from('appointments')
        .update({
          no_show_fee_applied: true,
          no_show_fee_amount: feeAmount,
          no_show_fee_charged_at: new Date().toISOString(),
          no_show_fee_payment_intent: result.paymentIntentId
        })
        .eq('id', appointmentData.id)

      // Record in payment history
      await supabase
        .from('payments')
        .insert({
          client_id: appointmentData.client_id,
          barbershop_id: appointmentData.barbershop_id,
          appointment_id: appointmentData.id,
          amount: feeAmount,
          payment_type: 'no_show_fee',
          payment_method: 'automatic',
          status: 'completed',
          stripe_payment_intent_id: result.paymentIntentId,
          processed_at: new Date().toISOString(),
          created_at: new Date().toISOString()
        })

      // Update client's no-show strikes
      await supabase
        .from('clients')
        .update({
          no_show_strikes: (appointmentData.clients?.no_show_strikes || 0) + 1
        })
        .eq('id', appointmentData.client_id)

      logger.info(`[FeeCollectionService] Recorded successful collection for appointment ${appointmentData.id}`)

    } catch (error) {
      logger.error(`[FeeCollectionService] Error recording successful collection:`, error)
    }
  }

  /**
   * Record fee collection failure
   */
  async recordCollectionFailure(appointmentData, feeAmount, errorMessage) {
    try {
      const supabase = await createClient()

      await supabase
        .from('fee_collection_attempts')
        .insert({
          appointment_id: appointmentData.id,
          client_id: appointmentData.client_id,
          barbershop_id: appointmentData.barbershop_id,
          fee_amount: feeAmount,
          attempt_type: 'automatic',
          status: 'failed',
          error_message: errorMessage,
          attempted_at: new Date().toISOString(),
          created_at: new Date().toISOString()
        })

    } catch (error) {
      logger.error(`[FeeCollectionService] Error recording collection failure:`, error)
    }
  }

  /**
   * Request manual confirmation for fee collection
   */
  async requestFeeConfirmation(appointmentData, feeAmount, settings) {
    try {
      const supabase = await createClient()

      // Create a confirmation request
      await supabase
        .from('fee_confirmation_requests')
        .insert({
          appointment_id: appointmentData.id,
          client_id: appointmentData.client_id,
          barbershop_id: appointmentData.barbershop_id,
          fee_amount: feeAmount,
          status: 'pending',
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
          created_at: new Date().toISOString()
        })

      // Notify manager
      await this.orchestrator.notifyManager({
        type: 'fee_confirmation_required',
        barbershopId: appointmentData.barbershop_id,
        appointmentId: appointmentData.id,
        clientId: appointmentData.client_id,
        feeAmount,
        settings
      })

    } catch (error) {
      logger.error(`[FeeCollectionService] Error requesting fee confirmation:`, error)
    }
  }

  /**
   * Utility methods
   */

  async getStripeClient(stripeAccountId) {
    try {
      // Initialize Stripe with the barbershop's account
      const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY, {
        stripeAccount: stripeAccountId
      })
      return stripe
    } catch (error) {
      logger.error(`[FeeCollectionService] Error initializing Stripe client:`, error)
      return null
    }
  }

  isRetriableStripeError(error) {
    const retriableCodes = [
      'rate_limit',
      'network_error', 
      'api_error',
      'temporary_error'
    ]
    return retriableCodes.includes(error.code) || error.type === 'network_error'
  }

  shouldRetryCollection(errorMessage, settings) {
    // Don't retry if max attempts is 0
    if ((settings.retryAttempts || 3) === 0) return false
    
    // Don't retry for certain permanent errors
    const permanentErrors = [
      'No payment method on file',
      'No valid payment methods found',
      'Stripe not configured',
      'card_declined',
      'insufficient_funds'
    ]
    
    return !permanentErrors.some(error => errorMessage.includes(error))
  }

  async getClientBookingCount(clientId) {
    try {
      const supabase = await createClient()
      const { count } = await supabase
        .from('appointments')
        .select('id', { count: 'exact' })
        .eq('client_id', clientId)
        .in('status', ['completed', 'no_show'])

      return count || 0
    } catch {
      return 0
    }
  }

  async getClientTotalSpent(clientId) {
    try {
      const supabase = await createClient()
      const { data } = await supabase
        .from('payments')
        .select('amount')
        .eq('client_id', clientId)
        .eq('status', 'completed')

      return data?.reduce((total, payment) => total + payment.amount, 0) || 0
    } catch {
      return 0
    }
  }

  calculateLoyaltyMonths(createdAt) {
    if (!createdAt) return 0
    const created = new Date(createdAt)
    const now = new Date()
    return Math.floor((now - created) / (1000 * 60 * 60 * 24 * 30))
  }

  async loadPendingRetries() {
    try {
      const supabase = await createClient()
      const { data: retries } = await supabase
        .from('fee_collection_retries')
        .select('*')
        .eq('status', 'pending')
        .lt('retry_at', new Date().toISOString())

      if (retries?.length) {
        logger.info(`[FeeCollectionService] Loaded ${retries.length} pending retries`)
        
        retries.forEach(retry => {
          this.retryQueue.set(retry.appointment_id, {
            appointmentId: retry.appointment_id,
            feeAmount: retry.fee_amount,
            settings: retry.settings,
            attemptNumber: retry.attempt_number,
            retryAt: new Date(retry.retry_at),
            lastError: retry.last_error
          })
        })
      }
    } catch (error) {
      logger.error(`[FeeCollectionService] Error loading pending retries:`, error)
    }
  }

  async saveRetryToDatabase(appointmentId, feeAmount, settings, attemptNumber, retryAt) {
    try {
      const supabase = await createClient()
      
      await supabase
        .from('fee_collection_retries')
        .upsert({
          appointment_id: appointmentId,
          fee_amount: feeAmount,
          settings: settings,
          attempt_number: attemptNumber,
          retry_at: retryAt.toISOString(),
          status: 'pending',
          updated_at: new Date().toISOString()
        })
        
    } catch (error) {
      logger.error(`[FeeCollectionService] Error saving retry to database:`, error)
    }
  }

  async clearRetryFromDatabase(appointmentId) {
    try {
      const supabase = await createClient()
      
      await supabase
        .from('fee_collection_retries')
        .update({ status: 'completed' })
        .eq('appointment_id', appointmentId)
        
    } catch (error) {
      logger.error(`[FeeCollectionService] Error clearing retry from database:`, error)
    }
  }

  async notifyManagerOfFailure(appointmentData, feeAmount, errorMessage) {
    try {
      await this.orchestrator.notifyManager({
        type: 'payment_failed',
        barbershopId: appointmentData.barbershop_id,
        appointmentId: appointmentData.id,
        clientId: appointmentData.client_id,
        reason: errorMessage,
        feeAmount
      })
    } catch (error) {
      logger.error(`[FeeCollectionService] Error notifying manager of failure:`, error)
    }
  }

  /**
   * Handle payment failures from webhooks
   */
  async handlePaymentFailure(data) {
    const { paymentId, appointmentId, reason, settings } = data
    
    logger.info(`[FeeCollectionService] Handling payment failure for payment ${paymentId}`)
    
    try {
      // Update payment record
      const supabase = await createClient()
      await supabase
        .from('payments')
        .update({
          status: 'failed',
          failure_reason: reason,
          failed_at: new Date().toISOString()
        })
        .eq('stripe_payment_intent_id', paymentId)

      // Schedule retry if appropriate
      if (this.shouldRetryCollection(reason, settings)) {
        await this.scheduleRetry(appointmentId, data.amount, settings, 1)
      }

    } catch (error) {
      logger.error(`[FeeCollectionService] Error handling payment failure:`, error)
    }
  }

  async shutdown() {
    logger.info('[FeeCollectionService] Shutting down fee collection service')
    this.retryQueue.clear()
    this.processingLock.clear()
  }
}

export default FeeCollectionService