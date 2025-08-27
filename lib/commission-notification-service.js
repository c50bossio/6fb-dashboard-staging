/**
 * Commission Notification Service
 * Real-time notifications for commission processing and payouts
 * Integrates with existing notification systems and provides webhooks
 */

import { createClient } from '@/lib/supabase/client'

class CommissionNotificationService {
  constructor() {
    this.supabase = null
    this.initializeClient()
    this.notificationChannels = {
      email: true,
      sms: false, // Disabled by default
      push: true,
      webhook: true,
      in_app: true
    }
  }

  initializeClient() {
    if (typeof window !== 'undefined') {
      this.supabase = createClient()
    }
  }

  getSupabase() {
    if (!this.supabase && typeof window !== 'undefined') {
      this.supabase = createClient()
    }
    return this.supabase
  }

  /**
   * Send commission calculated notification
   * @param {Object} data - Commission calculation data
   */
  async sendCommissionCalculated(data) {
    const {
      barberId,
      barbershopId,
      paymentIntentId,
      commissionAmount,
      shopAmount,
      arrangementType,
      customerName,
      serviceDetails
    } = data

    try {
      const supabase = this.getSupabase()
      
      // Get barber and barbershop details
      const { data: barberData } = await supabase
        .from('profiles')
        .select('email, full_name, notification_preferences')
        .eq('id', barberId)
        .single()

      const { data: barbershopData } = await supabase
        .from('barbershops')
        .select('name, owner_id')
        .eq('id', barbershopId)
        .single()

      if (!barberData || !barbershopData) {
        console.warn('Missing barber or barbershop data for notification')
        return
      }

      const notificationData = {
        type: 'commission_calculated',
        recipient_id: barberId,
        title: 'Commission Earned! 💰',
        message: `You earned $${commissionAmount.toFixed(2)} from ${customerName || 'a customer'} at ${barbershopData.name}`,
        data: {
          commission_amount: commissionAmount,
          shop_amount: shopAmount,
          arrangement_type: arrangementType,
          payment_intent_id: paymentIntentId,
          customer_name: customerName,
          service_details: serviceDetails,
          barbershop_name: barbershopData.name
        },
        channels: ['in_app', 'push'],
        priority: 'normal',
        created_at: new Date().toISOString()
      }

      await this.sendNotification(notificationData)

      // Real-time update via Supabase channels
      await this.sendRealtimeUpdate('commission_update', {
        barber_id: barberId,
        barbershop_id: barbershopId,
        type: 'commission_calculated',
        amount: commissionAmount,
        timestamp: new Date().toISOString()
      })

    } catch (error) {
      console.error('Error sending commission calculated notification:', error)
    }
  }

  /**
   * Send commission paid notification
   * @param {Object} data - Payout data
   */
  async sendCommissionPaid(data) {
    const {
      barberId,
      barbershopId,
      amount,
      transferId,
      method = 'stripe_transfer'
    } = data

    try {
      const supabase = this.getSupabase()
      
      const { data: barberData } = await supabase
        .from('profiles')
        .select('email, full_name, notification_preferences')
        .eq('id', barberId)
        .single()

      const { data: barbershopData } = await supabase
        .from('barbershops')
        .select('name')
        .eq('id', barbershopId)
        .single()

      if (!barberData || !barbershopData) {
        return
      }

      const methodText = method === 'stripe_transfer' ? 'automatically transferred' : 'processed'
      
      const notificationData = {
        type: 'commission_paid',
        recipient_id: barberId,
        title: 'Commission Paid! 💳',
        message: `$${amount.toFixed(2)} has been ${methodText} to your account from ${barbershopData.name}`,
        data: {
          amount: amount,
          method: method,
          transfer_id: transferId,
          barbershop_name: barbershopData.name
        },
        channels: ['in_app', 'push', 'email'],
        priority: 'high',
        created_at: new Date().toISOString()
      }

      await this.sendNotification(notificationData)

      // Update balance in real-time
      await this.sendRealtimeUpdate('commission_update', {
        barber_id: barberId,
        barbershop_id: barbershopId,
        type: 'commission_paid',
        amount: amount,
        method: method,
        timestamp: new Date().toISOString()
      })

    } catch (error) {
      console.error('Error sending commission paid notification:', error)
    }
  }

