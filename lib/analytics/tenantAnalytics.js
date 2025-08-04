'use client'

import posthog from '@/lib/posthog/client'

/**
 * Tenant-aware analytics wrapper for PostHog
 * Automatically includes tenant context in all events
 */
class TenantAnalytics {
  constructor() {
    this.currentTenant = null
  }

  // Set current tenant context (called by TenantProvider)
  setTenant(tenant) {
    this.currentTenant = tenant
    
    if (tenant && typeof posthog !== 'undefined') {
      // Set tenant properties in PostHog
      posthog.group('tenant', tenant.id, {
        tenant_name: tenant.name,
        business_name: tenant.settings?.business_name,
        subscription_tier: tenant.subscription_tier,
        address: tenant.settings?.address,
        phone: tenant.settings?.phone,
        timezone: tenant.settings?.timezone,
        currency: tenant.settings?.currency,
        created_at: tenant.created_at
      })
      
      console.log('📊 PostHog tenant context set:', tenant.name)
    }
  }

  // Track event with automatic tenant context
  track(eventName, properties = {}) {
    if (typeof posthog === 'undefined') {
      console.warn('PostHog not loaded, skipping event:', eventName)
      return
    }

    const tenantProperties = this.currentTenant ? {
      // Core tenant identification
      tenant_id: this.currentTenant.id,
      tenant_name: this.currentTenant.name,
      business_name: this.currentTenant.settings?.business_name,
      subscription_tier: this.currentTenant.subscription_tier,
      
      // Business context
      tenant_timezone: this.currentTenant.settings?.timezone,
      tenant_currency: this.currentTenant.settings?.currency,
      tenant_created_at: this.currentTenant.created_at,
      
      // Feature flags
      has_ai_chat: this.currentTenant.features?.ai_chat || false,
      has_analytics: this.currentTenant.features?.analytics || false,
      has_booking_system: this.currentTenant.features?.booking_system || false,
      has_payment_processing: this.currentTenant.features?.payment_processing || false,
      
      // Integration status
      stripe_connected: this.currentTenant.integrations?.stripe?.connected || false,
      google_calendar_connected: this.currentTenant.integrations?.google_calendar?.connected || false,
      mailchimp_connected: this.currentTenant.integrations?.mailchimp?.connected || false,
      twilio_connected: this.currentTenant.integrations?.twilio?.connected || false
    } : {}

    const enhancedProperties = {
      ...properties,
      ...tenantProperties,
      // Platform context
      platform: '6fb_ai_agent_system',
      environment: process.env.NODE_ENV,
      timestamp: new Date().toISOString()
    }

    posthog.capture(eventName, enhancedProperties)
    
    console.log('📊 Event tracked:', eventName, {
      tenant: this.currentTenant?.name || 'No tenant',
      properties: Object.keys(enhancedProperties).length
    })
  }

  // Identify user with tenant context
  identify(userId, userProperties = {}) {
    if (typeof posthog === 'undefined') return

    const tenantUserProperties = this.currentTenant ? {
      tenant_id: this.currentTenant.id,
      tenant_name: this.currentTenant.name,
      subscription_tier: this.currentTenant.subscription_tier,
      is_tenant_owner: userProperties.is_owner || false
    } : {}

    posthog.identify(userId, {
      ...userProperties,
      ...tenantUserProperties
    })
  }

  // Track page views with tenant context
  trackPageView(pageName, properties = {}) {
    this.track('page_viewed', {
      page_name: pageName,
      ...properties
    })
  }

  // Business-specific event tracking methods
  trackBookingEvent(eventType, bookingData = {}) {
    this.track(`booking_${eventType}`, {
      booking_id: bookingData.id,
      service_type: bookingData.service_type,
      service_price: bookingData.price,
      barber_id: bookingData.barber_id,
      customer_id: bookingData.customer_id,
      booking_date: bookingData.date,
      ...bookingData
    })
  }

  trackPaymentEvent(eventType, paymentData = {}) {
    this.track(`payment_${eventType}`, {
      payment_id: paymentData.id,
      amount: paymentData.amount,
      currency: paymentData.currency,
      payment_method: paymentData.method,
      booking_id: paymentData.booking_id,
      customer_id: paymentData.customer_id,
      ...paymentData
    })
  }

  trackAIEvent(eventType, aiData = {}) {
    this.track(`ai_${eventType}`, {
      model_used: aiData.model,
      message_length: aiData.message_length,
      response_time: aiData.response_time,
      conversation_id: aiData.conversation_id,
      user_satisfaction: aiData.satisfaction,
      ...aiData
    })
  }

  trackIntegrationEvent(eventType, provider, integrationData = {}) {
    this.track(`integration_${eventType}`, {
      provider: provider,
      integration_type: integrationData.type,
      success: integrationData.success,
      error_message: integrationData.error,
      ...integrationData
    })
  }

  trackUserEngagement(eventType, engagementData = {}) {
    this.track(`engagement_${eventType}`, {
      feature_used: engagementData.feature,
      time_spent: engagementData.duration,
      clicks: engagementData.clicks,
      session_id: engagementData.session_id,
      ...engagementData
    })
  }

  // Get tenant context for external use
  getTenantContext() {
    return this.currentTenant
  }
}

// Create singleton instance
const tenantAnalytics = new TenantAnalytics()

export default tenantAnalytics

// Named exports for specific functions
export const {
  track,
  identify,
  trackPageView,
  trackBookingEvent,
  trackPaymentEvent,
  trackAIEvent,
  trackIntegrationEvent,
  trackUserEngagement,
  getTenantContext
} = tenantAnalytics