import { NextResponse } from 'next/server'
import { z } from 'zod'

import { createClient } from '@/lib/supabase/server'
export const runtime = 'edge'

// Validation schema for updates
const updateAppointmentSchema = z.object({
  scheduled_at: z.string().datetime().optional(),
  duration_minutes: z.number().min(15).max(480).optional(),
  service_price: z.number().min(0).optional(),
  tip_amount: z.number().min(0).optional(),
  status: z.enum(['PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED', 'NO_SHOW']).optional(),
  client_name: z.string().min(1).max(255).optional(),
  client_phone: z.string().max(20).optional(),
  client_email: z.string().email().optional(),
  client_notes: z.string().max(500).optional(),
  barber_notes: z.string().max(500).optional(),
})

// GET /api/appointments/[id] - Get single appointment
export async function GET(request, { params }) {
  try {
    const supabase = createClient()
    const { id } = params
    
    // Get user session
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: appointment, error } = await supabase
      .from('bookings')
      .select(`
        *,
        client:users!appointments_client_id_fkey(id, name, email, phone),
        barber:users!appointments_barber_id_fkey(id, name, email),
        service:services(id, name, description, duration_minutes, price, category),
        barbershop:barbershops(id, name, address, phone)
      `)
      .eq('id', id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Appointment not found' }, { status: 404 })
      }
      console.error('Error fetching appointment:', error)
      return NextResponse.json({ error: 'Failed to fetch appointment' }, { status: 500 })
    }

    return NextResponse.json({ appointment })

  } catch (error) {
    console.error('Unexpected error in GET /api/appointments/[id]:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PATCH /api/appointments/[id] - Update appointment
export async function PATCH(request, { params }) {
  try {
    const supabase = createClient()
    const { id } = params
    
    // Get user session
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    
    // Validate request body
    const validationResult = updateAppointmentSchema.safeParse(body)
    if (!validationResult.success) {
      return NextResponse.json({
        error: 'Validation failed',
        details: validationResult.error.errors
      }, { status: 400 })
    }

    const updateData = validationResult.data

    // If updating time, check for conflicts
    if (updateData.scheduled_at || updateData.duration_minutes) {
      // Get current appointment details
      const { data: currentAppointment, error: fetchError } = await supabase
        .from('bookings')
        .select('barber_id, scheduled_at, duration_minutes')
        .eq('id', id)
        .single()

      if (fetchError) {
        return NextResponse.json({ error: 'Appointment not found' }, { status: 404 })
      }

      const newScheduledAt = updateData.scheduled_at || currentAppointment.scheduled_at
      const newDuration = updateData.duration_minutes || currentAppointment.duration_minutes

      // Check for conflicts
      const conflictCheck = await supabase
        .from('bookings')
        .select('id, scheduled_at, duration_minutes')
        .eq('barber_id', currentAppointment.barber_id)
        .eq('status', 'CONFIRMED')
        .neq('id', id) // Exclude current appointment

      if (!conflictCheck.error) {
        const newStart = new Date(newScheduledAt)
        const newEnd = new Date(newStart.getTime() + newDuration * 60000)

        const hasConflict = conflictCheck.data.some(existing => {
          const existingStart = new Date(existing.scheduled_at)
          const existingEnd = new Date(existingStart.getTime() + existing.duration_minutes * 60000)
          
          return (newStart < existingEnd && newEnd > existingStart)
        })

        if (hasConflict) {
          return NextResponse.json({
            error: 'Time conflict detected',
            message: 'The selected time slot conflicts with an existing appointment'
          }, { status: 409 })
        }
      }
    }

    // Recalculate total if price or tip changes
    if (updateData.service_price !== undefined || updateData.tip_amount !== undefined) {
      const { data: current, error: currentError } = await supabase
        .from('bookings')
        .select('service_price, tip_amount')
        .eq('id', id)
        .single()

      if (!currentError) {
        const newServicePrice = updateData.service_price ?? current.service_price
        const newTipAmount = updateData.tip_amount ?? current.tip_amount
        updateData.total_amount = newServicePrice + newTipAmount
      }
    }

    // Update appointment
    const { data: appointment, error } = await supabase
      .from('bookings')
      .update({
        ...updateData,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select(`
        *,
        client:users!appointments_client_id_fkey(id, name, email, phone),
        barber:users!appointments_barber_id_fkey(id, name, email),
        service:services(id, name, description, duration_minutes, price, category),
        barbershop:barbershops(id, name, address, phone)
      `)
      .single()

    if (error) {
      console.error('Error updating appointment:', error)
      return NextResponse.json({ error: 'Failed to update appointment' }, { status: 500 })
    }

    return NextResponse.json({
      message: 'Appointment updated successfully',
      appointment
    })

  } catch (error) {
    console.error('Unexpected error in PATCH /api/appointments/[id]:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE /api/appointments/[id] - Delete/Cancel appointment
export async function DELETE(request, { params }) {
  try {
    const supabase = createClient()
    const { id } = params
    
    // Get user session
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const hardDelete = searchParams.get('hard') === 'true'

    if (hardDelete) {
      // Permanently delete appointment
      const { error } = await supabase
        .from('bookings')
        .delete()
        .eq('id', id)

      if (error) {
        console.error('Error deleting appointment:', error)
        return NextResponse.json({ error: 'Failed to delete appointment' }, { status: 500 })
      }

      return NextResponse.json({
        message: 'Appointment deleted permanently'
      })
    } else {
      // Soft delete by marking as cancelled
      const { data: appointment, error } = await supabase
        .from('bookings')
        .update({
          status: 'CANCELLED',
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select(`
          *,
          client:users!appointments_client_id_fkey(id, name, email, phone),
          barber:users!appointments_barber_id_fkey(id, name, email),
          service:services(id, name, description, duration_minutes, price, category),
          barbershop:barbershops(id, name, address, phone)
        `)
        .single()

      if (error) {
        console.error('Error cancelling appointment:', error)
        return NextResponse.json({ error: 'Failed to cancel appointment' }, { status: 500 })
      }

      return NextResponse.json({
        message: 'Appointment cancelled successfully',
        appointment
      })
    }

  } catch (error) {
    console.error('Unexpected error in DELETE /api/appointments/[id]:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}