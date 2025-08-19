import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(supabaseUrl, supabaseServiceKey)

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const shopId = searchParams.get('shop_id')
    const barberId = searchParams.get('barber_id')
    
    // Shop ID is required
    if (!shopId) {
      return NextResponse.json({
        success: false,
        error: 'shop_id parameter is required'
      }, { status: 400 })
    }
    
    // Build query for recurring appointments
    let query = supabase
      .from('bookings')
      .select(`
        *,
        services (
          id,
          name,
          duration_minutes,
          price
        ),
        customers (
          id,
          name,
          phone,
          email
        ),
        barbers (
          id,
          name,
          color
        )
      `)
      .eq('shop_id', shopId)
      .eq('is_recurring', true)
      .not('recurring_pattern', 'is', null)
    
    if (barberId) {
      query = query.eq('barber_id', barberId)
    }
    
    const { data: recurringBookings, error } = await query.order('start_time')
    
    if (error) {
      console.error('Error fetching recurring bookings:', error)
      return NextResponse.json(
        { error: 'Failed to fetch recurring appointments', details: error.message },
        { status: 500 }
      )
    }
    
    // Format recurring appointments for calendar
    const formattedAppointments = recurringBookings.map(booking => {
      const customer = booking.customers || {}
      const service = booking.services || {}
      const barber = booking.barbers || {}
      
      return {
        id: booking.id,
        customer_name: customer.name || booking.customer_name || 'Customer',
        service_name: service.name || booking.service_name || 'Service',
        barber_id: booking.barber_id,
        barber_name: barber.name || 'Barber',
        barber_color: barber.color || '#546355',
        duration_minutes: booking.duration_minutes || service.duration_minutes || 30,
        service_price: booking.price || service.price,
        recurring_pattern: booking.recurring_pattern,
        notes: booking.notes,
        status: booking.status
      }
    })
    
    return NextResponse.json({ 
      appointments: formattedAppointments,
      count: formattedAppointments.length,
      success: true
    })
    
  } catch (error) {
    console.error('Error in recurring appointments endpoint:', error)
    return NextResponse.json(
      { error: 'Failed to fetch recurring appointments', details: error.message },
      { status: 500 }
    )
  }
}

export async function POST(request) {
  try {
    const body = await request.json()
    
    // Validate required fields
    if (!body.shop_id || !body.barber_id || !body.recurrence_rule) {
      return NextResponse.json({
        error: 'Missing required fields: shop_id, barber_id, and recurrence_rule are required'
      }, { status: 400 })
    }
    
    // Parse recurrence rule
    const startTime = new Date(body.start_time || body.scheduled_at)
    const endTime = new Date(body.end_time || new Date(startTime.getTime() + (body.duration_minutes || 30) * 60000))
    
    // Prepare recurring pattern
    const dtstart = startTime.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')
    let rrule = body.recurrence_rule
    if (!rrule.includes('DTSTART')) {
      rrule = `DTSTART:${dtstart}\n${rrule}`
    }
    
    const recurringPattern = {
      rrule: rrule,
      dtstart: startTime.toISOString(),
      dtend: endTime.toISOString(),
      frequency: body.frequency || 'WEEKLY',
      interval: body.interval || 1,
      count: body.count || null,
      until: body.until || null,
      created_at: new Date().toISOString(),
      created_by: 'calendar_api'
    }
    
    // Create the booking
    const bookingData = {
      shop_id: body.shop_id,
      barber_id: body.barber_id,
      customer_id: body.customer_id,
      service_id: body.service_id,
      start_time: startTime.toISOString(),
      end_time: endTime.toISOString(),
      duration_minutes: body.duration_minutes || 30,
      price: body.price,
      status: body.status || 'confirmed',
      notes: body.notes,
      is_recurring: true,
      recurring_pattern: recurringPattern
    }
    
    const { data: newBooking, error } = await supabase
      .from('bookings')
      .insert([bookingData])
      .select()
      .single()
    
    if (error) {
      console.error('Error creating recurring booking:', error)
      return NextResponse.json(
        { error: 'Failed to create recurring appointment', details: error.message },
        { status: 500 }
      )
    }
    
    return NextResponse.json({
      appointment: newBooking,
      message: 'Recurring appointment created successfully',
      recurring_pattern: recurringPattern
    }, { status: 201 })
    
  } catch (error) {
    console.error('Error creating recurring appointment:', error)
    return NextResponse.json(
      { error: 'Failed to create recurring appointment', details: error.message },
      { status: 500 }
    )
  }
}

export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url)
    const appointmentId = searchParams.get('id')
    const deleteAll = searchParams.get('delete_all') === 'true'
    
    if (!appointmentId) {
      return NextResponse.json({
        error: 'Appointment ID is required'
      }, { status: 400 })
    }
    
    if (deleteAll) {
      // Delete all instances of a recurring appointment
      const { error } = await supabase
        .from('bookings')
        .delete()
        .eq('id', appointmentId)
      
      if (error) {
        throw error
      }
      
      return NextResponse.json({
        message: 'Recurring appointment series deleted successfully'
      })
    } else {
      // Convert recurring appointment to single instance
      const { error } = await supabase
        .from('bookings')
        .update({ 
          is_recurring: false,
          recurring_pattern: null 
        })
        .eq('id', appointmentId)
      
      if (error) {
        throw error
      }
      
      return NextResponse.json({
        message: 'Converted to single appointment instance'
      })
    }
    
  } catch (error) {
    console.error('Error deleting recurring appointment:', error)
    return NextResponse.json(
      { error: 'Failed to delete recurring appointment', details: error.message },
      { status: 500 }
    )
  }
}