/**
 * Notification Service for sending booking confirmations and reminders
 * Supports SMS and email notifications with graceful fallbacks
 */

class NotificationService {
  constructor() {
    this.smsProvider = null // Will be initialized with Twilio or similar
    this.emailProvider = null // Will be initialized with SendGrid or similar
    this.enabledChannels = {
      sms: process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN,
      email: process.env.SENDGRID_API_KEY || process.env.SMTP_HOST
    }
  }

  /**
   * Send booking confirmation notification
   */
  async sendBookingConfirmation(appointmentData, customerData, preferences = {}) {
    const notifications = []

    try {
      // Prepare notification data
      const notificationData = {
        customerName: customerData.name || appointmentData.client_name,
        appointmentDate: new Date(appointmentData.scheduled_at).toLocaleDateString('en-US', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        }),
        appointmentTime: new Date(appointmentData.scheduled_at).toLocaleTimeString('en-US', {
          hour: 'numeric',
          minute: '2-digit',
          hour12: true
        }),
        barberName: appointmentData.barber_name || 'your barber',
        serviceName: appointmentData.service_name || 'your service',
        barbershopName: 'BonieStyles Barbershop', // TODO: Get from settings
        phone: customerData.phone || appointmentData.client_phone,
        email: customerData.email || appointmentData.client_email,
        appointmentId: appointmentData.id
      }

      // Send SMS confirmation if enabled and requested
      if (preferences.sms && preferences.confirmations && notificationData.phone && this.enabledChannels.sms) {
        try {
          const smsResult = await this.sendSMS({
            to: notificationData.phone,
            message: this.generateConfirmationSMS(notificationData)
          })
          notifications.push({ 
            channel: 'sms', 
            status: 'sent', 
            result: smsResult,
            to: notificationData.phone
          })
        } catch (error) {
          console.error('SMS confirmation failed:', error)
          notifications.push({ 
            channel: 'sms', 
            status: 'failed', 
            error: error.message,
            to: notificationData.phone
          })
        }
      }

      // Send email confirmation if enabled and requested
      if (preferences.email && preferences.confirmations && notificationData.email && this.enabledChannels.email) {
        try {
          const emailResult = await this.sendEmail({
            to: notificationData.email,
            subject: `Appointment Confirmed - ${notificationData.appointmentDate}`,
            html: this.generateConfirmationEmail(notificationData),
            text: this.generateConfirmationEmailText(notificationData)
          })
          notifications.push({ 
            channel: 'email', 
            status: 'sent', 
            result: emailResult,
            to: notificationData.email
          })
        } catch (error) {
          console.error('Email confirmation failed:', error)
          notifications.push({ 
            channel: 'email', 
            status: 'failed', 
            error: error.message,
            to: notificationData.email
          })
        }
      }

      // Log notification attempt
      console.log('📱 Booking confirmation notifications:', {
        appointmentId: appointmentData.id,
        customer: notificationData.customerName,
        channels: notifications.map(n => `${n.channel}:${n.status}`).join(', '),
        timestamp: new Date().toISOString()
      })

      return {
        success: notifications.some(n => n.status === 'sent'),
        notifications,
        summary: this.generateNotificationSummary(notifications)
      }

    } catch (error) {
      console.error('Notification service error:', error)
      return {
        success: false,
        error: error.message,
        notifications: []
      }
    }
  }

  /**
   * Schedule reminder notification (24 hours before appointment)
   */
  async scheduleReminder(appointmentData, customerData, preferences = {}) {
    if (!preferences.reminders) {
      return { success: true, scheduled: false, reason: 'Reminders disabled by customer' }
    }

    const appointmentTime = new Date(appointmentData.scheduled_at)
    const reminderTime = new Date(appointmentTime.getTime() - 24 * 60 * 60 * 1000) // 24 hours before

    // For now, log the reminder scheduling
    // In production, this would integrate with a job queue like Bull or Agenda
    console.log('⏰ Reminder scheduled:', {
      appointmentId: appointmentData.id,
      customer: customerData.name || appointmentData.client_name,
      reminderTime: reminderTime.toISOString(),
      appointmentTime: appointmentTime.toISOString(),
      channels: {
        sms: preferences.sms && customerData.phone,
        email: preferences.email && customerData.email
      }
    })

    // TODO: Implement actual reminder scheduling with job queue
    return {
      success: true,
      scheduled: true,
      reminderTime: reminderTime.toISOString(),
      channels: Object.entries(preferences)
        .filter(([key, value]) => ['sms', 'email'].includes(key) && value)
        .map(([key]) => key)
    }
  }

  /**
   * Generate SMS confirmation message
   */
  generateConfirmationSMS(data) {
    return `Hi ${data.customerName}! Your appointment is confirmed for ${data.appointmentDate} at ${data.appointmentTime} with ${data.barberName} at ${data.barbershopName}. See you soon! Reply STOP to opt out.`
  }

  /**
   * Generate email confirmation HTML
   */
  generateConfirmationEmail(data) {
    return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: linear-gradient(135deg, #3b82f6, #1d4ed8); color: white; padding: 30px; text-align: center;">
        <h1 style="margin: 0; font-size: 24px;">Appointment Confirmed!</h1>
        <p style="margin: 10px 0 0; font-size: 16px; opacity: 0.9;">Your booking at ${data.barbershopName}</p>
      </div>
      
      <div style="padding: 30px; background: #f8fafc;">
        <h2 style="color: #1f2937; margin: 0 0 20px;">Hi ${data.customerName},</h2>
        <p style="color: #4b5563; font-size: 16px; line-height: 1.5;">
          Your appointment has been confirmed! We're looking forward to seeing you.
        </p>
        
        <div style="background: white; border-radius: 8px; padding: 20px; margin: 20px 0; border-left: 4px solid #3b82f6;">
          <h3 style="color: #1f2937; margin: 0 0 15px;">Appointment Details</h3>
          <div style="color: #4b5563; line-height: 1.6;">
            <p><strong>📅 Date:</strong> ${data.appointmentDate}</p>
            <p><strong>🕒 Time:</strong> ${data.appointmentTime}</p>
            <p><strong>💺 Barber:</strong> ${data.barberName}</p>
            <p><strong>✂️ Service:</strong> ${data.serviceName}</p>
          </div>
        </div>
        
        <div style="background: #fef3c7; border-radius: 8px; padding: 15px; margin: 20px 0;">
          <p style="color: #92400e; margin: 0; font-size: 14px;">
            <strong>📝 Please note:</strong> If you need to reschedule or cancel, please call us at least 24 hours in advance.
          </p>
        </div>
      </div>
      
      <div style="background: #1f2937; color: #9ca3af; padding: 20px; text-align: center; font-size: 14px;">
        <p style="margin: 0;">${data.barbershopName}</p>
        <p style="margin: 5px 0 0;">Booking ID: ${data.appointmentId}</p>
      </div>
    </div>`
  }

  /**
   * Generate plain text email confirmation
   */
  generateConfirmationEmailText(data) {
    return `
Hi ${data.customerName},

Your appointment has been confirmed!

Appointment Details:
📅 Date: ${data.appointmentDate}
🕒 Time: ${data.appointmentTime}  
💺 Barber: ${data.barberName}
✂️ Service: ${data.serviceName}

Please note: If you need to reschedule or cancel, please call us at least 24 hours in advance.

${data.barbershopName}
Booking ID: ${data.appointmentId}
    `.trim()
  }

  /**
   * Send SMS (placeholder - integrate with Twilio)
   */
  async sendSMS({ to, message }) {
    // TODO: Integrate with Twilio or other SMS provider
    console.log(`📱 SMS would be sent to ${to}: ${message}`)
    
    // For now, simulate success
    return {
      success: true,
      messageId: `mock_sms_${Date.now()}`,
      to,
      provider: 'mock'
    }
  }

  /**
   * Send Email (placeholder - integrate with SendGrid)
   */
  async sendEmail({ to, subject, html, text }) {
    // TODO: Integrate with SendGrid or other email provider
    console.log(`✉️ Email would be sent to ${to}`)
    console.log(`   Subject: ${subject}`)
    console.log(`   HTML length: ${html.length} chars`)
    
    // For now, simulate success
    return {
      success: true,
      messageId: `mock_email_${Date.now()}`,
      to,
      subject,
      provider: 'mock'
    }
  }

  /**
   * Generate notification summary for logging
   */
  generateNotificationSummary(notifications) {
    const sent = notifications.filter(n => n.status === 'sent')
    const failed = notifications.filter(n => n.status === 'failed')
    
    return {
      total: notifications.length,
      sent: sent.length,
      failed: failed.length,
      channels: {
        sms: notifications.filter(n => n.channel === 'sms').length,
        email: notifications.filter(n => n.channel === 'email').length
      },
      success_rate: notifications.length > 0 ? (sent.length / notifications.length * 100).toFixed(1) + '%' : '0%'
    }
  }
}

// Export singleton instance
const notificationService = new NotificationService()
export default notificationService