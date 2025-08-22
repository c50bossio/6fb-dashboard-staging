import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

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
    
    // Get barbershop info (public information only)
    // Using * to avoid column mismatch errors
    const { data: barbershop, error } = await supabase
      .from('barbershops')
      .select('*')
      .eq('id', barbershopId)
      .single()

    if (error || !barbershop) {
      console.error('Barbershop lookup error:', error)
      console.log('Barbershop ID:', barbershopId)
      return NextResponse.json({
        success: false,
        error: 'Barbershop not found',
        details: error?.message || 'No barbershop with this ID'
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

    // Get active services count
    const { count: servicesCount } = await supabase
      .from('services')
      .select('*', { count: 'exact', head: true })
      .eq('barbershop_id', barbershopId)
      .eq('is_active', true)

    // Get active barbers count
    const { count: barbersCount } = await supabase
      .from('barbershop_staff')
      .select('*', { count: 'exact', head: true })
      .eq('barbershop_id', barbershopId)
      .eq('is_active', true)
      .eq('role', 'barber')

    return NextResponse.json({
      success: true,
      barbershop: {
        ...barbershop,
        services_count: servicesCount || 0,
        barbers_count: barbersCount || 0,
        public_booking_enabled: isPublicBookingEnabled
      }
    })

  } catch (error) {
    console.error('Public barbershop API error:', error)
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 })
  }
}