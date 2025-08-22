import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const barbershopId = searchParams.get('barbershop_id')
    
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
    
    // Get services for the barbershop (no auth required for public viewing)
    // Using select('*') to avoid column mismatch errors - we'll filter fields later
    // Note: services table uses 'shop_id' not 'barbershop_id'
    const { data: services, error } = await supabase
      .from('services')
      .select('*')
      .eq('shop_id', barbershopId)
      .eq('is_active', true)

    if (error) {
      console.error('Error fetching services:', error)
      return NextResponse.json({
        success: false,
        error: 'Failed to fetch services'
      }, { status: 500 })
    }

    // Get barbershop info for additional context
    const { data: barbershop } = await supabase
      .from('barbershops')
      .select('name, booking_settings, business_hours')
      .eq('id', barbershopId)
      .single()

    // Sort services manually if display_order exists, otherwise by name
    const sortedServices = services.sort((a, b) => {
      if (a.display_order !== undefined && b.display_order !== undefined) {
        return a.display_order - b.display_order
      }
      return (a.name || '').localeCompare(b.name || '')
    })

    // Transform services to include popularity and formatting
    const transformedServices = sortedServices.map((service, index) => ({
      id: service.id,
      name: service.name,
      description: service.description || 'Professional service',
      duration: service.duration_minutes || service.duration || 30,
      price: service.price || 0,
      category: service.category,
      popular: service.category === 'Popular' || index < 2, // Mark first 2 as popular
      available: true
    }))

    return NextResponse.json({
      success: true,
      services: transformedServices,
      barbershop: {
        name: barbershop?.name,
        settings: barbershop?.booking_settings
      }
    })

  } catch (error) {
    console.error('Public services API error:', error)
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 })
  }
}