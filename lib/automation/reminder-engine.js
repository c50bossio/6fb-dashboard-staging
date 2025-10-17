'use client'

import logger from '@/lib/logger'
import { createClient } from '@/lib/supabase/server'

/**
 * Smart Reminder Engine Service
 * 
 * Handles escalating reminders based on client risk scores including:
 * - Multi-channel delivery (email → SMS → phone)
 * - Personalized message generation
 * - Response tracking and analytics
 * - Risk-based escalation logic
 */
export class ReminderEngineService {
  constructor(orchestrator) {
    this.orchestrator = orchestrator
    this.scheduledReminders = new Map()
    this.processingQueue = []
    this.messageTemplates = new Map()
    this.deliveryMethods = {
      email: this.sendEmailReminder.bind(this),
      sms: this.sendSMSReminder.bind(this),
      phone: this.makePhoneReminder.bind(this),
      push: this.sendPushNotification.bind(this)
    }
  }

  async initialize() {
    logger.info('[ReminderEngineService] Initializing smart reminder engine')
    
    // Load message templates
    await this.loadMessageTemplates()
    
    // Load scheduled reminders from database
    await this.loadScheduledReminders()
    
    logger.info('[ReminderEngineService] Smart reminder engine initialized')
  }

  /**
   * Schedule smart reminders for a new appointment
   */
  async scheduleReminders(data) {
    const { appointmentId, barbershopId, clientId, settings } = data
    
    try {
      logger.info(`[ReminderEngineService] Scheduling smart reminders for appointment ${appointmentId}`)

      // Get appointment details
      const appointmentData = await this.getAppointmentDetails(appointmentId)
      if (!appointmentData) {
        throw new Error('Appointment not found')
      }

      // Calculate client risk score
      const riskScore = await this.calculateClientRiskScore(appointmentData.clients)
      
      // Determine reminder schedule based on risk
      const reminderSchedule = await this.createReminderSchedule(appointmentData, riskScore, settings)
      
      // Schedule each reminder
      for (const reminder of reminderSchedule) {
        await this.scheduleIndividualReminder(appointmentData, reminder, settings)
      }

      logger.info(`[ReminderEngineService] Scheduled ${reminderSchedule.length} reminders for appointment ${appointmentId}`)

    } catch (error) {
      logger.error(`[ReminderEngineService] Error scheduling reminders:`, error)
    }
  }

  /**
   * Calculate client risk score for reminder escalation
   */
  async calculateClientRiskScore(client) {
    try {
      if (!client) return 0.5 // Default medium risk

      let riskScore = 0.3 // Base score for all clients

      // No-show history (40% of score)
      const noShowStrikes = client.no_show_strikes || 0
      const riskFromNoShows = Math.min(noShowStrikes * 0.15, 0.4)
      riskScore += riskFromNoShows

      // Booking frequency (20% of score)
      const bookingCount = await this.getClientBookingCount(client.id)
      if (bookingCount < 3) {
        riskScore += 0.2 // New clients are higher risk
      } else if (bookingCount > 20) {
        riskScore -= 0.1 // Regular clients are lower risk
      }

      // Last-minute cancellations (20% of score)
      const cancellationRate = await this.getClientCancellationRate(client.id)
      riskScore += cancellationRate * 0.2

      // Recent appointment completion rate (20% of score)
      const completionRate = await this.getClientCompletionRate(client.id)
      riskScore += (1 - completionRate) * 0.2

      // Cap between 0 and 1
      return Math.max(0, Math.min(1, riskScore))

    } catch (error) {
      logger.error('[ReminderEngineService] Error calculating risk score:', error)
      return 0.5 // Default to medium risk
    }
  }

