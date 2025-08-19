/**
 * Unified Notification Service
 * Handles appointment reminders, confirmations, and all customer communications
 */

const { createClient } = require('@supabase/supabase-js')
const { twilioSMSService } = require('./twilio-service')
const { enhancedSendGridService } = require('./sendgrid-service-fixed')

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

class NotificationService {
  constructor() {
    this.initialized = false
    this.services = {
      sms: twilioSMSService,
      email: enhancedSendGridService
    }
    this.init()
  }

  async init() {
    console.log('🔔 Initializing Notification Service...')
    this.initialized = true
  }

  /**
   * Send appointment confirmation notification
   */
  async sendAppointmentConfirmation(bookingData) {
    try {
      const { booking, customer, barbershop, barber } = bookingData

      // Prepare notification data
      const notificationData = {
        customerName: customer.first_name || customer.name || 'Customer',
        customerEmail: customer.email,
        customerPhone: customer.phone,
        barbershopName: barbershop.name,
        barbershopPhone: barbershop.phone,
        barbershopAddress: barbershop.address,
        barberName: barber.first_name + ' ' + barber.last_name,
        appointmentDate: new Date(booking.appointment_date).toLocaleDateString(),
        appointmentTime: booking.appointment_time,
        serviceName: booking.service_name || 'Haircut',
        totalAmount: booking.total_amount,
        bookingId: booking.id
      }

      const results = []

      // Send SMS confirmation if customer has phone and opted in
      if (customer.phone && customer.sms_opt_in) {
        try {
          const smsResult = await this.sendSMSConfirmation(notificationData)
          results.push({ channel: 'sms', success: smsResult.success, result: smsResult })
        } catch (error) {
          console.error('SMS confirmation failed:', error)
          results.push({ channel: 'sms', success: false, error: error.message })
        }
      }

      // Send email confirmation if customer has email and opted in
      if (customer.email && customer.email_opt_in !== false) {
        try {
          const emailResult = await this.sendEmailConfirmation(notificationData)
          results.push({ channel: 'email', success: emailResult.success, result: emailResult })
        } catch (error) {
          console.error('Email confirmation failed:', error)
          results.push({ channel: 'email', success: false, error: error.message })
        }
      }

      // Log notification attempt
      await this.logNotification({
        booking_id: booking.id,
        customer_id: customer.id,
        barbershop_id: barbershop.id,
        notification_type: 'appointment_confirmation',
        channels: results.map(r => r.channel),
        results: results,
        sent_at: new Date().toISOString()
      })

      return {
        success: results.some(r => r.success),
        results: results,
        message: `Confirmation sent via ${results.filter(r => r.success).map(r => r.channel).join(', ')}`
      }

    } catch (error) {
      console.error('Error sending appointment confirmation:', error)
      throw error
    }
  }

  /**
   * Send appointment reminder notification
   */
  async sendAppointmentReminder(bookingData, reminderType = '24h') {
    try {
      const { booking, customer, barbershop, barber } = bookingData

      // Prepare notification data
      const notificationData = {
        customerName: customer.first_name || customer.name || 'Customer',
        customerEmail: customer.email,
        customerPhone: customer.phone,
        barbershopName: barbershop.name,
        barbershopPhone: barbershop.phone,
        barbershopAddress: barbershop.address,
        barberName: barber.first_name + ' ' + barber.last_name,
        appointmentDate: new Date(booking.appointment_date).toLocaleDateString(),
        appointmentTime: booking.appointment_time,
        serviceName: booking.service_name || 'Haircut',
        totalAmount: booking.total_amount,
        bookingId: booking.id,
        reminderType: reminderType
      }

      const results = []

      // Send SMS reminder if customer has phone and opted in
      if (customer.phone && customer.sms_opt_in) {
        try {
          const smsResult = await this.sendSMSReminder(notificationData)
          results.push({ channel: 'sms', success: smsResult.success, result: smsResult })
        } catch (error) {
          console.error('SMS reminder failed:', error)
          results.push({ channel: 'sms', success: false, error: error.message })
        }
      }

      // Send email reminder if customer has email and opted in
      if (customer.email && customer.email_opt_in !== false) {
        try {
          const emailResult = await this.sendEmailReminder(notificationData)
          results.push({ channel: 'email', success: emailResult.success, result: emailResult })
        } catch (error) {
          console.error('Email reminder failed:', error)
          results.push({ channel: 'email', success: false, error: error.message })
        }
      }

      // Log notification attempt
      await this.logNotification({
        booking_id: booking.id,
        customer_id: customer.id,
        barbershop_id: barbershop.id,
        notification_type: `appointment_reminder_${reminderType}`,
        channels: results.map(r => r.channel),
        results: results,
        sent_at: new Date().toISOString()
      })

      return {
        success: results.some(r => r.success),
        results: results,
        message: `${reminderType} reminder sent via ${results.filter(r => r.success).map(r => r.channel).join(', ')}`
      }

    } catch (error) {
      console.error('Error sending appointment reminder:', error)
      throw error
    }
  }