  /**
   * Send balance update notification (daily/weekly summaries)
   * @param {Object} data - Balance summary data
   */
  async sendBalanceUpdate(data) {
    const {
      barberId,
      barbershopId,
      pendingAmount,
      totalEarned,
      transactionCount,
      period = 'daily'
    } = data

    try {
      const supabase = this.getSupabase()
      
      const { data: barberData } = await supabase
        .from('profiles')
        .select('email, full_name, notification_preferences')
        .eq('id', barberId)
        .single()

      if (!barberData) return

      // Check if user wants balance update notifications
      const preferences = barberData.notification_preferences || {}
      if (preferences.balance_updates === false) {
        return
      }

      const notificationData = {
        type: 'balance_update',
        recipient_id: barberId,
        title: `${period.charAt(0).toUpperCase() + period.slice(1)} Commission Summary`,
        message: `You have $${pendingAmount.toFixed(2)} pending and earned $${totalEarned.toFixed(2)} total from ${transactionCount} transactions`,
        data: {
          pending_amount: pendingAmount,
          total_earned: totalEarned,
          transaction_count: transactionCount,
          period: period
        },
        channels: ['in_app'],
        priority: 'low',
        created_at: new Date().toISOString()
      }

      await this.sendNotification(notificationData)

    } catch (error) {
      console.error('Error sending balance update notification:', error)
    }
  }

  /**
   * Send payout error notification
   * @param {Object} data - Error data
   */
  async sendPayoutError(data) {
    const {
      barberId,
      barbershopId,
      amount,
      errorMessage,
      errorCode,
      transferId
    } = data

    try {
      const supabase = this.getSupabase()
      
      const { data: barberData } = await supabase
        .from('profiles')
        .select('email, full_name')
        .eq('id', barberId)
        .single()

      if (!barberData) return

      const notificationData = {
        type: 'payout_error',
        recipient_id: barberId,
        title: 'Payout Issue ⚠️',
        message: `There was an issue processing your $${amount.toFixed(2)} payout. Our team has been notified.`,
        data: {
          amount: amount,
          error_message: errorMessage,
          error_code: errorCode,
          transfer_id: transferId
        },
        channels: ['in_app', 'email'],
        priority: 'high',
        created_at: new Date().toISOString()
      }

      await this.sendNotification(notificationData)

      // Also notify shop owner
      const { data: shopData } = await supabase
        .from('barbershops')
        .select('owner_id, name')
        .eq('id', barbershopId)
        .single()

      if (shopData) {
        const ownerNotification = {
          type: 'barber_payout_error',
          recipient_id: shopData.owner_id,
          title: 'Barber Payout Issue',
          message: `Payout to ${barberData.full_name} ($${amount.toFixed(2)}) failed: ${errorMessage}`,
          data: {
            barber_id: barberId,
            barber_name: barberData.full_name,
            amount: amount,
            error_message: errorMessage
          },
          channels: ['in_app', 'email'],
          priority: 'high',
          created_at: new Date().toISOString()
        }

        await this.sendNotification(ownerNotification)
      }

    } catch (error) {
      console.error('Error sending payout error notification:', error)
    }
  }

  /**
   * Send notification through configured channels
   * @param {Object} notificationData - Notification details
   */
  async sendNotification(notificationData) {
    try {
      const supabase = this.getSupabase()
      
      // Store notification in database
      const { data: notification } = await supabase
        .from('notifications')
        .insert({
          ...notificationData,
          status: 'pending'
        })
        .select()
        .single()

      if (!notification) {
        throw new Error('Failed to create notification record')
      }

      // Send through each configured channel
      const sendPromises = []

      if (notificationData.channels.includes('in_app')) {
        sendPromises.push(this.sendInAppNotification(notificationData))
      }

      if (notificationData.channels.includes('push')) {
        sendPromises.push(this.sendPushNotification(notificationData))
      }

      if (notificationData.channels.includes('email')) {
        sendPromises.push(this.sendEmailNotification(notificationData))
      }

      if (notificationData.channels.includes('webhook')) {
        sendPromises.push(this.sendWebhookNotification(notificationData))
      }

      // Send all notifications in parallel
      const results = await Promise.allSettled(sendPromises)
      
      // Update notification status based on results
      const failedChannels = []
      results.forEach((result, index) => {
        if (result.status === 'rejected') {
          failedChannels.push(notificationData.channels[index])
          console.error(`Failed to send via ${notificationData.channels[index]}:`, result.reason)
        }
      })

      const status = failedChannels.length === 0 ? 'sent' : 
                    failedChannels.length === notificationData.channels.length ? 'failed' : 'partial'

      await supabase
        .from('notifications')
        .update({
          status: status,
          failed_channels: failedChannels,
          sent_at: new Date().toISOString()
        })
        .eq('id', notification.id)

    } catch (error) {
      console.error('Error sending notification:', error)
    }
  }

