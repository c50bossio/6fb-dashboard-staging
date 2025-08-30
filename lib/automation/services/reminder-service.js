/**
 * Automation Reminder Service
 * 
 * Handles smart reminder escalation for high-risk appointments.
 * Sends personalized reminders via email, SMS, and phone calls.
 */

import sgMail from '@sendgrid/mail'
import twilio from 'twilio'
import { createClient } from '@/lib/supabase/server'

// Initialize services
sgMail.setApiKey(process.env.SENDGRID_API_KEY)
const twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN)

export class AutomationReminderService {
  constructor() {
    this.initialized = false
  }

  async initialize() {
    this.initialized = true
    console.log('✅ Reminder Service initialized')
  }

  /**
   * Send escalated reminder based on risk score
   */
  async sendEscalatedReminder({ barbershopId, appointmentId, customerId, riskScore, jobId }) {
    const supabase = await createClient()
    
    try {
      console.log(`📢 Processing escalated reminder: ${jobId}`)
      
      // Get appointment details with related data
      const { data: appointment, error: appointmentError } = await supabase
        .from('appointments')
        .select(`
          *,
          customers:customers(*),
          services:services(*),
          barbers:profiles!appointments_barber_id_fkey(*)
        `)
        .eq('id', appointmentId)
        .single()
      
      if (appointmentError || !appointment) {
        throw new Error('Appointment not found')
      }

      // Get shop automation settings
      const { data: settings, error: settingsError } = await supabase
        .from('business_settings')
        .select('booking_rules')
        .eq('barberbarbershop_id', barbershopId)
        .single()
      
      if (settingsError) {
        console.warn('No automation settings found, using defaults')
      }

      const automationSettings = settings?.booking_rules?.automation?.smartReminderEscalation || {
        escalationSteps: [
          { hours: 48, method: 'email' },
          { hours: 24, method: 'sms' },
          { hours: 2, method: 'phone' }
        ],
        personalizedMessages: true
      }

      // Determine reminder method based on time until appointment and risk score
      const hoursUntilAppointment = this.getHoursUntilAppointment(appointment.appointment_time)
      const reminderMethod = this.determineReminderMethod(
        hoursUntilAppointment,
        riskScore,
        automationSettings.escalationSteps
      )

      // Send appropriate reminder
      let result
      switch (reminderMethod.method) {
        case 'email':
          result = await this.sendEmailReminder(appointment, reminderMethod, automationSettings)
          break
        case 'sms':
          result = await this.sendSMSReminder(appointment, reminderMethod, automationSettings)
          break
        case 'phone':
          result = await this.makePhoneReminder(appointment, reminderMethod, automationSettings)
          break
        default:
          throw new Error(`Unknown reminder method: ${reminderMethod.method}`)
      }

      // Record reminder attempt
      await this.recordReminderAttempt({
        supabase,
        appointmentId,
        customerId,
        barbershopId,
        method: reminderMethod.method,
        riskScore,
        success: result.success,
        details: result.details,
        jobId
      })

      console.log(`✅ Escalated reminder sent: ${jobId}`)
      
      return {
        success: true,
        message: `${reminderMethod.method} reminder sent successfully`,
        method: reminderMethod.method,
        riskScore,
        hoursUntilAppointment
      }
      
    } catch (error) {
      console.error(`❌ Escalated reminder failed: ${jobId}`, error)
      
      // Record failed attempt
      await this.recordReminderAttempt({
        supabase,
        appointmentId,
        customerId,
        barbershopId,
        method: 'unknown',
        riskScore,
        success: false,
        errorMessage: error.message,
        jobId
      })
      
      throw error
    }
  }

  /**
   * Calculate hours until appointment
   */
  getHoursUntilAppointment(appointmentTime) {
    const now = new Date()
    const appointment = new Date(appointmentTime)
    const diffMs = appointment.getTime() - now.getTime()
    return Math.max(0, diffMs / (1000 * 60 * 60))
  }

  /**
   * Determine appropriate reminder method based on timing and risk
   */
  determineReminderMethod(hoursUntilAppointment, riskScore, escalationSteps) {
    // Sort escalation steps by hours (descending)
    const sortedSteps = escalationSteps.sort((a, b) => b.hours - a.hours)
    
    // Find appropriate step based on time remaining
    for (const step of sortedSteps) {
      if (hoursUntilAppointment >= step.hours) {
        return step
      }
    }
    
    // If very close to appointment time, use most urgent method
    const urgentStep = sortedSteps[sortedSteps.length - 1]
    
    // Upgrade method based on risk score
    if (riskScore >= 0.8 && urgentStep.method === 'email') {
      return { ...urgentStep, method: 'sms' }
    } else if (riskScore >= 0.9 && urgentStep.method === 'sms') {
      return { ...urgentStep, method: 'phone' }
    }
    
    return urgentStep
  }

  /**
   * Send email reminder
   */
  async sendEmailReminder(appointment, reminderMethod, settings) {
    try {
      const customer = appointment.customers
      const service = appointment.services
      const barber = appointment.barbers
      
      if (!customer.email) {
        throw new Error('Customer email not available')
      }

      const emailContent = this.generateEmailContent(appointment, customer, service, barber, settings)
      
      await sgMail.send({
        to: customer.email,
        from: process.env.SENDGRID_FROM_EMAIL,
        subject: emailContent.subject,
        html: emailContent.html,
        text: emailContent.text
      })

      return {
        success: true,
        details: {
          recipient: customer.email,
          subject: emailContent.subject
        }
      }
      
    } catch (error) {
      return {
        success: false,
        details: { error: error.message }
      }
    }
  }

