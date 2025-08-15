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

    const { data: current, error: fetchError } = await supabase
      .from('bookings')
      .select('status, notes')
      .eq('id', appointmentId)
      .single()
    
    if (fetchError || !current) {
      return NextResponse.json(
        { error: 'Appointment not found' },
        { status: 404 }
      )
    }

    if (current.status !== 'cancelled') {
      return NextResponse.json(
        { error: 'Appointment is not cancelled' },
        { status: 400 }
      )
    }
    
    const currentNotes = current.notes || ''
    const uncancelNote = `${currentNotes} [Uncancelled at ${new Date().toLocaleString()}]`
    
    const { data, error } = await supabase
      .from('bookings')
      .update({
        status: 'confirmed',
        notes: uncancelNote
      })
      .eq('id', appointmentId)
      .select()
      .single()

    if (error) {
      console.error('Error uncancelling appointment:', error)
      return NextResponse.json(
        { error: 'Failed to uncancel appointment', details: error.message },
        { status: 500 }
      )
    }

    console.log('✅ Appointment uncancelled:', appointmentId)

    return NextResponse.json({
      success: true,
      appointment: data,
      message: 'Appointment uncancelled successfully'
    })

  } catch (error) {
    console.error('Uncancel appointment error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}