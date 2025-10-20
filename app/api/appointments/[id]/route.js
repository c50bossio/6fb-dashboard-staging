import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const supabase = createClient(supabaseUrl, supabaseKey)

export async function PUT(request, { params }) {
  try {
    const { id } = params
    const body = await request.json()
    const { customer_name, service_name, notes, phone } = body

    console.log(`[Appointment Update] Updating appointment ${id}`)

    // Update appointment in appointments table
    const { data, error } = await supabase
      .from('appointments')
      .update({
        customer_name,
        service_name,
        notes,
        customer_phone: phone,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()

    if (error) {
      console.error('[Appointment Update] Database error:', error)
      throw error
    }

    if (!data || data.length === 0) {
      return NextResponse.json(
        { error: 'Appointment not found' },
        { status: 404 }
      )
    }

    console.log('[Appointment Update] Successfully updated appointment:', data[0])

    return NextResponse.json({
      success: true,
      appointment: data[0],
      message: 'Appointment updated successfully'
    })

  } catch (error) {
    console.error('[Appointment Update] Error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to update appointment' },
      { status: 500 }
    )
  }
}

export async function DELETE(request, { params }) {
  try {
    const { id } = params

    console.log(`[Appointment Delete] Deleting appointment ${id}`)

    // Get appointment details for notification
    const { data: appointmentData } = await supabase
      .from('appointments')
      .select('customer_name, customer_phone, barbershop_id')
      .eq('id', id)
      .single()

    // Delete appointment from appointments table
    const { error } = await supabase
      .from('appointments')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('[Appointment Delete] Database error:', error)
      throw error
    }

    console.log('[Appointment Delete] Successfully deleted appointment')

    // Send cancellation notification if phone available
    if (appointmentData?.customer_phone) {
      try {
        await fetch('/api/notifications/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'appointment_cancelled',
            message: `Hi ${appointmentData.customer_name || 'there'}, your appointment has been cancelled. Please contact us if you have questions.`,
            phone: appointmentData.customer_phone,
            barbershop_id: appointmentData.barbershop_id
          })
        })
      } catch (notificationError) {
        console.warn('[Appointment Delete] Failed to send notification:', notificationError)
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Appointment deleted successfully'
    })

  } catch (error) {
    console.error('[Appointment Delete] Error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to delete appointment' },
      { status: 500 }
    )
  }
}