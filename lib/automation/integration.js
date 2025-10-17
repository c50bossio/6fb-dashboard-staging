'use client'

import logger from '@/lib/logger'
import { AutomationUtils } from './index'

/**
 * Integration layer between the 6FB booking system and automation services
 * 
 * This module provides hooks and integration points to connect existing
 * booking system events to the automation engine.
 */

let orchestratorInitialized = false

/**
 * Initialize automation system integration
 */
export async function initializeAutomationIntegration() {
  if (orchestratorInitialized) {
    logger.debug('[AutomationIntegration] Already initialized')
    return
  }

  try {
    logger.info('[AutomationIntegration] Initializing automation integration')
    
    // Initialize the automation orchestrator
    await AutomationUtils.initialize()
    
    orchestratorInitialized = true
    logger.info('[AutomationIntegration] Automation integration initialized successfully')
    
  } catch (error) {
    logger.error('[AutomationIntegration] Failed to initialize:', error)
    throw error
  }
}

/**
 * Hook: Called when an appointment is marked as no-show
 * Integrates with existing appointment status update logic
 */
export async function onAppointmentNoShow(appointmentData) {
  try {
    if (!orchestratorInitialized) {
      await initializeAutomationIntegration()
    }

    logger.info(`[AutomationIntegration] Processing no-show for appointment ${appointmentData.id}`)

    // Trigger automation event
    await AutomationUtils.triggerEvent('appointment:no_show', {
      appointmentId: appointmentData.id,
      barbershopId: appointmentData.barbershop_id,
      clientId: appointmentData.client_id,
      reason: 'Client did not arrive',
      noShowTime: new Date().toISOString(),
      servicePrice: appointmentData.price,
      serviceName: appointmentData.service_name
    })

    logger.info(`[AutomationIntegration] No-show automation triggered for appointment ${appointmentData.id}`)

  } catch (error) {
    logger.error('[AutomationIntegration] Error processing no-show event:', error)
    // Don't throw - we don't want automation failures to break the main booking flow
  }
}

/**
 * Hook: Called when a new appointment is created
 * Integrates with existing appointment creation logic
 */
export async function onAppointmentCreated(appointmentData) {
  try {
    if (!orchestratorInitialized) {
      await initializeAutomationIntegration()
    }

    logger.info(`[AutomationIntegration] Processing new appointment creation ${appointmentData.id}`)

    // Trigger automation event
    await AutomationUtils.triggerEvent('appointment:created', {
      appointmentId: appointmentData.id,
      barbershopId: appointmentData.barbershop_id,
      clientId: appointmentData.client_id,
      serviceId: appointmentData.service_id,
      barberId: appointmentData.barber_id,
      appointmentTime: `${appointmentData.appointment_date}T${appointmentData.start_time}`,
      servicePrice: appointmentData.price,
      serviceName: appointmentData.service_name
    })

    logger.info(`[AutomationIntegration] Appointment creation automation triggered for ${appointmentData.id}`)

  } catch (error) {
    logger.error('[AutomationIntegration] Error processing appointment creation:', error)
  }
}

/**
 * Hook: Called when an appointment is cancelled
 * Integrates with existing appointment cancellation logic
 */
export async function onAppointmentCancelled(appointmentData, cancelReason = null, cancelledBy = 'client') {
  try {
    if (!orchestratorInitialized) {
      await initializeAutomationIntegration()
    }

    logger.info(`[AutomationIntegration] Processing appointment cancellation ${appointmentData.id}`)

    // Trigger automation event
    await AutomationUtils.triggerEvent('appointment:cancelled', {
      appointmentId: appointmentData.id,
      barbershopId: appointmentData.barbershop_id,
      clientId: appointmentData.client_id,
      reason: cancelReason,
      cancelledBy: cancelledBy,
      cancelledAt: new Date().toISOString()
    })

    logger.info(`[AutomationIntegration] Appointment cancellation automation triggered for ${appointmentData.id}`)

  } catch (error) {
    logger.error('[AutomationIntegration] Error processing appointment cancellation:', error)
  }
}

/**
 * Hook: Called when a payment fails
 * Integrates with payment processing systems
 */
export async function onPaymentFailed(paymentData) {
  try {
    if (!orchestratorInitialized) {
      await initializeAutomationIntegration()
    }

    logger.info(`[AutomationIntegration] Processing payment failure ${paymentData.id}`)

    // Trigger automation event
    await AutomationUtils.triggerEvent('payment:failed', {
      paymentId: paymentData.id,
      appointmentId: paymentData.appointment_id,
      barbershopId: paymentData.barbershop_id,
      clientId: paymentData.client_id,
      amount: paymentData.amount,
      reason: paymentData.failure_reason || paymentData.error_message,
      paymentIntentId: paymentData.stripe_payment_intent_id
    })

    logger.info(`[AutomationIntegration] Payment failure automation triggered for ${paymentData.id}`)

  } catch (error) {
    logger.error('[AutomationIntegration] Error processing payment failure:', error)
  }
}

