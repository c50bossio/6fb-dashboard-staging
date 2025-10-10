import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

/**
 * GET /api/enterprise/overview
 *
 * Fetches organization-wide summary statistics for enterprise dashboard
 *
 * Returns:
 * - Total locations (active/inactive counts)
 * - Aggregate financial metrics (revenue, bookings)
 * - Average satisfaction and utilization scores
 * - Top and bottom performing locations
 *
 * Security: RLS enforced - users can only see their own organization's data
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

    // Get organization details
    const { data: organization, error: orgError } = await supabase
      .from('organizations')
      .select('id, name')
      .eq('id', organizationId)
      .single()

    if (orgError) {
      return NextResponse.json(
        { success: false, error: 'Failed to fetch organization details' },
        { status: 500 }
      )
    }

    // Get all barbershops for this organization
    const { data: locations, error: locationsError } = await supabase
      .from('barbershops')
      .select('id, name, is_active')
      .eq('organization_id', organizationId)

    if (locationsError) {
      return NextResponse.json(
        { success: false, error: 'Failed to fetch locations' },
        { status: 500 }
      )
    }

    const totalLocations = locations.length
    const activeLocations = locations.filter(l => l.is_active).length
    const inactiveLocations = totalLocations - activeLocations

    // Get performance metrics for the last 30 days (daily metrics)
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    const dateRangeStart = thirtyDaysAgo.toISOString().split('T')[0]
    const today = new Date().toISOString().split('T')[0]

    const { data: metrics, error: metricsError } = await supabase
      .from('location_performance_metrics')
      .select(`
        location_id,
        total_revenue,
        total_customers,
        customer_satisfaction_score,
        capacity_utilization
      `)
      .eq('organization_id', organizationId)
      .eq('metric_period', 'daily')
      .gte('metric_date', dateRangeStart)
      .lte('metric_date', today)

    if (metricsError) {
      return NextResponse.json(
        { success: false, error: 'Failed to fetch performance metrics' },
        { status: 500 }
      )
    }

    // Aggregate metrics across all locations
    let totalRevenue = 0
    let totalBookings = 0
    let satisfactionSum = 0
    let satisfactionCount = 0
    let utilizationSum = 0
    let utilizationCount = 0

    // Track per-location totals for ranking
    const locationTotals = {}

    metrics.forEach(metric => {
      totalRevenue += parseFloat(metric.total_revenue || 0)
      totalBookings += parseInt(metric.total_customers || 0)

      if (metric.customer_satisfaction_score) {
        satisfactionSum += parseFloat(metric.customer_satisfaction_score)
        satisfactionCount++
      }

      if (metric.capacity_utilization) {
        utilizationSum += parseFloat(metric.capacity_utilization)
        utilizationCount++
      }

      // Track location totals for ranking
      if (!locationTotals[metric.location_id]) {
        locationTotals[metric.location_id] = {
          locationId: metric.location_id,
          revenue: 0,
          bookings: 0
        }
      }
      locationTotals[metric.location_id].revenue += parseFloat(metric.total_revenue || 0)
      locationTotals[metric.location_id].bookings += parseInt(metric.total_customers || 0)
    })

    const averageSatisfaction = satisfactionCount > 0
      ? (satisfactionSum / satisfactionCount).toFixed(2)
      : 0

    const averageUtilization = utilizationCount > 0
      ? (utilizationSum / utilizationCount).toFixed(4)
      : 0

    // Find top and bottom performers by revenue
    const locationRankings = Object.values(locationTotals).sort((a, b) => b.revenue - a.revenue)

    let topPerformer = null
    let bottomPerformer = null

    if (locationRankings.length > 0) {
      const topLocationId = locationRankings[0].locationId
      const topLocation = locations.find(l => l.id === topLocationId)
      if (topLocation) {
        topPerformer = {
          locationId: topLocationId,
          locationName: topLocation.name,
          revenue: locationRankings[0].revenue.toFixed(2)
        }
      }

      const bottomLocationId = locationRankings[locationRankings.length - 1].locationId
      const bottomLocation = locations.find(l => l.id === bottomLocationId)
      if (bottomLocation) {
        bottomPerformer = {
          locationId: bottomLocationId,
          locationName: bottomLocation.name,
          revenue: locationRankings[locationRankings.length - 1].revenue.toFixed(2)
        }
      }
    }

    // Return response matching spec format
    return NextResponse.json({
      success: true,
      data: {
        organizationId: organization.id,
        organizationName: organization.name,
        totalLocations,
        activeLocations,
        inactiveLocations,
        totalRevenue: totalRevenue.toFixed(2),
        totalBookings,
        averageSatisfaction: parseFloat(averageSatisfaction),
        averageUtilization: parseFloat(averageUtilization),
        topPerformer,
        bottomPerformer
      },
      meta: {
        dateRange: `${dateRangeStart} to ${today}`,
        lastUpdated: new Date().toISOString()
      }
    })

  } catch (error) {
    console.error('Enterprise overview API error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
