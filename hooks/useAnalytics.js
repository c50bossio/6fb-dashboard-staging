'use client'

import { useCallback } from 'react'
import { trackEvent, EVENTS, isFeatureEnabled, setUserProperties } from '@/lib/posthog/client'
import { useAuth } from '@/components/SupabaseAuthProvider'

export function useAnalytics() {
  const { user } = useAuth()

  // Track booking events
  const trackBooking = useCallback((action, bookingData) => {
    const eventMap = {
      created: EVENTS.BOOKING_CREATED,
      cancelled: EVENTS.BOOKING_CANCELLED,
      completed: EVENTS.BOOKING_COMPLETED,
    }

    trackEvent(eventMap[action], {
      booking_id: bookingData.id,
      service_name: bookingData.serviceName,
      service_price: bookingData.price,
      barber_id: bookingData.barberId,
      date: bookingData.date,
      time: bookingData.time,
      user_id: user?.id,
    })
  }, [user])

  // Track payment events
  const trackPayment = useCallback((action, paymentData) => {
    const eventMap = {
      initiated: EVENTS.PAYMENT_INITIATED,
      completed: EVENTS.PAYMENT_COMPLETED,
      failed: EVENTS.PAYMENT_FAILED,
    }

    trackEvent(eventMap[action], {
      payment_id: paymentData.id,
      amount: paymentData.amount,
      currency: paymentData.currency,
      method: paymentData.method,
      user_id: user?.id,
    })

    // Track revenue for completed payments
    if (action === 'completed') {
      trackEvent('revenue', {
        revenue: paymentData.amount,
        currency: paymentData.currency,
      })
    }
  }, [user])

  // Track chat interactions
  const trackChat = useCallback((action, chatData = {}) => {
    const eventMap = {
      message_sent: EVENTS.CHAT_MESSAGE_SENT,
      model_changed: EVENTS.CHAT_MODEL_CHANGED,
    }

    trackEvent(eventMap[action], {
      ...chatData,
      user_id: user?.id,
    })
  }, [user])

  // Track feature usage
  const trackFeature = useCallback((featureName, properties = {}) => {
    trackEvent(EVENTS.FEATURE_USED, {
      feature_name: featureName,
      ...properties,
      user_id: user?.id,
    })
  }, [user])

  // Track user properties
  const updateUserProfile = useCallback((properties) => {
    if (user?.id) {
      setUserProperties({
        ...properties,
        last_seen: new Date().toISOString(),
      })
    }
  }, [user])

  // Check feature flags
  const checkFeatureFlag = useCallback((flagName) => {
    return isFeatureEnabled(flagName)
  }, [])

  return {
    trackBooking,
    trackPayment,
    trackChat,
    trackFeature,
    updateUserProfile,
    checkFeatureFlag,
  }
}