  /**
   * Create personalized reminder schedule based on risk score
   */
  async createReminderSchedule(appointmentData, riskScore, settings) {
    const appointmentTime = new Date(`${appointmentData.appointment_date}T${appointmentData.start_time}`)
    const riskThreshold = settings.riskThreshold || 0.7
    const escalationSteps = settings.escalationSteps || [
      { hours: 48, method: 'email' },
      { hours: 24, method: 'sms' },
      { hours: 2, method: 'phone' }
    ]

    let schedule = []

    if (riskScore < riskThreshold) {
      // Standard reminder schedule for low-risk clients
      schedule = [
        {
          method: 'email',
          scheduledFor: new Date(appointmentTime.getTime() - (24 * 60 * 60 * 1000)), // 24 hours before
          priority: 'normal',
          personalized: false
        }
      ]
    } else {
      // Escalated reminder schedule for high-risk clients
      schedule = escalationSteps.map(step => ({
        method: step.method,
        scheduledFor: new Date(appointmentTime.getTime() - (step.hours * 60 * 60 * 1000)),
        priority: riskScore > 0.8 ? 'high' : 'medium',
        personalized: settings.personalizedMessages || false,
        riskScore: riskScore
      })).filter(reminder => reminder.scheduledFor > new Date()) // Only future reminders

      // Add extra reminder for very high risk clients
      if (riskScore > 0.9) {
        schedule.unshift({
          method: 'email',
          scheduledFor: new Date(appointmentTime.getTime() - (72 * 60 * 60 * 1000)), // 72 hours before
          priority: 'high',
          personalized: true,
          riskScore: riskScore,
          isExtraReminder: true
        })
      }
    }

    return schedule.filter(reminder => reminder.scheduledFor > new Date())
  }

  /**
   * Schedule an individual reminder
   */
  async scheduleIndividualReminder(appointmentData, reminder, settings) {
    try {
      const reminderId = `${appointmentData.id}_${reminder.method}_${reminder.scheduledFor.getTime()}`
      
      const reminderData = {
        id: reminderId,
        appointmentId: appointmentData.id,
        clientId: appointmentData.client_id,
        barbershopId: appointmentData.barbershop_id,
        method: reminder.method,
        scheduledFor: reminder.scheduledFor,
        priority: reminder.priority,
        personalized: reminder.personalized,
        riskScore: reminder.riskScore,
        status: 'scheduled',
        retryCount: 0,
        settings: settings
      }

      // Store in memory
      this.scheduledReminders.set(reminderId, reminderData)

      // Persist to database
      await this.saveReminderToDatabase(reminderData)

      logger.debug(`[ReminderEngineService] Scheduled ${reminder.method} reminder for ${reminder.scheduledFor.toISOString()}`)

    } catch (error) {
      logger.error(`[ReminderEngineService] Error scheduling individual reminder:`, error)
    }
  }

  /**
   * Process all scheduled reminders that are due
   */
  async processScheduledReminders() {
    const now = new Date()
    const dueReminders = []

    // Find reminders that are due
    for (const [reminderId, reminderData] of this.scheduledReminders) {
      if (reminderData.scheduledFor <= now && reminderData.status === 'scheduled') {
        dueReminders.push(reminderData)
      }
    }

    if (dueReminders.length === 0) {
      return
    }

    logger.info(`[ReminderEngineService] Processing ${dueReminders.length} due reminders`)

    for (const reminder of dueReminders) {
      try {
        await this.sendReminder(reminder)
      } catch (error) {
        logger.error(`[ReminderEngineService] Error sending reminder ${reminder.id}:`, error)
      }
    }
  }

  /**
   * Send a reminder using the specified method
   */
  async sendReminder(reminderData) {
    const { method, appointmentId, clientId } = reminderData
    
    // Mark as processing
    reminderData.status = 'processing'
    reminderData.attemptedAt = new Date()
    
    try {
      // Get fresh appointment data
      const appointmentData = await this.getAppointmentDetails(appointmentId)
      if (!appointmentData) {
        throw new Error('Appointment not found')
      }

      // Check if appointment is still valid
      if (this.isAppointmentCancelled(appointmentData)) {
        reminderData.status = 'cancelled'
        logger.info(`[ReminderEngineService] Skipping reminder for cancelled appointment ${appointmentId}`)
        return
      }

      // Generate personalized message
      const message = await this.generateMessage(appointmentData, reminderData)
      
      // Send using appropriate method
      const deliveryMethod = this.deliveryMethods[method]
      if (!deliveryMethod) {
        throw new Error(`Unknown delivery method: ${method}`)
      }

      const result = await deliveryMethod(appointmentData, message, reminderData)
      
      if (result.success) {
        reminderData.status = 'sent'
        reminderData.sentAt = new Date()
        reminderData.deliveryId = result.deliveryId
        
        logger.info(`[ReminderEngineService] Successfully sent ${method} reminder for appointment ${appointmentId}`)
        
        // Track response if settings enable it
        if (reminderData.settings.trackResponse) {
          await this.setupResponseTracking(reminderData, result)
        }
      } else {
        throw new Error(result.error || 'Delivery failed')
      }

    } catch (error) {
      logger.error(`[ReminderEngineService] Failed to send reminder:`, error)
      await this.handleReminderFailure(reminderData, error)
    } finally {
      // Update database
      await this.updateReminderInDatabase(reminderData)
    }
  }

