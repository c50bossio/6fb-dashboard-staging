import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function POST(request, { params }) {
  try {
    const appointmentId = params.id

    if (!appointmentId) {
      return NextResponse.json({
        success: false,
        error: 'Appointment ID is required'
      }, { status: 400 })
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json({
        success: false,
        error: 'Service configuration error'
      }, { status: 500 })
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Check if appointment exists and can be checked in
    const { data: appointment, error: fetchError } = await supabase
      .from('appointments')
      .select('*')
      .eq('id', appointmentId)
      .single()

    if (fetchError || !appointment) {
      return NextResponse.json({
        success: false,
        error: 'Appointment not found'
      }, { status: 404 })
    }

    // Check if appointment can be checked in (must be confirmed status)
    if (appointment.status !== 'confirmed') {
      return NextResponse.json({
        success: false,
        error: `Cannot check in appointment with status: ${appointment.status}`
      }, { status: 400 })
    }

    // Calculate queue position based on current checked-in and waiting customers
    const { count: currentQueuePosition } = await supabase
      .from('appointments')
      .select('*', { count: 'exact' })
      .eq('barbershop_id', appointment.barbershop_id)
      .gte('date', new Date().toISOString().split('T')[0])
      .in('status', ['checked_in', 'WALK_IN_WAITING', 'WALK_IN_BEING_SERVED'])

    const queuePosition = (currentQueuePosition || 0) + 1

    console.log(`[Check-in] Assigning queue position ${queuePosition} to appointment ${appointmentId}`)

    // Update appointment status to checked_in and assign queue position
    const { data: updatedAppt, error: updateError } = await supabase
      .from('appointments')
      .update({
        status: 'checked_in',
        checked_in_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        queue_priority: queuePosition
      })
      .eq('id', appointmentId)
      .select('*')
      .single()

    if (updateError) {
      console.error('Error updating appointment status:', updateError)
      return NextResponse.json({
        success: false,
        error: 'Failed to update appointment status'
      }, { status: 500 })
    }

    // Optional: Send notification to barber about customer check-in
    try {
      // This could trigger a notification system
      await fetch('/api/notifications/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'customer_checked_in',
          appointment_id: appointmentId,
          customer_name: appointment.customer_name,
          barber_id: appointment.barber_id,
          barbershop_id: appointment.barbershop_id
        })
      })
    } catch (notificationError) {
      console.warn('Failed to send check-in notification:', notificationError)
      // Don't fail the check-in if notification fails
    }

    return NextResponse.json({
      success: true,
      appointment: updatedAppt,
      queue_position: queuePosition,
      message: `Customer checked in successfully! Queue position: ${queuePosition}`
    })

  } catch (error) {
    console.error('Check-in API error:', error)
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 })
  }
}