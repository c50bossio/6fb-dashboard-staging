'use client'

import { createClient } from '@/lib/supabase/server'
import logger from '@/lib/logger'

/**
 * Recovery Flow Manager Service
 * 
 * Manages automated client recovery workflows including:
 * - State machine for recovery sequences
 * - Multi-channel communication orchestration
 * - Manager escalation logic
 * - Success tracking and analytics
 */
export class RecoveryManagerService {
  constructor(orchestrator) {
    this.orchestrator = orchestrator
    this.activeRecoveries = new Map()
    this.recoveryTemplates = new Map()
    this.stateMachine = {
      // Recovery states and their possible transitions
      states: {
        'initiated': ['communication_sent', 'failed'],
        'communication_sent': ['response_received', 'follow_up_needed', 'escalated', 'timeout'],
        'response_received': ['in_negotiation', 'resolved', 'declined'],
        'follow_up_needed': ['communication_sent', 'escalated'],
        'in_negotiation': ['resolved', 'declined', 'escalated'],
        'escalated': ['manager_contacted', 'resolved', 'declined'],
        'manager_contacted': ['resolved', 'declined', 'closed'],
        'resolved': ['closed'],
        'declined': ['closed'],
        'timeout': ['escalated', 'closed'],
        'failed': ['retry', 'escalated', 'closed'],
        'retry': ['communication_sent', 'failed'],
        'closed': [] // Terminal state
      }
    }
    this.recoveryStrategies = {
      'no_show': this.createNoShowRecoveryFlow.bind(this),
      'client_blocked': this.createBlockedClientRecoveryFlow.bind(this),
      'payment_failed': this.createPaymentFailureRecoveryFlow.bind(this),
      'repeated_cancellations': this.createCancellationRecoveryFlow.bind(this)
    }
  }

  async initialize() {
    logger.info('[RecoveryManagerService] Initializing recovery flow manager')
    
    // Load recovery templates
    await this.loadRecoveryTemplates()
    
    // Load active recoveries from database
    await this.loadActiveRecoveries()
    
    logger.info('[RecoveryManagerService] Recovery flow manager initialized')
  }

  /**
   * Start a recovery flow for a client
   */
  async startRecoveryFlow(data) {
    const { barbershopId, clientId, trigger, settings, appointmentId, reason } = data
    
    try {
      logger.info(`[RecoveryManagerService] Starting recovery flow for client ${clientId}, trigger: ${trigger}`)

      // Check if recovery already exists
      const existingRecovery = await this.findActiveRecovery(clientId, trigger)
      if (existingRecovery) {
        logger.info(`[RecoveryManagerService] Active recovery already exists for client ${clientId}`)
        return existingRecovery
      }

      // Get client details
      const clientData = await this.getClientDetails(clientId)
      if (!clientData) {
        throw new Error('Client not found')
      }

      // Create recovery flow based on trigger type
      const recoveryFlow = await this.createRecoveryFlow(trigger, {
        clientData,
        barbershopId,
        appointmentId,
        reason,
        settings
      })

      // Initialize recovery record
      const recovery = await this.initializeRecovery({
        barbershopId,
        clientId,
        trigger,
        reason,
        flow: recoveryFlow,
        settings
      })

      // Store in active recoveries
      this.activeRecoveries.set(recovery.id, recovery)

      // Start the first step
      await this.executeRecoveryStep(recovery)

      logger.info(`[RecoveryManagerService] Recovery flow ${recovery.id} started for client ${clientId}`)
      return recovery

    } catch (error) {
      logger.error(`[RecoveryManagerService] Error starting recovery flow:`, error)
      throw error
    }
  }

  /**
   * Create recovery flow based on trigger type
   */
  async createRecoveryFlow(trigger, context) {
    const strategy = this.recoveryStrategies[trigger]
    if (!strategy) {
      throw new Error(`Unknown recovery trigger: ${trigger}`)
    }

    return await strategy(context)
  }

