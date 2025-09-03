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
      .select('id, full_name, role, barbershop_id, barbershop_id')
      .eq('id', user.id)
      .single()
    
    if (!profile) {
      return NextResponse.json({ 
        appointments: [],
        message: 'No profile found' 
      })
    }

    // Determine barbershop ID
    let barbershopId = profile.barbershop_id || profile.barbershop_id
    
    // Skip barbershop_staff query to avoid 406 errors
    // Staff associations should be managed through profiles table
    // If no barbershopId in profile, will return empty appointments below

    // If still no barbershop, return empty
    if (!barbershopId) {
      return NextResponse.json({ 
        appointments: [],
        message: 'No barbershop associated' 
      })
    }

    // Get URL parameters for date range optimization
    const { searchParams } = new URL(request.url)
    const start = searchParams.get('start') // FullCalendar sends these automatically
    const end = searchParams.get('end')
    const locationIds = searchParams.get('location_ids')
    const barbershopIdParam = searchParams.get('barbershop_id')
    
    // Use FullCalendar date range if provided, otherwise default to today + 30 days for performance
    let startDate, endDate
    if (start && end) {
      startDate = new Date(start)
      endDate = new Date(end)
      console.log(`[Calendar API] Using FullCalendar date range: ${start} to ${end}`)
    } else {
      // Fallback: today + 30 days ahead for reasonable data fetch
      startDate = new Date()
      startDate.setHours(0, 0, 0, 0)
      endDate = new Date(startDate)
      endDate.setDate(endDate.getDate() + 30)
      console.log(`[Calendar API] Using default date range: ${startDate.toISOString()} to ${endDate.toISOString()}`)
    }

    // Handle multi-location requests
    let targetbarbershopIds = []
    if (locationIds) {
      targetbarbershopIds = locationIds.split(',')
      console.log(`[Calendar API] Multi-location request for shops: ${targetbarbershopIds.join(', ')}`)
    } else if (barbershopIdParam) {
      targetbarbershopIds = [barbershopIdParam]
      console.log(`[Calendar API] Single shop request: ${barbershopIdParam}`)
    } else {
      targetbarbershopIds = [barbershopId]
      console.log(`[Calendar API] Using user's barbershop: ${barbershopId}`)
    }

    // Build optimized query with date range filtering
    let query = supabase
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
        duration_minutes,
        status,
        barber_id,
        barbershop_id,
        notes,
        created_at,
        updated_at
      `)
      .gte('date', startDate.toISOString())
      .lt('date', endDate.toISOString())
      .order('date', { ascending: true })
      .order('time', { ascending: true })

    // Apply barbershop filter
    if (targetbarbershopIds.length === 1) {
      query = query.eq('barbershop_id', targetbarbershopIds[0])
    } else if (targetbarbershopIds.length > 1) {
      query = query.in('barbershop_id', targetbarbershopIds)
    }

    const { data: bookings, error: bookingsError } = await query

    if (bookingsError) {
      console.error('Error fetching bookings:', bookingsError)
      return NextResponse.json({ 
        appointments: [],
        error: 'Failed to fetch bookings' 
      })
    }

    // Query walk-in appointments from the appointments table
    let walkInQuery = supabase
      .from('appointments')
      .select(`
        id,
        date,
        time,
        status,
        barber_id,
        barbershop_id,
        service_id,
        customer_id,
        notes,
        created_at,
        updated_at,
        customers (
          id,
          full_name,
          phone,
          email
        )
      `)
      .gte('date', startDate.toISOString().split('T')[0])
      .lt('date', endDate.toISOString().split('T')[0])
      .in('status', ['WALK_IN_WAITING', 'IN_SERVICE']) // Include both waiting and in-service
      .order('created_at', { ascending: true })

    // Apply barbershop filter to walk-ins
    if (targetbarbershopIds.length === 1) {
      walkInQuery = walkInQuery.eq('barbershop_id', targetbarbershopIds[0])
    } else if (targetbarbershopIds.length > 1) {
      walkInQuery = walkInQuery.in('barbershop_id', targetbarbershopIds)
    }

    const { data: walkIns, error: walkInsError } = await walkInQuery

    if (walkInsError) {
      console.error('Error fetching walk-ins:', walkInsError)
      // Don't fail completely if walk-ins fail, just log and continue
    }

    // Get barber details for both bookings and walk-ins
    const bookingBarberIds = bookings?.map(b => b.barber_id).filter(Boolean) || []
    const walkInBarberIds = walkIns?.map(w => w.barber_id).filter(Boolean) || []
    const barberIds = [...new Set([...bookingBarberIds, ...walkInBarberIds])]
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

    // Get service details for walk-ins
    const walkInServiceIds = walkIns?.map(w => w.service_id).filter(Boolean) || []
    let serviceMap = {}
    
    if (walkInServiceIds.length > 0) {
      const { data: services } = await supabase
        .from('services')
        .select('id, name, duration_minutes, price')
        .in('id', walkInServiceIds)
      
      if (services) {
        serviceMap = services.reduce((acc, service) => {
          acc[service.id] = service
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
      const duration = booking.duration_minutes || 30
      endDateTime.setMinutes(endDateTime.getMinutes() + duration)
      
      // Determine color based on status
      let backgroundColor = '#10b981' // Default green
      let borderColor = '#059669'
      const textColor = '#ffffff'
      
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

    // Transform walk-in appointments to calendar format
    const walkInAppointments = (walkIns || []).map(walkIn => {
      // Parse time to create full datetime
      const [hours, minutes] = (walkIn.time || '09:00').split(':')
      const startDateTime = new Date(walkIn.date)
      startDateTime.setHours(parseInt(hours), parseInt(minutes), 0, 0)
      
      // Get service details
      const service = serviceMap[walkIn.service_id]
      const serviceName = service?.name || 'Walk-in Service'
      const duration = service?.duration_minutes || 30
      
      // Calculate end time based on duration
      const endDateTime = new Date(startDateTime)
      endDateTime.setMinutes(endDateTime.getMinutes() + duration)
      
      // Walk-in specific colors - orange/amber theme
      let backgroundColor = '#f59e0b' // Amber for waiting
      let borderColor = '#d97706'
      const textColor = '#ffffff'
      
      if (walkIn.status === 'IN_SERVICE') {
        backgroundColor = '#3b82f6' // Blue for in-service
        borderColor = '#2563eb'
      }

      // Calculate queue position for display
      const queuePosition = walkIns.findIndex(w => w.id === walkIn.id) + 1
      const customerName = walkIn.customers?.full_name || 'Walk-in Customer'
      
      const title = walkIn.status === 'WALK_IN_WAITING' 
        ? `🚶 #${queuePosition} ${customerName} - ${serviceName}`
        : `🔄 ${customerName} - ${serviceName}`

      return {
        id: `walkin_${walkIn.id}`, // Prefix to distinguish from regular appointments
        title,
        start: startDateTime.toISOString(),
        end: endDateTime.toISOString(),
        backgroundColor,
        borderColor,
        textColor,
        classNames: ['walk-in-appointment'],
        extendedProps: {
          customer: customerName,
          email: walkIn.customers?.email || '',
          phone: walkIn.customers?.phone || '',
          service: serviceName,
          price: service?.price || 0,
          duration: duration,
          status: walkIn.status,
          notes: walkIn.notes,
          barberId: walkIn.barber_id,
          barberName: barberMap[walkIn.barber_id] || 'Available',
          barbershopId: walkIn.barbershop_id,
          isWalkIn: true,
          queuePosition: walkIn.status === 'WALK_IN_WAITING' ? queuePosition : null,
          createdAt: walkIn.created_at
        }
      }
    })

    // Combine regular appointments and walk-ins
    const allAppointments = [...appointments, ...walkInAppointments]

    // Performance and debugging metrics
    const performanceEnd = Date.now()
    const performanceMetrics = {
      totalRecords: allAppointments.length,
      regularAppointments: appointments.length,
      walkInAppointments: walkInAppointments.length,
      dateRange: {
        start: startDate.toISOString(),
        end: endDate.toISOString(),
        daysSpan: Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24))
      },
      barbershops: targetbarbershopIds,
      queryOptimization: start && end ? 'FullCalendar date range used' : 'Default 30-day range used'
    }
    
    console.log(`[Calendar API] Performance metrics:`, performanceMetrics)
    console.log(`[Calendar API] Integrated ${walkInAppointments.length} walk-in appointments with ${appointments.length} regular appointments`)

    return NextResponse.json({
      appointments: allAppointments,
      count: allAppointments.length,
      barbershopId,
      meta: {
        dateRange: {
          start: startDate.toISOString(),
          end: endDate.toISOString()
        },
        optimization: {
          rangeOptimized: !!(start && end),
          recordsReturned: appointments.length,
          barbershopsQueried: targetbarbershopIds.length
        }
      }
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
          barbershop_id: body.barbershop_id || body.barbershop_id,
          barber_id: barber_id || user.id,
          customer_name: 'BLOCKED',
          customer_email: 'blocked@system.local',
          customer_phone: '0000000000',
          date: date,
          time: start_time,
          service_name: reason || 'Time Blocked',
          duration_minutes: calculateDuration(start_time, end_time),
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
        barbershop_id: body.barbershop_id || body.barbershop_id,
        barber_id: body.barber_id || user.id,
        customer_name: body.customer_name,
        customer_email: body.customer_email,
        customer_phone: body.customer_phone,
        date: body.date,
        time: body.time || body.start_time,
        service_name: body.service_name || body.service,
        duration_minutes: body.service_duration || body.duration || body.duration_minutes || 30,
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