  /**
   * Generate personalized message for reminder
   */
  async generateMessage(appointmentData, reminderData) {
    try {
      const client = appointmentData.clients
      const service = appointmentData.services
      const barbershop = appointmentData.barbershops
      
      // Base template
      let template = this.getMessageTemplate(reminderData.method, reminderData.priority)
      
      if (reminderData.personalized) {
        // Add personalization based on client history and risk
        template = await this.personalizeMessage(template, client, appointmentData, reminderData)
      }

      // Replace placeholders
      const message = template
        .replace('{client_name}', client?.first_name || 'valued client')
        .replace('{service_name}', service?.name || 'your service')
        .replace('{barbershop_name}', barbershop?.name || 'the barbershop')
        .replace('{appointment_date}', this.formatAppointmentDate(appointmentData.appointment_date))
        .replace('{appointment_time}', this.formatAppointmentTime(appointmentData.start_time))
        .replace('{appointment_duration}', service?.duration ? `${service.duration} minutes` : '')
        .replace('{service_price}', appointmentData.price ? `$${appointmentData.price}` : '')

      return {
        text: message,
        subject: this.generateSubject(appointmentData, reminderData),
        metadata: {
          appointmentId: appointmentData.id,
          clientId: client?.id,
          reminderType: reminderData.method,
          priority: reminderData.priority,
          riskScore: reminderData.riskScore
        }
      }

    } catch (error) {
      logger.error('[ReminderEngineService] Error generating message:', error)
      
      // Fallback to basic message
      return {
        text: `Hi! This is a reminder about your appointment at ${appointmentData.barbershops?.name} on ${this.formatAppointmentDate(appointmentData.appointment_date)} at ${this.formatAppointmentTime(appointmentData.start_time)}.`,
        subject: 'Appointment Reminder',
        metadata: { appointmentId: appointmentData.id }
      }
    }
  }

  /**
   * Add personalization to message template
   */
  async personalizeMessage(template, client, appointmentData, reminderData) {
    try {
      const riskScore = reminderData.riskScore || 0
      const noShowStrikes = client?.no_show_strikes || 0

      // High-risk personalization
      if (riskScore > 0.8) {
        if (noShowStrikes > 0) {
          template = template.replace(
            '{personalization}',
            " We noticed you've had to reschedule in the past - we completely understand that life happens! Just wanted to make sure this appointment still works for you."
          )
        } else {
          template = template.replace(
            '{personalization}',
            " We're really looking forward to seeing you and want to make sure you have all the details you need."
          )
        }
      }

      // Add loyalty appreciation for regular clients
      const bookingCount = await this.getClientBookingCount(client?.id)
      if (bookingCount > 10) {
        template = template.replace(
          '{loyalty_note}',
          " Thank you for being such a loyal client - we truly appreciate your business!"
        )
      }

      // Remove unused placeholders
      template = template
        .replace('{personalization}', '')
        .replace('{loyalty_note}', '')

      return template

    } catch (error) {
      logger.error('[ReminderEngineService] Error personalizing message:', error)
      return template.replace('{personalization}', '').replace('{loyalty_note}', '')
    }
  }

