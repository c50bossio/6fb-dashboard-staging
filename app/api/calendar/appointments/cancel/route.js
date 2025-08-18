import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
export const runtime = 'edge'

export async function POST(request) {
  try {
    const { appointmentId } = await request.json()
    
    if (!appointmentId) {
      return NextResponse.json(
        { error: 'Appointment ID is required' },
        { status: 400 }
      )
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    )

    const { data: current } = await supabase
      .from('bookings')
      .select('notes')
      .eq('id', appointmentId)
      .single()
    
    const currentNotes = current?.notes || ''
    const cancelNote = `${currentNotes} [Cancelled at ${new Date().toLocaleString()}]`
    
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