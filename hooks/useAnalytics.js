'use client'

import { useCallback } from 'react'
// PostHog removed - use stubbed analytics
import { analytics } from '@/lib/analytics'
import { useAuth } from '@/components/SupabaseAuthProvider'

export function useAnalytics() {
  const { user } = useAuth()

  // Track booking events
  const trackBooking = useCallback((action, bookingData) => {
    const eventName = `booking_${action}`
    
    analytics.track(eventName, {
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
    const eventName = `payment_${action}`
    
    analytics.track(eventName, {
      payment_id: paymentData.id,
      amount: paymentData.amount,
      currency: paymentData.currency,
      method: paymentData.method,
      user_id: user?.id,
    })

    // Track revenue for completed payments
    if (action === 'completed') {
      analytics.trackRevenue(paymentData.amount, {
        currency: paymentData.currency,
      })
    }
  }, [user])

  // Track chat interactions
  const trackChat = useCallback((action, chatData = {}) => {
    const eventName = `chat_${action}`
    
    analytics.track(eventName, {
      ...chatData,
      user_id: user?.id,
    })
  }, [user])

  // Track feature usage
  const trackFeature = useCallback((featureName, properties = {}) => {
    analytics.track('feature_used', {
      feature_name: featureName,
      ...properties,
      user_id: user?.id,
    })
  }, [user])

  // Track user properties
  const updateUserProfile = useCallback((properties) => {
    if (user?.id) {
      analytics.setUserProperties({
        ...properties,
        last_seen: new Date().toISOString(),
      })
    }
  }, [user])

  // Check feature flags (always return false since we don't have feature flags)
  const checkFeatureFlag = useCallback((flagName) => {
    return false
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