  /**
   * Create no-show recovery flow
   */
  async createNoShowRecoveryFlow(context) {
    const { clientData, settings } = context
    const clientSegment = this.determineClientSegment(clientData)
    
    const baseFlow = [
      {
        id: 'initial_contact',
        type: 'communication',
        method: 'email',
        template: 'no_show_initial_contact',
        delay: 0,
        timeout: 24 * 60 * 60 * 1000, // 24 hours
        personalizeForSegment: true
      },
      {
        id: 'follow_up',
        type: 'communication', 
        method: 'sms',
        template: 'no_show_follow_up',
        delay: 24 * 60 * 60 * 1000, // 24 hours after initial
        timeout: 48 * 60 * 60 * 1000,
        condition: 'no_response'
      }
    ]

    // Add segment-specific steps
    if (clientSegment === 'loyal' || clientSegment === 'vip') {
      // Loyal/VIP clients get personal manager outreach
      baseFlow.push({
        id: 'manager_outreach',
        type: 'manager_contact',
        method: 'phone',
        template: 'vip_recovery_call',
        delay: 48 * 60 * 60 * 1000,
        condition: 'no_response',
        priority: 'high'
      })
    } else if (clientSegment === 'regular') {
      // Regular clients get a recovery offer
      baseFlow.push({
        id: 'recovery_offer',
        type: 'communication',
        method: 'email',
        template: 'recovery_discount_offer',
        delay: 48 * 60 * 60 * 1000,
        condition: 'no_response',
        includeIncentive: true
      })
    }

    // Final escalation step for all segments
    baseFlow.push({
      id: 'final_escalation',
      type: 'escalation',
      escalationTo: 'manager',
      delay: 72 * 60 * 60 * 1000,
      condition: 'no_response',
      requiresManualAction: true
    })

    return {
      flowType: 'no_show_recovery',
      clientSegment,
      steps: baseFlow,
      maxDuration: 7 * 24 * 60 * 60 * 1000, // 7 days max
      successCriteria: ['response_received', 'appointment_rescheduled', 'payment_made'],
      failureCriteria: ['client_declined', 'unresponsive', 'invalid_contact']
    }
  }

  /**
   * Create blocked client recovery flow
   */
  async createBlockedClientRecoveryFlow(context) {
    const { clientData, reason } = context
    
    // Determine recovery path based on block reason
    const blockingInfo = await this.getBlockingInfo(clientData.id)
    const recoveryOptions = this.getRecoveryOptions(blockingInfo)

    const flow = [
      {
        id: 'block_notification',
        type: 'communication',
        method: 'email',
        template: 'client_blocked_notification',
        delay: 0,
        includeRecoveryOptions: true,
        recoveryOptions: recoveryOptions
      },
      {
        id: 'recovery_options_follow_up',
        type: 'communication',
        method: 'sms',
        template: 'recovery_options_reminder',
        delay: 3 * 24 * 60 * 60 * 1000, // 3 days
        condition: 'no_response'
      },
      {
        id: 'manager_review',
        type: 'manager_review',
        delay: 7 * 24 * 60 * 60 * 1000, // 7 days
        condition: 'no_recovery_attempt',
        requiresApproval: true
      }
    ]

    return {
      flowType: 'blocked_client_recovery',
      blockReason: reason,
      recoveryOptions: recoveryOptions,
      steps: flow,
      maxDuration: 30 * 24 * 60 * 60 * 1000, // 30 days max
      successCriteria: ['fees_paid', 'deposit_provided', 'manager_approved'],
      failureCriteria: ['recovery_declined', 'timeout', 'manager_denied']
    }
  }

