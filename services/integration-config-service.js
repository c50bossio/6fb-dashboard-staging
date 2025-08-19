/**
 * Integration Configuration Management Service
 * Centralized management of all external service integrations
 */

const { createClient } = require('@supabase/supabase-js')
const { stripeService } = require('./stripe-service')
const { twilioSMSService } = require('./twilio-service')
const { enhancedSendGridService } = require('./sendgrid-service-fixed')
const { calendarIntegrationService } = require('./calendar-integration-service')
const { notificationService } = require('./notification-service')

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

class IntegrationConfigService {
  constructor() {
    this.integrations = {
      stripe: {
        service: stripeService,
        name: 'Stripe Payments',
        description: 'Accept online payments and manage payouts',
        category: 'payments',
        required: false,
        features: ['online_payments', 'stripe_connect', 'subscription_billing']
      },
      twilio: {
        service: twilioSMSService,
        name: 'Twilio SMS',
        description: 'Send appointment reminders and marketing campaigns via SMS',
        category: 'communications',
        required: false,
        features: ['sms_reminders', 'marketing_campaigns', 'customer_notifications']
      },
      sendgrid: {
        service: enhancedSendGridService,
        name: 'SendGrid Email',
        description: 'Send email confirmations, reminders, and newsletters',
        category: 'communications',
        required: false,
        features: ['email_confirmations', 'email_reminders', 'newsletter_campaigns']
      },
      google_calendar: {
        service: calendarIntegrationService,
        name: 'Google Calendar',
        description: 'Sync appointments with Google Calendar',
        category: 'calendar',
        required: false,
        features: ['calendar_sync', 'ical_export', 'appointment_management']
      },
      notifications: {
        service: notificationService,
        name: 'Notification System',
        description: 'Unified appointment notifications across all channels',
        category: 'communications',
        required: true,
        features: ['appointment_confirmations', 'appointment_reminders', 'multi_channel']
      }
    }
    
    this.initialized = false
    this.init()
  }

  async init() {
    console.log('⚙️ Initializing Integration Configuration Service...')
    this.initialized = true
  }

  /**
   * Get all available integrations
   */
  getAvailableIntegrations() {
    return Object.entries(this.integrations).map(([key, integration]) => ({
      id: key,
      name: integration.name,
      description: integration.description,
      category: integration.category,
      required: integration.required,
      features: integration.features
    }))
  }

  /**
   * Get integration status for a barbershop
   */
  async getIntegrationStatus(barbershopId, userId = null) {
    try {
      const status = {}

      for (const [key, integration] of Object.entries(this.integrations)) {
        try {
          const integrationStatus = await this.checkIntegrationStatus(key, barbershopId, userId)
          status[key] = {
            ...integrationStatus,
            name: integration.name,
            description: integration.description,
            category: integration.category,
            required: integration.required,
            features: integration.features
          }
        } catch (error) {
          console.error(`Error checking ${key} status:`, error)
          status[key] = {
            configured: false,
            enabled: false,
            healthy: false,
            error: error.message,
            name: integration.name,
            description: integration.description,
            category: integration.category,
            required: integration.required,
            features: integration.features
          }
        }
      }

      return {
        success: true,
        integrations: status,
        summary: {
          total: Object.keys(this.integrations).length,
          configured: Object.values(status).filter(s => s.configured).length,
          enabled: Object.values(status).filter(s => s.enabled).length,
          healthy: Object.values(status).filter(s => s.healthy).length
        }
      }

    } catch (error) {
      console.error('Error getting integration status:', error)
      throw error
    }
  }

  /**
   * Check individual integration status
   */
  async checkIntegrationStatus(integrationKey, barbershopId, userId = null) {
    switch (integrationKey) {
      case 'stripe':
        return await this.checkStripeStatus(barbershopId, userId)
      
      case 'twilio':
        return await this.checkTwilioStatus()
      
      case 'sendgrid':
        return await this.checkSendGridStatus()
      
      case 'google_calendar':
        return await this.checkGoogleCalendarStatus(userId)
      
      case 'notifications':
        return await this.checkNotificationStatus()
      
      default:
        throw new Error(`Unknown integration: ${integrationKey}`)
    }
  }

  /**
   * Check Stripe integration status
   */
  async checkStripeStatus(barbershopId, userId) {
    try {
      const healthCheck = await stripeService.healthCheck()
      
      // Check if Stripe Connect is set up
      let connectConfigured = false
      let connectEnabled = false
      
      if (userId) {
        const { data: connectAccount } = await supabase
          .from('stripe_connected_accounts')
          .select('stripe_account_id, onboarding_completed, charges_enabled')
          .eq('user_id', userId)
          .single()

        if (connectAccount) {
          connectConfigured = true
          connectEnabled = connectAccount.onboarding_completed && connectAccount.charges_enabled
        }
      }

      return {
        configured: healthCheck.status === 'healthy',
        enabled: healthCheck.status === 'healthy',
        healthy: healthCheck.status === 'healthy',
        connect_configured: connectConfigured,
        connect_enabled: connectEnabled,
        details: healthCheck
      }

    } catch (error) {
      return {
        configured: false,
        enabled: false,
        healthy: false,
        error: error.message
      }
    }
  }

