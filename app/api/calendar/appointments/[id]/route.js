import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(supabaseUrl, supabaseServiceKey)

// Helper function to transform appointment to calendar event
function transformBookingToEvent(appointment) {
  return {
    id: appointment.id,
    resourceId: appointment.barber_id,
    title: `${appointment.clients?.name || appointment.client_name || 'Customer'} - ${appointment.services?.name || 'Service'}`,
    start: appointment.scheduled_at,
    end: appointment.end_time,
    backgroundColor: appointment.barbers?.color || '#3b82f6',
    borderColor: appointment.barbers?.color || '#3b82f6',
    extendedProps: {
      customer: appointment.clients?.name || appointment.client_name,
      customerPhone: appointment.clients?.phone || appointment.client_phone,
      customerEmail: appointment.clients?.email || appointment.client_email,
      service: appointment.services?.name,
      service_id: appointment.service_id,
      barber_id: appointment.barber_id,
      duration: appointment.duration_minutes || appointment.services?.duration,
      price: appointment.service_price || appointment.services?.price,
      status: appointment.status,
      notes: appointment.client_notes,
      recurrence_rule: appointment.recurrence_rule,
      recurrence_id: appointment.parent_appointment_id,
      isRecurring: !!appointment.recurrence_rule,
      isRecurringInstance: !!appointment.parent_appointment_id
    }
  }
}

export async function PATCH(request, { params }) {
  try {
    const { id } = params
    const body = await request.json()
    
    // Calculate end time based on duration if provided
    let updateData = {}
    
    if (body.scheduled_at && body.duration_minutes) {
      const startTime = new Date(body.scheduled_at)
      const endTime = new Date(startTime.getTime() + body.duration_minutes * 60000)
      
      // For bookings table, we use start_time and end_time
      updateData.start_time = startTime.toISOString()
      updateData.end_time = endTime.toISOString()
      updateData.duration_minutes = body.duration_minutes
    }
    
    // Map frontend field names to database field names (bookings table)
    if (body.client_notes) updateData.notes = body.client_notes
    if (body.service_price) updateData.price = body.service_price
    if (body.status) updateData.status = body.status
    if (body.barber_id) updateData.barber_id = body.barber_id
    if (body.service_id) updateData.service_id = body.service_id
    
    // Handle customer information updates directly on bookings table
    if (body.client_name) updateData.customer_name = body.client_name
    if (body.client_phone) updateData.customer_phone = body.client_phone
    if (body.client_email) updateData.customer_email = body.client_email
    
    // Update the booking
    const { data: updatedBooking, error } = await supabase
      .from('bookings')
      .update(updateData)
      .eq('id', id)
      .select('*')
      .single()
    
    if (error) {
      console.error('Error updating booking:', error)
      return NextResponse.json(
        { error: 'Failed to update appointment', details: error.message },
        { status: 500 }
      )
    }
    
    if (!updatedBooking) {
      return NextResponse.json(
        { error: 'Appointment not found' },
        { status: 404 }
      )
    }
    
    // Return the updated booking
    return NextResponse.json({ 
      appointment: updatedBooking,
      message: 'Appointment updated successfully'
    })
    
  } catch (error) {
    console.error('Error updating booking:', error)
    return NextResponse.json(
      { error: 'Failed to update appointment', details: error.message },
      { status: 500 }
    )
  }
}

export async function DELETE(request, { params }) {
  try {
    const { id } = params
    const { searchParams } = new URL(request.url)
    const deleteAll = searchParams.get('deleteAll') === 'true' // For recurring appointments
    const cancelDate = searchParams.get('cancelDate') // For cancelling single occurrence
    
    console.log('Delete appointment request:', { id, deleteAll, cancelDate })
    
    // First, get the appointment to check if it's recurring
    const { data: appointment, error: fetchError } = await supabase
      .from('bookings')
      .select('*')
      .eq('id', id)
      .single()
    
    if (fetchError || !appointment) {
      console.error('Appointment not found:', fetchError)
      return NextResponse.json(
        { error: 'Appointment not found' },
        { status: 404 }
      )
    }
    
    console.log('Found appointment:', appointment)
    
    // If it's a recurring appointment and user wants to delete just one occurrence
    if (appointment.is_recurring && appointment.recurring_pattern && !deleteAll && cancelDate) {
      // Add the date to cancelled_dates in recurring_pattern
      const currentPattern = appointment.recurring_pattern || {}
      const cancelledDates = currentPattern.cancelled_dates || []
      
      // Add the cancelled date if not already present
      if (!cancelledDates.includes(cancelDate)) {
        cancelledDates.push(cancelDate)
      }
      
      // Update the recurring pattern with the new cancelled date
      const updatedPattern = {
        ...currentPattern,
        cancelled_dates: cancelledDates
      }
      
      const { error: updateError } = await supabase
        .from('bookings')
        .update({ 
          recurring_pattern: updatedPattern,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
      
      if (updateError) {
        console.error('Error cancelling single occurrence:', updateError)
        return NextResponse.json(
          { error: 'Failed to cancel single occurrence', details: updateError.message },
          { status: 500 }
        )
      }
      
      return NextResponse.json({
        success: true,
        message: 'Single occurrence cancelled successfully',
        appointmentId: id,
        cancelledDate: cancelDate,
        wasRecurring: true,
        deletedAll: false
      })
      
    } else {
      // Delete the entire appointment (recurring series or single)
      const { error: deleteError } = await supabase
        .from('bookings')
        .delete()
        .eq('id', id)
      
      if (deleteError) {
        console.error('Error deleting booking:', deleteError)
        return NextResponse.json(
          { error: 'Failed to delete appointment' },
          { status: 500 }
        )
      }
      
      return NextResponse.json({ 
        success: true,
        message: appointment.is_recurring && deleteAll 
          ? 'Recurring appointment series deleted successfully' 
          : 'Appointment deleted successfully',
        deleted_id: id,
        wasRecurring: appointment.is_recurring,
        deletedAll: appointment.is_recurring ? deleteAll : false
      })
    }
    
  } catch (error) {
    console.error('Error deleting booking:', error)
    return NextResponse.json(
      { error: 'Failed to delete appointment', details: error.message },
      { status: 500 }
    )
  }
}