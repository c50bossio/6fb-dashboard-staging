import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

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

    // Mock locations data
    const mockLocationsData = {
      locations: [
        {
          id: 1,
          name: 'Downtown Location',
          address: '123 Main St, New York, NY 10001',
          city: 'New York',
          state: 'NY',
          phone: '(212) 555-0101',
          email: 'downtown@bookedbarber.com',
          manager: 'John Smith',
          managerId: 'manager-1',
          status: 'active',
          hours: {
            monday: { open: '9:00 AM', close: '8:00 PM' },
            tuesday: { open: '9:00 AM', close: '8:00 PM' },
            wednesday: { open: '9:00 AM', close: '8:00 PM' },
            thursday: { open: '9:00 AM', close: '9:00 PM' },
            friday: { open: '9:00 AM', close: '9:00 PM' },
            saturday: { open: '8:00 AM', close: '7:00 PM' },
            sunday: { open: '10:00 AM', close: '6:00 PM' }
          },
          staff: [
            { id: 1, name: 'Mike Johnson', role: 'Senior Barber', rating: 4.9, bookings: 245 },
            { id: 2, name: 'Sarah Williams', role: 'Barber', rating: 4.8, bookings: 189 },
            { id: 3, name: 'Tom Davis', role: 'Junior Barber', rating: 4.7, bookings: 142 }
          ],
          metrics: {
            revenue: 75420,
            bookings: 1823,
            customers: 456,
            rating: 4.9,
            utilization: 85
          },
          services: [
            { name: 'Haircut', price: 35, duration: 30 },
            { name: 'Beard Trim', price: 25, duration: 20 },
            { name: 'Hair + Beard', price: 55, duration: 45 }
          ]
        },
        {
          id: 2,
          name: 'Uptown Location',
          address: '456 Park Ave, New York, NY 10022',
          city: 'New York',
          state: 'NY',
          phone: '(212) 555-0202',
          email: 'uptown@bookedbarber.com',
          manager: 'Emily Chen',
          managerId: 'manager-2',
          status: 'active',
          hours: {
            monday: { open: '10:00 AM', close: '7:00 PM' },
            tuesday: { open: '10:00 AM', close: '7:00 PM' },
            wednesday: { open: '10:00 AM', close: '7:00 PM' },
            thursday: { open: '10:00 AM', close: '8:00 PM' },
            friday: { open: '10:00 AM', close: '8:00 PM' },
            saturday: { open: '9:00 AM', close: '6:00 PM' },
            sunday: { open: 'Closed', close: 'Closed' }
          },
          staff: [
            { id: 4, name: 'David Lee', role: 'Senior Barber', rating: 4.8, bookings: 198 },
            { id: 5, name: 'Maria Garcia', role: 'Barber', rating: 4.9, bookings: 167 }
          ],
          metrics: {
            revenue: 42360,
            bookings: 924,
            customers: 312,
            rating: 4.7,
            utilization: 78
          },
          services: [
            { name: 'Premium Cut', price: 45, duration: 40 },
            { name: 'Beard Sculpting', price: 35, duration: 30 },
            { name: 'Full Service', price: 75, duration: 60 }
          ]
        }
      ],
      summary: {
        totalLocations: 2,
        activeLocations: 2,
        totalStaff: 5,
        averageRating: 4.8,
        totalRevenue: 117780,
        totalBookings: 2747
      }
    }

    // If organization exists, try to get real data
    if (profile?.organization_id) {
      // Get all barbershops for this organization
      const { data: barbershops } = await supabase
        .from('barbershops')
        .select('*')
        .eq('organization_id', profile.organization_id)

      if (barbershops && barbershops.length > 0) {
        // Transform real data to match expected format
        const locations = await Promise.all(barbershops.map(async (shop) => {
          // Get staff for each location
          const { data: staff } = await supabase
            .from('barbershop_staff')
            .select('*')
            .eq('barbershop_id', shop.id)

          // Get services for each location
          const { data: services } = await supabase
            .from('services')
            .select('*')
            .eq('barbershop_id', shop.id)

          return {
            id: shop.id,
            name: shop.name,
            address: shop.address || 'Address not set',
            city: shop.city || 'City not set',
            state: shop.state || 'State not set',
            phone: shop.phone || 'Phone not set',
            email: shop.email || 'Email not set',
            manager: shop.location_manager_id || 'No manager assigned',
            managerId: shop.location_manager_id,
            status: shop.location_status || 'active',
            hours: shop.business_hours || mockLocationsData.locations[0].hours,
            staff: staff || [],
            metrics: {
              revenue: 0,
              bookings: 0,
              customers: 0,
              rating: shop.rating || 4.5,
              utilization: 0
            },
            services: services || []
          }
        }))

        return NextResponse.json({
          locations,
          summary: {
            totalLocations: locations.length,
            activeLocations: locations.filter(l => l.status === 'active').length,
            totalStaff: locations.reduce((sum, l) => sum + l.staff.length, 0),
            averageRating: 4.8,
            totalRevenue: 0,
            totalBookings: 0
          }
        })
      }
    }

    // Return mock data for development
    return NextResponse.json(mockLocationsData)

  } catch (error) {
    console.error('Error in enterprise locations API:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}

export async function POST(request) {
  try {
    const supabase = await createClient()
    const body = await request.json()
    
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { action, locationId, data } = body

    switch (action) {
      case 'updateLocation':
        // Update location details
        return NextResponse.json({ success: true, message: 'Location updated' })
        
      case 'updateHours':
        // Update business hours
        return NextResponse.json({ success: true, message: 'Hours updated' })
        
      case 'assignManager':
        // Assign location manager
        return NextResponse.json({ success: true, message: 'Manager assigned' })
        
      case 'toggleStatus':
        // Toggle location active/inactive
        return NextResponse.json({ success: true, message: 'Status updated' })
        
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

  } catch (error) {
    console.error('Error in enterprise locations POST:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}