  /**
   * Check Twilio SMS status
   */
  async checkTwilioStatus() {
    try {
      const healthCheck = await twilioSMSService.getServiceHealth()
      
      return {
        configured: healthCheck.status === 'healthy',
        enabled: healthCheck.status === 'healthy',
        healthy: healthCheck.status === 'healthy',
        details: healthCheck
      }

    } catch (error) {
      return {
        configured: false,
        enabled: false,
        healthy: false,
        error: error.message
      }
    }
  }

  /**
   * Check SendGrid status
   */
  async checkSendGridStatus() {
    try {
      const statusCheck = enhancedSendGridService.getServiceStatus()
      
      return {
        configured: statusCheck.apiKeyConfigured,
        enabled: !statusCheck.testMode,
        healthy: statusCheck.validationStatus === 'VALIDATED',
        details: statusCheck
      }

    } catch (error) {
      return {
        configured: false,
        enabled: false,
        healthy: false,
        error: error.message
      }
    }
  }

  /**
   * Check Google Calendar status
   */
  async checkGoogleCalendarStatus(userId) {
    try {
      const healthCheck = await calendarIntegrationService.getServiceHealth()
      
      let userConnected = false
      if (userId) {
        const { data: integration } = await supabase
          .from('calendar_integrations')
          .select('is_active')
          .eq('user_id', userId)
          .eq('provider', 'google')
          .eq('is_active', true)
          .single()

        userConnected = !!integration
      }

      return {
        configured: healthCheck.providers.google.configured,
        enabled: userConnected,
        healthy: healthCheck.providers.google.initialized && userConnected,
        user_connected: userConnected,
        details: healthCheck
      }

    } catch (error) {
      return {
        configured: false,
        enabled: false,
        healthy: false,
        error: error.message
      }
    }
  }

  /**
   * Check notification service status
   */
  async checkNotificationStatus() {
    try {
      const healthCheck = await notificationService.getServiceHealth()
      
      return {
        configured: true, // Always configured as it's a core service
        enabled: true,
        healthy: healthCheck.status === 'healthy',
        details: healthCheck
      }

    } catch (error) {
      return {
        configured: true,
        enabled: false,
        healthy: false,
        error: error.message
      }
    }
  }

  /**
   * Enable/disable integration for barbershop
   */
  async toggleIntegration(integrationKey, barbershopId, userId, enabled) {
    try {
      const { error } = await supabase
        .from('barbershop_integrations')
        .upsert({
          barbershop_id: barbershopId,
          integration_type: integrationKey,
          enabled: enabled,
          configured_by: userId,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'barbershop_id,integration_type'
        })

      if (error) {
        throw error
      }

      return {
        success: true,
        message: `${this.integrations[integrationKey]?.name || integrationKey} ${enabled ? 'enabled' : 'disabled'} successfully`
      }

    } catch (error) {
      console.error(`Error toggling ${integrationKey}:`, error)
      throw error
    }
  }

  /**
   * Get integration configuration for barbershop
   */
  async getIntegrationConfig(barbershopId, integrationKey = null) {
    try {
      let query = supabase
        .from('barbershop_integrations')
        .select('*')
        .eq('barbershop_id', barbershopId)

      if (integrationKey) {
        query = query.eq('integration_type', integrationKey)
      }

      const { data, error } = await query

      if (error) {
        throw error
      }

      if (integrationKey) {
        return data[0] || null
      }

      // Return all configurations as object
      const configs = {}
      for (const config of data || []) {
        configs[config.integration_type] = config
      }

      return configs

    } catch (error) {
      console.error('Error getting integration config:', error)
      throw error
    }
  }

  /**
   * Save integration settings
   */
  async saveIntegrationSettings(barbershopId, userId, integrationKey, settings) {
    try {
      const { error } = await supabase
        .from('barbershop_integrations')
        .upsert({
          barbershop_id: barbershopId,
          integration_type: integrationKey,
          settings: settings,
          configured_by: userId,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'barbershop_id,integration_type'
        })

      if (error) {
        throw error
      }

      return {
        success: true,
        message: `${this.integrations[integrationKey]?.name || integrationKey} settings saved successfully`
      }

    } catch (error) {
      console.error(`Error saving ${integrationKey} settings:`, error)
      throw error
    }
  }

