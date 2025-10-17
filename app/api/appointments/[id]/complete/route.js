import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(supabaseUrl, supabaseKey)

export async function POST(request, { params }) {
  try {
    const { id } = params

    if (!id) {
      return NextResponse.json(
        { error: 'Appointment ID is required' },
        { status: 400 }
      )
    }

    // Update appointment status to completed
    const { data: appointment, error: updateError } = await supabase
      .from('appointments')
      .update({
        status: 'completed'
      })
      .eq('id', id)
      .select()
      .single()

    if (updateError) throw updateError

    if (!appointment) {
      return NextResponse.json(
        { error: 'Appointment not found' },
        { status: 404 }
      )
    }

    // Update customer's last_visit if customer_id exists
    if (appointment.customer_id) {
      try {
        await supabase
          .from('customers')
          .update({
            last_visit: new Date().toISOString()
          })
          .eq('id', appointment.customer_id)
      } catch (error) {
        console.warn('Failed to update customer last_visit:', error)
        // Don't fail the completion if customer update fails
      }
    }

    return NextResponse.json({
      success: true,
      appointment_id: appointment.id,
      message: 'Service completed successfully'
    })

  } catch (error) {
    console.error('Complete appointment error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to complete appointment' },
      { status: 500 }
    )
  }
}
