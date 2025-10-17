/**
 * Automation Notification Service
 * 
 * Handles manager notifications for high-risk events and escalations.
 */

import sgMail from '@sendgrid/mail'
import { createClient } from '@/lib/supabase/server'

sgMail.setApiKey(process.env.SENDGRID_API_KEY)

export class AutomationNotificationService {
  constructor() {
    this.initialized = false
  }

  async initialize() {
    this.initialized = true
    console.log('✅ Notification Service initialized')
  }

  /**
   * Send manager notification for automation events
   */
  async sendManagerNotification({ barbershopId, userId, alertType, alertData, jobId }) {
    const supabase = await createClient()
    
    try {
      console.log(`🔔 Sending manager notification: ${jobId}`)
      
      // Get manager details
      const { data: manager } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()

      if (!manager) {
        throw new Error('Manager not found')
      }

      // Generate notification content
      const notification = this.generateNotification(alertType, alertData, manager)
      
      // Send email notification
      await this.sendEmailNotification(manager.email, notification)
      
      // Create dashboard notification
      await this.createDashboardNotification({
        supabase,
        barbershopId,
        userId,
        notification,
        jobId
      })

      console.log(`✅ Manager notification sent: ${jobId}`)
      
      return {
        success: true,
        message: 'Manager notification sent',
        alertType
      }
      
    } catch (error) {
      console.error(`❌ Manager notification failed: ${jobId}`, error)
      throw error
    }
  }

  /**
   * Generate notification content based on alert type
   */
  generateNotification(alertType, alertData, manager) {
    const notifications = {
      high_risk_booking: {
        subject: '🚨 High-Risk Appointment Alert',
        message: `A high-risk appointment has been detected. Customer ${alertData.customerName} has a ${(alertData.riskScore * 100).toFixed(0)}% no-show probability.`,
        priority: 'high',
        actionUrl: `/dashboard/bookings/${alertData.appointmentId}`
      },
      payment_failure: {
        subject: '💳 Payment Collection Failed',
        message: `Automatic payment collection failed for ${alertData.customerName}. Amount: $${alertData.amount}`,
        priority: 'medium',
        actionUrl: `/dashboard/payments/${alertData.paymentId}`
      },
      repeated_no_shows: {
        subject: '⚠️ Repeated No-Show Customer',
        message: `Customer ${alertData.customerName} has reached ${alertData.strikeCount} no-show strikes.`,
        priority: 'high',
        actionUrl: `/dashboard/customers/${alertData.customerId}`
      }
    }

    return notifications[alertType] || {
      subject: 'Automation Alert',
      message: `Alert: ${alertType}`,
      priority: 'low'
    }
  }

  /**
   * Send email notification
   */
  async sendEmailNotification(email, notification) {
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #fee2e2; border: 1px solid #fca5a5; padding: 15px; border-radius: 6px; margin: 20px 0;">
          <h2 style="margin: 0; color: #dc2626;">${notification.subject}</h2>
        </div>
        
        <p>${notification.message}</p>
        
        ${notification.actionUrl ? `
          <div style="margin: 20px 0;">
            <a href="${process.env.NEXTAUTH_URL}${notification.actionUrl}" 
               style="background: #2563eb; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
              View Details
            </a>
          </div>
        ` : ''}
        
        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; font-size: 12px; color: #6b7280;">
          <p>This is an automated alert from your 6FB booking system.</p>
        </div>
      </div>
    `

    await sgMail.send({
      to: email,
      from: process.env.SENDGRID_FROM_EMAIL,
      subject: notification.subject,
      html
    })
  }

  /**
   * Create dashboard notification
   */
  async createDashboardNotification({ supabase, barbershopId, userId, notification, jobId }) {
    await supabase
      .from('notifications')
      .insert({
        user_id: userId,
        barbershop_id: barbershopId,
        type: 'automation_alert',
        title: notification.subject,
        message: notification.message,
        priority: notification.priority,
        action_url: notification.actionUrl,
        automation_job_id: jobId,
        read: false,
        created_at: new Date().toISOString()
      })
  }

  async shutdown() {
    this.initialized = false
    console.log('✅ Notification Service shutdown')
  }
}