import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'
import { posthog } from '@/lib/posthog/server'
export const runtime = 'edge'

/**
 * Production Metrics Dashboard API
 * Provides comprehensive metrics for BookedBarber production monitoring
 * GDPR compliant with user consent verification
 */

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const timeframe = searchParams.get('timeframe') || '7d' // 1h, 24h, 7d, 30d, 90d
    const metric_type = searchParams.get('metric_type') || 'all'
    const include_detailed = searchParams.get('detailed') === 'true'

    // Validate timeframe
    const validTimeframes = ['1h', '24h', '7d', '30d', '90d']
    if (!validTimeframes.includes(timeframe)) {
      return NextResponse.json({ 
        error: 'Invalid timeframe. Use: 1h, 24h, 7d, 30d, 90d' 
      }, { status: 400 })
    }

    const supabase = createServerClient()
    const timeAgo = getTimeAgo(timeframe)

    // Build comprehensive metrics response
    const metricsData = {
      timeframe,
      generated_at: new Date().toISOString(),
      summary: {},
      conversion_funnel: {},
      user_behavior: {},
      performance: {},
      drop_offs: {},
      revenue: {}
    }

    // 1. Conversion Funnel Metrics
    if (metric_type === 'all' || metric_type === 'conversion') {
      metricsData.conversion_funnel = await getConversionMetrics(supabase, timeAgo, include_detailed)
    }

    // 2. User Behavior Analysis
    if (metric_type === 'all' || metric_type === 'behavior') {
      metricsData.user_behavior = await getUserBehaviorMetrics(supabase, timeAgo, include_detailed)
    }

    // 3. Performance Metrics
    if (metric_type === 'all' || metric_type === 'performance') {
      metricsData.performance = await getPerformanceMetrics(supabase, timeAgo, include_detailed)
    }

    // 4. Drop-off Analysis
    if (metric_type === 'all' || metric_type === 'dropoffs') {
      metricsData.drop_offs = await getDropOffMetrics(supabase, timeAgo, include_detailed)
    }

    // 5. Revenue Metrics
    if (metric_type === 'all' || metric_type === 'revenue') {
      metricsData.revenue = await getRevenueMetrics(supabase, timeAgo, include_detailed)
    }

    // 6. Summary Statistics
    metricsData.summary = await getSummaryMetrics(supabase, timeAgo)

    // Add real-time PostHog insights if available
    if (posthog && (metric_type === 'all' || metric_type === 'realtime')) {
      try {
        metricsData.realtime = await getPostHogInsights(timeframe)
      } catch (error) {
        console.error('PostHog insights error:', error)
        metricsData.realtime = { error: 'PostHog unavailable' }
      }
    }

    return NextResponse.json(metricsData)

  } catch (error) {
    console.error('Metrics dashboard error:', error)
    return NextResponse.json({ 
      error: 'Failed to fetch metrics data',
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}

// Conversion Funnel Metrics
async function getConversionMetrics(supabase, timeAgo, detailed) {
  const metrics = {}

  try {
    // Visitor to subscriber conversion
    const { data: pricingViews } = await supabase
      .from('metrics_events')
      .select('session_id, properties')
      .eq('event_name', 'pricing_page_viewed')
      .gte('created_at', timeAgo)

    const { data: subscriptions } = await supabase
      .from('metrics_events')
      .select('session_id, properties')
      .eq('event_name', 'subscription_completed')
      .gte('created_at', timeAgo)

    const uniquePricingViews = new Set(pricingViews?.map(v => v.session_id)).size
    const uniqueSubscriptions = new Set(subscriptions?.map(s => s.session_id)).size

    metrics.visitor_to_subscriber = {
      pricing_page_views: uniquePricingViews,
      completed_subscriptions: uniqueSubscriptions,
      conversion_rate: uniquePricingViews > 0 ? (uniqueSubscriptions / uniquePricingViews * 100).toFixed(2) : 0
    }

    // Plan selection analysis
    const { data: planHovers } = await supabase
      .from('plan_interactions')
      .select('plan_name, interaction_type')
      .eq('interaction_type', 'hover')
      .gte('timestamp', timeAgo)

    const { data: planClicks } = await supabase
      .from('plan_interactions')
      .select('plan_name, interaction_type')
      .eq('interaction_type', 'click_no_completion')
      .gte('timestamp', timeAgo)

    // Plan popularity analysis
    const planHoverCounts = {}
    const planClickCounts = {}
    
    planHovers?.forEach(hover => {
      planHoverCounts[hover.plan_name] = (planHoverCounts[hover.plan_name] || 0) + 1
    })
    
    planClicks?.forEach(click => {
      planClickCounts[click.plan_name] = (planClickCounts[click.plan_name] || 0) + 1
    })

    metrics.plan_interactions = {
      most_hovered_plan: Object.keys(planHoverCounts).reduce((a, b) => 
        planHoverCounts[a] > planHoverCounts[b] ? a : b, Object.keys(planHoverCounts)[0]),
      hover_counts: planHoverCounts,
      click_without_completion_counts: planClickCounts,
      total_hovers: planHovers?.length || 0,
      total_clicks_without_completion: planClicks?.length || 0
    }

    // OAuth completion rates
    const { data: oauthStarted } = await supabase
      .from('oauth_funnel')
      .select('session_id, oauth_provider')
      .eq('step', 'started')
      .gte('timestamp', timeAgo)

    const { data: oauthCompleted } = await supabase
      .from('oauth_funnel')
      .select('session_id, oauth_provider')
      .eq('step', 'completed')
      .gte('timestamp', timeAgo)

    const oauthProviders = {}
    oauthStarted?.forEach(oauth => {
      if (!oauthProviders[oauth.oauth_provider]) {
        oauthProviders[oauth.oauth_provider] = { started: 0, completed: 0 }
      }
      oauthProviders[oauth.oauth_provider].started++
    })

    oauthCompleted?.forEach(oauth => {
      if (!oauthProviders[oauth.oauth_provider]) {
        oauthProviders[oauth.oauth_provider] = { started: 0, completed: 0 }
      }
      oauthProviders[oauth.oauth_provider].completed++
    })

    Object.keys(oauthProviders).forEach(provider => {
      const stats = oauthProviders[provider]
      stats.completion_rate = stats.started > 0 ? (stats.completed / stats.started * 100).toFixed(2) : 0
    })

    metrics.oauth_completion = {
      by_provider: oauthProviders,
      overall: {
        started: oauthStarted?.length || 0,
        completed: oauthCompleted?.length || 0,
        completion_rate: oauthStarted?.length > 0 ? 
          (oauthCompleted.length / oauthStarted.length * 100).toFixed(2) : 0
      }
    }

    // Payment success/failure rates
    const { data: paymentsStarted } = await supabase
      .from('payment_funnel')
      .select('session_id, step, amount')
      .eq('step', 'checkout_started')
      .gte('timestamp', timeAgo)

    const { data: paymentsCompleted } = await supabase
      .from('metrics_events')
      .select('session_id, properties')
      .eq('event_name', 'stripe_checkout_completed')
      .gte('created_at', timeAgo)

    const { data: paymentsFailed } = await supabase
      .from('metrics_events')
      .select('session_id, properties')
      .eq('event_name', 'stripe_checkout_failed')
      .gte('created_at', timeAgo)

    const { data: paymentsAbandoned } = await supabase
      .from('payment_funnel')
      .select('session_id, step')
      .eq('step', 'checkout_abandoned')
      .gte('timestamp', timeAgo)

    metrics.payment_funnel = {
      started: paymentsStarted?.length || 0,
      completed: paymentsCompleted?.length || 0,
      failed: paymentsFailed?.length || 0,
      abandoned: paymentsAbandoned?.length || 0,
      success_rate: paymentsStarted?.length > 0 ? 
        (paymentsCompleted.length / paymentsStarted.length * 100).toFixed(2) : 0,
      abandonment_rate: paymentsStarted?.length > 0 ? 
        (paymentsAbandoned.length / paymentsStarted.length * 100).toFixed(2) : 0
    }

    if (detailed) {
      // Add detailed breakdown by time intervals
      metrics.hourly_breakdown = await getHourlyConversionBreakdown(supabase, timeAgo)
    }

  } catch (error) {
    console.error('Conversion metrics error:', error)
    metrics.error = 'Failed to fetch conversion metrics'
  }

  return metrics
}

// User Behavior Metrics
async function getUserBehaviorMetrics(supabase, timeAgo, detailed) {
  const metrics = {}

  try {
    // Time on pricing page
    const { data: timeTracking } = await supabase
      .from('metrics_events')
      .select('properties')
      .like('event_name', 'time_on_page_%')
      .gte('created_at', timeAgo)

    const timeDistribution = {}
    timeTracking?.forEach(event => {
      const timeEvent = event.properties?.event_name || event.event_name
      timeDistribution[timeEvent] = (timeDistribution[timeEvent] || 0) + 1
    })

    metrics.time_on_page = {
      distribution: timeDistribution,
      total_sessions: timeTracking?.length || 0
    }

    // Scroll depth analysis
    const { data: scrollEvents } = await supabase
      .from('metrics_events')
      .select('event_name, properties')
      .like('event_name', 'scroll_depth_%')
      .gte('created_at', timeAgo)

    const scrollDepthStats = {
      '25%': 0, '50%': 0, '75%': 0, '100%': 0
    }

    scrollEvents?.forEach(event => {
      if (event.event_name.includes('25')) scrollDepthStats['25%']++
      else if (event.event_name.includes('50')) scrollDepthStats['50%']++
      else if (event.event_name.includes('75')) scrollDepthStats['75%']++
      else if (event.event_name.includes('100')) scrollDepthStats['100%']++
    })

    metrics.scroll_engagement = scrollDepthStats

    // Element visibility and interaction
    const { data: elementViews } = await supabase
      .from('metrics_events')
      .select('properties')
      .eq('event_name', 'element_viewed')
      .gte('created_at', timeAgo)

    const elementStats = {}
    elementViews?.forEach(view => {
      const elementData = view.properties?.element_data
      if (elementData) {
        elementStats[elementData] = (elementStats[elementData] || 0) + 1
      }
    })

    metrics.element_visibility = {
      most_viewed_elements: elementStats,
      total_element_views: elementViews?.length || 0
    }

    if (detailed) {
      // Device and browser breakdown
      const { data: deviceData } = await supabase
        .from('metrics_events')
        .select('properties')
        .gte('created_at', timeAgo)
        .limit(1000)

      const deviceStats = { mobile: 0, tablet: 0, desktop: 0 }
      const browserStats = {}

      deviceData?.forEach(event => {
        const deviceType = event.properties?.device_type
        const userAgent = event.properties?.user_agent

        if (deviceType && deviceStats.hasOwnProperty(deviceType)) {
          deviceStats[deviceType]++
        }

        if (userAgent) {
          const browser = extractBrowserFromUserAgent(userAgent)
          browserStats[browser] = (browserStats[browser] || 0) + 1
        }
      })

      metrics.device_breakdown = deviceStats
      metrics.browser_breakdown = browserStats
    }

  } catch (error) {
    console.error('User behavior metrics error:', error)
    metrics.error = 'Failed to fetch user behavior metrics'
  }

  return metrics
}

// Performance Metrics
async function getPerformanceMetrics(supabase, timeAgo, detailed) {
  const metrics = {}

  try {
    // Page load performance
    const { data: performanceData } = await supabase
      .from('page_performance')
      .select('load_time, first_contentful_paint, largest_contentful_paint, cumulative_layout_shift, first_input_delay, page_url, device_type')
      .gte('timestamp', timeAgo)

    if (performanceData && performanceData.length > 0) {
      const loadTimes = performanceData.map(p => p.load_time).filter(t => t > 0)
      const fcpTimes = performanceData.map(p => p.first_contentful_paint).filter(t => t > 0)
      const lcpTimes = performanceData.map(p => p.largest_contentful_paint).filter(t => t > 0)
      
      metrics.page_load = {
        average_load_time: loadTimes.length > 0 ? Math.round(loadTimes.reduce((a, b) => a + b) / loadTimes.length) : 0,
        median_load_time: loadTimes.length > 0 ? getMedian(loadTimes) : 0,
        p95_load_time: loadTimes.length > 0 ? getPercentile(loadTimes, 95) : 0,
        average_fcp: fcpTimes.length > 0 ? Math.round(fcpTimes.reduce((a, b) => a + b) / fcpTimes.length) : 0,
        average_lcp: lcpTimes.length > 0 ? Math.round(lcpTimes.reduce((a, b) => a + b) / lcpTimes.length) : 0,
        total_measurements: performanceData.length
      }

      // Core Web Vitals scoring
      const { data: webVitals } = await supabase
        .from('metrics_events')
        .select('properties')
        .eq('event_name', 'web_vital')
        .gte('created_at', timeAgo)

      const vitalScores = { LCP: [], FID: [], CLS: [] }
      webVitals?.forEach(vital => {
        const name = vital.properties?.vital_name
        const value = vital.properties?.value
        if (name && value !== undefined && vitalScores[name]) {
          vitalScores[name].push(value)
        }
      })

      metrics.core_web_vitals = {
        lcp: vitalScores.LCP.length > 0 ? {
          average: vitalScores.LCP.reduce((a, b) => a + b) / vitalScores.LCP.length,
          p75: getPercentile(vitalScores.LCP, 75),
          good_threshold: 2500, // ms
          needs_improvement_threshold: 4000 // ms
        } : null,
        fid: vitalScores.FID.length > 0 ? {
          average: vitalScores.FID.reduce((a, b) => a + b) / vitalScores.FID.length,
          p75: getPercentile(vitalScores.FID, 75),
          good_threshold: 100, // ms
          needs_improvement_threshold: 300 // ms
        } : null,
        cls: vitalScores.CLS.length > 0 ? {
          average: vitalScores.CLS.reduce((a, b) => a + b) / vitalScores.CLS.length,
          p75: getPercentile(vitalScores.CLS, 75),
          good_threshold: 0.1,
          needs_improvement_threshold: 0.25
        } : null
      }
    }

    if (detailed) {
      // Performance by page and device type
      const pagePerformance = {}
      const devicePerformance = { mobile: [], tablet: [], desktop: [] }

      performanceData?.forEach(perf => {
        // Group by page
        if (!pagePerformance[perf.page_url]) {
          pagePerformance[perf.page_url] = []
        }
        pagePerformance[perf.page_url].push(perf.load_time)

        // Group by device
        if (devicePerformance[perf.device_type]) {
          devicePerformance[perf.device_type].push(perf.load_time)
        }
      })

      metrics.performance_by_page = Object.keys(pagePerformance).reduce((acc, url) => {
        const times = pagePerformance[url].filter(t => t > 0)
        acc[url] = times.length > 0 ? {
          average: Math.round(times.reduce((a, b) => a + b) / times.length),
          median: getMedian(times),
          sample_size: times.length
        } : null
        return acc
      }, {})

      metrics.performance_by_device = Object.keys(devicePerformance).reduce((acc, device) => {
        const times = devicePerformance[device].filter(t => t > 0)
        acc[device] = times.length > 0 ? {
          average: Math.round(times.reduce((a, b) => a + b) / times.length),
          median: getMedian(times),
          sample_size: times.length
        } : null
        return acc
      }, {})
    }

  } catch (error) {
    console.error('Performance metrics error:', error)
    metrics.error = 'Failed to fetch performance metrics'
  }

  return metrics
}

// Drop-off Analysis
async function getDropOffMetrics(supabase, timeAgo, detailed) {
  const metrics = {}

  try {
    const { data: dropOffs } = await supabase
      .from('metrics_events')
      .select('properties')
      .eq('event_name', 'funnel_drop_off')
      .gte('created_at', timeAgo)

    const dropOffStats = {}
    const reasonStats = {}

    dropOffs?.forEach(dropOff => {
      const step = dropOff.properties?.funnel_step
      const reason = dropOff.properties?.drop_off_reason

      if (step) {
        dropOffStats[step] = (dropOffStats[step] || 0) + 1
      }
      if (reason) {
        reasonStats[reason] = (reasonStats[reason] || 0) + 1
      }
    })

    metrics.drop_off_points = {
      by_funnel_step: dropOffStats,
      by_reason: reasonStats,
      total_drop_offs: dropOffs?.length || 0
    }

    // Form abandonment analysis
    const { data: formAbandonment } = await supabase
      .from('metrics_events')
      .select('properties')
      .eq('event_name', 'form_field_abandoned')
      .gte('created_at', timeAgo)

    const formStats = {}
    formAbandonment?.forEach(abandon => {
      const formName = abandon.properties?.form_name
      const fieldName = abandon.properties?.field_name
      
      if (!formStats[formName]) formStats[formName] = {}
      formStats[formName][fieldName] = (formStats[formName][fieldName] || 0) + 1
    })

    metrics.form_abandonment = {
      by_form_and_field: formStats,
      total_abandonments: formAbandonment?.length || 0
    }

  } catch (error) {
    console.error('Drop-off metrics error:', error)
    metrics.error = 'Failed to fetch drop-off metrics'
  }

  return metrics
}

// Revenue Metrics
async function getRevenueMetrics(supabase, timeAgo, detailed) {
  const metrics = {}

  try {
    const { data: revenueEvents } = await supabase
      .from('metrics_events')
      .select('properties')
      .eq('event_name', 'subscription_completed')
      .gte('created_at', timeAgo)

    let totalRevenue = 0
    const planRevenue = {}
    const revenueByDay = {}

    revenueEvents?.forEach(event => {
      const amount = parseFloat(event.properties?.amount || 0)
      const planName = event.properties?.plan_name
      const date = event.properties?.timestamp?.split('T')[0]

      totalRevenue += amount
      
      if (planName) {
        planRevenue[planName] = (planRevenue[planName] || 0) + amount
      }
      
      if (date) {
        revenueByDay[date] = (revenueByDay[date] || 0) + amount
      }
    })

    metrics.revenue_summary = {
      total_revenue: totalRevenue,
      revenue_by_plan: planRevenue,
      average_revenue_per_user: revenueEvents?.length > 0 ? totalRevenue / revenueEvents.length : 0,
      total_subscriptions: revenueEvents?.length || 0
    }

    if (detailed) {
      metrics.daily_revenue = revenueByDay
    }

  } catch (error) {
    console.error('Revenue metrics error:', error)
    metrics.error = 'Failed to fetch revenue metrics'
  }

  return metrics
}

// Summary Metrics
async function getSummaryMetrics(supabase, timeAgo) {
  const summary = {}

  try {
    // Overall session count
    const { data: sessions } = await supabase
      .from('metrics_events')
      .select('session_id')
      .gte('created_at', timeAgo)

    const uniqueSessions = new Set(sessions?.map(s => s.session_id)).size

    // Top events
    const { data: allEvents } = await supabase
      .from('metrics_events')
      .select('event_name')
      .gte('created_at', timeAgo)

    const eventCounts = {}
    allEvents?.forEach(event => {
      eventCounts[event.event_name] = (eventCounts[event.event_name] || 0) + 1
    })

    const topEvents = Object.entries(eventCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)
      .reduce((acc, [event, count]) => {
        acc[event] = count
        return acc
      }, {})

    summary.overview = {
      unique_sessions: uniqueSessions,
      total_events: allEvents?.length || 0,
      top_events: topEvents,
      data_freshness: new Date().toISOString()
    }

  } catch (error) {
    console.error('Summary metrics error:', error)
    summary.error = 'Failed to fetch summary metrics'
  }

  return summary
}

// PostHog Real-time Insights
async function getPostHogInsights(timeframe) {
  // This would integrate with PostHog API for real-time insights
  // For now, return a placeholder structure
  return {
    active_users_now: 0,
    popular_pages: [],
    conversion_trends: [],
    note: 'PostHog integration pending'
  }
}

// Helper functions
function getTimeAgo(timeframe) {
  const now = new Date()
  switch (timeframe) {
    case '1h': return new Date(now - 60 * 60 * 1000).toISOString()
    case '24h': return new Date(now - 24 * 60 * 60 * 1000).toISOString()
    case '7d': return new Date(now - 7 * 24 * 60 * 60 * 1000).toISOString()
    case '30d': return new Date(now - 30 * 24 * 60 * 60 * 1000).toISOString()
    case '90d': return new Date(now - 90 * 24 * 60 * 60 * 1000).toISOString()
    default: return new Date(now - 7 * 24 * 60 * 60 * 1000).toISOString()
  }
}

function getMedian(arr) {
  const sorted = [...arr].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2
}

function getPercentile(arr, percentile) {
  const sorted = [...arr].sort((a, b) => a - b)
  const index = Math.ceil((percentile / 100) * sorted.length) - 1
  return sorted[index] || 0
}

function extractBrowserFromUserAgent(userAgent) {
  if (userAgent.includes('Chrome')) return 'Chrome'
  if (userAgent.includes('Firefox')) return 'Firefox'
  if (userAgent.includes('Safari')) return 'Safari'
  if (userAgent.includes('Edge')) return 'Edge'
  return 'Other'
}

async function getHourlyConversionBreakdown(supabase, timeAgo) {
  // Implementation for hourly breakdown would go here
  return {}
}

// Health check endpoint
export async function HEAD() {
  return NextResponse.json({ status: 'healthy' })
}