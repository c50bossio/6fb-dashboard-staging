import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// Force dynamic rendering - this route uses authentication
export const dynamic = 'force-dynamic'

export async function GET(request) {
  try {
    const supabase = await createClient()
    
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

    // Initialize empty dashboard data structure
    const dashboardData = {
      totalRevenue: 0,
      totalBookings: 0,
      activeCustomers: 0,
      averageRating: 0,
      locations: [],
      recentActivity: [],
      performanceMetrics: {
        revenueGrowth: 0,
        bookingGrowth: 0,
        customerRetention: 0,
        staffUtilization: 0
      },
      dataAvailable: false,
      message: 'No dashboard data available yet. Data will appear once your barbershops have activity.'
    }

    // If organization exists, try to get real data
    if (profile?.organization_id) {
      // Get organization data
      const { data: organization } = await supabase
        .from('organizations')
        .select('*')
        .eq('id', profile.organization_id)
        .single()

      // Get all barbershops for this organization
      const { data: barbershops } = await supabase
        .from('barbershops')
        .select('*')
        .eq('organization_id', profile.organization_id)

      if (barbershops && barbershops.length > 0) {
        // Calculate real metrics
        let totalRevenue = 0
        let totalBookings = 0
        
        const locationData = await Promise.all(barbershops.map(async (shop) => {
          // Get bookings for each shop
          const { count: bookingCount } = await supabase
            .from('bookings')
            .select('*', { count: 'exact', head: true })
            .eq('shop_id', shop.id)

          // Get appointments for each shop
          const { count: appointmentCount } = await supabase
            .from('appointments')
            .select('*', { count: 'exact', head: true })
            .eq('barbershop_id', shop.id)

          const shopBookings = (bookingCount || 0) + (appointmentCount || 0)
          totalBookings += shopBookings

          // Get staff count for this shop
          const { count: staffCount } = await supabase
            .from('barbershop_staff')
            .select('*', { count: 'exact', head: true })
            .eq('barbershop_id', shop.id)
            .eq('is_active', true)
          
          // Get reviews for rating
          const { data: reviews } = await supabase
            .from('reviews')
            .select('rating')
            .eq('barbershop_id', shop.id)
          
          const avgRating = reviews && reviews.length > 0
            ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
            : 0
          
          return {
            id: shop.id,
            name: shop.name,
            city: shop.city || 'Unknown',
            revenue: 0, // TODO: Calculate from transactions table
            bookings: shopBookings,
            rating: avgRating,
            staff: staffCount || 0,
            trending: 'stable'
          }
        }))

        // Update dashboard data with real values
        dashboardData.totalBookings = totalBookings
        dashboardData.locations = locationData
        dashboardData.dataAvailable = totalBookings > 0 || locationData.length > 0
        
        // Get total customer count
        const { count: customerCount } = await supabase
          .from('customers')
          .select('*', { count: 'exact', head: true })
          .in('barbershop_id', barbershops.map(s => s.id))
        
        dashboardData.activeCustomers = customerCount || 0
        
        // Calculate average rating
        const totalRating = locationData.reduce((sum, loc) => sum + loc.rating, 0)
        dashboardData.averageRating = locationData.length > 0 
          ? parseFloat((totalRating / locationData.length).toFixed(1))
          : 0
        
        if (dashboardData.dataAvailable) {
          dashboardData.message = 'Showing real-time dashboard data'
        }
        
        return NextResponse.json({
          ...dashboardData,
          organization
        })
      }
    }

    // Return empty dashboard structure when no organization
    return NextResponse.json(dashboardData)

  } catch (error) {
    console.error('Error in enterprise dashboard API:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}