import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export const runtime = 'edge'

export async function GET(request) {
  try {
    const cookieStore = cookies()
    const supabase = createClient(cookieStore)
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }
    
    // Get user profile and role
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()
    
    if (!profile || !['ENTERPRISE_OWNER', 'SUPER_ADMIN'].includes(profile.role)) {
      return NextResponse.json(
        { error: 'Forbidden - Must be an enterprise owner or admin' },
        { status: 403 }
      )
    }

    // Get user's organizations first
    let organizations = []
    try {
      const { data: orgsData } = await supabase
        .from('organizations')
        .select('*')
        .or(`owner_id.eq.${user.id}`)
      
      if (orgsData) {
        organizations = orgsData
      }
    } catch (orgError) {
      console.log('Organizations table access issue, using direct barbershop access')
    }

    // Get all barbershops owned by this user with detailed location data
    const { data: locations, error: locationsError } = await supabase
      .from('barbershops')
      .select(`
        id,
        name,
        address,
        city,
        state,
        zip,
        phone,
        email,
        created_at,
        updated_at,
        organization_id,
        location_manager_id,
        location_status,
        profiles:location_manager_id (
          email,
          full_name
        )
      `)
      .eq('owner_id', user.id)
      .order('created_at', { ascending: false })

    if (locationsError) {
      throw new Error(`Failed to fetch locations: ${locationsError.message}`)
    }

    // For each location, get additional metrics
    const enrichedLocations = []
    
    for (const location of locations || []) {
      // Get barber count
      const { data: barbersData } = await supabase
        .from('barbershop_staff')
        .select('id, user_id, role')
        .eq('barbershop_id', location.id)
        .eq('is_active', true)
      
      const barberCount = barbersData?.length || 0

      // Get customer count
      const { data: customersData } = await supabase
        .from('customers')
        .select('id')
        .eq('barbershop_id', location.id)
      
      const customerCount = customersData?.length || 0

      // Get monthly bookings and revenue
      const startOfMonth = new Date()
      startOfMonth.setDate(1)
      startOfMonth.setHours(0, 0, 0, 0)
      
      let monthlyBookings = 0
      let monthlyRevenue = 0

      // Check appointments
      const { data: appointmentsData } = await supabase
        .from('appointments')
        .select('id, price, status')
        .eq('barbershop_id', location.id)
        .gte('created_at', startOfMonth.toISOString())
      
      if (appointmentsData) {
        monthlyBookings += appointmentsData.length
        monthlyRevenue += appointmentsData.reduce((sum, apt) => sum + (apt.price || 0), 0)
      }

      // Check bookings table too
      const { data: bookingsData } = await supabase
        .from('bookings')
        .select('id, price, status')
        .eq('shop_id', location.id)
        .gte('created_at', startOfMonth.toISOString())
      
      if (bookingsData) {
        monthlyBookings += bookingsData.length
        monthlyRevenue += bookingsData.reduce((sum, booking) => sum + (booking.price || 0), 0)
      }

      // Get recent activity (last 5 appointments/bookings)
      const { data: recentActivity } = await supabase
        .from('appointments')
        .select(`
          id,
          appointment_date,
          status,
          price,
          customers:customer_id (
            name
          )
        `)
        .eq('barbershop_id', location.id)
        .order('created_at', { ascending: false })
        .limit(5)

      enrichedLocations.push({
        id: location.id,
        name: location.name,
        address: {
          street: location.address,
          city: location.city,
          state: location.state,
          zip: location.zip
        },
        contact: {
          phone: location.phone,
          email: location.email
        },
        manager: location.profiles ? {
          id: location.location_manager_id,
          name: location.profiles.full_name,
          email: location.profiles.email
        } : null,
        status: location.location_status || 'active',
        organization_id: location.organization_id,
        metrics: {
          barber_count: barberCount,
          customer_count: customerCount,
          monthly_bookings: monthlyBookings,
          monthly_revenue: monthlyRevenue,
          avg_booking_value: monthlyBookings > 0 ? Math.round(monthlyRevenue / monthlyBookings) : 0
        },
        recent_activity: recentActivity || [],
        created_at: location.created_at,
        updated_at: location.updated_at
      })
    }

    // Get summary statistics
    const totalLocations = enrichedLocations.length
    const activeLocations = enrichedLocations.filter(loc => loc.status === 'active').length
    const totalBarbers = enrichedLocations.reduce((sum, loc) => sum + loc.metrics.barber_count, 0)
    const totalCustomers = enrichedLocations.reduce((sum, loc) => sum + loc.metrics.customer_count, 0)
    const totalMonthlyRevenue = enrichedLocations.reduce((sum, loc) => sum + loc.metrics.monthly_revenue, 0)
    const totalMonthlyBookings = enrichedLocations.reduce((sum, loc) => sum + loc.metrics.monthly_bookings, 0)

    return NextResponse.json({
      success: true,
      data: {
        locations: enrichedLocations,
        summary: {
          total_locations: totalLocations,
          active_locations: activeLocations,
          inactive_locations: totalLocations - activeLocations,
          total_barbers: totalBarbers,
          total_customers: totalCustomers,
          total_monthly_revenue: totalMonthlyRevenue,
          total_monthly_bookings: totalMonthlyBookings,
          avg_revenue_per_location: totalLocations > 0 ? Math.round(totalMonthlyRevenue / totalLocations) : 0
        },
        organizations: organizations
      },
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Error in enterprise locations API:', error)
    
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: error.message,
        details: 'Failed to load location data'
      },
      { status: 500 }
    )
  }
}