/**
 * Hook: Called when a payment succeeds
 * Integrates with payment processing systems
 */
export async function onPaymentSucceeded(paymentData) {
  try {
    if (!orchestratorInitialized) {
      await initializeAutomationIntegration()
    }

    logger.info(`[AutomationIntegration] Processing payment success ${paymentData.id}`)

    // Trigger automation event
    await AutomationUtils.triggerEvent('payment:succeeded', {
      paymentId: paymentData.id,
      appointmentId: paymentData.appointment_id,
      barbershopId: paymentData.barbershop_id,
      clientId: paymentData.client_id,
      amount: paymentData.amount,
      method: paymentData.payment_method,
      paymentIntentId: paymentData.stripe_payment_intent_id
    })

    logger.info(`[AutomationIntegration] Payment success automation triggered for ${paymentData.id}`)

  } catch (error) {
    logger.error('[AutomationIntegration] Error processing payment success:', error)
  }
}

/**
 * Hook: Called when a client is blocked from booking
 * Integrates with client management systems
 */
export async function onClientBlocked(clientData, blockReason = null, blockedBy = 'system') {
  try {
    if (!orchestratorInitialized) {
      await initializeAutomationIntegration()
    }

    logger.info(`[AutomationIntegration] Processing client block for ${clientData.id}`)

    // Trigger automation event
    await AutomationUtils.triggerEvent('client:blocked', {
      clientId: clientData.id,
      barbershopId: clientData.barbershop_id,
      reason: blockReason || 'Exceeded no-show limit',
      blockedBy: blockedBy,
      blockDuration: null, // Could be specified based on policy
      noShowStrikes: clientData.no_show_strikes
    })

    logger.info(`[AutomationIntegration] Client block automation triggered for ${clientData.id}`)

  } catch (error) {
    logger.error('[AutomationIntegration] Error processing client block:', error)
  }
}

/**
 * Hook: Called when a client requests account recovery
 * Integrates with client support systems
 */
export async function onClientRecoveryRequested(clientData, recoveryType = 'unblock_request', message = null) {
  try {
    if (!orchestratorInitialized) {
      await initializeAutomationIntegration()
    }

    logger.info(`[AutomationIntegration] Processing recovery request for client ${clientData.id}`)

    // Trigger automation event
    await AutomationUtils.triggerEvent('client:recovery_requested', {
      clientId: clientData.id,
      barbershopId: clientData.barbershop_id,
      recoveryType: recoveryType,
      message: message,
      requestedAt: new Date().toISOString()
    })

    logger.info(`[AutomationIntegration] Client recovery automation triggered for ${clientData.id}`)

  } catch (error) {
    logger.error('[AutomationIntegration] Error processing recovery request:', error)
  }
}

/**
 * Utility function to manually trigger automation for testing
 * Use this for development and testing purposes
 */
export async function triggerTestAutomation(eventType, testData) {
  try {
    if (!orchestratorInitialized) {
      await initializeAutomationIntegration()
    }

    logger.info(`[AutomationIntegration] Triggering test automation: ${eventType}`)

    await AutomationUtils.triggerEvent(eventType, {
      ...testData,
      isTest: true,
      triggeredAt: new Date().toISOString()
    })

    return { success: true, message: `Test automation ${eventType} triggered successfully` }

  } catch (error) {
    logger.error('[AutomationIntegration] Error triggering test automation:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Get current automation status
 * Use this to check if automation is working properly
 */
export async function getAutomationIntegrationStatus() {
  try {
    return {
      initialized: orchestratorInitialized,
      timestamp: new Date().toISOString(),
      availableHooks: [
        'onAppointmentNoShow',
        'onAppointmentCreated', 
        'onAppointmentCancelled',
        'onPaymentFailed',
        'onPaymentSucceeded',
        'onClientBlocked',
        'onClientRecoveryRequested'
      ]
    }
  } catch (error) {
    logger.error('[AutomationIntegration] Error getting status:', error)
    return {
      initialized: false,
      error: error.message,
      timestamp: new Date().toISOString()
    }
  }
}

/**
 * Cleanup function for graceful shutdown
 */
export async function shutdownAutomationIntegration() {
  try {
    if (orchestratorInitialized) {
      logger.info('[AutomationIntegration] Shutting down automation integration')
      
      await AutomationUtils.shutdown()
      orchestratorInitialized = false
      
      logger.info('[AutomationIntegration] Automation integration shut down successfully')
    }
  } catch (error) {
    logger.error('[AutomationIntegration] Error during shutdown:', error)
  }
}

// Export all hooks and utilities
export default {
  initializeAutomationIntegration,
  onAppointmentNoShow,
  onAppointmentCreated,
  onAppointmentCancelled,
  onPaymentFailed,
  onPaymentSucceeded,
  onClientBlocked,
  onClientRecoveryRequested,
  triggerTestAutomation,
  getAutomationIntegrationStatus,
  shutdownAutomationIntegration
}