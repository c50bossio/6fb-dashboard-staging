import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

// Validation schema matching EXACT frontend data structure
const appointmentSchema = z.object({
  // Core appointment fields - REQUIRED
  barber_id: z.string().uuid(),
  start_time: z.string(), // Frontend always sends ISO string
  end_time: z.string(), // Frontend always sends ISO string  
  duration_minutes: z.number().min(15).max(480),
  
  // Optional appointment details
  customer_id: z.string().nullable().optional(),
  service_id: z.string().nullable().optional(),
  scheduled_at: z.string().optional(),
  status: z.string().optional(),
  notes: z.string().optional(),
  
  // Client information - exact format from frontend
  client_name: z.string().optional(),
  client_phone: z.string().optional(),
  client_email: z.string().optional(), // Can be empty string, don't validate email format
  
  // Payment fields - exact names from frontend
  service_price: z.number().optional(),
  tip_amount: z.number().optional(),
  
  // Shop association
  shop_id: z.string().uuid().optional(),
  barbershop_id: z.string().uuid().optional(),
  
  // Time blocking flag
  is_blocked_time: z.boolean().optional(),
})

type AppointmentData = z.infer<typeof appointmentSchema>

// Helper function to get status color for calendar display
function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    'PENDING': '#FFA500',
    'CONFIRMED': '#4CAF50', 
    'CANCELLED': '#F44336',
    'COMPLETED': '#2196F3',
    'BLOCKED': '#9E9E9E',
    'NO_SHOW': '#795548',
    'blocked': '#9E9E9E', // Support lowercase
    'pending': '#FFA500',
    'confirmed': '#4CAF50',
  }
  return colors[status] || '#757575'
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Parse query parameters for FullCalendar.io
    const searchParams = request.nextUrl.searchParams
    const start = searchParams.get('start') // FullCalendar sends 'start' and 'end'
    const end = searchParams.get('end')
    const shopId = searchParams.get('shop_id')

    // Get user's profile to determine their shop
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('shop_id, barbershop_id, role')
      .eq('id', user.id)
      .single()

    if (profileError || !profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    // Determine which shop to query
    const userShopId = profile.shop_id || profile.barbershop_id || shopId

    if (!userShopId) {
      return NextResponse.json({ error: 'No shop association found' }, { status: 400 })
    }

    // Build query for appointments/bookings
    let query = supabase.from('bookings').select('*')
    
    // Filter by shop
    query = query.eq('shop_id', userShopId)
    
    // Filter by date range if provided (FullCalendar sends these)
    if (start) {
      query = query.gte('start_time', start)
    }
    if (end) {
      query = query.lte('start_time', end)
    }

    // Execute query
    const { data: appointments, error: appointmentError } = await query

    if (appointmentError) {
      console.error('Database error:', appointmentError)
      return NextResponse.json({ error: 'Database error', details: appointmentError.message }, { status: 500 })
    }

    // Transform data for FullCalendar format
    const calendarEvents = appointments?.map(apt => ({
      id: apt.id,
      title: apt.status === 'blocked' || apt.notes?.includes('blocked') 
        ? `🚫 ${apt.notes || 'Time Blocked'}` 
        : `${apt.customer_name || 'Appointment'} - ${apt.service_name || 'Service'}`,
      start: apt.start_time,
      end: apt.end_time,
      color: getStatusColor(apt.status),
      extendedProps: {
        customer_name: apt.customer_name,
        customer_phone: apt.customer_phone,
        customer_email: apt.customer_email,
        barber_id: apt.barber_id,
        service_id: apt.service_id,
        status: apt.status,
        price: apt.price,
        notes: apt.notes,
        is_blocked_time: apt.status === 'blocked' || apt.notes?.includes('blocked')
      }
    })) || []

    return NextResponse.json({
      success: true,
      events: calendarEvents, // FullCalendar expects 'events' array
      total: calendarEvents.length
    })

  } catch (error) {
    console.error('Calendar appointments API error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    console.log('Received appointment data:', JSON.stringify(body, null, 2))
    
    // Validate request body
    const validationResult = appointmentSchema.safeParse(body)
    if (!validationResult.success) {
      console.error('Validation errors:', validationResult.error.errors)
      return NextResponse.json({
        error: 'Validation failed',
        details: validationResult.error.errors
      }, { status: 400 })
    }

    const appointmentData: AppointmentData = validationResult.data

    // Get user's profile for shop context
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('shop_id, barbershop_id, full_name')
      .eq('id', user.id)
      .single()

    if (profileError || !profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    // Determine shop ID
    const shopId = appointmentData.shop_id || appointmentData.barbershop_id || profile.shop_id || profile.barbershop_id

    if (!shopId) {
      return NextResponse.json({ error: 'No shop association found' }, { status: 400 })
    }

    // Parse start and end times
    const startTime = new Date(appointmentData.start_time!).toISOString()
    const endTime = appointmentData.end_time 
      ? new Date(appointmentData.end_time).toISOString()
      : new Date(new Date(startTime).getTime() + (appointmentData.duration_minutes * 60000)).toISOString()

    // Check if the barber_id exists in the barbers table
    const { data: existingBarber, error: barberCheckError } = await supabase
      .from('barbers')
      .select('id')
      .eq('id', appointmentData.barber_id)
      .single()

    let validBarberId = appointmentData.barber_id

    // If barber doesn't exist in barbers table, find one from the shop or create entry
    if (barberCheckError || !existingBarber) {
      console.log(`Barber ${appointmentData.barber_id} not found in barbers table`)
      
      // First try to find an existing barber for this shop
      const { data: shopBarbers, error: shopBarbersError } = await supabase
        .from('barbers')
        .select('id')
        .eq('shop_id', shopId)
        .eq('is_active', true)
        .limit(1)

      if (shopBarbers && shopBarbers.length > 0) {
        validBarberId = shopBarbers[0].id
        console.log(`Using existing shop barber: ${validBarberId}`)
      } else {
        // If no barbers exist for this shop, create a barber record for the profile
        console.log('Creating barber record for profile')
        const newBarberData = {
          id: appointmentData.barber_id,
          shop_id: shopId,
          name: profile.full_name || 'Shop Owner',
          email: profile.email || 'no-email@shop.com',
          phone: profile.phone || '',
          color: '#4CAF50',
          avatar_url: `https://api.dicebear.com/7.x/avataaars/svg?seed=${appointmentData.barber_id}`,
          bio: 'Shop Owner',
          specialties: ['All Services'],
          rating: 5.0,
          is_active: true,
          is_test: false,
          experience_years: 5,
          languages: ['English'],
          availability: 'full_time'
        }

        const { data: newBarber, error: createBarberError } = await supabase
          .from('barbers')
          .insert([newBarberData])
          .select('id')
          .single()

        if (createBarberError) {
          console.error('Failed to create barber record:', createBarberError)
          return NextResponse.json({
            error: 'Failed to create barber record',
            details: createBarberError.message
          }, { status: 500 })
        }

        validBarberId = newBarber.id
        console.log(`Created new barber record: ${validBarberId}`)
      }
    }

    // Prepare booking data for database
    const bookingData = {
      shop_id: shopId,
      barber_id: validBarberId,
      customer_id: appointmentData.customer_id || null,
      service_id: appointmentData.service_id || null,
      start_time: startTime,
      end_time: endTime,
      status: appointmentData.is_blocked_time ? 'blocked' : appointmentData.status || 'confirmed',
      price: appointmentData.service_price || 0,
      notes: appointmentData.is_blocked_time ? 
        `🚫 Time Blocked - ${appointmentData.notes || 'Blocked by user'}` : 
        appointmentData.notes || '',
      duration_minutes: appointmentData.duration_minutes,
      customer_name: appointmentData.client_name === 'BLOCKED' ? null : appointmentData.client_name || null,
      customer_phone: appointmentData.client_phone || null,
      customer_email: appointmentData.client_email === '' ? null : appointmentData.client_email || null,
      is_recurring: false,
      is_test: false
    }

    console.log('Saving booking to database:', bookingData)

    // Insert the booking
    const { data: newBooking, error: insertError } = await supabase
      .from('bookings')
      .insert([bookingData])
      .select('*')
      .single()

    if (insertError) {
      console.error('Database insert error:', insertError)
      return NextResponse.json({
        error: 'Failed to create appointment',
        details: insertError.message
      }, { status: 500 })
    }

    // Transform for FullCalendar response
    const calendarEvent = {
      id: newBooking.id,
      title: newBooking.status === 'blocked' 
        ? newBooking.notes 
        : `${newBooking.customer_name || 'Appointment'} - ${newBooking.service_name || 'Service'}`,
      start: newBooking.start_time,
      end: newBooking.end_time,
      color: getStatusColor(newBooking.status),
      extendedProps: {
        customer_name: newBooking.customer_name,
        customer_phone: newBooking.customer_phone,
        customer_email: newBooking.customer_email,
        barber_id: newBooking.barber_id,
        service_id: newBooking.service_id,
        status: newBooking.status,
        price: newBooking.price,
        notes: newBooking.notes,
        is_blocked_time: newBooking.status === 'blocked'
      }
    }

    return NextResponse.json({
      success: true,
      event: calendarEvent, // FullCalendar format
      appointment: newBooking, // Raw database record
      message: appointmentData.is_blocked_time ? 'Time slot blocked successfully' : 'Appointment created successfully'
    })

  } catch (error) {
    console.error('Create appointment API error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}