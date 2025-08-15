'use client'

import { useUser } from '@clerk/nextjs'
import { usePathname, useSearchParams } from 'next/navigation'
import { PostHogProvider, usePostHog } from 'posthog-js/react'
import { useEffect } from 'react'

import { posthog } from '@/lib/posthog'

function PostHogTracker() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const { user } = useUser()
  const client = usePostHog()

  useEffect(() => {
    if (pathname && client) {
      let url = window.origin + pathname
      if (searchParams.toString()) {
        url += `?${searchParams.toString()}`
      }
      
      client.capture('$pageview', {
        $current_url: url,
      })
    }
  }, [pathname, searchParams, client])

  useEffect(() => {
    if (user && client) {
      client.identify(user.id, {
        email: user.emailAddresses?.[0]?.emailAddress,
        firstName: user.firstName,
        lastName: user.lastName,
        createdAt: user.createdAt,
        lastSignInAt: user.lastSignInAt,
        subscription_plan: user.publicMetadata?.subscriptionPlan || 'free',
        user_type: user.publicMetadata?.userType || 'barber',
        onboarding_completed: user.publicMetadata?.onboardingCompleted || false,
      })
    }
  }, [user, client])

  return null
}

export default function PostHogProviderWrapper({ children }) {
  if (!process.env.NEXT_PUBLIC_POSTHOG_KEY) {
    return children
  }

  return (
    <PostHogProvider client={posthog}>
      <PostHogTracker />
      {children}
    </PostHogProvider>
  )
}

export function useAnalytics() {
  const client = usePostHog()
  const { user } = useUser()

  return {
    track: (event, properties = {}) => {
      if (client) {
        client.capture(event, {
          ...properties,
          user_id: user?.id,
          timestamp: new Date().toISOString(),
        })
      }
    },

    trackBookingStarted: (serviceType, price) => {
      if (client) {
        client.capture('booking_started', {
          service_type: serviceType,
          price: price,
          user_id: user?.id,
        })
      }
    },

    trackBookingCompleted: (booking) => {
      if (client) {
        client.capture('booking_completed', {
          booking_id: booking.id,
          service_type: booking.service,
          price: booking.price,
          barber_id: booking.barberId,
          duration: booking.duration,
          payment_method: booking.paymentMethod,
          user_id: user?.id,
        })
      }
    },

    trackSubscriptionStarted: (plan) => {
      if (client) {
        client.capture('subscription_started', {
          plan_name: plan.name,
          plan_price: plan.price,
          billing_interval: plan.interval,
          user_id: user?.id,
        })
      }
    },

    trackAIInteraction: (type, query) => {
      if (client) {
        client.capture('ai_interaction', {
          interaction_type: type,
          query_length: query?.length || 0,
          user_id: user?.id,
        })
      }
    },

    trackFeatureUsage: (featureName, context = {}) => {
      if (client) {
        client.capture('feature_used', {
          feature_name: featureName,
          ...context,
          user_id: user?.id,
        })
      }
    },

    trackError: (error, context = {}) => {
      if (client) {
        client.capture('error_occurred', {
          error_message: error.message,
          error_stack: error.stack,
          error_name: error.name,
          ...context,
          user_id: user?.id,
        })
      }
    },

    setUserProperties: (properties) => {
      if (client && user) {
        client.people.set(properties)
      }
    },

    trackRevenue: (amount, properties = {}) => {
      if (client) {
        client.capture('revenue', {
          revenue: amount,
          currency: 'USD',
          ...properties,
          user_id: user?.id,
        })
      }
    },

    isFeatureEnabled: (flagName) => {
      if (client) {
        return client.isFeatureEnabled(flagName)
      }
      return false
    },

    getFeatureFlag: (flagName) => {
      if (client) {
        return client.getFeatureFlag(flagName)
      }
      return null
    },

    getExperimentVariant: (experimentName) => {
      if (client) {
        return client.getFeatureFlag(experimentName)
      }
      return 'control'
    },

    reset: () => {
      if (client) {
        client.reset()
      }
    },
  }
}