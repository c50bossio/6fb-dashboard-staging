'use client'

import logger from '@/lib/logger'
import { createClient } from '@/lib/supabase/server'
import { FeeCollectionService } from './fee-collector'
import { PredictionService } from './prediction-service'
import { RecoveryManagerService } from './recovery-manager'
import { ReminderEngineService } from './reminder-engine'

/**
 * Main Automation Orchestrator
 * Coordinates all automation features based on database settings
 * 
 * This is the central hub that:
 * - Loads current automation settings from database
 * - Triggers appropriate automation services when events occur
 * - Manages dependencies between automation features
 * - Provides scheduling and background processing
 */
export class AutomationOrchestrator {
  constructor() {
    this.isInitialized = false
    this.services = {}
    this.settings = {}
    this.eventListeners = new Map()
    this.scheduledTasks = new Map()
    this.processingQueue = []
  }

  /**
   * Initialize the orchestrator and all automation services
   */
  async initialize() {
    try {
      await this.loadSettings()
      await this.initializeServices()
      this.setupEventListeners()
      this.startScheduledTasks()
      
      this.isInitialized = true
      logger.info('[AutomationOrchestrator] Successfully initialized all automation services')
      
    } catch (error) {
      logger.error('[AutomationOrchestrator] Failed to initialize:', error)
      throw error
    }
  }

  /**
   * Load automation settings from database
   */
  async loadSettings() {
    try {
      const supabase = await createClient()
      
      // Load all automation settings for all users (for background processing)
      const { data: allSettings, error } = await supabase
        .from('business_settings')
        .select(`
          user_id,
          booking_rules,
          profiles!business_settings_user_id_fkey (
            barberbarbershop_id,
            role,
            first_name,
            last_name
          )
        `)
        .not('booking_rules', 'is', null)

      if (error && error.code !== 'PGRST116') {
        throw error
      }

      // Process and store settings by barbershop
      this.settings = {}
      
      if (allSettings) {
        allSettings.forEach(setting => {
          const automation = setting.booking_rules?.automation
          if (automation && setting.profiles?.barbershop_id) {
            const barberbarbershopId = setting.profiles.barbershop_id
            
            this.settings[barberbarbershopId] = {
              ...automation,
              userId: setting.user_id,
              userProfile: setting.profiles
            }
          }
        })
      }

      logger.info(`[AutomationOrchestrator] Loaded settings for ${Object.keys(this.settings).length} barbershops`)
      
    } catch (error) {
      logger.error('[AutomationOrchestrator] Error loading settings:', error)
      // Don't throw - allow initialization to continue with empty settings
      this.settings = {}
    }
  }

  /**
   * Initialize all automation services
   */
  async initializeServices() {
    try {
      this.services = {
        feeCollector: new FeeCollectionService(this),
        reminderEngine: new ReminderEngineService(this),
        predictionService: new PredictionService(this),
        recoveryManager: new RecoveryManagerService(this)
      }

      // Initialize each service
      await Promise.all([
        this.services.feeCollector.initialize(),
        this.services.reminderEngine.initialize(),
        this.services.predictionService.initialize(),
        this.services.recoveryManager.initialize()
      ])

      logger.info('[AutomationOrchestrator] All automation services initialized')
      
    } catch (error) {
      logger.error('[AutomationOrchestrator] Error initializing services:', error)
      throw error
    }
  }

  /**
   * Set up event listeners for real-time automation triggers
   */
  setupEventListeners() {
    // Listen for appointment events
    this.on('appointment:no_show', this.handleNoShowEvent.bind(this))
    this.on('appointment:created', this.handleAppointmentCreated.bind(this))
    this.on('appointment:cancelled', this.handleAppointmentCancelled.bind(this))
    
    // Listen for payment events
    this.on('payment:failed', this.handlePaymentFailed.bind(this))
    this.on('payment:succeeded', this.handlePaymentSucceeded.bind(this))
    
    // Listen for client events
    this.on('client:blocked', this.handleClientBlocked.bind(this))
    this.on('client:recovery_requested', this.handleRecoveryRequested.bind(this))
    
    logger.info('[AutomationOrchestrator] Event listeners configured')
  }