  /**
   * Send email reminder
   */
  async sendEmailReminder(appointmentData, message, reminderData) {
    try {
      // This would integrate with your email service (SendGrid, etc.)
      // For now, we'll simulate the email sending
      
      const client = appointmentData.clients
      if (!client?.email) {
        return { success: false, error: 'No email address available' }
      }

      // Simulate email service call
      logger.info(`[ReminderEngineService] Sending email reminder to ${client.email}`)
      
      // Here you would actually send the email
      // const result = await sendEmail({
      //   to: client.email,
      //   subject: message.subject,
      //   html: message.text,
      //   metadata: message.metadata
      // })

      return {
        success: true,
        deliveryId: `email_${Date.now()}`,
        method: 'email',
        recipient: client.email
      }

    } catch (error) {
      logger.error('[ReminderEngineService] Error sending email reminder:', error)
      return { success: false, error: error.message }
    }
  }

  /**
   * Send SMS reminder
   */
  async sendSMSReminder(appointmentData, message, reminderData) {
    try {
      const client = appointmentData.clients
      if (!client?.phone) {
        return { success: false, error: 'No phone number available' }
      }

      // This would integrate with your SMS service (Twilio, etc.)
      logger.info(`[ReminderEngineService] Sending SMS reminder to ${client.phone}`)
      
      // Simulate SMS service call
      // const result = await sendSMS({
      //   to: client.phone,
      //   message: message.text,
      //   metadata: message.metadata
      // })

      return {
        success: true,
        deliveryId: `sms_${Date.now()}`,
        method: 'sms',
        recipient: client.phone
      }

    } catch (error) {
      logger.error('[ReminderEngineService] Error sending SMS reminder:', error)
      return { success: false, error: error.message }
    }
  }

  /**
   * Make phone reminder (automated call)
   */
  async makePhoneReminder(appointmentData, message, reminderData) {
    try {
      const client = appointmentData.clients
      if (!client?.phone) {
        return { success: false, error: 'No phone number available' }
      }

      // This would integrate with voice service (Twilio Voice, etc.)
      logger.info(`[ReminderEngineService] Making phone reminder call to ${client.phone}`)
      
      // Simulate voice call
      // const result = await makeVoiceCall({
      //   to: client.phone,
      //   message: message.text,
      //   metadata: message.metadata
      // })

      return {
        success: true,
        deliveryId: `phone_${Date.now()}`,
        method: 'phone',
        recipient: client.phone
      }

    } catch (error) {
      logger.error('[ReminderEngineService] Error making phone reminder:', error)
      return { success: false, error: error.message }
    }
  }

  /**
   * Send push notification
   */
  async sendPushNotification(appointmentData, message, reminderData) {
    try {
      // This would integrate with push notification service
      logger.info(`[ReminderEngineService] Sending push notification for appointment ${appointmentData.id}`)
      
      return {
        success: true,
        deliveryId: `push_${Date.now()}`,
        method: 'push'
      }

    } catch (error) {
      logger.error('[ReminderEngineService] Error sending push notification:', error)
      return { success: false, error: error.message }
    }
  }

  /**
   * Setup response tracking for sent reminders
   */
  async setupResponseTracking(reminderData, deliveryResult) {
    try {
      // Create tracking record
      const supabase = await createClient()
      
      await supabase
        .from('reminder_response_tracking')
        .insert({
          reminder_id: reminderData.id,
          appointment_id: reminderData.appointmentId,
          client_id: reminderData.clientId,
          delivery_method: reminderData.method,
          delivery_id: deliveryResult.deliveryId,
          sent_at: new Date().toISOString(),
          tracking_expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
          created_at: new Date().toISOString()
        })

      logger.debug(`[ReminderEngineService] Set up response tracking for reminder ${reminderData.id}`)

    } catch (error) {
      logger.error('[ReminderEngineService] Error setting up response tracking:', error)
    }
  }

