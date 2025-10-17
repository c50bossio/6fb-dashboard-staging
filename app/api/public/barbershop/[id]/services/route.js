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

    // Get active services for this barbershop
    const { data: services, error: servicesError } = await supabase
      .from('services')
      .select(`
        id,
        name,
        description,
        price,
        duration_minutes,
        category,
        image_url,
        is_active,
        created_at
      `)
      .eq('barbershop_id', barbershopId)
      .eq('is_active', true)
      .order('category')
      .order('name')

    if (servicesError) {
      console.error('Error fetching services:', servicesError)
      return NextResponse.json({ 
        success: false, 
        error: 'Failed to fetch services' 
      }, { status: 500 })
    }

    // Transform services for public consumption
    const publicServices = (services || []).map(service => ({
      id: service.id,
      name: service.name,
      description: service.description || '',
      price: service.price || 0,
      duration: service.duration_minutes || 30,
      duration_minutes: service.duration_minutes || 30,
      category: service.category || 'General',
      image_url: service.image_url || null,
      // Public-friendly display formatting
      formatted_price: new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD'
      }).format(service.price || 0),
      formatted_duration: `${service.duration_minutes || 30} min`
    }))

    // Group services by category
    const servicesByCategory = {}
    publicServices.forEach(service => {
      const category = service.category || 'General'
      if (!servicesByCategory[category]) {
        servicesByCategory[category] = []
      }
      servicesByCategory[category].push(service)
    })

    // Get service statistics
    const stats = {
      total_services: publicServices.length,
      categories: Object.keys(servicesByCategory).length,
      price_range: publicServices.length > 0 ? {
        min: Math.min(...publicServices.map(s => s.price)),
        max: Math.max(...publicServices.map(s => s.price)),
        average: publicServices.reduce((sum, s) => sum + s.price, 0) / publicServices.length
      } : null,
      duration_range: publicServices.length > 0 ? {
        min: Math.min(...publicServices.map(s => s.duration)),
        max: Math.max(...publicServices.map(s => s.duration)),
        average: publicServices.reduce((sum, s) => sum + s.duration, 0) / publicServices.length
      } : null
    }

    return NextResponse.json({
      success: true,
      services: publicServices,
      services_by_category: servicesByCategory,
      categories: Object.keys(servicesByCategory),
      stats,
      barbershop_id: barbershopId,
      barbershop_name: barbershop.name,
      count: publicServices.length
    })

  } catch (error) {
    console.error('Public services API error:', error)
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 })
  }
}