  /**
   * Start scheduled background tasks
   */
  startScheduledTasks() {
    // Reminder engine - check every 15 minutes
    this.scheduleTask('reminder_check', () => {
      this.services.reminderEngine.processScheduledReminders()
    }, 15 * 60 * 1000)

    // Fee collection retry - check every hour
    this.scheduleTask('fee_retry', () => {
      this.services.feeCollector.processRetries()
    }, 60 * 60 * 1000)

    // Prediction model updates - check every 6 hours
    this.scheduleTask('prediction_update', () => {
      this.services.predictionService.updateModels()
    }, 6 * 60 * 60 * 1000)

    // Recovery flow monitoring - check every 30 minutes
    this.scheduleTask('recovery_monitoring', () => {
      this.services.recoveryManager.monitorActiveRecoveries()
    }, 30 * 60 * 1000)

    // Settings refresh - check every 5 minutes
    this.scheduleTask('settings_refresh', () => {
      this.loadSettings()
    }, 5 * 60 * 1000)

    logger.info('[AutomationOrchestrator] Scheduled tasks started')
  }

  /**
   * Schedule a recurring task
   */
  scheduleTask(taskId, taskFunction, intervalMs) {
    if (this.scheduledTasks.has(taskId)) {
      clearInterval(this.scheduledTasks.get(taskId))
    }

    const intervalId = setInterval(async () => {
      try {
        await taskFunction()
      } catch (error) {
        logger.error(`[AutomationOrchestrator] Scheduled task ${taskId} failed:`, error)
      }
    }, intervalMs)

    this.scheduledTasks.set(taskId, intervalId)
  }

  /**
   * Stop all scheduled tasks
   */
  stopScheduledTasks() {
    this.scheduledTasks.forEach((intervalId, taskId) => {
      clearInterval(intervalId)
      logger.debug(`[AutomationOrchestrator] Stopped scheduled task: ${taskId}`)
    })
    this.scheduledTasks.clear()
  }

  /**
   * Event handling methods
   */

  async handleNoShowEvent(data) {
    const { appointmentId, barberbarbershopId, clientId } = data
    const settings = this.settings[barberbarbershopId]
    
    if (!settings) return

    try {
      // Trigger appropriate automations based on settings
      const promises = []

      // 1. Automatic fee collection
      if (settings.automaticFeeCollection?.enabled) {
        promises.push(
          this.services.feeCollector.processNoShowFee({
            appointmentId,
            barberbarbershopId,
            clientId,
            settings: settings.automaticFeeCollection
          })
        )
      }

      // 2. Manager notifications
      if (settings.managerNotifications?.enabled && 
          settings.managerNotifications.triggers?.repeatedNoShows) {
        promises.push(
          this.notifyManager({
            type: 'no_show',
            appointmentId,
            barberbarbershopId,
            clientId,
            settings: settings.managerNotifications
          })
        )
      }

      // 3. Recovery flow automation
      if (settings.recoveryFlowAutomation?.enabled) {
        promises.push(
          this.services.recoveryManager.startRecoveryFlow({
            appointmentId,
            barberbarbershopId,
            clientId,
            trigger: 'no_show',
            settings: settings.recoveryFlowAutomation
          })
        )
      }

      await Promise.allSettled(promises)
      
      logger.info(`[AutomationOrchestrator] Processed no-show automation for appointment ${appointmentId}`)
      
    } catch (error) {
      logger.error(`[AutomationOrchestrator] Error handling no-show event:`, error)
    }
  }

  async handleAppointmentCreated(data) {
    const { appointmentId, barberbarbershopId, clientId } = data
    const settings = this.settings[barberbarbershopId]
    
    if (!settings) return

    try {
      const promises = []

      // 1. Predictive no-show detection
      if (settings.predictiveDetection?.enabled) {
        promises.push(
          this.services.predictionService.assessAppointmentRisk({
            appointmentId,
            barberbarbershopId,
            clientId,
            settings: settings.predictiveDetection
          })
        )
      }

      // 2. Smart reminder scheduling
      if (settings.smartReminderEscalation?.enabled) {
        promises.push(
          this.services.reminderEngine.scheduleReminders({
            appointmentId,
            barberbarbershopId,
            clientId,
            settings: settings.smartReminderEscalation
          })
        )
      }

      // 3. Deposit requirements check
      if (settings.automatedDepositRequirements?.enabled) {
        promises.push(
          this.checkDepositRequirement({
            appointmentId,
            barberbarbershopId,
            clientId,
            settings: settings.automatedDepositRequirements
          })
        )
      }

      await Promise.allSettled(promises)
      
      logger.info(`[AutomationOrchestrator] Processed appointment creation automation for ${appointmentId}`)
      
    } catch (error) {
      logger.error(`[AutomationOrchestrator] Error handling appointment created event:`, error)
    }
  }

