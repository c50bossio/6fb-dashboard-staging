import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

/**
 * GET /api/enterprise/locations/performance
 *
 * Fetches detailed performance data for all locations in the organization
 *
 * Returns sortable/filterable table data with:
 * - Location details (name, city, state)
 * - Performance metrics (revenue, bookings, satisfaction, utilization)
 * - Trend indicators and rankings
 *
 * Security: RLS enforced - users can only see their own organization's locations
 */
export async function GET(request) {
  try {
    const supabase = await createClient()

    // Verify authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get user's profile with organization_id
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, organization_id, role')
      .eq('id', user.id)
      .single()

    if (profileError || !profile?.organization_id) {
      return NextResponse.json(
        { success: false, error: 'Organization not found for user' },
        { status: 404 }
      )
    }

    const organizationId = profile.organization_id

    // Get all barbershops for this organization
    const { data: locations, error: locationsError } = await supabase
      .from('barbershops')
      .select('id, name, city, state, address, is_active')
      .eq('organization_id', organizationId)

    if (locationsError) {
      return NextResponse.json(
        { success: false, error: 'Failed to fetch locations' },
        { status: 500 }
      )
    }

    // Get performance metrics for the last 30 days
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    const dateRangeStart = thirtyDaysAgo.toISOString().split('T')[0]
    const today = new Date().toISOString().split('T')[0]

    // Also get previous period for trend calculation
    const sixtyDaysAgo = new Date()
    sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60)
    const previousPeriodStart = sixtyDaysAgo.toISOString().split('T')[0]

    const { data: allMetrics, error: metricsError } = await supabase
      .from('location_performance_metrics')
      .select(`
        location_id,
        metric_date,
        total_revenue,
        total_customers,
        customer_satisfaction_score,
        capacity_utilization
      `)
      .eq('organization_id', organizationId)
      .eq('metric_period', 'daily')
      .gte('metric_date', previousPeriodStart)
      .lte('metric_date', today)

    if (metricsError) {
      return NextResponse.json(
        { success: false, error: 'Failed to fetch performance metrics' },
        { status: 500 }
      )
    }

    // Aggregate metrics per location for current period (last 30 days)
    const locationMetrics = {}
    const previousPeriodMetrics = {}

    allMetrics.forEach(metric => {
      const metricDate = new Date(metric.metric_date)
      const thirtyDaysAgoDate = new Date(dateRangeStart)
      const isCurrentPeriod = metricDate >= thirtyDaysAgoDate

      const targetMap = isCurrentPeriod ? locationMetrics : previousPeriodMetrics

      if (!targetMap[metric.location_id]) {
        targetMap[metric.location_id] = {
          revenue: 0,
          bookings: 0,
          satisfactionSum: 0,
          satisfactionCount: 0,
          utilizationSum: 0,
          utilizationCount: 0
        }
      }

      const locMetric = targetMap[metric.location_id]
      locMetric.revenue += parseFloat(metric.total_revenue || 0)
      locMetric.bookings += parseInt(metric.total_customers || 0)

      if (metric.customer_satisfaction_score) {
        locMetric.satisfactionSum += parseFloat(metric.customer_satisfaction_score)
        locMetric.satisfactionCount++
      }

      if (metric.capacity_utilization) {
        locMetric.utilizationSum += parseFloat(metric.capacity_utilization)
        locMetric.utilizationCount++
      }
    })

    // Build location performance array with trend calculation
    const locationPerformance = locations.map(location => {
      const currentMetrics = locationMetrics[location.id] || {
        revenue: 0,
        bookings: 0,
        satisfactionSum: 0,
        satisfactionCount: 0,
        utilizationSum: 0,
        utilizationCount: 0
      }

      const previousMetrics = previousPeriodMetrics[location.id] || {
        revenue: 0
      }

      // Calculate averages
      const satisfaction = currentMetrics.satisfactionCount > 0
        ? parseFloat((currentMetrics.satisfactionSum / currentMetrics.satisfactionCount).toFixed(2))
        : 0

      const utilization = currentMetrics.utilizationCount > 0
        ? parseFloat((currentMetrics.utilizationSum / currentMetrics.utilizationCount).toFixed(4))
        : 0

      // Calculate trend (comparing current 30 days to previous 30 days)
      let trend = 'stable'
      if (previousMetrics.revenue > 0) {
        const percentChange = ((currentMetrics.revenue - previousMetrics.revenue) / previousMetrics.revenue) * 100
        if (percentChange > 5) {
          trend = 'up'
        } else if (percentChange < -5) {
          trend = 'down'
        }
      } else if (currentMetrics.revenue > 0) {
        trend = 'up' // New location with revenue
      }

      return {
        id: location.id,
        name: location.name,
        city: location.city || '',
        state: location.state || '',
        isActive: location.is_active,
        revenue: parseFloat(currentMetrics.revenue.toFixed(2)),
        bookings: currentMetrics.bookings,
        satisfaction,
        utilization,
        trend
      }
    })

    // Rank by revenue (highest first)
    const sortedByRevenue = [...locationPerformance].sort((a, b) => b.revenue - a.revenue)
    sortedByRevenue.forEach((loc, index) => {
      const originalLoc = locationPerformance.find(l => l.id === loc.id)
      if (originalLoc) {
        originalLoc.performanceRank = index + 1
      }
    })

    return NextResponse.json({
      success: true,
      data: {
        locations: locationPerformance
      },
      meta: {
        dateRange: `${dateRangeStart} to ${today}`,
        totalLocations: locations.length,
        lastUpdated: new Date().toISOString()
      }
    })

  } catch (error) {
    console.error('Enterprise locations performance API error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
