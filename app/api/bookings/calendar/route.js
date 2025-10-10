import { NextResponse } from 'next/server'
import { createClient } from '../../../../lib/supabase/client'
import { z } from 'zod'

export const runtime = 'edge'

// Validation schema for calendar data request
const calendarQuerySchema = z.object({
  start: z.string().datetime().optional(),
  end: z.string().datetime().optional(),
  barberId: z.string().optional(),
  status: z.array(z.string()).optional().default(['PENDING', 'CONFIRMED']),
  limit: z.number().min(1).max(1000).optional().default(100)
})

// GET /api/bookings/calendar - Get calendar events for staff dashboard
export async function GET(request) {
  try {
    const supabase = createClient()
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    
    // Parse and validate query parameters
    const queryParams = {
      start: searchParams.get('start'),
      end: searchParams.get('end'),
      barberId: searchParams.get('barberId'),
      status: searchParams.get('status')?.split(',') || ['PENDING', 'CONFIRMED'],
      limit: parseInt(searchParams.get('limit') || '100')
    }

    const validationResult = calendarQuerySchema.safeParse(queryParams)
    if (!validationResult.success) {
      return NextResponse.json({
        error: 'Invalid query parameters',
        details: validationResult.error.errors
      }, { status: 400 })
    }

    const { start, end, barberId, status, limit } = validationResult.data

    // Build query
    let query = supabase
      .from('bookings')
      .select(`
        id,
        scheduled_at,
        duration_minutes,
        service_price,
        total_amount,
        client_name,
        client_email,
        client_phone,
        client_notes,
        status,
        payment_status,
        created_at,
        barber:profiles!bookings_barber_id_fkey(
          id, 
          name, 
          email, 
          image_url,
          user_metadata
        ),
        service:services(
          id, 
          name, 
          description, 
          duration_minutes, 
          price, 
          category,
          color
        ),
        barbershop:barbershops(
          id, 
          name, 
          address, 
          phone
        )
      `)
      .in('status', status)
      .limit(limit)
      .order('scheduled_at', { ascending: true })

    // Add date range filter if provided
    if (start) {
      query = query.gte('scheduled_at', start)
    }
    if (end) {
      query = query.lte('scheduled_at', end)
    }

    // Add barber filter if provided
    if (barberId) {
      query = query.eq('barber_id', barberId)
    }

    const { data: bookings, error } = await query

    if (error) {
      console.error('Error fetching calendar bookings:', error)
      return NextResponse.json({ 
        error: 'Failed to fetch calendar data' 
      }, { status: 500 })
    }

    // Transform bookings to calendar events format
    const events = bookings.map(booking => {
      const startTime = new Date(booking.scheduled_at)
      const endTime = new Date(startTime.getTime() + booking.duration_minutes * 60000)
      
      // Determine event color based on service category or status
      let backgroundColor = '#546355' // Default olive green
      if (booking.service?.color) {
        backgroundColor = booking.service.color
      } else if (booking.service?.category) {
        // Color coding by service category
        const categoryColors = {
          'Haircuts': '#3B82F6',      // Blue
          'Beard Services': '#F59E0B', // Amber
          'Premium Services': '#8B5CF6', // Purple
          'Add-ons': '#10B981'        // Emerald
        }
        backgroundColor = categoryColors[booking.service.category] || backgroundColor
      }

      // Adjust opacity based on status
      if (booking.status === 'PENDING') {
        backgroundColor += '80' // Add transparency
      }

      return {
        id: booking.id,
        title: `${booking.client_name} - ${booking.service?.name || 'Service'}`,
        start: booking.scheduled_at,
        end: endTime.toISOString(),
        resourceId: booking.barber?.id,
        backgroundColor,
        borderColor: backgroundColor,
        textColor: '#FFFFFF',
        classNames: [`status-${booking.status.toLowerCase()}`],
        extendedProps: {
          bookingId: booking.id,
          clientName: booking.client_name,
          clientEmail: booking.client_email,
          clientPhone: booking.client_phone,
          clientNotes: booking.client_notes,
          serviceName: booking.service?.name,
          serviceCategory: booking.service?.category,
          servicePrice: booking.service_price,
          totalAmount: booking.total_amount,
          status: booking.status,
          paymentStatus: booking.payment_status,
          barberName: booking.barber?.name,
          barbershopName: booking.barbershop?.name,
          duration: booking.duration_minutes,
          canEdit: true,
          canCancel: new Date(booking.scheduled_at) > new Date(Date.now() + 2 * 60 * 60 * 1000) // 2 hours ahead
        }
      }
    })

    // Get barber resources for the calendar
    const { data: barbers, error: barbersError } = await supabase
      .from('profiles')
      .select(`
        id,
        name,
        image_url,
        user_metadata,
        barbershop_staff!inner(
          barbershop_id,
          role,
          is_active
        )
      `)
      .eq('barbershop_staff.is_active', true)

    if (barbersError) {
      console.error('Error fetching barbers:', barbersError)
    }

    // Transform barbers to resource format for calendar
    const resources = barbers?.map(barber => ({
      id: barber.id,
      title: barber.name,
      imageUrl: barber.image_url,
      eventColor: '#546355',
      businessHours: {
        startTime: '09:00',
        endTime: '18:00',
        daysOfWeek: [1, 2, 3, 4, 5, 6] // Monday to Saturday
      }
    })) || []

    return NextResponse.json({
      success: true,
      events,
      resources,
      stats: {
        totalBookings: bookings.length,
        confirmedBookings: bookings.filter(b => b.status === 'CONFIRMED').length,
        pendingBookings: bookings.filter(b => b.status === 'PENDING').length,
        totalRevenue: bookings
          .filter(b => b.status === 'CONFIRMED')
          .reduce((sum, b) => sum + (b.total_amount || 0), 0)
      },
      dateRange: {
        start: start || new Date().toISOString(),
        end: end || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
      }
    })

  } catch (error) {
    console.error('Error in calendar API:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}