  /**
   * Create payment failure recovery flow
   */
  async createPaymentFailureRecoveryFlow(context) {
    const { clientData, reason, appointmentId } = context
    
    const flow = [
      {
        id: 'payment_failure_notification',
        type: 'communication',
        method: 'email',
        template: 'payment_failed_notification',
        delay: 2 * 60 * 60 * 1000, // 2 hours delay to allow for temporary issues
        includeRetryLink: true,
        paymentInfo: true
      },
      {
        id: 'payment_retry_reminder',
        type: 'communication',
        method: 'sms',
        template: 'payment_retry_sms',
        delay: 24 * 60 * 60 * 1000, // 24 hours
        condition: 'payment_still_failed',
        urgent: true
      },
      {
        id: 'alternative_payment_offer',
        type: 'communication',
        method: 'email',
        template: 'alternative_payment_methods',
        delay: 48 * 60 * 60 * 1000, // 48 hours
        condition: 'payment_still_failed',
        includeAlternatives: true
      }
    ]

    return {
      flowType: 'payment_failure_recovery',
      failureReason: reason,
      appointmentId: appointmentId,
      steps: flow,
      maxDuration: 7 * 24 * 60 * 60 * 1000, // 7 days max
      successCriteria: ['payment_successful', 'alternative_payment_arranged'],
      failureCriteria: ['payment_permanently_failed', 'client_unresponsive']
    }
  }

  /**
   * Create cancellation pattern recovery flow
   */
  async createCancellationRecoveryFlow(context) {
    const { clientData } = context
    
    const flow = [
      {
        id: 'pattern_recognition_outreach',
        type: 'communication',
        method: 'email',
        template: 'cancellation_pattern_concern',
        delay: 0,
        empathetic: true,
        offerSolutions: true
      },
      {
        id: 'scheduling_assistance_offer',
        type: 'communication',
        method: 'phone',
        template: 'scheduling_assistance_call',
        delay: 24 * 60 * 60 * 1000,
        condition: 'response_received',
        personalTouch: true
      },
      {
        id: 'flexible_booking_offer',
        type: 'communication',
        method: 'email',
        template: 'flexible_booking_options',
        delay: 48 * 60 * 60 * 1000,
        condition: 'no_improvement',
        includeSpecialAccommodations: true
      }
    ]

    return {
      flowType: 'cancellation_pattern_recovery',
      steps: flow,
      maxDuration: 14 * 24 * 60 * 60 * 1000, // 14 days max
      successCriteria: ['improved_attendance', 'stable_booking_pattern'],
      failureCriteria: ['continued_cancellations', 'client_disengaged']
    }
  }

  /**
   * Execute a recovery step
   */
  async executeRecoveryStep(recovery) {
    const currentStep = this.getCurrentStep(recovery)
    if (!currentStep) {
      await this.completeRecovery(recovery, 'no_more_steps')
      return
    }

    try {
      logger.info(`[RecoveryManagerService] Executing step ${currentStep.id} for recovery ${recovery.id}`)

      // Check if conditions are met for this step
      if (!await this.checkStepConditions(recovery, currentStep)) {
        await this.moveToNextStep(recovery)
        return
      }

      // Execute the step based on its type
      switch (currentStep.type) {
        case 'communication':
          await this.executeCommunicationStep(recovery, currentStep)
          break
        case 'manager_contact':
          await this.executeManagerContactStep(recovery, currentStep)
          break
        case 'manager_review':
          await this.executeManagerReviewStep(recovery, currentStep)
          break
        case 'escalation':
          await this.executeEscalationStep(recovery, currentStep)
          break
        default:
          throw new Error(`Unknown step type: ${currentStep.type}`)
      }

      // Update recovery state
      await this.updateRecoveryState(recovery, 'step_executed')
      
      // Schedule timeout if applicable
      if (currentStep.timeout) {
        this.scheduleStepTimeout(recovery, currentStep)
      }

    } catch (error) {
      logger.error(`[RecoveryManagerService] Error executing recovery step:`, error)
      await this.handleStepFailure(recovery, currentStep, error)
    }
  }

