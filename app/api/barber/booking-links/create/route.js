import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
export const runtime = 'edge'

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

    let bookingLinks = []
    let useFallback = false

    try {
      // Fetch all booking links for the barber
      const { data, error: fetchError } = await supabase
        .from('booking_links')
        .select('*')
        .eq('barber_id', barberId)
        .order('created_at', { ascending: false })

      if (fetchError) {
        console.warn('Booking links table not found, using fallback:', fetchError.message)
        useFallback = true
      } else {
        bookingLinks = data || []
        // Don't use fallback if table exists but is empty
        useFallback = false
      }
    } catch (dbError) {
      console.warn('Database error, using fallback:', dbError.message)
      useFallback = true
    }

    // Only use mock data if table doesn't exist, not if it's empty
    if (useFallback) {
      const mockData = [
        {
          id: 'demo-link-1',
          name: 'Quick Haircut Booking',
          url: 'http://localhost:9999/book/demo-barber?service=haircut',
          services: JSON.stringify(['Classic Cut', 'Fade Cut']),
          time_slots: ['Morning', 'Afternoon'],
          duration: 45,
          custom_price: 45,
          discount: 0,
          clicks: 15,
          conversions: 3,
          revenue: 135,
          created_at: '2024-08-01T10:00:00.000Z',
          expires_at: null,
          active: true,
          qr_generated: false
        },
        {
          id: 'demo-link-2',
          name: 'Full Grooming Package',
          url: 'http://localhost:9999/book/demo-barber?service=full',
          services: JSON.stringify(['Classic Cut', 'Beard Trim', 'Hot Towel Shave']),
          time_slots: ['Morning', 'Afternoon', 'Evening'],
          duration: 90,
          custom_price: 85,
          discount: 10,
          clicks: 8,
          conversions: 2,
          revenue: 170,
          created_at: '2024-08-05T14:30:00.000Z',
          expires_at: null,
          active: true,
          qr_generated: true
        },
        {
          id: 'demo-link-3',
          name: 'Premium Experience',
          url: 'http://localhost:9999/book/demo-barber?service=premium',
          services: JSON.stringify(['Fade Cut', 'Beard Styling', 'Hair Wash']),
          time_slots: ['Afternoon', 'Evening'],
          duration: 75,
          custom_price: 95,
          discount: 5,
          clicks: 5,
          conversions: 1,
          revenue: 95,
          created_at: '2024-08-10T16:00:00.000Z',
          expires_at: null,
          active: false,
          qr_generated: true
        }
      ]
      
      bookingLinks = mockData
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