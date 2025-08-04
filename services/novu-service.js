import { Novu } from '@novu/node'
import { novuTemplates, validateTemplateVariables } from '@/config/novu-templates'

/**
 * Novu Notification Service
 * Handles all notification sending through Novu workflows
 */
class NovuService {
  constructor() {
    if (!process.env.NOVU_API_KEY) {
      console.warn('Novu API key not found. Notifications will be disabled.')
      this.client = null
      return
    }

    this.client = new Novu(process.env.NOVU_API_KEY)
    this.baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:9999'
  }

  /**
   * Send a notification using a predefined template
   * @param {string} templateId - Template identifier
   * @param {string} subscriberId - User ID to send to
   * @param {object} data - Template variables
   * @param {object} options - Additional options
   */
  async sendNotification(templateId, subscriberId, data = {}, options = {}) {
    if (!this.client) {
      console.log(`[Novu] Would send ${templateId} to ${subscriberId}:`, data)
      return { success: false, message: 'Novu not configured' }
    }

    try {
      // Add common variables
      const payload = {
        ...data,
        dashboardUrl: `${this.baseUrl}/dashboard`,
        helpUrl: `${this.baseUrl}/help`,
        ...options.extraData
      }

      const response = await this.client.trigger(templateId, {
        to: {
          subscriberId: subscriberId,
          email: options.email,
          firstName: options.firstName,
          lastName: options.lastName,
        },
        payload: payload,
        actor: options.actor,
        tenant: options.tenant,
      })

      console.log(`[Novu] Notification sent: ${templateId} to ${subscriberId}`)
      return { success: true, transactionId: response.data.transactionId }

    } catch (error) {
      console.error(`[Novu] Failed to send ${templateId}:`, error)
      return { success: false, error: error.message }
    }
  }

  /**
   * Welcome sequence for new users
   */
  async sendWelcomeSequence(userId, userDetails) {
    return this.sendNotification('welcome-sequence', userId, {
      firstName: userDetails.firstName,
      dashboardUrl: `${this.baseUrl}/dashboard`,
      helpUrl: `${this.baseUrl}/help`,
    }, {
      email: userDetails.email,
      firstName: userDetails.firstName,
      lastName: userDetails.lastName,
    })
  }

  /**
   * Booking confirmation and reminders
   */
  async sendBookingConfirmation(userId, bookingDetails) {
    const data = {
      serviceName: bookingDetails.serviceName,
      barberName: bookingDetails.barberName,
      appointmentDate: new Date(bookingDetails.appointmentTime).toLocaleDateString(),
      appointmentTime: new Date(bookingDetails.appointmentTime).toLocaleTimeString(),
      duration: bookingDetails.duration,
      price: bookingDetails.price,
      shopName: bookingDetails.shopName,
      shopAddress: bookingDetails.shopAddress,
      rescheduleUrl: `${this.baseUrl}/bookings/${bookingDetails.id}/reschedule`,
      cancelUrl: `${this.baseUrl}/bookings/${bookingDetails.id}/cancel`,
    }

    return this.sendNotification('booking-workflow', userId, data, {
      email: bookingDetails.customerEmail,
      firstName: bookingDetails.customerName?.split(' ')[0],
    })
  }

  /**
   * AI insights notification
   */
  async sendAIInsight(userId, insight) {
    return this.sendNotification('ai-insights', userId, {
      insightTitle: insight.title,
      insightId: insight.id,
      insightDescription: insight.description,
      insightRecommendation: insight.recommendation,
      confidence: Math.round(insight.confidence * 100),
    })
  }

  /**
   * Weekly insights digest
   */
  async sendWeeklyInsights(userId, insights, metrics) {
    const data = {
      firstName: metrics.firstName,
      insights: insights.map(insight => ({
        title: insight.title,
        description: insight.description,
        recommendation: insight.recommendation,
        confidence: Math.round(insight.confidence * 100),
      })),
      totalBookings: metrics.totalBookings,
      bookingTrend: metrics.bookingTrend,
      revenue: metrics.revenue,
      revenueTrend: metrics.revenueTrend,
      avgBookingValue: metrics.avgBookingValue,
      retentionRate: metrics.retentionRate,
    }

    return this.sendNotification('ai-insights', userId, data, {
      email: metrics.email,
      firstName: metrics.firstName,
    })
  }

  /**
   * Payment received notification
   */
  async sendPaymentReceived(userId, paymentDetails) {
    const data = {
      amount: paymentDetails.amount,
      customerName: paymentDetails.customerName,
      serviceName: paymentDetails.serviceName,
      paymentMethod: paymentDetails.paymentMethod,
      paymentDate: new Date(paymentDetails.createdAt).toLocaleDateString(),
    }

    return this.sendNotification('payment-notifications', userId, data)
  }

