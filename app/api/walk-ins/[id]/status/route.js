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

    console.log(`[Walk-in Status] Updating walk-in ${id} to status: ${status}`)

    // Update walk-in status in appointments table
    const { data, error } = await supabase
      .from('appointments')
      .update({ 
        status,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select(`
        *,
        customers (
          id,
          full_name,
          phone
        )
      `)

    if (error) {
      console.error('[Walk-in Status] Database error:', error)
      throw error
    }

    if (!data || data.length === 0) {
      return NextResponse.json(
        { error: 'Walk-in appointment not found' },
        { status: 404 }
      )
    }

    const walkIn = data[0]
    console.log('[Walk-in Status] Successfully updated walk-in:', walkIn)

    // Send notification to customer if status is significant
    const customerPhone = walkIn.customers?.phone
    if (['IN_SERVICE', 'completed'].includes(status) && customerPhone) {
      try {
        let notificationMessage
        
        switch (status) {
          case 'IN_SERVICE':
            notificationMessage = "Great news! Your barber is ready for you now. Please come in!"
            break
          case 'completed':
            notificationMessage = "Your service is complete. Thank you for visiting us!"
            break
          default:
            notificationMessage = `Your walk-in appointment status has been updated to ${status}`
        }

        const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:9999'
        await fetch(`${baseUrl}/api/notifications/send`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'walk_in_status_update',
            message: notificationMessage,
            phone: customerPhone,
            barbershop_id: walkIn.barbershop_id,
            appointment_id: walkIn.id
          })
        })

        console.log(`[Walk-in Status] Notification sent to ${customerPhone}`)
      } catch (notificationError) {
        console.warn('[Walk-in Status] Failed to send notification:', notificationError)
        // Don't fail the status update if notification fails
      }
    }

    // If status changed to IN_SERVICE, update queue positions for remaining waiting customers
    if (status === 'IN_SERVICE') {
      try {
        // Get all remaining walk-ins waiting in this barbershop
        const { data: waitingWalkIns } = await supabase
          .from('appointments')
          .select('id, created_at')
          .eq('barbershop_id', walkIn.barbershop_id)
          .eq('status', 'WALK_IN_WAITING')
          .gte('date', new Date().toISOString().split('T')[0])
          .order('created_at', { ascending: true })

        // Update their queue priorities
        if (waitingWalkIns && waitingWalkIns.length > 0) {
          const priorityUpdates = waitingWalkIns.map((walkIn, index) =>
            supabase
              .from('appointments')
              .update({ queue_priority: index + 1 })
              .eq('id', walkIn.id)
          )

          await Promise.all(priorityUpdates)
          console.log(`[Walk-in Status] Updated queue positions for ${waitingWalkIns.length} waiting customers`)
        }
      } catch (queueError) {
        console.warn('[Walk-in Status] Failed to update queue positions:', queueError)
        // Don't fail the main operation
      }
    }

    return NextResponse.json({
      success: true,
      walk_in: walkIn,
      message: `Walk-in status updated to ${status}`,
      notification_sent: customerPhone ? true : false
    })

  } catch (error) {
    console.error('[Walk-in Status] Error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to update walk-in status' },
      { status: 500 }
    )
  }
}