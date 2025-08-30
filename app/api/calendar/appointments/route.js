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

export async function PATCH(request) {
  try {
    const supabase = await createClient()
    
    // Get the current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action')
    
    const body = await request.json()

    // Handle different actions
    if (action === 'block') {
      // Block time slot
      const { 
        date, 
        start_time, 
        end_time, 
        barber_id,
        reason = 'Blocked',
        recurring = false,
        recurrence_pattern
      } = body

      // Create a blocked time entry
      const { data: blockedTime, error: blockError } = await supabase
        .from('bookings')
        .insert({
          barbershop_id: body.barbershop_id || body.shop_id,
          barber_id: barber_id || user.id,
          customer_name: 'BLOCKED',
          customer_email: 'blocked@system.local',
          customer_phone: '0000000000',
          date: date,
          time: start_time,
          service_name: reason || 'Time Blocked',
          service_duration: calculateDuration(start_time, end_time),
          service_price: 0,
          status: 'blocked',
          notes: body.notes || 'Time blocked by staff',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single()

      if (blockError) {
        console.error('Error blocking time:', blockError)
        return NextResponse.json({ 
          error: 'Failed to block time slot',
          details: blockError.message 
        }, { status: 400 })
      }

      return NextResponse.json({
        success: true,
        message: 'Time slot blocked successfully',
        data: blockedTime
      })

    } else if (action === 'reschedule') {
      // Reschedule appointment
      const { id, start_time, end_time, date, barber_id } = body

      const { data: updated, error: updateError } = await supabase
        .from('bookings')
        .update({
          date: date,
          time: start_time,
          barber_id: barber_id,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single()

      if (updateError) {
        console.error('Error rescheduling appointment:', updateError)
        return NextResponse.json({ 
          error: 'Failed to reschedule appointment' 
        }, { status: 400 })
      }

      return NextResponse.json({
        success: true,
        message: 'Appointment rescheduled successfully',
        data: updated
      })

    } else if (action === 'cancel') {
      // Cancel appointment
      const { id, reason } = body

      const { data: cancelled, error: cancelError } = await supabase
        .from('bookings')
        .update({
          status: 'cancelled',
          notes: reason || 'Cancelled by user',
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single()

      if (cancelError) {
        console.error('Error cancelling appointment:', cancelError)
        return NextResponse.json({ 
          error: 'Failed to cancel appointment' 
        }, { status: 400 })
      }

      return NextResponse.json({
        success: true,
        message: 'Appointment cancelled successfully',
        data: cancelled
      })

    } else {
      // Default update action
      const { id, ...updates } = body

      const { data: updated, error: updateError } = await supabase
        .from('bookings')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single()

      if (updateError) {
        console.error('Error updating appointment:', updateError)
        return NextResponse.json({ 
          error: 'Failed to update appointment' 
        }, { status: 400 })
      }

      return NextResponse.json({
        success: true,
        message: 'Appointment updated successfully',
        data: updated
      })
    }

  } catch (error) {
    console.error('Error in PATCH appointments endpoint:', error)
    return NextResponse.json({ 
      error: 'Failed to update appointment',
      details: error.message
    }, { status: 500 })
  }
}

export async function POST(request) {
  try {
    const supabase = await createClient()
    
    // Get the current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    
    // Create new appointment
    const { data: newBooking, error: createError } = await supabase
      .from('bookings')
      .insert({
        barbershop_id: body.barbershop_id || body.shop_id,
        barber_id: body.barber_id || user.id,
        customer_name: body.customer_name,
        customer_email: body.customer_email,
        customer_phone: body.customer_phone,
        date: body.date,
        time: body.time || body.start_time,
        service_name: body.service_name || body.service,
        service_duration: body.service_duration || body.duration || 30,
        service_price: body.service_price || body.price || 0,
        status: body.status || 'confirmed',
        notes: body.notes,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single()

    if (createError) {
      console.error('Error creating appointment:', createError)
      return NextResponse.json({ 
        error: 'Failed to create appointment',
        details: createError.message
      }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      message: 'Appointment created successfully',
      data: newBooking
    })

  } catch (error) {
    console.error('Error in POST appointments endpoint:', error)
    return NextResponse.json({ 
      error: 'Failed to create appointment',
      details: error.message
    }, { status: 500 })
  }
}

export async function DELETE(request) {
  try {
    const supabase = await createClient()
    
    // Get the current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ 
        error: 'Appointment ID is required' 
      }, { status: 400 })
    }

    const { error: deleteError } = await supabase
      .from('bookings')
      .delete()
      .eq('id', id)

    if (deleteError) {
      console.error('Error deleting appointment:', deleteError)
      return NextResponse.json({ 
        error: 'Failed to delete appointment',
        details: deleteError.message
      }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      message: 'Appointment deleted successfully'
    })

  } catch (error) {
    console.error('Error in DELETE appointments endpoint:', error)
    return NextResponse.json({ 
      error: 'Failed to delete appointment',
      details: error.message
    }, { status: 500 })
  }
}

// Helper function to calculate duration in minutes
function calculateDuration(startTime, endTime) {
  const [startHours, startMinutes] = startTime.split(':').map(Number)
  const [endHours, endMinutes] = endTime.split(':').map(Number)
  
  const startTotalMinutes = startHours * 60 + startMinutes
  const endTotalMinutes = endHours * 60 + endMinutes
  
  return endTotalMinutes - startTotalMinutes
}