  /**
   * Subscription renewal notification
   */
  async sendSubscriptionRenewal(userId, subscriptionDetails) {
    const data = {
      planName: subscriptionDetails.planName,
      amount: subscriptionDetails.amount,
      features: subscriptionDetails.features,
      nextBillingDate: new Date(subscriptionDetails.nextBillingDate).toLocaleDateString(),
    }

    return this.sendNotification('payment-notifications', userId, data, {
      email: subscriptionDetails.email,
      firstName: subscriptionDetails.firstName,
    })
  }

  /**
   * Post-service follow-up
   */
  async sendPostServiceFollowup(customerId, serviceDetails) {
    const data = {
      customerName: serviceDetails.customerName,
      shopName: serviceDetails.shopName,
      reviewUrl: `${this.baseUrl}/review/${serviceDetails.bookingId}`,
      bookingUrl: `${this.baseUrl}/book?barber=${serviceDetails.barberId}`,
    }

    return this.sendNotification('customer-engagement', customerId, data, {
      email: serviceDetails.customerEmail,
      firstName: serviceDetails.customerName?.split(' ')[0],
    })
  }

  /**
   * Win-back campaign for inactive customers
   */
  async sendWinBackCampaign(customerId, customerDetails) {
    const offerExpiry = new Date()
    offerExpiry.setDate(offerExpiry.getDate() + 14) // 2 weeks from now

    const data = {
      customerName: customerDetails.firstName,
      shopName: customerDetails.shopName,
      barberName: customerDetails.preferredBarberName,
      offerExpiry: offerExpiry.toLocaleDateString(),
      bookingUrl: `${this.baseUrl}/book?discount=COMEBACK20`,
    }

    return this.sendNotification('customer-engagement', customerId, data, {
      email: customerDetails.email,
      firstName: customerDetails.firstName,
    })
  }

  /**
   * System alert for high error rates
   */
  async sendSystemAlert(alertDetails) {
    const adminUsers = process.env.ADMIN_USER_IDS?.split(',') || []
    
    const data = {
      errorRate: alertDetails.errorRate,
      timePeriod: alertDetails.timePeriod,
      affectedServices: alertDetails.affectedServices.join(', '),
      firstDetected: new Date(alertDetails.firstDetected).toLocaleString(),
      monitoringUrl: `${this.baseUrl}/monitoring`,
    }

    const results = []
    for (const adminId of adminUsers) {
      const result = await this.sendNotification('system-alerts', adminId, data)
      results.push(result)
    }

    return results
  }

  /**
   * Bulk notification to multiple users
   */
  async sendBulkNotification(templateId, recipients, data = {}) {
    const results = []
    
    for (const recipient of recipients) {
      try {
        const result = await this.sendNotification(templateId, recipient.userId, data, {
          email: recipient.email,
          firstName: recipient.firstName,
          lastName: recipient.lastName,
        })
        results.push({ userId: recipient.userId, ...result })
      } catch (error) {
        results.push({ 
          userId: recipient.userId, 
          success: false, 
          error: error.message 
        })
      }
    }

    return results
  }

  /**
   * Create or update a subscriber
   */
  async upsertSubscriber(subscriberId, data) {
    if (!this.client) return { success: false, message: 'Novu not configured' }

    try {
      await this.client.subscribers.identify(subscriberId, {
        email: data.email,
        firstName: data.firstName,
        lastName: data.lastName,
        phone: data.phone,
        avatar: data.avatar,
        data: {
          subscriptionPlan: data.subscriptionPlan,
          userType: data.userType,
          businessName: data.businessName,
          timezone: data.timezone,
          language: data.language,
        }
      })

      return { success: true }
    } catch (error) {
      console.error('[Novu] Failed to upsert subscriber:', error)
      return { success: false, error: error.message }
    }
  }

  /**
   * Update subscriber preferences
   */
  async updatePreferences(subscriberId, preferences) {
    if (!this.client) return { success: false, message: 'Novu not configured' }

    try {
      await this.client.subscribers.updatePreferences(subscriberId, {
        enabled: preferences.enabled,
        channels: preferences.channels,
      })

      return { success: true }
    } catch (error) {
      console.error('[Novu] Failed to update preferences:', error)
      return { success: false, error: error.message }
    }
  }

  /**
   * Delete a subscriber
   */
  async deleteSubscriber(subscriberId) {
    if (!this.client) return { success: false, message: 'Novu not configured' }

    try {
      await this.client.subscribers.delete(subscriberId)
      return { success: true }
    } catch (error) {
      console.error('[Novu] Failed to delete subscriber:', error)
      return { success: false, error: error.message }
    }
  }

  /**
   * Get notification statistics
   */
  async getNotificationStats(templateId, dateRange = {}) {
    if (!this.client) return { success: false, message: 'Novu not configured' }

    try {
      // This would use Novu's analytics API when available
      // For now, return mock data
      return {
        success: true,
        stats: {
          sent: 0,
          delivered: 0,
          opened: 0,
          clicked: 0,
          bounced: 0,
        }
      }
    } catch (error) {
      console.error('[Novu] Failed to get stats:', error)
      return { success: false, error: error.message }
    }
  }
}

// Export singleton instance
export const novuService = new NovuService()
export default novuService