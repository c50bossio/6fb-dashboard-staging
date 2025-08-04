import { posthog } from './posthog'

export const analytics = {
  // User identification
  identify: (userId, properties = {}) => {
    if (posthog && userId) {
      posthog.identify(userId, {
        ...properties,
        identified_at: new Date().toISOString(),
      })
    }
  },

  // Reset user (on logout)
  reset: () => {
    if (posthog) {
      posthog.reset()
    }
  },

  // Generic event tracking
  track: (event, properties = {}) => {
    if (posthog) {
      posthog.capture(event, {
        ...properties,
        timestamp: new Date().toISOString(),
      })
    }
  },

  // Page view tracking (manual)
  pageView: (pageName, properties = {}) => {
    if (posthog) {
      posthog.capture('$pageview', {
        $current_url: window.location.href,
        $host: window.location.host,
        $pathname: window.location.pathname,
        page_name: pageName,
        ...properties,
      })
    }
  },

  // Business-specific events
  events: {
    // Authentication events
    signupStarted: () => analytics.track('signup_started'),
    signupCompleted: (method) => analytics.track('signup_completed', { method }),
    loginCompleted: (method) => analytics.track('login_completed', { method }),
    logoutCompleted: () => analytics.track('logout_completed'),

    // Booking events
    bookingViewed: (serviceId) => analytics.track('booking_viewed', { service_id: serviceId }),
    bookingStarted: (service) => analytics.track('booking_started', { 
      service_type: service.type,
      service_price: service.price,
    }),
    bookingCompleted: (booking) => analytics.track('booking_completed', {
      booking_id: booking.id,
      service_type: booking.service,
      price: booking.price,
      barber_id: booking.barberId,
      time_slot: booking.timeSlot,
      payment_method: booking.paymentMethod,
    }),
    bookingCancelled: (bookingId, reason) => analytics.track('booking_cancelled', {
      booking_id: bookingId,
      cancellation_reason: reason,
    }),

    // AI/Insights events
    aiChatStarted: () => analytics.track('ai_chat_started'),
    aiChatMessage: (messageType) => analytics.track('ai_chat_message', { message_type: messageType }),
    insightViewed: (insight) => analytics.track('insight_viewed', {
      insight_id: insight.id,
      insight_type: insight.type,
      insight_category: insight.category,
    }),
    insightActionTaken: (insightId, action) => analytics.track('insight_action_taken', {
      insight_id: insightId,
      action_type: action,
    }),

    // Subscription events
    pricingViewed: () => analytics.track('pricing_viewed'),
    planSelected: (planName) => analytics.track('plan_selected', { plan_name: planName }),
    subscriptionStarted: (plan) => analytics.track('subscription_started', {
      plan_name: plan.name,
      plan_price: plan.price,
      billing_period: plan.interval,
      trial: plan.trial || false,
    }),
    subscriptionUpgraded: (fromPlan, toPlan) => analytics.track('subscription_upgraded', {
      from_plan: fromPlan,
      to_plan: toPlan,
    }),
    subscriptionCancelled: (planName, reason) => analytics.track('subscription_cancelled', {
      plan_name: planName,
      cancellation_reason: reason,
    }),

    // Feature usage
    featureUsed: (featureName) => analytics.track('feature_used', { feature_name: featureName }),
    calendarViewed: () => analytics.track('calendar_viewed'),
    reportGenerated: (reportType) => analytics.track('report_generated', { report_type: reportType }),
    notificationInteracted: (notificationType) => analytics.track('notification_interacted', {
      notification_type: notificationType,
    }),

    // Error tracking
    errorOccurred: (error, context) => analytics.track('error_occurred', {
      error_message: error.message,
      error_stack: error.stack,
      error_context: context,
    }),
  },

  // A/B testing helpers
  experiments: {
    getVariant: (experimentName) => {
      if (posthog) {
        return posthog.getFeatureFlag(experimentName)
      }
      return null
    },

    trackExperimentViewed: (experimentName, variant) => {
      analytics.track('experiment_viewed', {
        experiment_name: experimentName,
        variant: variant,
      })
    },

    trackExperimentConversion: (experimentName, variant, value) => {
      analytics.track('experiment_conversion', {
        experiment_name: experimentName,
        variant: variant,
        conversion_value: value,
      })
    },
  },

  // User properties
  setUserProperties: (properties) => {
    if (posthog) {
      posthog.people.set(properties)
    }
  },

  // Revenue tracking
  trackRevenue: (amount, properties = {}) => {
    if (posthog) {
      posthog.capture('revenue', {
        revenue: amount,
        currency: 'USD',
        ...properties,
      })
    }
  },
}