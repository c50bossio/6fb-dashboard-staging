import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request) {
  try {
    const supabase = await createClient()
    
    // Get the current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, full_name, role, shop_id, barbershop_id')
      .eq('id', user.id)
      .single()
    
    if (!profile) {
      return NextResponse.json({ 
        appointments: [],
        message: 'No profile found' 
      })
    }

    // Determine barbershop ID
    let barbershopId = profile.shop_id || profile.barbershop_id
    
    // If no direct shop, check if user is staff
    if (!barbershopId) {
      const { data: staffAssignment } = await supabase
        .from('barbershop_staff')
        .select('barbershop_id')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .single()
      
      if (staffAssignment) {
        barbershopId = staffAssignment.barbershop_id
      }
    }

    // If still no barbershop, return empty
    if (!barbershopId) {
      return NextResponse.json({ 
        appointments: [],
        message: 'No barbershop associated' 
      })
    }

    // Get today's date range
    const today = new Date()
    const startOfDay = new Date(today.setHours(0, 0, 0, 0))
    const endOfDay = new Date(today.setHours(23, 59, 59, 999))

    // Fetch appointments for the barbershop
    const { data: bookings, error: bookingsError } = await supabase
      .from('bookings')
      .select(`
        id,
        customer_name,
        customer_email,
        customer_phone,
        date,
        time,
        service_name,
        service_price,
        service_duration,
        status,
        barber_id,
        barbershop_id,
        notes,
        created_at,
        updated_at
      `)
      .eq('barbershop_id', barbershopId)
      .gte('date', startOfDay.toISOString())
      .order('date', { ascending: true })
      .order('time', { ascending: true })

    if (bookingsError) {
      console.error('Error fetching bookings:', bookingsError)
      return NextResponse.json({ 
        appointments: [],
        error: 'Failed to fetch bookings' 
      })
    }

    // Get barber details for the appointments
    const barberIds = [...new Set(bookings?.map(b => b.barber_id).filter(Boolean))]
    let barberMap = {}
    
    if (barberIds.length > 0) {
      const { data: barbers } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', barberIds)
      
      if (barbers) {
        barberMap = barbers.reduce((acc, barber) => {
          acc[barber.id] = barber.full_name
          return acc
        }, {})
      }
    }

    // Transform bookings to calendar appointments format
    const appointments = (bookings || []).map(booking => {
      // Parse time to create full datetime
      const [hours, minutes] = (booking.time || '09:00').split(':')
      const startDateTime = new Date(booking.date)
      startDateTime.setHours(parseInt(hours), parseInt(minutes), 0, 0)
      
      // Calculate end time based on duration
      const endDateTime = new Date(startDateTime)
      const duration = booking.service_duration || 30
      endDateTime.setMinutes(endDateTime.getMinutes() + duration)
      
      // Determine color based on status
      let backgroundColor = '#10b981' // Default green
      let borderColor = '#059669'
      let textColor = '#ffffff'
      
      if (booking.status === 'cancelled') {
        backgroundColor = '#ef4444'
        borderColor = '#dc2626'
      } else if (booking.status === 'completed') {
        backgroundColor = '#6b7280'
        borderColor = '#4b5563'
      } else if (booking.status === 'no_show') {
        backgroundColor = '#f59e0b'
        borderColor = '#d97706'
      }

      const title = booking.status === 'cancelled' 
        ? `❌ ${booking.customer_name || 'Customer'} - ${booking.service_name || 'Service'}`
        : `${booking.customer_name || 'Customer'} - ${booking.service_name || 'Service'}`

      return {
        id: booking.id,
        title,
        start: startDateTime.toISOString(),
        end: endDateTime.toISOString(),
        backgroundColor,
        borderColor,
        textColor,
        classNames: booking.status === 'cancelled' ? ['cancelled-appointment'] : [],
        extendedProps: {
          customer: booking.customer_name,
          email: booking.customer_email,
          phone: booking.customer_phone,
          service: booking.service_name,
          price: booking.service_price,
          duration: duration,
          status: booking.status,
          notes: booking.notes,
          barberId: booking.barber_id,
          barberName: barberMap[booking.barber_id] || 'Unassigned',
          barbershopId: booking.barbershop_id
        }
      }
    })

    return NextResponse.json({
      appointments,
      count: appointments.length,
      barbershopId
    })

  } catch (error) {
    console.error('Error in appointments endpoint:', error)
    return NextResponse.json({ 
      error: 'Failed to fetch appointments',
      appointments: []
    }, { status: 500 })
  }
}