import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function GET(request, { params }) {
  try {
    const barbershopId = params.id
    
    if (!barbershopId) {
      return NextResponse.json({
        success: false,
        error: 'Barbershop ID is required'
      }, { status: 400 })
    }

    // Use simple client for public API - no auth needed
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    
    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json({
        success: false,
        error: 'Service configuration error'
      }, { status: 500 })
    }
    
    const supabase = createClient(supabaseUrl, supabaseKey)
    
    // First check if barbershop exists and allows public booking
    const { data: barbershop, error: barbershopError } = await supabase
      .from('barbershops')
      .select('id, name, booking_settings')
      .eq('id', barbershopId)
      .single()

    if (barbershopError || !barbershop) {
      return NextResponse.json({
        success: false,
        error: 'Barbershop not found'
      }, { status: 404 })
    }

    // Check if public booking is enabled
    const bookingSettings = barbershop.booking_settings || {}
    const isPublicBookingEnabled = bookingSettings.allowPublicBooking !== false

    if (!isPublicBookingEnabled) {
      return NextResponse.json({
        success: false,
        error: 'Public booking is not available for this barbershop'
      }, { status: 403 })
    }

    // Get active staff for this barbershop
    const { data: staff, error: staffError } = await supabase
      .from('barbershop_staff')
      .select('user_id, role, is_active')
      .eq('barbershop_id', barbershopId)
      .eq('is_active', true)

    if (staffError) {
      console.error('Error fetching staff:', staffError)
      return NextResponse.json({ 
        success: false, 
        error: 'Failed to fetch staff' 
      }, { status: 500 })
    }

    // If no staff, return empty availability
    if (!staff || staff.length === 0) {
      return NextResponse.json({
        success: true,
        availability: [],
        staff_count: 0,
        barbershop_id: barbershopId
      })
    }

    // Get availability for all staff members
    const staffIds = staff.map(s => s.user_id)
    const { data: availability, error: availabilityError } = await supabase
      .from('barber_availability')
      .select(`
        id,
        barber_id,
        day_of_week,
        start_time,
        end_time,
        is_available,
        max_concurrent_bookings,
        specific_date,
        notes
      `)
      .eq('barbershop_id', barbershopId)
      .in('barber_id', staffIds)
      .order('day_of_week')
      .order('start_time')

    if (availabilityError) {
      console.error('Error fetching availability:', availabilityError)
      return NextResponse.json({ 
        success: false, 
        error: 'Failed to fetch availability' 
      }, { status: 500 })
    }

    // Group availability by barber for easier consumption
    const availabilityByBarber = {}
    if (availability) {
      availability.forEach(slot => {
        if (!availabilityByBarber[slot.barber_id]) {
          availabilityByBarber[slot.barber_id] = []
        }
        availabilityByBarber[slot.barber_id].push({
          id: slot.id,
          day_of_week: slot.day_of_week,
          start_time: slot.start_time,
          end_time: slot.end_time,
          is_available: slot.is_available,
          max_concurrent_bookings: slot.max_concurrent_bookings,
          specific_date: slot.specific_date,
          notes: slot.notes
        })
      })
    }

    return NextResponse.json({
      success: true,
      availability: availability || [],
      availability_by_barber: availabilityByBarber,
      staff_count: staff.length,
      barbershop_id: barbershopId,
      barbershop_name: barbershop.name
    })

  } catch (error) {
    console.error('Public availability API error:', error)
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 })
  }
}