  /**
   * Send SMS confirmation
   */
  async sendSMSConfirmation(data) {
    const message = `Hi ${data.customerName}! Your appointment at ${data.barbershopName} is confirmed for ${data.appointmentDate} at ${data.appointmentTime} with ${data.barberName}. Service: ${data.serviceName}. Total: $${data.totalAmount}. Questions? Call ${data.barbershopPhone}. Reply STOP to opt out.`

    return await this.services.sms.sendSMS({
      to: data.customerPhone,
      message: message,
      customerId: data.bookingId,
      campaignId: 'appointment_confirmation'
    })
  }

  /**
   * Send SMS reminder
   */
  async sendSMSReminder(data) {
    const timeframe = data.reminderType === '24h' ? 'tomorrow' : 
                     data.reminderType === '2h' ? 'in 2 hours' : 'soon'

    const message = `Reminder: Your appointment with ${data.barberName} at ${data.barbershopName} is ${timeframe} (${data.appointmentDate} at ${data.appointmentTime}). Address: ${data.barbershopAddress}. Call ${data.barbershopPhone} to reschedule. Reply STOP to opt out.`

    return await this.services.sms.sendSMS({
      to: data.customerPhone,
      message: message,
      customerId: data.bookingId,
      campaignId: `appointment_reminder_${data.reminderType}`
    })
  }

  /**
   * Send email confirmation
   */
  async sendEmailConfirmation(data) {
    const emailContent = this.buildConfirmationEmailHTML(data)

    const emailMessage = {
      to: [{
        email: data.customerEmail,
        name: data.customerName
      }],
      from: {
        email: process.env.SENDGRID_FROM_EMAIL || 'noreply@bookedbarber.com',
        name: data.barbershopName
      },
      subject: `Appointment Confirmed - ${data.barbershopName}`,
      html: emailContent,
      customArgs: {
        booking_id: data.bookingId,
        notification_type: 'appointment_confirmation',
        barbershop_name: data.barbershopName
      }
    }

    return await this.services.email.sendEmailWithRetry(emailMessage)
  }

  /**
   * Send email reminder
   */
  async sendEmailReminder(data) {
    const emailContent = this.buildReminderEmailHTML(data)

    const emailMessage = {
      to: [{
        email: data.customerEmail,
        name: data.customerName
      }],
      from: {
        email: process.env.SENDGRID_FROM_EMAIL || 'noreply@bookedbarber.com',
        name: data.barbershopName
      },
      subject: `Appointment Reminder - ${data.barbershopName}`,
      html: emailContent,
      customArgs: {
        booking_id: data.bookingId,
        notification_type: `appointment_reminder_${data.reminderType}`,
        barbershop_name: data.barbershopName
      }
    }

    return await this.services.email.sendEmailWithRetry(emailMessage)
  }

