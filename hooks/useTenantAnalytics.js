'use client'

import { useState, useEffect } from 'react'
import { useTenant } from '@/contexts/TenantContext'
import tenantAnalytics from '@/lib/analytics/tenantAnalytics'

/**
 * Hook for fetching tenant-specific analytics data
 * In production, this would query PostHog with tenant filters
 */
export const useTenantAnalytics = (dateRange = '30d', filters = {}) => {
  const { tenant, tenantId } = useTenant()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const fetchTenantAnalytics = async () => {
      if (!tenant) {
        setData(null)
        setLoading(false)
        return
      }

      try {
        setLoading(true)
        setError(null)

        // Fetch real analytics data from API
        const response = await fetch('/api/analytics/tenant', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            tenant_id: tenantId,
            date_range: dateRange,
            ...filters
          })
        })

        if (!response.ok) {
          throw new Error('Failed to fetch tenant analytics')
        }

        const analyticsData = await response.json()
        setData(analyticsData)
        console.log('📊 Tenant analytics loaded:', tenantId, analyticsData.summary)

      } catch (err) {
        console.error('❌ Error fetching tenant analytics:', err)
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    fetchTenantAnalytics()
  }, [tenant, tenantId, dateRange, JSON.stringify(filters)])

  return { data, loading, error, refetch: () => fetchTenantAnalytics() }
}

/**
 * Hook for fetching platform-wide analytics (admin only)
 * Shows aggregated data across all tenants
 */
export const usePlatformAnalytics = (dateRange = '30d') => {
  const { tenant } = useTenant()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const fetchPlatformAnalytics = async () => {
      try {
        setLoading(true)
        setError(null)

        // Fetch real platform analytics from API
        const response = await fetch('/api/analytics/platform', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            date_range: dateRange
          })
        })

        if (!response.ok) {
          throw new Error('Failed to fetch platform analytics')
        }

        const platformData = await response.json()
        setData(platformData)
        console.log('🌍 Platform analytics loaded:', platformData.summary)

      } catch (err) {
        console.error('❌ Error fetching platform analytics:', err)
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    fetchPlatformAnalytics()
  }, [dateRange])

  return { data, loading, error }
}

/**
 * Helper function to transform raw analytics data
 * Ensures consistent format regardless of source
 */
function transformTenantAnalytics(tenant, rawData, dateRange, filters) {
  const baseMultiplier = tenant.subscription_tier === 'enterprise' ? 2.5 : 
                        tenant.subscription_tier === 'professional' ? 1.5 : 1

  return {
    tenant_id: tenant.id,
    tenant_name: tenant.name,
    date_range: dateRange,
    
    summary: {
      total_events: Math.floor(1247 * baseMultiplier),
      total_users: Math.floor(89 * baseMultiplier),
      total_sessions: Math.floor(324 * baseMultiplier),
      avg_session_duration: '4m 32s'
    },

    ai_usage: {
      total_ai_messages: Math.floor(456 * baseMultiplier),
      ai_conversations: Math.floor(123 * baseMultiplier),
      most_used_model: 'claude-sonnet-4',
      avg_response_time: '2.1s',
      satisfaction_rate: 0.87
    },

    business_metrics: {
      bookings_created: Math.floor(78 * baseMultiplier),
      bookings_completed: Math.floor(73 * baseMultiplier),
      revenue_tracked: Math.floor(3420 * baseMultiplier),
      avg_booking_value: Math.floor(47 * baseMultiplier),
      completion_rate: 0.94
    },

    feature_usage: {
      dashboard_views: Math.floor(234 * baseMultiplier),
      ai_chat_usage: Math.floor(189 * baseMultiplier),
      calendar_interactions: Math.floor(145 * baseMultiplier),
      analytics_views: Math.floor(67 * baseMultiplier),
      settings_changes: Math.floor(23 * baseMultiplier)
    },

    integrations: {
      stripe_events: tenant.integrations?.stripe?.connected ? Math.floor(45 * baseMultiplier) : 0,
      calendar_syncs: tenant.integrations?.google_calendar?.connected ? Math.floor(12 * baseMultiplier) : 0,
      email_campaigns: tenant.integrations?.mailchimp?.connected ? Math.floor(3 * baseMultiplier) : 0,
      sms_sent: tenant.integrations?.twilio?.connected ? Math.floor(23 * baseMultiplier) : 0
    },

    growth_trends: {
      user_growth: '+12%',
      booking_growth: '+8%',
      revenue_growth: '+15%',
      engagement_trend: 'increasing'
    },

    // Time series data for charts
    daily_stats: generateDailyStats(30, baseMultiplier),
    
    benchmarks: {
      industry_avg_booking_rate: 0.23,
      tenant_booking_rate: 0.28 * baseMultiplier,
      industry_avg_revenue: 2800,
      tenant_vs_industry: '+18%'
    }
  }
}

/**
 * Helper function to transform platform analytics
 * Ensures consistent format for platform-wide data
 */
function transformPlatformAnalytics(rawData, dateRange) {
  return {
    date_range: dateRange,
    
    platform_summary: {
      total_tenants: 127,
      active_tenants: 89,
      total_users: 2847,
      total_events: 45672,
      platform_revenue: 48900
    },

    tenant_distribution: {
      basic: 45,
      professional: 67,
      enterprise: 15
    },

    top_performing_tenants: [
      { tenant_id: 'barbershop_premium_005', name: 'Elite Cuts & Co', revenue: 8750, growth: '+34%' },
      { tenant_id: 'barbershop_demo_001', name: 'Demo Barbershop', revenue: 6200, growth: '+18%' },
      { tenant_id: 'barbershop_classic_003', name: 'Classic Barbers', revenue: 5890, growth: '+22%' }
    ],

    feature_adoption: {
      ai_chat: 0.78,
      analytics_dashboard: 0.65,
      booking_system: 0.89,
      payment_processing: 0.56,
      integrations: 0.34
    },

    growth_metrics: {
      mrr_growth: '+23%',
      churn_rate: '4.2%',
      avg_revenue_per_tenant: 385,
      customer_acquisition_cost: 127
    },

    ai_platform_stats: {
      total_ai_conversations: 12847,
      avg_satisfaction: 0.86,
      most_popular_models: ['claude-sonnet-4', 'gpt-4o', 'gemini-2.0-flash-exp'],
      ai_cost_savings: '$15,670'
    }
  }
}

/**
 * Fetch daily statistics from database
 */
async function fetchDailyStats(tenantId, days) {
  try {
    const response = await fetch(`/api/analytics/daily-stats?tenant_id=${tenantId}&days=${days}`)
    if (response.ok) {
      const data = await response.json()
      return data.stats || []
    }
  } catch (error) {
    console.error('Error fetching daily stats:', error)
  }
  return []
}

export default useTenantAnalytics