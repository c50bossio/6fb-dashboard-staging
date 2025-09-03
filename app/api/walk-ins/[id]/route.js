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

    console.log(`[Walk-in Update] Updating walk-in ${id}`)

    // First update the customer record
    const { data: walkInData } = await supabase
      .from('appointments')
      .select('customer_id')
      .eq('id', id)
      .single()

    if (walkInData?.customer_id && customer_name) {
      await supabase
        .from('customers')
        .update({
          full_name: customer_name,
          phone: phone ? phone.replace(/\D/g, '') : null,
          updated_at: new Date().toISOString()
        })
        .eq('id', walkInData.customer_id)
    }

    // Update the walk-in appointment
    const { data, error } = await supabase
      .from('appointments')
      .update({ 
        notes,
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
      console.error('[Walk-in Update] Database error:', error)
      throw error
    }

    if (!data || data.length === 0) {
      return NextResponse.json(
        { error: 'Walk-in appointment not found' },
        { status: 404 }
      )
    }

    console.log('[Walk-in Update] Successfully updated walk-in:', data[0])

    return NextResponse.json({
      success: true,
      walk_in: data[0],
      message: 'Walk-in updated successfully'
    })

  } catch (error) {
    console.error('[Walk-in Update] Error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to update walk-in' },
      { status: 500 }
    )
  }
}

export async function DELETE(request, { params }) {
  try {
    const { id } = params

    console.log(`[Walk-in Delete] Deleting walk-in ${id}`)

    // Get walk-in details for notification
    const { data: walkInData } = await supabase
      .from('appointments')
      .select(`
        *,
        customers (
          id,
          full_name,
          phone
        )
      `)
      .eq('id', id)
      .single()

    // Delete walk-in appointment
    const { error } = await supabase
      .from('appointments')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('[Walk-in Delete] Database error:', error)
      throw error
    }

    console.log('[Walk-in Delete] Successfully deleted walk-in')

    // Send notification if phone available
    const customerPhone = walkInData?.customers?.phone
    if (customerPhone) {
      try {
        await fetch('/api/notifications/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'walk_in_cancelled',
            message: `Hi ${walkInData?.customers?.full_name || 'there'}, you've been removed from our walk-in queue. Please contact us if you have questions.`,
            phone: customerPhone,
            barbershop_id: walkInData.barbershop_id
          })
        })
      } catch (notificationError) {
        console.warn('[Walk-in Delete] Failed to send notification:', notificationError)
      }
    }

    // Update queue positions for remaining walk-ins
    try {
      const { data: remainingWalkIns } = await supabase
        .from('appointments')
        .select('id, created_at')
        .eq('barbershop_id', walkInData?.barbershop_id)
        .eq('status', 'WALK_IN_WAITING')
        .gte('date', new Date().toISOString().split('T')[0])
        .order('created_at', { ascending: true })

      if (remainingWalkIns && remainingWalkIns.length > 0) {
        const priorityUpdates = remainingWalkIns.map((walkIn, index) =>
          supabase
            .from('appointments')
            .update({ queue_priority: index + 1 })
            .eq('id', walkIn.id)
        )

        await Promise.all(priorityUpdates)
        console.log(`[Walk-in Delete] Updated queue positions for ${remainingWalkIns.length} remaining customers`)
      }
    } catch (queueError) {
      console.warn('[Walk-in Delete] Failed to update queue positions:', queueError)
    }

    return NextResponse.json({
      success: true,
      message: 'Walk-in removed from queue successfully'
    })

  } catch (error) {
    console.error('[Walk-in Delete] Error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to delete walk-in' },
      { status: 500 }
    )
  }
}