  /**
   * Execute communication step (email, SMS, etc.)
   */
  async executeCommunicationStep(recovery, step) {
    const client = await this.getClientDetails(recovery.clientId)
    const message = await this.generateStepMessage(recovery, step, client)

    // Send communication via appropriate channel
    const deliveryResult = await this.sendCommunication(step.method, client, message, recovery)

    if (deliveryResult.success) {
      // Update step status
      recovery.currentStep.status = 'sent'
      recovery.currentStep.sentAt = new Date()
      recovery.currentStep.deliveryId = deliveryResult.deliveryId

      // Set up response tracking
      await this.setupResponseTracking(recovery, step, deliveryResult)

    } else {
      throw new Error(`Communication failed: ${deliveryResult.error}`)
    }
  }

  /**
   * Execute manager contact step
   */
  async executeManagerContactStep(recovery, step) {
    const managers = await this.getBarbershopManagers(recovery.barbershopId)
    if (!managers?.length) {
      throw new Error('No managers available for contact')
    }

    // Create manager task
    const task = await this.createManagerTask({
      recoveryId: recovery.id,
      clientId: recovery.clientId,
      barbershopId: recovery.barbershopId,
      taskType: 'client_recovery_contact',
      priority: step.priority || 'medium',
      method: step.method,
      template: step.template,
      dueBy: new Date(Date.now() + (step.timeout || 24 * 60 * 60 * 1000))
    })

    recovery.currentStep.status = 'assigned_to_manager'
    recovery.currentStep.assignedAt = new Date()
    recovery.currentStep.managerTaskId = task.id

    // Notify managers
    await this.notifyManagers(managers, task, recovery)
  }

  /**
   * Execute manager review step
   */
  async executeManagerReviewStep(recovery, step) {
    const reviewData = await this.compileRecoveryReview(recovery)
    
    const reviewTask = await this.createManagerReview({
      recoveryId: recovery.id,
      clientId: recovery.clientId,
      barbershopId: recovery.barbershopId,
      reviewData: reviewData,
      recommendations: this.generateRecoveryRecommendations(recovery),
      requiresApproval: step.requiresApproval,
      dueBy: new Date(Date.now() + (step.timeout || 48 * 60 * 60 * 1000))
    })

    recovery.currentStep.status = 'pending_manager_review'
    recovery.currentStep.reviewTaskId = reviewTask.id
  }

  /**
   * Execute escalation step
   */
  async executeEscalationStep(recovery, step) {
    const escalationData = {
      recoveryId: recovery.id,
      clientId: recovery.clientId,
      barbershopId: recovery.barbershopId,
      escalationReason: recovery.trigger,
      escalationTo: step.escalationTo,
      previousSteps: recovery.flow.steps.slice(0, recovery.currentStepIndex),
      urgency: this.determineEscalationUrgency(recovery)
    }

    // Create escalation record
    await this.createEscalation(escalationData)

    // Notify appropriate parties
    await this.notifyEscalation(escalationData)

    recovery.currentStep.status = 'escalated'
    recovery.currentStep.escalatedAt = new Date()
  }

  /**
   * Monitor active recoveries for timeouts and progress
   */
  async monitorActiveRecoveries() {
    const now = new Date()
    const recoveriesToCheck = []

    // Find recoveries that need monitoring
    for (const [recoveryId, recovery] of this.activeRecoveries) {
      if (this.shouldMonitorRecovery(recovery, now)) {
        recoveriesToCheck.push(recovery)
      }
    }

    if (recoveriesToCheck.length === 0) {
      return
    }

    logger.info(`[RecoveryManagerService] Monitoring ${recoveriesToCheck.length} active recoveries`)

    for (const recovery of recoveriesToCheck) {
      try {
        await this.checkRecoveryProgress(recovery, now)
      } catch (error) {
        logger.error(`[RecoveryManagerService] Error monitoring recovery ${recovery.id}:`, error)
      }
    }
  }