  /**
   * Send SMS reminder
   */
  async sendSMSReminder(appointment, reminderMethod, settings) {
    try {
      const customer = appointment.customers
      const service = appointment.services
      
      if (!customer.phone) {
        throw new Error('Customer phone not available')
      }

      const smsContent = this.generateSMSContent(appointment, customer, service, settings)
      
      const message = await twilioClient.messages.create({
        body: smsContent,
        from: process.env.TWILIO_PHONE_NUMBER,
        to: customer.phone
      })

      return {
        success: true,
        details: {
          recipient: customer.phone,
          messageId: message.sid,
          content: smsContent
        }
      }
      
    } catch (error) {
      return {
        success: false,
        details: { error: error.message }
      }
    }
  }

  /**
   * Make phone reminder (placeholder - would integrate with voice service)
   */
  async makePhoneReminder(appointment, reminderMethod, settings) {
    // For now, this is a placeholder. In production, you would integrate
    // with Twilio Voice API or similar service
    try {
      const customer = appointment.customers
      
      if (!customer.phone) {
        throw new Error('Customer phone not available')
      }

      // Log the phone reminder attempt
      console.log(`📞 Phone reminder scheduled for ${customer.phone}`)
      
      // In a real implementation, you would:
      // 1. Create a voice call using Twilio Voice API
      // 2. Play a pre-recorded message or use text-to-speech
      // 3. Handle call outcomes (answered, voicemail, busy, etc.)
      
      return {
        success: true,
        details: {
          recipient: customer.phone,
          method: 'phone',
          note: 'Phone reminder scheduled (not implemented in demo)'
        }
      }
      
    } catch (error) {
      return {
        success: false,
        details: { error: error.message }
      }
    }
  }

  /**
   * Generate personalized email content
   */
  generateEmailContent(appointment, customer, service, barber, settings) {
    const appointmentDate = new Date(appointment.appointment_time)
    const formattedDate = appointmentDate.toLocaleDateString()
    const formattedTime = appointmentDate.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})
    
    const subject = `Important: Your ${service?.name || 'appointment'} tomorrow at ${formattedTime}`
    
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2563eb;">Don't Forget Your Appointment!</h2>
        
        <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin: 0; color: #374151;">Appointment Details</h3>
          <p><strong>Service:</strong> ${service?.name || 'Appointment'}</p>
          <p><strong>Date:</strong> ${formattedDate}</p>
          <p><strong>Time:</strong> ${formattedTime}</p>
          <p><strong>With:</strong> ${barber?.full_name || 'Your barber'}</p>
          <p><strong>Duration:</strong> ${service?.duration || 60} minutes</p>
        </div>

        <p>Hi ${customer.first_name || 'there'},</p>
        
        <p>We're looking forward to seeing you for your upcoming appointment. This is an important reminder to help ensure you don't miss your scheduled time.</p>
        
        <p><strong>Please confirm your attendance by replying to this email or calling us.</strong></p>
        
        <div style="background: #fef3c7; border: 1px solid #f59e0b; padding: 15px; border-radius: 6px; margin: 20px 0;">
          <p style="margin: 0; color: #92400e;"><strong>Note:</strong> Our no-show policy includes a fee to help us maintain fair scheduling for all clients.</p>
        </div>
        
        <p>If you need to reschedule or cancel, please let us know as soon as possible.</p>
        
        <p>Thank you for choosing us!</p>
        
        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; font-size: 12px; color: #6b7280;">
          <p>This is an automated reminder. Please do not reply to this email.</p>
        </div>
      </div>
    `
    
    const text = `
Don't Forget Your Appointment!

Service: ${service?.name || 'Appointment'}
Date: ${formattedDate}
Time: ${formattedTime}
With: ${barber?.full_name || 'Your barber'}

Hi ${customer.first_name || 'there'},

We're looking forward to seeing you for your upcoming appointment. Please confirm your attendance by calling us.

If you need to reschedule or cancel, please let us know as soon as possible.

Thank you for choosing us!
    `
    
    return { subject, html, text }
  }

  /**
   * Generate personalized SMS content
   */
  generateSMSContent(appointment, customer, service, settings) {
    const appointmentDate = new Date(appointment.appointment_time)
    const formattedDate = appointmentDate.toLocaleDateString()
    const formattedTime = appointmentDate.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})
    
    return `Hi ${customer.first_name || 'there'}! Important reminder: Your ${service?.name || 'appointment'} is tomorrow ${formattedDate} at ${formattedTime}. Please confirm or reschedule ASAP. Thanks!`
  }

  /**
   * Record reminder attempt in database
   */
  async recordReminderAttempt({
    supabase,
    appointmentId,
    customerId,
    barbershopId,
    method,
    riskScore,
    success,
    details = {},
    errorMessage = null,
    jobId
  }) {
    try {
      await supabase
        .from('automation_reminder_attempts')
        .insert({
          appointment_id: appointmentId,
          customer_id: customerId,
          barbershop_id: barbershopId,
          reminder_method: method,
          risk_score: riskScore,
          success,
          details,
          error_message: errorMessage,
          automation_job_id: jobId,
          sent_at: new Date().toISOString()
        })
        
    } catch (error) {
      console.error('Failed to record reminder attempt:', error)
    }
  }

  async shutdown() {
    this.initialized = false
    console.log('✅ Reminder Service shutdown')
  }
}