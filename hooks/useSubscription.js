import { useState, useEffect } from 'react'
import { useAuth } from '@/components/SupabaseAuthProvider'

export function useSubscription() {
  const { user } = useAuth()
  const [subscriptionData, setSubscriptionData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!user) {
      setLoading(false)
      return
    }

    loadSubscriptionData()
  }, [user])

  const loadSubscriptionData = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const response = await fetch('/api/subscription/status')
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to fetch subscription')
      }
      
      const data = await response.json()
      
      // Store the full response for compatibility
      setSubscriptionData({
        subscription: data.subscription,
        usage: data.usage,
        billing: data.billing,
        user: data.user,
        profile: data.profile,
        features: data.features
      })
      
    } catch (error) {
      console.error('Error loading subscription:', error)
      setError(error.message)
      // Set default data on error
      setSubscriptionData({
        subscription: {
          tier: 'free',
          status: 'inactive',
          isActive: false,
          plan_name: 'Free Plan'
        },
        usage: { sms: {}, email: {}, ai: {}, staff: {} },
        billing: {},
        profile: {},
        features: { name: 'Free Plan', features: [] }
      })
    } finally {
      setLoading(false)
    }
  }

  const openBillingPortal = async () => {
    try {
      const response = await fetch('/api/stripe/create-portal-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })
      
      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to create portal session')
      }
      
      // Check if we got a relative URL (local billing page) or absolute URL (Stripe portal)
      if (data.url.startsWith('/')) {
        // Local billing page - navigate within the app
        window.location.href = data.url
      } else {
        // External Stripe portal - open in new tab
        window.open(data.url, '_blank')
      }
    } catch (error) {
      console.error('Error opening billing portal:', error)
      
      // Provide more helpful error message
      const errorMessage = error.message.includes('No billing account') 
        ? 'Billing setup in progress. Please try again in a moment.'
        : 'Unable to open billing portal. Redirecting to billing page...'
      
      alert(errorMessage)
      
      // Fallback: redirect to local billing page
      if (error.message.includes('No billing account') || error.message.includes('Failed to create')) {
        window.location.href = '/dashboard/billing'
      }
    }
  }

  return {
    subscriptionData,
    subscription: subscriptionData?.subscription || null,
    usage: subscriptionData?.usage || null,
    loading,
    error,
    openBillingPortal,
    refresh: loadSubscriptionData
  }
}