  /**
   * Build confirmation email HTML
   */
  buildConfirmationEmailHTML(data) {
    return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <title>Appointment Confirmed</title>
    </head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: #f8f9fa; padding: 30px; border-radius: 10px;">
            <!-- Header -->
            <div style="text-align: center; margin-bottom: 30px;">
                <h1 style="color: #2c3e50; margin: 0;">${data.barbershopName}</h1>
                <p style="color: #666; margin: 5px 0;">Your appointment is confirmed!</p>
            </div>
            
            <!-- Appointment Details -->
            <div style="background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                <h2 style="color: #2c3e50; margin-top: 0;">Appointment Details</h2>
                
                <div style="margin: 20px 0;">
                    <table style="width: 100%; border-collapse: collapse;">
                        <tr>
                            <td style="padding: 10px 0; border-bottom: 1px solid #eee;"><strong>Date:</strong></td>
                            <td style="padding: 10px 0; border-bottom: 1px solid #eee;">${data.appointmentDate}</td>
                        </tr>
                        <tr>
                            <td style="padding: 10px 0; border-bottom: 1px solid #eee;"><strong>Time:</strong></td>
                            <td style="padding: 10px 0; border-bottom: 1px solid #eee;">${data.appointmentTime}</td>
                        </tr>
                        <tr>
                            <td style="padding: 10px 0; border-bottom: 1px solid #eee;"><strong>Barber:</strong></td>
                            <td style="padding: 10px 0; border-bottom: 1px solid #eee;">${data.barberName}</td>
                        </tr>
                        <tr>
                            <td style="padding: 10px 0; border-bottom: 1px solid #eee;"><strong>Service:</strong></td>
                            <td style="padding: 10px 0; border-bottom: 1px solid #eee;">${data.serviceName}</td>
                        </tr>
                        <tr>
                            <td style="padding: 10px 0;"><strong>Total:</strong></td>
                            <td style="padding: 10px 0; font-size: 18px; font-weight: bold; color: #27ae60;">$${data.totalAmount}</td>
                        </tr>
                    </table>
                </div>
                
                <!-- Location -->
                <div style="background: #f8f9fa; padding: 20px; border-radius: 5px; margin: 20px 0;">
                    <h3 style="margin-top: 0; color: #2c3e50;">Location</h3>
                    <p style="margin: 5px 0;"><strong>${data.barbershopName}</strong></p>
                    <p style="margin: 5px 0;">${data.barbershopAddress}</p>
                    <p style="margin: 5px 0;">Phone: ${data.barbershopPhone}</p>
                </div>
                
                <!-- Call to Action -->
                <div style="text-align: center; margin: 30px 0;">
                    <p style="color: #666; margin-bottom: 20px;">Need to make changes to your appointment?</p>
                    <a href="tel:${data.barbershopPhone}" 
                       style="background: #007cba; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block; margin-right: 10px;">
                        Call ${data.barbershopName}
                    </a>
                </div>
            </div>
            
            <!-- Footer -->
            <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 12px; color: #666; text-align: center;">
                <p>Thank you for choosing ${data.barbershopName}!</p>
                <p>This confirmation was sent to ${data.customerEmail}</p>
                <p>Booking ID: ${data.bookingId}</p>
            </div>
        </div>
    </body>
    </html>
    `
  }

  /**
   * Build reminder email HTML
   */
  buildReminderEmailHTML(data) {
    const timeframe = data.reminderType === '24h' ? 'tomorrow' : 
                     data.reminderType === '2h' ? 'in 2 hours' : 'soon'

    return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <title>Appointment Reminder</title>
    </head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: #fff3cd; padding: 30px; border-radius: 10px; border-left: 5px solid #ffc107;">
            <!-- Header -->
            <div style="text-align: center; margin-bottom: 30px;">
                <h1 style="color: #856404; margin: 0;">Appointment Reminder</h1>
                <p style="color: #856404; margin: 5px 0; font-size: 18px;">Your appointment is ${timeframe}!</p>
            </div>
            
            <!-- Appointment Details -->
            <div style="background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                <h2 style="color: #2c3e50; margin-top: 0;">Appointment Details</h2>
                
                <div style="margin: 20px 0;">
                    <table style="width: 100%; border-collapse: collapse;">
                        <tr>
                            <td style="padding: 10px 0; border-bottom: 1px solid #eee;"><strong>Date:</strong></td>
                            <td style="padding: 10px 0; border-bottom: 1px solid #eee;">${data.appointmentDate}</td>
                        </tr>
                        <tr>
                            <td style="padding: 10px 0; border-bottom: 1px solid #eee;"><strong>Time:</strong></td>
                            <td style="padding: 10px 0; border-bottom: 1px solid #eee; font-size: 18px; font-weight: bold;">${data.appointmentTime}</td>
                        </tr>
                        <tr>
                            <td style="padding: 10px 0; border-bottom: 1px solid #eee;"><strong>Barber:</strong></td>
                            <td style="padding: 10px 0; border-bottom: 1px solid #eee;">${data.barberName}</td>
                        </tr>
                        <tr>
                            <td style="padding: 10px 0;"><strong>Service:</strong></td>
                            <td style="padding: 10px 0;">${data.serviceName}</td>
                        </tr>
                    </table>
                </div>
                
                <!-- Location -->
                <div style="background: #e8f4f8; padding: 20px; border-radius: 5px; margin: 20px 0;">
                    <h3 style="margin-top: 0; color: #2c3e50;">Location</h3>
                    <p style="margin: 5px 0;"><strong>${data.barbershopName}</strong></p>
                    <p style="margin: 5px 0;">${data.barbershopAddress}</p>
                    <p style="margin: 5px 0;">Phone: ${data.barbershopPhone}</p>
                </div>
                
                <!-- Call to Action -->
                <div style="text-align: center; margin: 30px 0;">
                    <p style="color: #666; margin-bottom: 20px;">Need to reschedule or cancel?</p>
                    <a href="tel:${data.barbershopPhone}" 
                       style="background: #007cba; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">
                        Call ${data.barbershopName}
                    </a>
                </div>
            </div>
            
            <!-- Footer -->
            <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 12px; color: #666; text-align: center;">
                <p>See you ${timeframe} at ${data.barbershopName}!</p>
                <p>Booking ID: ${data.bookingId}</p>
            </div>
        </div>
    </body>
    </html>
    `
  }

