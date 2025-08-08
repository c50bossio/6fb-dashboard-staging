import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export async function POST(request) {
  try {
    const body = await request.json()
    
    const {
      barberId,
      name,
      url,
      services,
      timeSlots,
      duration,
      customPrice,
      discount,
      expiresAt,
      description,
      requirePhone,
      requireEmail, 
      allowReschedule,
      sendReminders
    } = body

    // Validate required fields
    if (!barberId || !name || !url || !services) {
      return NextResponse.json(
        { error: 'Missing required fields: barberId, name, url, services' },
        { status: 400 }
      )
    }

    // Validate services array
    if (!Array.isArray(services) || services.length === 0) {
      return NextResponse.json(
        { error: 'Services must be a non-empty array' },
        { status: 400 }
      )
    }

    // Insert booking link into database
    const { data: bookingLink, error: insertError } = await supabase
      .from('booking_links')
      .insert({
        barber_id: barberId,
        name,
        url,
        services: JSON.stringify(services),
        time_slots: timeSlots || [],
        duration: duration || 45,
        custom_price: customPrice ? parseFloat(customPrice) : null,
        discount: discount || 0,
        expires_at: expiresAt || null,
        description: description || null,
        require_phone: requirePhone !== false, // Default to true
        require_email: requireEmail !== false, // Default to true
        allow_reschedule: allowReschedule !== false, // Default to true  
        send_reminders: sendReminders !== false, // Default to true
        active: true,
        qr_generated: false
      })
      .select()
      .single()

    if (insertError) {
      console.error('Database insert error:', insertError)
      return NextResponse.json(
        { error: 'Failed to create booking link', details: insertError.message },
        { status: 500 }
      )
    }

    // Track the link creation event
    await supabase
      .from('link_analytics')
      .insert({
        link_id: bookingLink.id,
        event_type: 'created',
        session_id: request.headers.get('x-session-id'),
        user_agent: request.headers.get('user-agent'),
        ip_address: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip'),
        timestamp: new Date().toISOString()
      })

    return NextResponse.json({
      success: true,
      data: {
        id: bookingLink.id,
        name: bookingLink.name,
        url: bookingLink.url,
        services: JSON.parse(bookingLink.services),
        timeSlots: bookingLink.time_slots,
        duration: bookingLink.duration,
        customPrice: bookingLink.custom_price,
        discount: bookingLink.discount,
        expiresAt: bookingLink.expires_at,
        active: bookingLink.active,
        clicks: 0,
        conversions: 0,
        revenue: 0,
        createdAt: bookingLink.created_at,
        qrGenerated: false
      }
    })

  } catch (error) {
    console.error('API Error:', error)
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    )
  }
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const barberId = searchParams.get('barberId')

    if (!barberId) {
      return NextResponse.json(
        { error: 'barberId parameter is required' },
        { status: 400 }
      )
    }

    // Fetch all booking links for the barber
    const { data: bookingLinks, error: fetchError } = await supabase
      .from('booking_links')
      .select('*')
      .eq('barber_id', barberId)
      .order('created_at', { ascending: false })

    if (fetchError) {
      console.error('Database fetch error:', fetchError)
      return NextResponse.json(
        { error: 'Failed to fetch booking links', details: fetchError.message },
        { status: 500 }
      )
    }

    // Transform data for frontend
    const transformedLinks = bookingLinks.map(link => ({
      id: link.id,
      name: link.name,
      url: link.url,
      services: typeof link.services === 'string' ? JSON.parse(link.services) : link.services,
      timeSlots: link.time_slots,
      duration: link.duration,
      customPrice: link.custom_price,
      discount: link.discount,
      clicks: link.clicks,
      conversions: link.conversions,
      conversionRate: link.clicks > 0 ? ((link.conversions / link.clicks) * 100).toFixed(1) : 0,
      revenue: parseFloat(link.revenue || 0),
      createdAt: link.created_at.split('T')[0], // Format as YYYY-MM-DD
      expiresAt: link.expires_at ? link.expires_at.split('T')[0] : null,
      active: link.active,
      qrGenerated: link.qr_generated
    }))

    return NextResponse.json({
      success: true,
      data: transformedLinks
    })

  } catch (error) {
    console.error('API Error:', error)
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    )
  }
}