  async handlePaymentFailed(data) {
    const { paymentId, appointmentId, barberbarbershopId, clientId, reason } = data
    const settings = this.settings[barberbarbershopId]
    
    if (!settings) return

    try {
      const promises = []

      // 1. Fee collection retry logic
      if (settings.automaticFeeCollection?.enabled) {
        promises.push(
          this.services.feeCollector.handlePaymentFailure({
            paymentId,
            appointmentId,
            barberbarbershopId,
            clientId,
            reason,
            settings: settings.automaticFeeCollection
          })
        )
      }

      // 2. Manager notification for payment failures
      if (settings.managerNotifications?.enabled && 
          settings.managerNotifications.triggers?.paymentFailures) {
        promises.push(
          this.notifyManager({
            type: 'payment_failed',
            paymentId,
            appointmentId,
            barberbarbershopId,
            clientId,
            reason,
            settings: settings.managerNotifications
          })
        )
      }

      await Promise.allSettled(promises)
      
    } catch (error) {
      logger.error(`[AutomationOrchestrator] Error handling payment failed event:`, error)
    }
  }

  async handleClientBlocked(data) {
    const { clientId, barberbarbershopId, reason } = data
    const settings = this.settings[barberbarbershopId]
    
    if (!settings) return

    try {
      // Start recovery flow automation if enabled
      if (settings.recoveryFlowAutomation?.enabled) {
        await this.services.recoveryManager.startRecoveryFlow({
          barberbarbershopId,
          clientId,
          trigger: 'client_blocked',
          reason,
          settings: settings.recoveryFlowAutomation
        })
      }
      
    } catch (error) {
      logger.error(`[AutomationOrchestrator] Error handling client blocked event:`, error)
    }
  }

  /**
   * Utility methods
   */

  async notifyManager(data) {
    try {
      const { type, barberbarbershopId, settings } = data
      
      // Check if manager notifications should be sent
      if (!this.shouldSendManagerNotification(type, settings)) {
        return
      }

      // Get manager contact info
      const supabase = await createClient()
      const { data: managers } = await supabase
        .from('profiles')
        .select('email, first_name, last_name, role')
        .eq('barberbarbershop_id', barberbarbershopId)
        .in('role', ['SHOP_OWNER', 'ENTERPRISE_OWNER', 'MANAGER'])

      if (!managers?.length) return

      // Send notifications based on configured channels
      for (const channel of settings.channels || ['email']) {
        if (channel === 'email') {
          await this.sendManagerEmailNotification(managers, data)
        } else if (channel === 'dashboard') {
          await this.createDashboardNotification(managers, data)
        }
      }
      
    } catch (error) {
      logger.error('[AutomationOrchestrator] Error sending manager notification:', error)
    }
  }

  shouldSendManagerNotification(type, settings) {
    const frequency = settings.frequency || 'immediate'
    
    // For now, implement immediate notifications
    // In the future, batch notifications can be added based on frequency setting
    return frequency === 'immediate'
  }

  async sendManagerEmailNotification(managers, data) {
    // This would integrate with your email service
    // For now, log the notification
    logger.info(`[AutomationOrchestrator] Manager email notification:`, {
      managers: managers.length,
      type: data.type,
      barberbarbershopId: data.barberbarbershopId
    })
  }

  async createDashboardNotification(managers, data) {
    try {
      const supabase = await createClient()
      
      const notifications = managers.map(manager => ({
        user_id: manager.id,
        type: 'automation_alert',
        title: this.getNotificationTitle(data.type),
        message: this.getNotificationMessage(data),
        metadata: {
          automation_type: data.type,
          barberbarbershop_id: data.barberbarbershopId,
          client_id: data.clientId,
          appointment_id: data.appointmentId
        },
        created_at: new Date().toISOString()
      }))

      await supabase
        .from('notifications')
        .insert(notifications)
        
    } catch (error) {
      logger.error('[AutomationOrchestrator] Error creating dashboard notifications:', error)
    }
  }

  getNotificationTitle(type) {
    const titles = {
      'no_show': 'Repeat No-Show Alert',
      'payment_failed': 'Payment Failure Alert',
      'high_risk_booking': 'High-Risk Booking Alert',
      'recovery_denied': 'Client Recovery Denied'
    }
    return titles[type] || 'Automation Alert'
  }

