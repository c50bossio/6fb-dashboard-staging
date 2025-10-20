import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const supabase = createClient(supabaseUrl, supabaseKey)

export async function PUT(request, { params }) {
  try {
    const { id } = params
    const body = await request.json()
    const { status } = body

    if (!status) {
      return NextResponse.json(
        { error: 'Status is required' },
        { status: 400 }
      )
    }

    console.log(`[Appointment Status] Updating appointment ${id} to status: ${status}`)

    // Update appointment status in appointments table
    const { data, error } = await supabase
      .from('appointments')
      .update({
        status,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()

    if (error) {
      console.error('[Appointment Status] Database error:', error)
      throw error
    }

    if (!data || data.length === 0) {
      return NextResponse.json(
        { error: 'Appointment not found' },
        { status: 404 }
      )
    }

    console.log('[Appointment Status] Successfully updated appointment:', data[0])

    // Send notification to customer if status is significant
    if (['in_progress', 'completed'].includes(status) && data[0].customer_phone) {
      try {
        const notificationMessage = status === 'in_progress' 
          ? "Your appointment is now starting! Please head to your barber."
          : "Your appointment is complete. Thank you for visiting us!"

        await fetch('/api/notifications/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'status_update',
            message: notificationMessage,
            phone: data[0].customer_phone,
            barbershop_id: data[0].barbershop_id
          })
        })
      } catch (notificationError) {
        console.warn('[Appointment Status] Failed to send notification:', notificationError)
        // Don't fail the status update if notification fails
      }
    }

    return NextResponse.json({
      success: true,
      appointment: data[0],
      message: `Appointment status updated to ${status}`
    })

  } catch (error) {
    console.error('[Appointment Status] Error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to update appointment status' },
      { status: 500 }
    )
  }
}