  /**
   * Handle reminder delivery failure
   */
  async handleReminderFailure(reminderData, error) {
    reminderData.status = 'failed'
    reminderData.failureReason = error.message
    reminderData.failedAt = new Date()
    reminderData.retryCount = (reminderData.retryCount || 0) + 1

    // Determine if we should retry
    const shouldRetry = this.shouldRetryReminder(reminderData, error)
    
    if (shouldRetry && reminderData.retryCount < 3) {
      // Schedule retry with exponential backoff
      const retryDelay = Math.pow(2, reminderData.retryCount) * 5 * 60 * 1000 // 5, 10, 20 minutes
      reminderData.scheduledFor = new Date(Date.now() + retryDelay)
      reminderData.status = 'scheduled'
      
      logger.info(`[ReminderEngineService] Scheduled retry ${reminderData.retryCount} for reminder ${reminderData.id}`)
    } else {
      // Try fallback method if available
      await this.tryFallbackMethod(reminderData)
    }
  }

  /**
   * Try fallback delivery method
   */
  async tryFallbackMethod(reminderData) {
    const fallbackMethods = {
      'phone': 'sms',
      'sms': 'email',
      'email': null // No fallback for email
    }

    const fallbackMethod = fallbackMethods[reminderData.method]
    if (fallbackMethod) {
      // Create new reminder with fallback method
      const fallbackReminder = {
        ...reminderData,
        id: `${reminderData.id}_fallback`,
        method: fallbackMethod,
        scheduledFor: new Date(Date.now() + 5 * 60 * 1000), // 5 minutes delay
        status: 'scheduled',
        retryCount: 0,
        isFallback: true
      }

      this.scheduledReminders.set(fallbackReminder.id, fallbackReminder)
      await this.saveReminderToDatabase(fallbackReminder)
      
      logger.info(`[ReminderEngineService] Created fallback ${fallbackMethod} reminder for ${reminderData.id}`)
    }
  }

  /**
   * Utility methods
   */

  shouldRetryReminder(reminderData, error) {
    const retriableErrors = [
      'Network error',
      'Service temporarily unavailable',
      'Rate limit exceeded'
    ]
    
    return retriableErrors.some(err => error.message.includes(err))
  }

  getMessageTemplate(method, priority) {
    const key = `${method}_${priority}`
    return this.messageTemplates.get(key) || this.getDefaultTemplate(method)
  }

  getDefaultTemplate(method) {
    const templates = {
      email: "Hi {client_name}! This is a friendly reminder about your {service_name} appointment at {barbershop_name} on {appointment_date} at {appointment_time}.{personalization} Please let us know if you need to reschedule. Looking forward to seeing you!{loyalty_note}",
      sms: "Hi {client_name}! Reminder: {service_name} appointment at {barbershop_name} on {appointment_date} at {appointment_time}. Please confirm or reschedule if needed. Thanks!",
      phone: "Hello {client_name}, this is a reminder about your {service_name} appointment at {barbershop_name} scheduled for {appointment_date} at {appointment_time}. Please press 1 to confirm or call us to reschedule.",
      push: "Appointment reminder: {service_name} at {barbershop_name} on {appointment_date} at {appointment_time}"
    }
    
    return templates[method] || templates.email
  }

  generateSubject(appointmentData, reminderData) {
    const urgencyMap = {
      high: 'URGENT: ',
      medium: 'Important: ',
      normal: ''
    }
    
    const urgency = urgencyMap[reminderData.priority] || ''
    return `${urgency}Appointment Reminder - ${appointmentData.barbershops?.name}`
  }

