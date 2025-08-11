import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(supabaseUrl, supabaseServiceKey)

// Helper function to transform appointment to calendar event
function transformBookingToEvent(appointment) {
  // Determine background color based on status
  let backgroundColor = appointment.barbers?.color || '#3b82f6'
  let borderColor = appointment.barbers?.color || '#3b82f6'
  
  if (appointment.status === 'cancelled') {
    backgroundColor = '#ef4444' // Red color for cancelled appointments
    borderColor = '#dc2626'     // Darker red border
  }

  return {
    id: appointment.id,
    resourceId: appointment.barber_id,
    title: `${appointment.clients?.name || appointment.client_name || 'Customer'} - ${appointment.services?.name || 'Service'}`,
    start: appointment.scheduled_at,
    end: appointment.end_time,
    backgroundColor: backgroundColor,
    borderColor: borderColor,
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

export async function GET(request, { params }) {
  try {
    const { id } = params
    
    // Fetch appointment from bookings table
    const { data: appointment, error } = await supabase
      .from('bookings')
      .select(`
        *,
        customers(id, name, email, phone),
        services(id, name, duration_minutes, price),
        barbers(id, name, color)
      `)
      .eq('id', id)
      .single()
    
    if (error || !appointment) {
      return NextResponse.json(
        { error: 'Appointment not found' },
        { status: 404 }
      )
    }
    
    // Return the appointment data
    return NextResponse.json({ 
      appointment: appointment
    })
    
  } catch (error) {
    console.error('Error fetching appointment:', error)
    return NextResponse.json(
      { error: 'Failed to fetch appointment', details: error.message },
      { status: 500 }
    )
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
    
    console.log('🔴 DELETE API - Request received:', { 
      id, 
      deleteAll, 
      cancelDate,
      url: request.url 
    })
    
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
    
    console.log('🔴 DELETE API - Found appointment:', {
      id: appointment.id,
      status: appointment.status,
      is_recurring: appointment.is_recurring,
      recurring_pattern: appointment.recurring_pattern
    })
    
    // ===================================================
    // PHASE 2: CLEAR DECISION TREE FOR DELETE OPERATIONS
    // ===================================================
    
    // RULE 1: CANCELLED APPOINTMENTS - ALWAYS DELETE DIRECTLY
    if (appointment.status === 'cancelled') {
      console.log('🔴 DELETE API - RULE 1: CANCELLED APPOINTMENT')
      console.log('🔴 DELETE API - Action: DELETE DIRECTLY (ignore all parameters)')
      
      const { error: deleteError } = await supabase
        .from('bookings')
        .delete()
        .eq('id', id)
      
      if (deleteError) {
        console.error('🔴 DELETE API - ERROR deleting cancelled appointment:', deleteError)
        return NextResponse.json(
          { error: 'Failed to delete cancelled appointment', details: deleteError.message },
          { status: 500 }
        )
      }
      
      console.log('✅ DELETE API - Successfully deleted cancelled appointment ID:', id)
      
      return NextResponse.json({ 
        success: true,
        message: 'Cancelled appointment deleted successfully',
        deleted_id: id,
        wasCancelled: true,
        ruleApplied: 'RULE_1_CANCELLED'
      })
    }
    
    // RULE 2: NON-RECURRING APPOINTMENTS - DELETE DIRECTLY
    if (!appointment.is_recurring || !appointment.recurring_pattern) {
      console.log('🔴 DELETE API - RULE 2: NON-RECURRING APPOINTMENT')
      console.log('🔴 DELETE API - Action: DELETE DIRECTLY')
      
      const { error: deleteError } = await supabase
        .from('bookings')
        .delete()
        .eq('id', id)
      
      if (deleteError) {
        console.error('🔴 DELETE API - ERROR deleting non-recurring appointment:', deleteError)
        return NextResponse.json(
          { error: 'Failed to delete appointment', details: deleteError.message },
          { status: 500 }
        )
      }
      
      console.log('✅ DELETE API - Successfully deleted non-recurring appointment ID:', id)
      
      return NextResponse.json({ 
        success: true,
        message: 'Appointment deleted successfully',
        deleted_id: id,
        wasRecurring: false,
        ruleApplied: 'RULE_2_NON_RECURRING'
      })
    }
    
    // RULE 3: RECURRING APPOINTMENT WITH deleteAll=true - DELETE ENTIRE SERIES
    if (appointment.is_recurring && deleteAll === true) {
      console.log('🔴 DELETE API - RULE 3: RECURRING SERIES DELETE')
      console.log('🔴 DELETE API - Action: DELETE ENTIRE RECURRING SERIES')
      
      const { error: deleteError } = await supabase
        .from('bookings')
        .delete()
        .eq('id', id)
      
      if (deleteError) {
        console.error('🔴 DELETE API - ERROR deleting recurring series:', deleteError)
        return NextResponse.json(
          { error: 'Failed to delete recurring series', details: deleteError.message },
          { status: 500 }
        )
      }
      
      console.log('✅ DELETE API - Successfully deleted recurring series ID:', id)
      
      return NextResponse.json({ 
        success: true,
        message: 'Recurring appointment series deleted successfully',
        deleted_id: id,
        wasRecurring: true,
        deletedAll: true,
        ruleApplied: 'RULE_3_RECURRING_DELETE_ALL'
      })
    }
    
    // RULE 4: RECURRING APPOINTMENT WITH cancelDate - CANCEL SINGLE OCCURRENCE
    if (appointment.is_recurring && cancelDate) {
      console.log('🔴 DELETE API - RULE 4: RECURRING SINGLE OCCURRENCE')
      console.log('🔴 DELETE API - Action: ADD DATE TO CANCELLED_DATES')
      
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
        console.error('🔴 DELETE API - ERROR cancelling single occurrence:', updateError)
        return NextResponse.json(
          { error: 'Failed to cancel single occurrence', details: updateError.message },
          { status: 500 }
        )
      }
      
      console.log('✅ DELETE API - Successfully cancelled single occurrence for date:', cancelDate)
      
      return NextResponse.json({
        success: true,
        message: 'Single occurrence cancelled successfully',
        appointmentId: id,
        cancelledDate: cancelDate,
        wasRecurring: true,
        deletedAll: false,
        ruleApplied: 'RULE_4_RECURRING_SINGLE_CANCEL'
      })
    }
    
    // RULE 5: DEFAULT - DELETE DIRECTLY (fallback for any edge cases)
    console.log('🔴 DELETE API - RULE 5: DEFAULT FALLBACK')
    console.log('🔴 DELETE API - Action: DELETE DIRECTLY')
    console.log('🔴 DELETE API - Decision Logic:', {
      is_recurring: appointment.is_recurring,
      has_pattern: !!appointment.recurring_pattern,
      deleteAll: deleteAll,
      cancelDate: cancelDate,
      status: appointment.status
    })
    
    const { error: deleteError } = await supabase
      .from('bookings')
      .delete()
      .eq('id', id)
    
    if (deleteError) {
      console.error('🔴 DELETE API - ERROR in fallback delete:', deleteError)
      return NextResponse.json(
        { error: 'Failed to delete appointment', details: deleteError.message },
        { status: 500 }
      )
    }
    
    console.log('✅ DELETE API - Successfully deleted appointment ID (fallback):', id)
    
    return NextResponse.json({ 
      success: true,
      message: 'Appointment deleted successfully',
      deleted_id: id,
      ruleApplied: 'RULE_5_DEFAULT_FALLBACK'
    })
    
  } catch (error) {
    console.error('Error deleting booking:', error)
    return NextResponse.json(
      { error: 'Failed to delete appointment', details: error.message },
      { status: 500 }
    )
  }
}