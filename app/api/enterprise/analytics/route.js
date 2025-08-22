import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// Force dynamic rendering - this route uses authentication
export const dynamic = 'force-dynamic'

export async function GET(request) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    const timeRange = searchParams.get('timeRange') || '7d'
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's profile and organization
    const { data: profile } = await supabase
      .from('profiles')
      .select('organization_id, role')
      .eq('id', user.id)
      .single()

    // Check if user has enterprise access
    if (!profile || !['ENTERPRISE_OWNER', 'SUPER_ADMIN'].includes(profile.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    // Mock analytics data
    const mockAnalyticsData = {
      summary: {
        totalRevenue: 145780,
        revenueChange: 12.5,
        totalBookings: 3247,
        bookingsChange: 8.3,
        activeCustomers: 892,
        customersChange: 5.2,
        averageRating: 4.8,
        ratingChange: 0.2
      },
      revenueByLocation: [
        { location: 'Downtown', revenue: 75420, percentage: 51.7 },
        { location: 'Uptown', revenue: 42360, percentage: 29.1 },
        { location: 'Brooklyn', revenue: 28000, percentage: 19.2 }
      ],
      bookingsByLocation: [
        { location: 'Downtown', bookings: 1823, percentage: 56.1 },
        { location: 'Uptown', bookings: 924, percentage: 28.5 },
        { location: 'Brooklyn', bookings: 500, percentage: 15.4 }
      ],
      topPerformers: [
        { 
          name: 'Mike Johnson',
          location: 'Downtown',
          revenue: 18500,
          bookings: 423,
          rating: 4.9,
          trend: 'up'
        },
        { 
          name: 'Sarah Williams',
          location: 'Downtown',
          revenue: 15200,
          bookings: 367,
          rating: 4.8,
          trend: 'up'
        },
        { 
          name: 'David Lee',
          location: 'Uptown',
          revenue: 13800,
          bookings: 298,
          rating: 4.8,
          trend: 'stable'
        }
      ],
      revenueTrend: generateTrendData(timeRange, 'revenue'),
      bookingsTrend: generateTrendData(timeRange, 'bookings'),
      customerGrowth: {
        newCustomers: 145,
        returningCustomers: 747,
        churnRate: 8.2,
        retentionRate: 91.8
      },
      servicePopularity: [
        { service: 'Haircut', bookings: 1542, revenue: 53970 },
        { service: 'Beard Trim', bookings: 892, revenue: 22300 },
        { service: 'Full Service', bookings: 456, revenue: 34200 },
        { service: 'Hair Color', bookings: 234, revenue: 18600 },
        { service: 'Kids Cut', bookings: 123, revenue: 3075 }
      ],
      peakHours: [
        { hour: '10 AM', bookings: 245 },
        { hour: '11 AM', bookings: 312 },
        { hour: '12 PM', bookings: 289 },
        { hour: '1 PM', bookings: 267 },
        { hour: '2 PM', bookings: 298 },
        { hour: '3 PM', bookings: 334 },
        { hour: '4 PM', bookings: 367 },
        { hour: '5 PM', bookings: 412 },
        { hour: '6 PM', bookings: 389 },
        { hour: '7 PM', bookings: 234 }
      ],
      locationComparison: [
        {
          location: 'Downtown',
          metrics: {
            revenue: 75420,
            bookings: 1823,
            customers: 456,
            rating: 4.9,
            utilization: 85
          }
        },
        {
          location: 'Uptown',
          metrics: {
            revenue: 42360,
            bookings: 924,
            customers: 312,
            rating: 4.7,
            utilization: 78
          }
        },
        {
          location: 'Brooklyn',
          metrics: {
            revenue: 28000,
            bookings: 500,
            customers: 124,
            rating: 4.8,
            utilization: 72
          }
        }
      ]
    }

    // If organization exists, try to get real data
    if (profile?.organization_id) {
      // Get all barbershops for this organization
      const { data: barbershops } = await supabase
        .from('barbershops')
        .select('*')
        .eq('organization_id', profile.organization_id)

      if (barbershops && barbershops.length > 0) {
        // Calculate real metrics from database
        let totalBookings = 0
        let locationData = []

        for (const shop of barbershops) {
          // Count bookings for each shop
          const { count: bookingCount } = await supabase
            .from('bookings')
            .select('*', { count: 'exact', head: true })
            .eq('shop_id', shop.id)

          const { count: appointmentCount } = await supabase
            .from('appointments')
            .select('*', { count: 'exact', head: true })
            .eq('barbershop_id', shop.id)

          const shopBookings = (bookingCount || 0) + (appointmentCount || 0)
          totalBookings += shopBookings

          locationData.push({
            location: shop.name,
            bookings: shopBookings,
            percentage: 0 // Will calculate after getting all data
          })
        }

        // Calculate percentages
        locationData = locationData.map(loc => ({
          ...loc,
          percentage: totalBookings > 0 ? (loc.bookings / totalBookings * 100).toFixed(1) : 0
        }))

        // Merge real data with mock data
        return NextResponse.json({
          ...mockAnalyticsData,
          summary: {
            ...mockAnalyticsData.summary,
            totalBookings
          },
          bookingsByLocation: locationData.length > 0 ? locationData : mockAnalyticsData.bookingsByLocation
        })
      }
    }

    // Return mock data for development
    return NextResponse.json(mockAnalyticsData)

  } catch (error) {
    console.error('Error in enterprise analytics API:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}

// Helper function to generate trend data
function generateTrendData(timeRange, type) {
  const days = timeRange === '30d' ? 30 : timeRange === '90d' ? 90 : 7
  const data = []
  const baseValue = type === 'revenue' ? 4000 : 100
  
  for (let i = 0; i < days; i++) {
    const date = new Date()
    date.setDate(date.getDate() - (days - i - 1))
    
    data.push({
      date: date.toISOString().split('T')[0],
      value: baseValue + Math.random() * baseValue * 0.5
    })
  }
  
  return data
}