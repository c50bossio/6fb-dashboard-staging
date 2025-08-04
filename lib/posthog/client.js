'use client'

import posthog from 'posthog-js'
import { useEffect } from 'react'

// Initialize PostHog
if (typeof window !== 'undefined' && process.env.NEXT_PUBLIC_POSTHOG_KEY) {
  posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY, {
    api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://app.posthog.com',
    loaded: (posthog) => {
      if (process.env.NODE_ENV === 'development') {
        posthog.debug()
      }
    },
    capture_pageview: true,
    capture_pageleave: true,
    autocapture: true,
    session_recording: {
      enabled: true,
      maskAllInputs: false,
      maskTextContent: false,
    },
    persistence: 'localStorage',
  })
}

export default posthog

// React hook for PostHog
export function usePostHog() {
  return posthog
}

// Hook to identify user
export function usePostHogIdentify(user) {
  useEffect(() => {
    if (user?.id) {
      posthog.identify(user.id, {
        email: user.email,
        name: user.name,
        created_at: user.created_at,
      })
    } else {
      posthog.reset()
    }
  }, [user])
}

// Common events
export const EVENTS = {
  // Authentication
  USER_SIGNED_UP: 'user_signed_up',
  USER_SIGNED_IN: 'user_signed_in',
  USER_SIGNED_OUT: 'user_signed_out',
  
  // Bookings
  BOOKING_CREATED: 'booking_created',
  BOOKING_CANCELLED: 'booking_cancelled',
  BOOKING_COMPLETED: 'booking_completed',
  
  // Payments
  PAYMENT_INITIATED: 'payment_initiated',
  PAYMENT_COMPLETED: 'payment_completed',
  PAYMENT_FAILED: 'payment_failed',
  SUBSCRIPTION_STARTED: 'subscription_started',
  SUBSCRIPTION_CANCELLED: 'subscription_cancelled',
  
  // AI Chat
  CHAT_MESSAGE_SENT: 'chat_message_sent',
  CHAT_MODEL_CHANGED: 'chat_model_changed',
  
  // Calendar
  CALENDAR_EVENT_CREATED: 'calendar_event_created',
  CALENDAR_EVENT_UPDATED: 'calendar_event_updated',
  CALENDAR_VIEW_CHANGED: 'calendar_view_changed',
  
  // Dashboard
  DASHBOARD_VIEWED: 'dashboard_viewed',
  METRIC_CLICKED: 'metric_clicked',
  REPORT_GENERATED: 'report_generated',
  
  // Feature Usage
  FEATURE_USED: 'feature_used',
  SETTINGS_UPDATED: 'settings_updated',
}

// Helper functions
export function trackEvent(eventName, properties = {}) {
  posthog.capture(eventName, properties)
}

export function trackPageView(pageName, properties = {}) {
  posthog.capture('$pageview', {
    $current_url: window.location.href,
    page_name: pageName,
    ...properties,
  })
}

export function setUserProperties(properties) {
  posthog.people.set(properties)
}

export function incrementUserProperty(property, value = 1) {
  posthog.people.increment(property, value)
}

export function trackTiming(category, variable, time) {
  posthog.capture('timing_complete', {
    timing_category: category,
    timing_variable: variable,
    timing_time: time,
  })
}

// Feature flags
export function isFeatureEnabled(flagName) {
  return posthog.isFeatureEnabled(flagName)
}

export function getFeatureFlagPayload(flagName) {
  return posthog.getFeatureFlagPayload(flagName)
}

export function onFeatureFlags(callback) {
  posthog.onFeatureFlags(callback)
}