  /**
   * Check recovery progress and handle timeouts
   */
  async checkRecoveryProgress(recovery, now) {
    const currentStep = this.getCurrentStep(recovery)
    
    // Check for step timeout
    if (this.isStepTimedOut(currentStep, now)) {
      await this.handleStepTimeout(recovery, currentStep)
      return
    }

    // Check for overall recovery timeout
    if (this.isRecoveryTimedOut(recovery, now)) {
      await this.handleRecoveryTimeout(recovery)
      return
    }

    // Check for responses or other updates
    await this.checkForRecoveryUpdates(recovery)
  }

  /**
   * Handle step timeout
   */
  async handleStepTimeout(recovery, step) {
    logger.info(`[RecoveryManagerService] Step timeout for recovery ${recovery.id}, step ${step.id}`)

    // Update step status
    step.status = 'timed_out'
    step.timedOutAt = new Date()

    // Determine next action based on step configuration
    if (step.onTimeout === 'retry' && (step.retryCount || 0) < 2) {
      // Retry the step
      step.retryCount = (step.retryCount || 0) + 1
      step.status = 'pending'
      await this.executeRecoveryStep(recovery)
    } else if (step.onTimeout === 'escalate') {
      // Escalate to manager
      await this.escalateRecovery(recovery, 'step_timeout')
    } else {
      // Move to next step
      await this.moveToNextStep(recovery)
    }

    await this.saveRecoveryState(recovery)
  }

  /**
   * Handle response to recovery communication
   */
  async handleRecoveryResponse(recoveryId, responseData) {
    const recovery = this.activeRecoveries.get(recoveryId)
    if (!recovery) {
      logger.warn(`[RecoveryManagerService] Recovery ${recoveryId} not found for response`)
      return
    }

    try {
      logger.info(`[RecoveryManagerService] Processing response for recovery ${recoveryId}`)

      // Update recovery with response
      recovery.responses = recovery.responses || []
      recovery.responses.push({
        ...responseData,
        receivedAt: new Date()
      })

      // Analyze response
      const responseAnalysis = await this.analyzeResponse(responseData, recovery)
      
      // Update recovery state based on response
      if (responseAnalysis.isPositive) {
        await this.handlePositiveResponse(recovery, responseAnalysis)
      } else if (responseAnalysis.isNegative) {
        await this.handleNegativeResponse(recovery, responseAnalysis)
      } else {
        await this.handleNeutralResponse(recovery, responseAnalysis)
      }

      await this.saveRecoveryState(recovery)

    } catch (error) {
      logger.error(`[RecoveryManagerService] Error handling recovery response:`, error)
    }
  }

  /**
   * Complete recovery with outcome
   */
  async completeRecovery(recovery, outcome, details = {}) {
    try {
      logger.info(`[RecoveryManagerService] Completing recovery ${recovery.id} with outcome: ${outcome}`)

      // Update recovery status
      recovery.status = 'completed'
      recovery.outcome = outcome
      recovery.completedAt = new Date()
      recovery.details = details

      // Calculate recovery metrics
      const metrics = this.calculateRecoveryMetrics(recovery)
      recovery.metrics = metrics

      // Save final state
      await this.saveRecoveryState(recovery)

      // Remove from active recoveries
      this.activeRecoveries.delete(recovery.id)

      // Update analytics
      await this.updateRecoveryAnalytics(recovery)

      // Notify stakeholders if needed
      if (recovery.settings.successTracking) {
        await this.notifyRecoveryCompletion(recovery)
      }

    } catch (error) {
      logger.error(`[RecoveryManagerService] Error completing recovery:`, error)
    }
  }

  /**
   * Utility methods
   */