  getNotificationMessage(data) {
    // Create contextual messages based on the alert type
    switch (data.type) {
      case 'no_show':
        return `Client has multiple no-shows and may need attention`
      case 'payment_failed':
        return `Automatic fee collection failed: ${data.reason}`
      case 'high_risk_booking':
        return `New booking flagged as high-risk for no-show`
      case 'recovery_denied':
        return `Client recovery request was denied by system`
      default:
        return 'Automation system requires attention'
    }
  }

  async checkDepositRequirement(data) {
    try {
      const { appointmentId, barberbarbershopId, clientId, settings } = data
      
      // Get client history and risk assessment
      const riskScore = await this.services.predictionService.getClientRiskScore(clientId)
      
      // Check if deposit should be required based on settings
      const shouldRequireDeposit = this.shouldRequireDeposit(riskScore, settings)
      
      if (shouldRequireDeposit) {
        await this.requestDepositForAppointment(appointmentId, settings.depositAmount)
      }
      
    } catch (error) {
      logger.error('[AutomationOrchestrator] Error checking deposit requirement:', error)
    }
  }

  shouldRequireDeposit(riskScore, settings) {
    const conditions = settings.triggerConditions || {}
    
    // Check multiple trigger conditions
    if (riskScore >= (conditions.riskScore || 0.6)) return true
    // Add other condition checks as needed
    
    return false
  }

  async requestDepositForAppointment(appointmentId, depositAmount) {
    try {
      const supabase = await createClient()
      
      // Update appointment to require deposit
      await supabase
        .from('appointments')
        .update({
          requires_deposit: true,
          deposit_amount: depositAmount,
          deposit_requested_at: new Date().toISOString()
        })
        .eq('id', appointmentId)
        
      logger.info(`[AutomationOrchestrator] Deposit required for appointment ${appointmentId}`)
      
    } catch (error) {
      logger.error('[AutomationOrchestrator] Error requesting deposit:', error)
    }
  }

  /**
   * Public API methods
   */

  /**
   * Emit an event to trigger automations
   */
  emit(eventName, data) {
    if (!this.isInitialized) {
      logger.warn(`[AutomationOrchestrator] Ignoring event ${eventName} - not initialized`)
      return
    }

    const listeners = this.eventListeners.get(eventName) || []
    listeners.forEach(listener => {
      try {
        listener(data)
      } catch (error) {
        logger.error(`[AutomationOrchestrator] Error in event listener for ${eventName}:`, error)
      }
    })
  }

  /**
   * Register an event listener
   */
  on(eventName, callback) {
    if (!this.eventListeners.has(eventName)) {
      this.eventListeners.set(eventName, [])
    }
    this.eventListeners.get(eventName).push(callback)
  }

  /**
   * Get automation status for a barbershop
   */
  getAutomationStatus(barberbarbershopId) {
    const settings = this.settings[barberbarbershopId]
    if (!settings) return { enabled: false }

    return {
      enabled: true,
      activeFeatures: Object.keys(settings).filter(key => 
        settings[key]?.enabled && key !== 'userId' && key !== 'userProfile'
      ),
      settings
    }
  }

  /**
   * Manually trigger automation for testing
   */
  async triggerAutomation(automationType, data) {
    if (!this.isInitialized) {
      throw new Error('Automation orchestrator not initialized')
    }

    switch (automationType) {
      case 'no_show':
        return this.handleNoShowEvent(data)
      case 'appointment_created':
        return this.handleAppointmentCreated(data)
      case 'payment_failed':
        return this.handlePaymentFailed(data)
      default:
        throw new Error(`Unknown automation type: ${automationType}`)
    }
  }

  /**
   * Shutdown the orchestrator
   */
  async shutdown() {
    this.stopScheduledTasks()
    
    // Shutdown all services
    if (this.services) {
      await Promise.all([
        this.services.feeCollector?.shutdown?.(),
        this.services.reminderEngine?.shutdown?.(),
        this.services.predictionService?.shutdown?.(),
        this.services.recoveryManager?.shutdown?.()
      ])
    }

    this.isInitialized = false
    logger.info('[AutomationOrchestrator] Shutdown completed')
  }
}

// Export singleton instance
export const automationOrchestrator = new AutomationOrchestrator()
export default automationOrchestrator