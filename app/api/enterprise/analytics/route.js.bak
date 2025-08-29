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

    // Initialize empty analytics data structure
    const analyticsData = {
      summary: {
        totalRevenue: 0,
        revenueChange: 0,
        totalBookings: 0,
        bookingsChange: 0,
        activeCustomers: 0,
        customersChange: 0,
        averageRating: 0,
        ratingChange: 0
      },
      revenueByLocation: [],
      bookingsByLocation: [],
      topPerformers: [],
      revenueTrend: [],
      bookingsTrend: [],
      customerGrowth: {
        newCustomers: 0,
        returningCustomers: 0,
        churnRate: 0,
        retentionRate: 0
      },
      servicePopularity: [],
      peakHours: [],
      locationComparison: [],
      dataAvailable: false,
      message: 'No analytics data available yet. Data will appear once bookings are made.'
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

        // Update analytics data with real information
        analyticsData.summary.totalBookings = totalBookings
        analyticsData.bookingsByLocation = locationData
        analyticsData.dataAvailable = totalBookings > 0
        
        if (totalBookings > 0) {
          analyticsData.message = 'Showing real-time analytics data'
          
          // Calculate real revenue if transactions exist
          let totalRevenue = 0
          for (const shop of barbershops) {
            const { data: transactions } = await supabase
              .from('transactions')
              .select('amount')
              .eq('barbershop_id', shop.id)
              .eq('status', 'completed')
            
            if (transactions) {
              const shopRevenue = transactions.reduce((sum, t) => sum + (t.amount || 0), 0)
              totalRevenue += shopRevenue
            }
          }
          analyticsData.summary.totalRevenue = totalRevenue
          
          // Get real customer count
          const { count: customerCount } = await supabase
            .from('customers')
            .select('*', { count: 'exact', head: true })
            .in('barbershop_id', barbershops.map(s => s.id))
          
          analyticsData.summary.activeCustomers = customerCount || 0
        }
        
        return NextResponse.json(analyticsData)
      }
    }

    // Return empty analytics structure when no organization
    return NextResponse.json(analyticsData)

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