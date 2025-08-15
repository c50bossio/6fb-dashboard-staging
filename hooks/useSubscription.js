import { useState, useEffect } from 'react'
import { useUser } from '@clerk/nextjs'
import { createClient } from '../lib/supabase/client'

const supabase = createClient()
import { SUBSCRIPTION_PLANS } from '../lib/stripe-client'

export function useSubscription() {
  const { user } = useUser()
  const [subscription, setSubscription] = useState(null)
  const [usage, setUsage] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) {
      setLoading(false)
      return
    }

    loadSubscriptionData()
  }, [user])

  const loadSubscriptionData = async () => {
    try {
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('subscription_plan, subscription_status, stripe_customer_id')
        .eq('clerk_id', user.id)
        .single()

      if (userError) throw userError

      const startOfMonth = new Date()
      startOfMonth.setDate(1)
      startOfMonth.setHours(0, 0, 0, 0)

      const { data: sessions, error: sessionsError } = await supabase
        .from('ai_sessions')
        .select('id')
        .eq('user_id', userData.id)
        .gte('created_at', startOfMonth.toISOString())

      if (sessionsError) throw sessionsError

      const currentPlan = SUBSCRIPTION_PLANS[userData.subscription_plan || 'free']
      
      setSubscription({
        plan: currentPlan,
        status: userData.subscription_status || 'free',
        customerId: userData.stripe_customer_id
      })

      setUsage({
        sessionsUsed: sessions?.length || 0,
        sessionsLimit: currentPlan.limits.sessionsPerMonth,
        percentUsed: currentPlan.limits.sessionsPerMonth === -1 
          ? 0 
          : ((sessions?.length || 0) / currentPlan.limits.sessionsPerMonth) * 100
      })
    } catch (error) {
      console.error('Error loading subscription:', error)
    } finally {
      setLoading(false)
    }
  }

  const canUseFeature = (feature) => {
    if (!subscription) return false
    
    switch (feature) {
      case 'ai_chat':
        return usage.sessionsLimit === -1 || usage.sessionsUsed < usage.sessionsLimit
      
      case 'marketing_agent':
      case 'financial_agent':
        return subscription.plan.limits.agentsAccess.includes('all') || 
               subscription.plan.limits.agentsAccess.includes(feature)
      
      case 'team_collaboration':
        return subscription.plan.limits.teamMembers > 0
      
      case 'api_access':
        return subscription.plan.limits.apiAccess === true
      
      default:
        return true
    }
  }

  const upgradeRequired = (feature) => {
    if (canUseFeature(feature)) return null

    if (feature === 'ai_chat' && usage.sessionsUsed >= usage.sessionsLimit) {
      if (subscription.plan.id === 'free') return 'starter'
      if (subscription.plan.id === 'starter') return 'professional'
    }

    if (['marketing_agent', 'financial_agent'].includes(feature)) {
      return 'starter'
    }

    if (feature === 'team_collaboration') {
      return 'professional'
    }

    if (feature === 'api_access') {
      return 'enterprise'
    }

    return 'professional'
  }

  const trackUsage = async (eventType) => {
    if (!user) return

    try {
      await supabase.from('usage_events').insert({
        user_id: user.id,
        event_type: eventType,
        metadata: {
          plan: subscription?.plan?.id,
          timestamp: new Date().toISOString()
        }
      })

      await loadSubscriptionData()
    } catch (error) {
      console.error('Error tracking usage:', error)
    }
  }

  return {
    subscription,
    usage,
    loading,
    canUseFeature,
    upgradeRequired,
    trackUsage,
    refresh: loadSubscriptionData
  }
}