  /**
   * Test integration connection
   */
  async testIntegration(integrationKey, barbershopId, userId = null) {
    try {
      let testResult

      switch (integrationKey) {
        case 'stripe':
          testResult = await stripeService.healthCheck()
          break
        
        case 'twilio':
          testResult = await twilioSMSService.getServiceHealth()
          break
        
        case 'sendgrid':
          // Test by sending a test email if configured
          if (enhancedSendGridService.getServiceStatus().apiKeyConfigured) {
            testResult = await enhancedSendGridService.sendTestEmail('test@example.com')
          } else {
            testResult = { success: false, error: 'SendGrid not configured' }
          }
          break
        
        case 'google_calendar':
          testResult = await calendarIntegrationService.getServiceHealth()
          break
        
        case 'notifications':
          testResult = await notificationService.getServiceHealth()
          break
        
        default:
          throw new Error(`Cannot test unknown integration: ${integrationKey}`)
      }

      return {
        success: true,
        integration: integrationKey,
        testResult: testResult
      }

    } catch (error) {
      console.error(`Error testing ${integrationKey}:`, error)
      return {
        success: false,
        integration: integrationKey,
        error: error.message
      }
    }
  }

  /**
   * Get integration recommendations for barbershop
   */
  async getRecommendations(barbershopId) {
    try {
      const status = await this.getIntegrationStatus(barbershopId)
      const recommendations = []

      // Analyze current status and provide recommendations
      for (const [key, integration] of Object.entries(status.integrations)) {
        if (!integration.configured && !integration.required) {
          recommendations.push({
            type: 'setup',
            integration: key,
            title: `Set up ${integration.name}`,
            description: `${integration.description}`,
            priority: this.getRecommendationPriority(key, integration),
            benefits: this.getIntegrationBenefits(key)
          })
        } else if (integration.configured && !integration.enabled) {
          recommendations.push({
            type: 'enable',
            integration: key,
            title: `Enable ${integration.name}`,
            description: `${integration.name} is configured but not enabled`,
            priority: 'medium',
            benefits: ['Activate configured features']
          })
        } else if (integration.enabled && !integration.healthy) {
          recommendations.push({
            type: 'fix',
            integration: key,
            title: `Fix ${integration.name}`,
            description: `${integration.name} needs attention`,
            priority: 'high',
            benefits: ['Restore service functionality']
          })
        }
      }

      // Sort by priority
      const priorityOrder = { high: 3, medium: 2, low: 1 }
      recommendations.sort((a, b) => priorityOrder[b.priority] - priorityOrder[a.priority])

      return {
        success: true,
        recommendations: recommendations,
        summary: {
          total: recommendations.length,
          high_priority: recommendations.filter(r => r.priority === 'high').length,
          medium_priority: recommendations.filter(r => r.priority === 'medium').length,
          low_priority: recommendations.filter(r => r.priority === 'low').length
        }
      }

    } catch (error) {
      console.error('Error getting recommendations:', error)
      throw error
    }
  }

  /**
   * Get recommendation priority for integration
   */
  getRecommendationPriority(integrationKey, integration) {
    if (integration.required) return 'high'
    
    const highPriority = ['stripe', 'notifications']
    const mediumPriority = ['twilio', 'sendgrid']
    
    if (highPriority.includes(integrationKey)) return 'high'
    if (mediumPriority.includes(integrationKey)) return 'medium'
    
    return 'low'
  }

  /**
   * Get integration benefits
   */
  getIntegrationBenefits(integrationKey) {
    const benefits = {
      stripe: ['Accept online payments', 'Reduce no-shows', 'Automated payouts', 'Professional checkout'],
      twilio: ['Automated appointment reminders', 'Reduce no-shows by 50%', 'Marketing campaigns', 'Customer engagement'],
      sendgrid: ['Professional email confirmations', 'Automated reminders', 'Newsletter campaigns', 'Brand consistency'],
      google_calendar: ['Calendar synchronization', 'iCal export', 'Better scheduling', 'Team coordination'],
      notifications: ['Unified notifications', 'Multi-channel delivery', 'Automated workflows', 'Customer satisfaction']
    }
    
    return benefits[integrationKey] || ['Improved functionality']
  }

  /**
   * Get service health status
   */
  async getServiceHealth() {
    return {
      service: 'integration-config',
      status: this.initialized ? 'healthy' : 'unhealthy',
      integrations_available: Object.keys(this.integrations).length,
      categories: [...new Set(Object.values(this.integrations).map(i => i.category))],
      features: {
        status_monitoring: true,
        configuration_management: true,
        health_checks: true,
        recommendations: true
      }
    }
  }
}

const integrationConfigService = new IntegrationConfigService()

module.exports = {
  integrationConfigService,
  IntegrationConfigService
}