  determineClientSegment(clientData) {
    // Simplified client segmentation logic
    const bookingCount = clientData.total_bookings || 0
    const noShowStrikes = clientData.no_show_strikes || 0
    const accountAge = clientData.created_at ? 
      Math.floor((new Date() - new Date(clientData.created_at)) / (1000 * 60 * 60 * 24 * 30)) : 0

    if (bookingCount >= 30 && accountAge >= 12 && noShowStrikes <= 1) {
      return 'loyal'
    } else if (bookingCount >= 20 && accountAge >= 6 && noShowStrikes <= 2) {
      return 'vip'
    } else if (bookingCount >= 4 && accountAge >= 3) {
      return 'regular'
    } else {
      return 'new'
    }
  }

  getCurrentStep(recovery) {
    const stepIndex = recovery.currentStepIndex || 0
    return recovery.flow.steps[stepIndex]
  }

  async checkStepConditions(recovery, step) {
    if (!step.condition) return true

    switch (step.condition) {
      case 'no_response':
        return !this.hasRecentResponse(recovery)
      case 'payment_still_failed':
        return await this.isPaymentStillFailed(recovery)
      case 'response_received':
        return this.hasRecentResponse(recovery)
      case 'no_recovery_attempt':
        return !this.hasRecoveryAttempts(recovery)
      default:
        return true
    }
  }

  hasRecentResponse(recovery) {
    if (!recovery.responses?.length) return false
    
    const latestResponse = recovery.responses[recovery.responses.length - 1]
    const timeSinceResponse = Date.now() - new Date(latestResponse.receivedAt).getTime()
    
    return timeSinceResponse < 24 * 60 * 60 * 1000 // Within last 24 hours
  }

  async generateStepMessage(recovery, step, client) {
    const template = await this.getRecoveryTemplate(step.template)
    if (!template) {
      throw new Error(`Template not found: ${step.template}`)
    }

    // Personalize message
    let message = template.content
      .replace('{client_name}', client.first_name || 'valued client')
      .replace('{client_email}', client.email || '')
      .replace('{barbershop_name}', recovery.barbershopName || 'our barbershop')

    // Add segment-specific personalization
    if (step.personalizeForSegment) {
      const segment = this.determineClientSegment(client)
      message = this.personalizeForSegment(message, segment, recovery)
    }

    return {
      subject: template.subject,
      content: message,
      template: step.template,
      metadata: {
        recoveryId: recovery.id,
        stepId: step.id,
        clientId: client.id
      }
    }
  }

  personalizeForSegment(message, segment, recovery) {
    const segmentPersonalization = {
      loyal: "As one of our most valued long-term clients, ",
      vip: "As a VIP client, ",
      regular: "As a valued regular client, ",
      new: "We want to make sure your experience with us is positive, "
    }

    const prefix = segmentPersonalization[segment] || ""
    return prefix + message
  }

  async sendCommunication(method, client, message, recovery) {
    try {
      // This would integrate with actual communication services
      switch (method) {
        case 'email':
          return await this.sendEmail(client.email, message)
        case 'sms':
          return await this.sendSMS(client.phone, message)
        case 'phone':
          return await this.makeCall(client.phone, message)
        default:
          throw new Error(`Unknown communication method: ${method}`)
      }
    } catch (error) {
      logger.error(`[RecoveryManagerService] Communication failed:`, error)
      return { success: false, error: error.message }
    }
  }

  async sendEmail(email, message) {
    // Mock email sending - integrate with actual service
    logger.info(`[RecoveryManagerService] Sending email to ${email}`)
    return {
      success: true,
      deliveryId: `email_${Date.now()}`,
      method: 'email'
    }
  }

  async sendSMS(phone, message) {
    // Mock SMS sending - integrate with actual service  
    logger.info(`[RecoveryManagerService] Sending SMS to ${phone}`)
    return {
      success: true,
      deliveryId: `sms_${Date.now()}`,
      method: 'sms'
    }
  }

  async makeCall(phone, message) {
    // Mock phone call - integrate with actual service
    logger.info(`[RecoveryManagerService] Making call to ${phone}`)
    return {
      success: true,
      deliveryId: `call_${Date.now()}`,
      method: 'phone'
    }
  }