  formatAppointmentDate(dateString) {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    })
  }

  formatAppointmentTime(timeString) {
    const [hours, minutes] = timeString.split(':')
    const date = new Date()
    date.setHours(parseInt(hours), parseInt(minutes))
    return date.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    })
  }

  isAppointmentCancelled(appointmentData) {
    return ['cancelled', 'no_show', 'rescheduled'].includes(appointmentData.status)
  }

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
          clients (
            id,
            email,
            phone,
            first_name,
            last_name,
            no_show_strikes,
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
            name
          )
        `)
        .eq('id', appointmentId)
        .single()

      return error ? null : data

    } catch (error) {
      logger.error('[ReminderEngineService] Error fetching appointment details:', error)
      return null
    }
  }

  async getClientBookingCount(clientId) {
    if (!clientId) return 0
    
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

  async getClientCancellationRate(clientId) {
    if (!clientId) return 0
    
    try {
      const supabase = await createClient()
      
      const { count: totalCount } = await supabase
        .from('appointments')
        .select('id', { count: 'exact' })
        .eq('client_id', clientId)

      const { count: cancelledCount } = await supabase
        .from('appointments')
        .select('id', { count: 'exact' })
        .eq('client_id', clientId)
        .in('status', ['cancelled', 'no_show'])

      return totalCount > 0 ? cancelledCount / totalCount : 0
    } catch {
      return 0
    }
  }

  async getClientCompletionRate(clientId) {
    if (!clientId) return 1 // Assume good for new clients
    
    try {
      const supabase = await createClient()
      
      const { count: totalCount } = await supabase
        .from('appointments')
        .select('id', { count: 'exact' })
        .eq('client_id', clientId)

      const { count: completedCount } = await supabase
        .from('appointments')
        .select('id', { count: 'exact' })
        .eq('client_id', clientId)
        .eq('status', 'completed')

      return totalCount > 0 ? completedCount / totalCount : 1
    } catch {
      return 1
    }
  }

  async loadMessageTemplates() {
    try {
      // Load custom templates from database
      const supabase = await createClient()
      const { data: templates } = await supabase
        .from('reminder_templates')
        .select('*')

      if (templates?.length) {
        templates.forEach(template => {
          const key = `${template.method}_${template.priority}`
          this.messageTemplates.set(key, template.content)
        })
        
        logger.info(`[ReminderEngineService] Loaded ${templates.length} custom message templates`)
      }
    } catch (error) {
      logger.error('[ReminderEngineService] Error loading message templates:', error)
    }
  }

  async loadScheduledReminders() {
    try {
      const supabase = await createClient()
      const { data: reminders } = await supabase
        .from('scheduled_reminders')
        .select('*')
        .eq('status', 'scheduled')
        .gte('scheduled_for', new Date().toISOString())

      if (reminders?.length) {
        reminders.forEach(reminder => {
          this.scheduledReminders.set(reminder.id, {
            ...reminder,
            scheduledFor: new Date(reminder.scheduled_for)
          })
        })
        
        logger.info(`[ReminderEngineService] Loaded ${reminders.length} scheduled reminders`)
      }
    } catch (error) {
      logger.error('[ReminderEngineService] Error loading scheduled reminders:', error)
    }
  }

  async saveReminderToDatabase(reminderData) {
    try {
      const supabase = await createClient()
      
      await supabase
        .from('scheduled_reminders')
        .upsert({
          id: reminderData.id,
          appointment_id: reminderData.appointmentId,
          client_id: reminderData.clientId,
          barbershop_id: reminderData.barbershopId,
          method: reminderData.method,
          scheduled_for: reminderData.scheduledFor.toISOString(),
          priority: reminderData.priority,
          personalized: reminderData.personalized,
          risk_score: reminderData.riskScore,
          status: reminderData.status,
          retry_count: reminderData.retryCount || 0,
          settings: reminderData.settings,
          updated_at: new Date().toISOString()
        })
        
    } catch (error) {
      logger.error('[ReminderEngineService] Error saving reminder to database:', error)
    }
  }

  async updateReminderInDatabase(reminderData) {
    try {
      const supabase = await createClient()
      
      await supabase
        .from('scheduled_reminders')
        .update({
          status: reminderData.status,
          attempted_at: reminderData.attemptedAt?.toISOString(),
          sent_at: reminderData.sentAt?.toISOString(),
          failed_at: reminderData.failedAt?.toISOString(),
          failure_reason: reminderData.failureReason,
          delivery_id: reminderData.deliveryId,
          retry_count: reminderData.retryCount || 0,
          updated_at: new Date().toISOString()
        })
        .eq('id', reminderData.id)
        
    } catch (error) {
      logger.error('[ReminderEngineService] Error updating reminder in database:', error)
    }
  }

  async shutdown() {
    logger.info('[ReminderEngineService] Shutting down reminder engine')
    this.scheduledReminders.clear()
    this.processingQueue = []
    this.messageTemplates.clear()
  }
}

export default ReminderEngineService