import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const phone = searchParams.get('phone')
    const barbershopId = searchParams.get('barbershop_id')

    if (!phone) {
      return NextResponse.json({
        success: false,
        error: 'Phone number is required'
      }, { status: 400 })
    }

    if (!barbershopId) {
      return NextResponse.json({
        success: false,
        error: 'Barbershop ID is required'
      }, { status: 400 })
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json({
        success: false,
        error: 'Service configuration error'
      }, { status: 500 })
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Clean phone number for consistent searching
    const cleanPhone = phone.replace(/\D/g, '')
    
    // Create search patterns for different phone number formats
    const phonePatterns = [
      cleanPhone,
      `+1${cleanPhone}`,
      `1${cleanPhone}`,
      cleanPhone.replace(/^1/, ''), // Remove leading 1 if present
      `(${cleanPhone.slice(0,3)}) ${cleanPhone.slice(3,6)}-${cleanPhone.slice(6)}`, // (555) 123-4567
      `${cleanPhone.slice(0,3)}-${cleanPhone.slice(3,6)}-${cleanPhone.slice(6)}`, // 555-123-4567
      `${cleanPhone.slice(0,3)}.${cleanPhone.slice(3,6)}.${cleanPhone.slice(6)}`, // 555.123.4567
      `${cleanPhone.slice(0,3)} ${cleanPhone.slice(3,6)} ${cleanPhone.slice(6)}` // 555 123 4567
    ]

    // Search for customers with matching phone numbers
    const { data: customers, error: customerError } = await supabase
      .from('customers')
      .select('id, full_name, phone, email')
      .eq('barbershop_id', barbershopId)
      .or(phonePatterns.map(pattern => `phone.like.%${pattern}%`).join(','))

    if (customerError) {
      console.error('Error searching customers:', customerError)
      return NextResponse.json({
        success: false,
        error: 'Failed to search customers'
      }, { status: 500 })
    }

    if (!customers || customers.length === 0) {
      return NextResponse.json({
        success: true,
        appointments: [],
        message: 'No customers found with this phone number'
      })
    }

    // Get customer IDs
    const customerIds = customers.map(c => c.id)

    // Search for appointments for these customers
    const { data: appointments, error: appointmentError } = await supabase
      .from('appointments')
      .select(`
        id,
        date,
        start_time,
        end_time,
        status,
        duration_minutes,
        customer_id,
        barber_id,
        service_id,
        notes,
        checked_in_at,
        completed_at,
        created_at
      `)
      .eq('barbershop_id', barbershopId)
      .in('customer_id', customerIds)
      .gte('date', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]) // Last 7 days
      .order('date', { ascending: false })
      .order('start_time', { ascending: false })

    if (appointmentError) {
      console.error('Error searching appointments:', appointmentError)
      return NextResponse.json({
        success: false,
        error: 'Failed to search appointments'
      }, { status: 500 })
    }

    // Fetch related data for enrichment
    const appointmentsWithDetails = []
    
    for (const appointment of appointments || []) {
      // Get customer info
      const customer = customers.find(c => c.id === appointment.customer_id)
      
      // Get barber info
      let barberName = 'Unassigned'
      if (appointment.barber_id) {
        const { data: barber } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('id', appointment.barber_id)
          .single()
        
        barberName = barber?.full_name || 'Unknown Barber'
      }

      // Get service info
      let serviceName = 'General Service'
      let servicePrice = 0
      if (appointment.service_id) {
        const { data: service } = await supabase
          .from('services')
          .select('name, price')
          .eq('id', appointment.service_id)
          .single()
        
        serviceName = service?.name || 'General Service'
        servicePrice = service?.price || 0
      }

      appointmentsWithDetails.push({
        ...appointment,
        customer_name: customer?.full_name || 'Unknown Customer',
        customer_phone: customer?.phone || phone,
        customer_email: customer?.email || '',
        barber_name: barberName,
        service_name: serviceName,
        service_price: servicePrice
      })
    }

    return NextResponse.json({
      success: true,
      appointments: appointmentsWithDetails,
      customer_count: customers.length,
      search_phone: cleanPhone
    })

  } catch (error) {
    console.error('Search appointments API error:', error)
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 })
  }
}