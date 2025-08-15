'use client'

import posthog from 'posthog-js'
import { useEffect } from 'react'

let posthogInitialized = false

function initPostHogIfNeeded() {
  if (typeof window !== 'undefined' && process.env.NEXT_PUBLIC_POSTHOG_KEY && !posthogInitialized) {
    posthogInitialized = true
    posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY, {
      api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://app.posthog.com',
      loaded: (posthog) => {
        // }
      },
      capture_pageview: false, // We'll manually track page views
      capture_pageleave: true,
      autocapture: false, // Disable auto-capture for faster loading
      session_recording: {
        enabled: false, // Disable session recording on login page for privacy
      },
      persistence: 'localStorage',
    })
  }
}

if (typeof window !== 'undefined') {
  window.addEventListener('load', () => {
    setTimeout(initPostHogIfNeeded, 1000) // Delay 1 second after page load
  })
  
  const initOnInteraction = () => {
    initPostHogIfNeeded()
    document.removeEventListener('click', initOnInteraction)
    document.removeEventListener('scroll', initOnInteraction)
    document.removeEventListener('keydown', initOnInteraction)
  }
  
  document.addEventListener('click', initOnInteraction)
  document.addEventListener('scroll', initOnInteraction)
  document.addEventListener('keydown', initOnInteraction)
}

export default posthog

export function usePostHog() {
  return posthog
}

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

export const EVENTS = {
  USER_SIGNED_UP: 'user_signed_up',
  USER_SIGNED_IN: 'user_signed_in',
  USER_SIGNED_OUT: 'user_signed_out',
  
  BOOKING_CREATED: 'booking_created',
  BOOKING_CANCELLED: 'booking_cancelled',
  BOOKING_COMPLETED: 'booking_completed',
  
  PAYMENT_INITIATED: 'payment_initiated',
  PAYMENT_COMPLETED: 'payment_completed',
  PAYMENT_FAILED: 'payment_failed',
  SUBSCRIPTION_STARTED: 'subscription_started',
  SUBSCRIPTION_CANCELLED: 'subscription_cancelled',
  
  CHAT_MESSAGE_SENT: 'chat_message_sent',
  CHAT_MODEL_CHANGED: 'chat_model_changed',
  
  CALENDAR_EVENT_CREATED: 'calendar_event_created',
  CALENDAR_EVENT_UPDATED: 'calendar_event_updated',
  CALENDAR_VIEW_CHANGED: 'calendar_view_changed',
  
  DASHBOARD_VIEWED: 'dashboard_viewed',
  METRIC_CLICKED: 'metric_clicked',
  REPORT_GENERATED: 'report_generated',
  
  FEATURE_USED: 'feature_used',
  SETTINGS_UPDATED: 'settings_updated',
}

export function trackEvent(eventName, properties = {}) {
  initPostHogIfNeeded()
  posthog.capture(eventName, properties)
}

export function trackPageView(pageName, properties = {}) {
  initPostHogIfNeeded()
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

export function isFeatureEnabled(flagName) {
  return posthog.isFeatureEnabled(flagName)
}

export function getFeatureFlagPayload(flagName) {
  return posthog.getFeatureFlagPayload(flagName)
}

export function onFeatureFlags(callback) {
  posthog.onFeatureFlags(callback)
}