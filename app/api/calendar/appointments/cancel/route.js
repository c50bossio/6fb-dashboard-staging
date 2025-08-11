import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

// Cancel appointment (soft delete)
export async function POST(request) {
  try {
    const { appointmentId } = await request.json()
    
    if (!appointmentId) {
      return NextResponse.json(
        { error: 'Appointment ID is required' },
        { status: 400 }
      )
    }

    // Initialize Supabase client
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    
    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json(
        { error: 'Supabase configuration missing' },
        { status: 500 }
      )
    }

    const supabase = createClient(supabaseUrl, supabaseKey)

    // Soft delete: Update status to 'cancelled' instead of deleting
    // First get the current appointment
    const { data: current } = await supabase
      .from('bookings')
      .select('notes')
      .eq('id', appointmentId)
      .single()
    
    const currentNotes = current?.notes || ''
    const cancelNote = `${currentNotes} [Cancelled at ${new Date().toLocaleString()}]`
    
    // Update the appointment
    const { data, error } = await supabase
      .from('bookings')
      .update({
        status: 'cancelled',
        notes: cancelNote
      })
      .eq('id', appointmentId)
      .select()
      .single()

    if (error) {
      console.error('Error cancelling appointment:', error)
      return NextResponse.json(
        { error: 'Failed to cancel appointment', details: error.message },
        { status: 500 }
      )
    }

    // The UPDATE event will trigger real-time updates automatically
    console.log('✅ Appointment cancelled (soft delete):', appointmentId)

    return NextResponse.json({
      success: true,
      appointment: data,
      message: 'Appointment cancelled successfully'
    })

  } catch (error) {
    console.error('Cancel appointment error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}