  async getClientDetails(clientId) {
    try {
      const supabase = await createClient()
      
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .eq('id', clientId)
        .single()

      return error ? null : data

    } catch (error) {
      logger.error('[RecoveryManagerService] Error fetching client details:', error)
      return null
    }
  }

  async initializeRecovery(data) {
    const recoveryId = `recovery_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    
    const recovery = {
      id: recoveryId,
      barbershopId: data.barbershopId,
      clientId: data.clientId,
      trigger: data.trigger,
      reason: data.reason,
      status: 'initiated',
      flow: data.flow,
      settings: data.settings,
      currentStepIndex: 0,
      startedAt: new Date(),
      responses: [],
      metrics: {}
    }

    // Save to database
    await this.saveRecoveryState(recovery)
    
    return recovery
  }

  async saveRecoveryState(recovery) {
    try {
      const supabase = await createClient()
      
      await supabase
        .from('client_recovery_flows')
        .upsert({
          id: recovery.id,
          barbershop_id: recovery.barbershopId,
          client_id: recovery.clientId,
          trigger: recovery.trigger,
          reason: recovery.reason,
          status: recovery.status,
          flow_definition: recovery.flow,
          current_step_index: recovery.currentStepIndex,
          responses: recovery.responses,
          metrics: recovery.metrics,
          started_at: recovery.startedAt?.toISOString(),
          completed_at: recovery.completedAt?.toISOString(),
          outcome: recovery.outcome,
          updated_at: new Date().toISOString()
        })

    } catch (error) {
      logger.error('[RecoveryManagerService] Error saving recovery state:', error)
    }
  }

  async loadRecoveryTemplates() {
    try {
      const supabase = await createClient()
      const { data: templates } = await supabase
        .from('recovery_templates')
        .select('*')

      if (templates?.length) {
        templates.forEach(template => {
          this.recoveryTemplates.set(template.name, template)
        })
        
        logger.info(`[RecoveryManagerService] Loaded ${templates.length} recovery templates`)
      }
    } catch (error) {
      logger.error('[RecoveryManagerService] Error loading recovery templates:', error)
    }
  }

  async loadActiveRecoveries() {
    try {
      const supabase = await createClient()
      const { data: recoveries } = await supabase
        .from('client_recovery_flows')
        .select('*')
        .in('status', ['initiated', 'in_progress'])

      if (recoveries?.length) {
        recoveries.forEach(recovery => {
          this.activeRecoveries.set(recovery.id, {
            ...recovery,
            startedAt: new Date(recovery.started_at),
            completedAt: recovery.completed_at ? new Date(recovery.completed_at) : null
          })
        })
        
        logger.info(`[RecoveryManagerService] Loaded ${recoveries.length} active recoveries`)
      }
    } catch (error) {
      logger.error('[RecoveryManagerService] Error loading active recoveries:', error)
    }
  }

  async getRecoveryTemplate(templateName) {
    return this.recoveryTemplates.get(templateName) || {
      subject: 'Recovery Communication',
      content: 'We wanted to reach out regarding your recent experience with us.'
    }
  }

  shouldMonitorRecovery(recovery, now) {
    // Monitor active recoveries that haven't been updated recently
    const lastUpdate = recovery.updatedAt || recovery.startedAt
    const timeSinceUpdate = now - lastUpdate
    
    return timeSinceUpdate > 30 * 60 * 1000 // 30 minutes
  }

  isStepTimedOut(step, now) {
    if (!step.timeout || !step.sentAt) return false
    
    const timeElapsed = now - step.sentAt
    return timeElapsed > step.timeout
  }

  async shutdown() {
    logger.info('[RecoveryManagerService] Shutting down recovery manager')
    this.activeRecoveries.clear()
    this.recoveryTemplates.clear()
  }
}

export default RecoveryManagerService