// POST endpoint for creating new locations
export async function POST(request) {
  try {
    const cookieStore = cookies()
    const supabase = createClient(cookieStore)
    
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }
    
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()
    
    if (!profile || !['ENTERPRISE_OWNER', 'SUPER_ADMIN'].includes(profile.role)) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { action, locationData } = body

    switch (action) {
      case 'create_location':
        // Create a new barbershop location
        const { data: newLocation, error: createError } = await supabase
          .from('barbershops')
          .insert({
            name: locationData.name,
            address: locationData.address,
            city: locationData.city,
            state: locationData.state,
            zip: locationData.zip,
            phone: locationData.phone,
            email: locationData.email,
            owner_id: user.id,
            organization_id: locationData.organization_id,
            location_status: locationData.status || 'active'
          })
          .select()
          .single()

        if (createError) {
          throw new Error(`Failed to create location: ${createError.message}`)
        }

        return NextResponse.json({
          success: true,
          data: newLocation,
          message: 'Location created successfully'
        })

      case 'update_location':
        // Update an existing location
        const { data: updatedLocation, error: updateError } = await supabase
          .from('barbershops')
          .update({
            name: locationData.name,
            address: locationData.address,
            city: locationData.city,
            state: locationData.state,
            zip: locationData.zip,
            phone: locationData.phone,
            email: locationData.email,
            location_status: locationData.status,
            updated_at: new Date().toISOString()
          })
          .eq('id', locationData.id)
          .eq('owner_id', user.id) // Security: only update locations they own
          .select()
          .single()

        if (updateError) {
          throw new Error(`Failed to update location: ${updateError.message}`)
        }

        return NextResponse.json({
          success: true,
          data: updatedLocation,
          message: 'Location updated successfully'
        })

      case 'delete_location':
        // Soft delete a location (set status to inactive)
        const { error: deleteError } = await supabase
          .from('barbershops')
          .update({
            location_status: 'inactive',
            updated_at: new Date().toISOString()
          })
          .eq('id', locationData.id)
          .eq('owner_id', user.id) // Security: only delete locations they own

        if (deleteError) {
          throw new Error(`Failed to delete location: ${deleteError.message}`)
        }

        return NextResponse.json({
          success: true,
          message: 'Location deactivated successfully'
        })

      case 'assign_manager':
        // Assign a manager to a location
        const { error: managerError } = await supabase
          .from('barbershops')
          .update({
            location_manager_id: locationData.manager_id,
            updated_at: new Date().toISOString()
          })
          .eq('id', locationData.id)
          .eq('owner_id', user.id)

        if (managerError) {
          throw new Error(`Failed to assign manager: ${managerError.message}`)
        }

        return NextResponse.json({
          success: true,
          message: 'Manager assigned successfully'
        })

      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        )
    }

  } catch (error) {
    console.error('Error in enterprise locations POST:', error)
    
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: error.message 
      },
      { status: 500 }
    )
  }
}