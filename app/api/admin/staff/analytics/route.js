import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { withAuth, getUserProfile } from '@/lib/auth-middleware'

/**
 * GET /api/admin/staff/analytics
 * Get staff performance analytics (admin only)
 * Query params: start_date, end_date (optional, default last 30 days)
 */
export const GET = withAuth(async (request) => {
  try {
    const supabase = createClient()

    // Get authenticated user
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get user profile and verify admin access
    const profile = await getUserProfile(user.id)
    if (!profile || (profile.role !== 'SHOP_OWNER' && profile.role !== 'SUPER_ADMIN')) {
      return NextResponse.json(
        { success: false, error: 'Forbidden - admin access required' },
        { status: 403 }
      )
    }

    // Parse date range from query params
    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get('start_date')
    const endDate = searchParams.get('end_date')

    // Default to last 30 days if not specified
    const defaultEndDate = new Date()
    const defaultStartDate = new Date()
    defaultStartDate.setDate(defaultStartDate.getDate() - 30)

    const dateRangeStart = startDate || defaultStartDate.toISOString().split('T')[0]
    const dateRangeEnd = endDate || defaultEndDate.toISOString().split('T')[0]

    // Get all staff members in this barbershop
    const { data: staffMembers, error: staffError } = await supabase
      .from('profiles')
      .select('id, first_name, last_name, email, booking_slug, image, role')
      .eq('barbershop_id', profile.barbershop_id)
      .eq('role', 'BARBER')
      .order('first_name', { ascending: true })

    if (staffError) {
      console.error('Error fetching staff:', staffError)
      return NextResponse.json(
        { success: false, error: 'Failed to fetch staff members' },
        { status: 500 }
      )
    }

    // Get analytics for each staff member
    const analyticsPromises = staffMembers.map(async (staff) => {
      // Get total bookings and revenue
      const { data: bookings, error: bookingsError } = await supabase
        .from('appointments')
        .select('id, price, booking_source, service_id, scheduled_at')
        .eq('barber_id', staff.id)
        .gte('scheduled_at', `${dateRangeStart}T00:00:00`)
        .lte('scheduled_at', `${dateRangeEnd}T23:59:59`)
        .in('status', ['confirmed', 'completed'])

      if (bookingsError) {
        console.error(`Error fetching bookings for ${staff.id}:`, bookingsError)
        return null
      }

      const totalBookings = bookings?.length || 0
      const totalRevenue = bookings?.reduce((sum, b) => sum + (parseFloat(b.price) || 0), 0) || 0

      // Break down by booking source
      const sourceBreakdown = {
        staff_link: { count: 0, revenue: 0 },
        admin: { count: 0, revenue: 0 },
        walk_in: { count: 0, revenue: 0 },
      }

      bookings?.forEach((booking) => {
        const source = booking.booking_source || 'admin'
        if (sourceBreakdown[source]) {
          sourceBreakdown[source].count++
          sourceBreakdown[source].revenue += parseFloat(booking.price) || 0
        }
      })

      // Get top services
      const serviceCount = {}
      bookings?.forEach((booking) => {
        if (booking.service_id) {
          serviceCount[booking.service_id] = (serviceCount[booking.service_id] || 0) + 1
        }
      })

      // Get service details for top 5
      const topServiceIds = Object.entries(serviceCount)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([id]) => id)

      let topServices = []
      if (topServiceIds.length > 0) {
        const { data: services } = await supabase
          .from('services')
          .select('id, name, price')
          .in('id', topServiceIds)

        topServices = services?.map((service) => ({
          ...service,
          booking_count: serviceCount[service.id],
          revenue: serviceCount[service.id] * parseFloat(service.price),
        })) || []
      }

      return {
        staff_id: staff.id,
        staff_name: `${staff.first_name} ${staff.last_name}`,
        first_name: staff.first_name,
        last_name: staff.last_name,
        email: staff.email,
        booking_slug: staff.booking_slug,
        image: staff.image,
        total_bookings: totalBookings,
        total_revenue: totalRevenue,
        average_booking_value: totalBookings > 0 ? totalRevenue / totalBookings : 0,
        source_breakdown: sourceBreakdown,
        top_services: topServices.sort((a, b) => b.booking_count - a.booking_count),
        booking_url: staff.booking_slug ? `/book/${staff.booking_slug}` : null,
      }
    })

    const analytics = await Promise.all(analyticsPromises)

    // Filter out any null results (from errors)
    const validAnalytics = analytics.filter((a) => a !== null)

    return NextResponse.json({
      success: true,
      date_range: {
        start: dateRangeStart,
        end: dateRangeEnd,
      },
      analytics: validAnalytics,
      summary: {
        total_staff: validAnalytics.length,
        total_bookings: validAnalytics.reduce((sum, a) => sum + a.total_bookings, 0),
        total_revenue: validAnalytics.reduce((sum, a) => sum + a.total_revenue, 0),
      },
    })
  } catch (error) {
    console.error('Analytics API error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
})
