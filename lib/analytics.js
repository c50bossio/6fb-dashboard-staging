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
    signupStarted: () => {
      if (posthog) {
        posthog.capture('signup_started', { timestamp: new Date().toISOString() })
      }
    },
    signupCompleted: (method) => {
      if (posthog) {
        posthog.capture('signup_completed', { method, timestamp: new Date().toISOString() })
      }
    },
    loginCompleted: (method) => {
      if (posthog) {
        posthog.capture('login_completed', { method, timestamp: new Date().toISOString() })
      }
    },
    logoutCompleted: () => {
      if (posthog) {
        posthog.capture('logout_completed', { timestamp: new Date().toISOString() })
      }
    },

    // Booking events
    bookingViewed: (serviceId) => {
      if (posthog) {
        posthog.capture('booking_viewed', { service_id: serviceId, timestamp: new Date().toISOString() })
      }
    },
    bookingStarted: (service) => {
      if (posthog) {
        posthog.capture('booking_started', { 
          service_type: service.type,
          service_price: service.price,
          timestamp: new Date().toISOString()
        })
      }
    },
    bookingCompleted: (booking) => {
      if (posthog) {
        posthog.capture('booking_completed', {
          booking_id: booking.id,
          service_type: booking.service,
          price: booking.price,
          barber_id: booking.barberId,
          time_slot: booking.timeSlot,
          payment_method: booking.paymentMethod,
          timestamp: new Date().toISOString()
        })
      }
    },
    bookingCancelled: (bookingId, reason) => {
      if (posthog) {
        posthog.capture('booking_cancelled', {
          booking_id: bookingId,
          cancellation_reason: reason,
          timestamp: new Date().toISOString()
        })
      }
    },

    // AI/Insights events
    aiChatStarted: () => {
      if (posthog) {
        posthog.capture('ai_chat_started', { timestamp: new Date().toISOString() })
      }
    },
    aiChatMessage: (messageType) => {
      if (posthog) {
        posthog.capture('ai_chat_message', { message_type: messageType, timestamp: new Date().toISOString() })
      }
    },
    insightViewed: (insight) => {
      if (posthog) {
        posthog.capture('insight_viewed', {
          insight_id: insight.id,
          insight_type: insight.type,
          insight_category: insight.category,
          timestamp: new Date().toISOString()
        })
      }
    },
    insightActionTaken: (insightId, action) => {
      if (posthog) {
        posthog.capture('insight_action_taken', {
          insight_id: insightId,
          action_type: action,
          timestamp: new Date().toISOString()
        })
      }
    },

    // Subscription events
    pricingViewed: () => {
      if (posthog) {
        posthog.capture('pricing_viewed', { timestamp: new Date().toISOString() })
      }
    },
    planSelected: (planName) => {
      if (posthog) {
        posthog.capture('plan_selected', { plan_name: planName, timestamp: new Date().toISOString() })
      }
    },
    subscriptionStarted: (plan) => {
      if (posthog) {
        posthog.capture('subscription_started', {
          plan_name: plan.name,
          plan_price: plan.price,
          billing_period: plan.interval,
          trial: plan.trial || false,
          timestamp: new Date().toISOString()
        })
      }
    },
    subscriptionUpgraded: (fromPlan, toPlan) => {
      if (posthog) {
        posthog.capture('subscription_upgraded', {
          from_plan: fromPlan,
          to_plan: toPlan,
          timestamp: new Date().toISOString()
        })
      }
    },
    subscriptionCancelled: (planName, reason) => {
      if (posthog) {
        posthog.capture('subscription_cancelled', {
          plan_name: planName,
          cancellation_reason: reason,
          timestamp: new Date().toISOString()
        })
      }
    },

    // Feature usage
    featureUsed: (featureName) => {
      if (posthog) {
        posthog.capture('feature_used', { feature_name: featureName, timestamp: new Date().toISOString() })
      }
    },
    calendarViewed: () => {
      if (posthog) {
        posthog.capture('calendar_viewed', { timestamp: new Date().toISOString() })
      }
    },
    reportGenerated: (reportType) => {
      if (posthog) {
        posthog.capture('report_generated', { report_type: reportType, timestamp: new Date().toISOString() })
      }
    },
    notificationInteracted: (notificationType) => {
      if (posthog) {
        posthog.capture('notification_interacted', {
          notification_type: notificationType,
          timestamp: new Date().toISOString()
        })
      }
    },

    // Error tracking
    errorOccurred: (error, context) => {
      if (posthog) {
        posthog.capture('error_occurred', {
          error_message: error.message,
          error_stack: error.stack,
          error_context: context,
          timestamp: new Date().toISOString()
        })
      }
    },
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
      if (posthog) {
        posthog.capture('experiment_viewed', {
          experiment_name: experimentName,
          variant: variant,
          timestamp: new Date().toISOString()
        })
      }
    },

    trackExperimentConversion: (experimentName, variant, value) => {
      if (posthog) {
        posthog.capture('experiment_conversion', {
          experiment_name: experimentName,
          variant: variant,
          conversion_value: value,
          timestamp: new Date().toISOString()
        })
      }
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