import { NextResponse } from 'next/server'
import { createClient } from '../../../../lib/supabase/client'
import { z } from 'zod'

export const runtime = 'edge'

// Validation schemas
const updateBookingSchema = z.object({
  scheduled_at: z.string().datetime().optional(),
  duration_minutes: z.number().min(15).max(480).optional(),
  service_price: z.number().min(0).optional(),
  client_name: z.string().min(1).max(255).optional(),
  client_phone: z.string().max(20).optional(),
  client_email: z.string().email().optional(),
  client_notes: z.string().max(500).optional(),
  payment_method: z.enum(['online', 'cash', 'card']).optional(),
  status: z.enum(['PENDING', 'CONFIRMED', 'CANCELLED', 'COMPLETED', 'NO_SHOW']).optional()
})

// GET /api/bookings/[id] - Get booking details
export async function GET(request, { params }) {
  try {
    const supabase = createClient()
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: booking, error } = await supabase
      .from('bookings')
      .select(`
        *,
        barber:profiles!bookings_barber_id_fkey(id, name, email, image_url),
        service:services(id, name, description, duration_minutes, price, category),
        barbershop:barbershops(id, name, address, phone)
      `)
      .eq('id', params.id)
      .single()

    if (error || !booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
    }

    // Check if user has permission to view this booking
    // Either the customer who made the booking or staff at the barbershop
    const canView = booking.client_email === user.email || 
                   user.role === 'admin' || 
                   user.role === 'staff'

    if (!canView) {
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 })
    }

    return NextResponse.json({
      success: true,
      booking: {
        ...booking,
        barber_name: booking.barber?.name,
        service_name: booking.service?.name,
        barbershop_name: booking.barbershop?.name,
        barbershop_address: booking.barbershop?.address,
        barbershop_phone: booking.barbershop?.phone
      }
    })

  } catch (error) {
    console.error('Error fetching booking:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// PUT /api/bookings/[id] - Update booking (reschedule, modify details)
export async function PUT(request, { params }) {
  try {
    const supabase = createClient()
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    console.log('📝 Updating booking:', params.id, body)
    
    // Validate request body
    const validationResult = updateBookingSchema.safeParse(body)
    if (!validationResult.success) {
      return NextResponse.json({
        error: 'Validation failed',
        details: validationResult.error.errors
      }, { status: 400 })
    }

    const updateData = validationResult.data

    // Get existing booking to check permissions
    const { data: existingBooking, error: fetchError } = await supabase
      .from('bookings')
      .select('*')
      .eq('id', params.id)
      .single()

    if (fetchError || !existingBooking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
    }

    // Check permissions
    const canUpdate = existingBooking.client_email === user.email || 
                     user.role === 'admin' || 
                     user.role === 'staff'

    if (!canUpdate) {
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 })
    }

    // If rescheduling, check for conflicts
    if (updateData.scheduled_at) {
      const newStart = new Date(updateData.scheduled_at)
      const duration = updateData.duration_minutes || existingBooking.duration_minutes
      const newEnd = new Date(newStart.getTime() + duration * 60000)

      const { data: conflicts, error: conflictError } = await supabase
        .from('bookings')
        .select('id, scheduled_at, duration_minutes')
        .eq('barber_id', existingBooking.barber_id)
        .eq('status', 'CONFIRMED')
        .neq('id', params.id)

      if (conflictError) {
        console.error('Error checking conflicts:', conflictError)
        return NextResponse.json({ error: 'Failed to check time conflicts' }, { status: 500 })
      }

      const hasConflict = conflicts?.some(booking => {
        const bookingStart = new Date(booking.scheduled_at)
        const bookingEnd = new Date(bookingStart.getTime() + booking.duration_minutes * 60000)
        
        return (newStart < bookingEnd && newEnd > bookingStart)
      })

      if (hasConflict) {
        return NextResponse.json({
          error: 'Time conflict detected',
          message: 'The selected time slot conflicts with an existing appointment'
        }, { status: 409 })
      }
    }

    // Update the booking
    const { data: updatedBooking, error: updateError } = await supabase
      .from('bookings')
      .update({
        ...updateData,
        updated_at: new Date().toISOString()
      })
      .eq('id', params.id)
      .select(`
        *,
        barber:profiles!bookings_barber_id_fkey(id, name, email),
        service:services(id, name, description, duration_minutes, price, category),
        barbershop:barbershops(id, name, address, phone)
      `)
      .single()

    if (updateError) {
      console.error('Error updating booking:', updateError)
      return NextResponse.json({ 
        error: 'Failed to update booking',
        details: updateError.message 
      }, { status: 500 })
    }

    console.log('✅ Booking updated successfully:', updatedBooking.id)

    return NextResponse.json({
      success: true,
      booking: updatedBooking,
      message: 'Booking updated successfully'
    })

  } catch (error) {
    console.error('Unexpected error updating booking:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}

// DELETE /api/bookings/[id] - Cancel booking
export async function DELETE(request, { params }) {
  try {
    const supabase = createClient()
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get existing booking to check permissions
    const { data: existingBooking, error: fetchError } = await supabase
      .from('bookings')
      .select('*')
      .eq('id', params.id)
      .single()

    if (fetchError || !existingBooking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
    }

    // Check permissions
    const canCancel = existingBooking.client_email === user.email || 
                     user.role === 'admin' || 
                     user.role === 'staff'

    if (!canCancel) {
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 })
    }

    // Check cancellation policy (e.g., must be at least 2 hours before appointment)
    const appointmentTime = new Date(existingBooking.scheduled_at)
    const now = new Date()
    const hoursUntilAppointment = (appointmentTime - now) / (1000 * 60 * 60)
    
    const cancellationPolicy = {
      minimumHours: 2,
      allowSameDayStaff: user.role === 'staff' || user.role === 'admin'
    }

    if (hoursUntilAppointment < cancellationPolicy.minimumHours && !cancellationPolicy.allowSameDayStaff) {
      return NextResponse.json({
        error: 'Cancellation policy violation',
        message: `Appointments must be cancelled at least ${cancellationPolicy.minimumHours} hours in advance`
      }, { status: 400 })
    }

    // Update booking status to CANCELLED
    const { data: cancelledBooking, error: cancelError } = await supabase
      .from('bookings')
      .update({
        status: 'CANCELLED',
        cancelled_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', params.id)
      .select(`
        *,
        barber:profiles!bookings_barber_id_fkey(id, name, email),
        service:services(id, name, description, duration_minutes, price, category)
      `)
      .single()

    if (cancelError) {
      console.error('Error cancelling booking:', cancelError)
      return NextResponse.json({ 
        error: 'Failed to cancel booking',
        details: cancelError.message 
      }, { status: 500 })
    }

    // TODO: Send cancellation notifications
    // TODO: Process refunds if applicable

    console.log('✅ Booking cancelled successfully:', cancelledBooking.id)

    return NextResponse.json({
      success: true,
      booking: cancelledBooking,
      message: 'Booking cancelled successfully'
    })

  } catch (error) {
    console.error('Unexpected error cancelling booking:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}