  /**
   * Process scheduled notifications (called by cron job)
   */
  async processScheduledNotifications() {
    try {
      console.log('🔔 Processing scheduled notifications...')

      // Get appointments that need reminders
      const now = new Date()
      const twentyFourHours = new Date(now.getTime() + 24 * 60 * 60 * 1000)
      const twoHours = new Date(now.getTime() + 2 * 60 * 60 * 1000)

      // 24-hour reminders
      const { data: upcoming24h } = await supabase
        .from('bookings')
        .select(`
          *,
          customers (*),
          barbershops (*),
          barbershop_staff (*)
        `)
        .eq('status', 'confirmed')
        .gte('appointment_date', now.toISOString().split('T')[0])
        .lte('appointment_date', twentyFourHours.toISOString().split('T')[0])
        .is('reminder_24h_sent', null)

      // 2-hour reminders
      const { data: upcoming2h } = await supabase
        .from('bookings')
        .select(`
          *,
          customers (*),
          barbershops (*),
          barbershop_staff (*)
        `)
        .eq('status', 'confirmed')
        .gte('appointment_datetime', now.toISOString())
        .lte('appointment_datetime', twoHours.toISOString())
        .is('reminder_2h_sent', null)

      // Process 24-hour reminders
      for (const booking of upcoming24h || []) {
        try {
          await this.sendAppointmentReminder({
            booking: booking,
            customer: booking.customers,
            barbershop: booking.barbershops,
            barber: booking.barbershop_staff
          }, '24h')

          // Mark as sent
          await supabase
            .from('bookings')
            .update({ reminder_24h_sent: new Date().toISOString() })
            .eq('id', booking.id)

        } catch (error) {
          console.error('Error sending 24h reminder:', error)
        }
      }

      // Process 2-hour reminders
      for (const booking of upcoming2h || []) {
        try {
          await this.sendAppointmentReminder({
            booking: booking,
            customer: booking.customers,
            barbershop: booking.barbershops,
            barber: booking.barbershop_staff
          }, '2h')

          // Mark as sent
          await supabase
            .from('bookings')
            .update({ reminder_2h_sent: new Date().toISOString() })
            .eq('id', booking.id)

        } catch (error) {
          console.error('Error sending 2h reminder:', error)
        }
      }

      console.log(`🔔 Processed ${(upcoming24h?.length || 0) + (upcoming2h?.length || 0)} reminder notifications`)

      return {
        success: true,
        sent24h: upcoming24h?.length || 0,
        sent2h: upcoming2h?.length || 0
      }

    } catch (error) {
      console.error('Error processing scheduled notifications:', error)
      throw error
    }
  }

  /**
   * Log notification attempt to database
   */
  async logNotification(notificationData) {
    try {
      await supabase
        .from('notification_logs')
        .insert(notificationData)

    } catch (error) {
      console.error('Error logging notification:', error)
    }
  }

  /**
   * Get service health status
   */
  async getServiceHealth() {
    return {
      service: 'notification-service',
      status: this.initialized ? 'healthy' : 'unhealthy',
      services: {
        sms: await this.services.sms.getServiceHealth(),
        email: this.services.email.getServiceStatus()
      },
      features: {
        appointment_confirmations: true,
        appointment_reminders: true,
        automated_scheduling: true,
        multi_channel: true
      }
    }
  }
}

const notificationService = new NotificationService()

module.exports = {
  notificationService,
  NotificationService
}