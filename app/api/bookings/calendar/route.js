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

    // Build query - using appointments table (single source of truth)
    let query = supabase
      .from('appointments')
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
        created_at,
        barber:profiles!appointments_barber_id_fkey(
          id,
          full_name,
          email,
          avatar_url
        ),
        service:services(
          id,
          name,
          description,
          duration_minutes,
          price,
          category
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

    // Transform appointments to calendar events format
    const events = bookings.map(appointment => {
      const startTime = new Date(appointment.scheduled_at)
      const endTime = new Date(startTime.getTime() + appointment.duration_minutes * 60000)

      // Determine event color based on service category or status
      let backgroundColor = '#546355' // Default olive green
      if (appointment.service?.category) {
        // Color coding by service category
        const categoryColors = {
          'Haircuts': '#3B82F6',      // Blue
          'Beard Services': '#F59E0B', // Amber
          'Premium Services': '#8B5CF6', // Purple
          'Add-ons': '#10B981'        // Emerald
        }
        backgroundColor = categoryColors[appointment.service.category] || backgroundColor
      }

      // Adjust opacity based on status
      if (appointment.status === 'PENDING') {
        backgroundColor += '80' // Add transparency
      }

      return {
        id: appointment.id,
        title: `${appointment.client_name || 'Walk-in'} - ${appointment.service?.name || 'Service'}`,
        start: appointment.scheduled_at,
        end: endTime.toISOString(),
        resourceId: appointment.barber?.id,
        backgroundColor,
        borderColor: backgroundColor,
        textColor: '#FFFFFF',
        classNames: [`status-${appointment.status.toLowerCase()}`],
        extendedProps: {
          appointmentId: appointment.id,
          clientName: appointment.client_name,
          clientEmail: appointment.client_email,
          clientPhone: appointment.client_phone,
          clientNotes: appointment.client_notes,
          serviceName: appointment.service?.name,
          serviceCategory: appointment.service?.category,
          servicePrice: appointment.service_price,
          totalAmount: appointment.total_amount,
          status: appointment.status,
          barberName: appointment.barber?.full_name,
          barbershopName: appointment.barbershop?.name,
          duration: appointment.duration_minutes,
          canEdit: true,
          canCancel: new Date(appointment.scheduled_at) > new Date(Date.now() + 2 * 60 * 60 * 1000) // 2 hours ahead
        }
      }
    })

    // Get barber resources for the calendar
    const { data: barbers, error: barbersError } = await supabase
      .from('profiles')
      .select(`
        id,
        full_name,
        avatar_url,
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
      title: barber.full_name,
      imageUrl: barber.avatar_url,
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