  /**
   * Send in-app notification (real-time via Supabase)
   */
  async sendInAppNotification(notificationData) {
    const supabase = this.getSupabase()
    
    // Real-time notification via Supabase channels
    await supabase.channel(`user_${notificationData.recipient_id}`)
      .send({
        type: 'broadcast',
        event: 'notification',
        payload: notificationData
      })
  }

  /**
   * Send push notification (integrate with your push service)
   */
  async sendPushNotification(notificationData) {
    // TODO: Integrate with push notification service (Firebase, OneSignal, etc.)
    
  }

  /**
   * Send email notification (integrate with email service)
   */
  async sendEmailNotification(notificationData) {
    try {
      // TODO: Integrate with email service (SendGrid, Mailgun, etc.)
      const response = await fetch('/api/notifications/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(notificationData)
      })

      if (!response.ok) {
        throw new Error(`Email API failed: ${response.status}`)
      }

    } catch (error) {
      console.error('Email notification failed:', error)
      throw error
    }
  }

  /**
   * Send webhook notification to external systems
   */
  async sendWebhookNotification(notificationData) {
    // TODO: Send to configured webhook URLs
    
  }

  /**
   * Send real-time update via Supabase channels
   * @param {string} eventType - Type of update
   * @param {Object} data - Update data
   */
  async sendRealtimeUpdate(eventType, data) {
    try {
      const supabase = this.getSupabase()
      
      // Send to barber's personal channel
      await supabase.channel(`barber_${data.barber_id}`)
        .send({
          type: 'broadcast',
          event: eventType,
          payload: data
        })

      // Send to barbershop channel
      await supabase.channel(`barbershop_${data.barbershop_id}`)
        .send({
          type: 'broadcast',
          event: eventType,
          payload: data
        })

    } catch (error) {
      console.error('Error sending real-time update:', error)
    }
  }

  /**
   * Get notification preferences for a user
   * @param {string} userId - User ID
   * @returns {Object} Notification preferences
   */
  async getNotificationPreferences(userId) {
    try {
      const supabase = this.getSupabase()
      
      const { data } = await supabase
        .from('profiles')
        .select('notification_preferences')
        .eq('id', userId)
        .single()

      return data?.notification_preferences || {
        commission_calculated: true,
        commission_paid: true,
        balance_updates: true,
        payout_errors: true,
        email: true,
        push: true,
        sms: false
      }
    } catch (error) {
      console.error('Error fetching notification preferences:', error)
      return {}
    }
  }

  /**
   * Update notification preferences for a user
   * @param {string} userId - User ID
   * @param {Object} preferences - New preferences
   */
  async updateNotificationPreferences(userId, preferences) {
    try {
      const supabase = this.getSupabase()
      
      const { error } = await supabase
        .from('profiles')
        .update({
          notification_preferences: preferences,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId)

      if (error) throw error

      return { success: true }

    } catch (error) {
      console.error('Error updating notification preferences:', error)
      return { success: false, error: error.message }
    }
  }

  /**
   * Send daily commission summary to all barbers
   */
  async sendDailyCommissionSummaries() {
    try {
      const supabase = this.getSupabase()
      
      // Get all barbers with pending commissions
      const { data: balances } = await supabase
        .from('barber_commission_balances')
        .select(`
          *,
          profiles:barber_id (
            id,
            full_name,
            email,
            notification_preferences
          ),
          barbershops (
            name
          )
        `)
        .gt('pending_amount', 0)

      for (const balance of balances || []) {
        const preferences = balance.profiles?.notification_preferences || {}
        
        if (preferences.daily_summary !== false) {
          await this.sendBalanceUpdate({
            barberId: balance.barber_id,
            barbershopId: balance.barbershop_id,
            pendingAmount: balance.pending_amount,
            totalEarned: balance.total_earned,
            transactionCount: 1, // Would need to calculate this
            period: 'daily'
          })
        }
      }

    } catch (error) {
      console.error('Error sending daily commission summaries:', error)
    }
  }
}

// Export singleton instance
const commissionNotificationService = new CommissionNotificationService()
export default commissionNotificationService

// Named exports
export { CommissionNotificationService, commissionNotificationService }