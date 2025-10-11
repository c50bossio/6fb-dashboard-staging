import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * POST /api/appointments/send-reminder
 *
 * Sends a reminder notification to customer about their upcoming appointment
 *
 * Request body:
 * - appointment_id: UUID of the appointment
 * - customer_name: Name of the customer
 * - customer_phone: Customer phone number (for SMS)
 * - customer_email: Customer email (for email reminder)
 * - appointment_time: ISO datetime string
 */
export async function POST(request) {
  try {
    const supabase = await createClient()

    // Get user session
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const {
      appointment_id,
      customer_name,
      customer_phone,
      customer_email,
      appointment_time
    } = body

    // Validate required fields
    if (!appointment_id) {
      return NextResponse.json(
        { error: 'Appointment ID is required' },
        { status: 400 }
      )
    }

    if (!customer_name || !appointment_time) {
      return NextResponse.json(
        { error: 'Customer name and appointment time are required' },
        { status: 400 }
      )
    }

    if (!customer_phone && !customer_email) {
      return NextResponse.json(
        { error: 'Either customer phone or email is required' },
        { status: 400 }
      )
    }

    // Verify appointment exists
    const { data: appointment, error: fetchError } = await supabase
      .from('appointments')
      .select('id, barbershop_id, barber_id, service_id, status')
      .eq('id', appointment_id)
      .single()

    if (fetchError || !appointment) {
      return NextResponse.json(
        { error: 'Appointment not found' },
        { status: 404 }
      )
    }

    // Don't send reminders for cancelled or completed appointments
    if (['CANCELLED', 'COMPLETED', 'NO_SHOW'].includes(appointment.status?.toUpperCase())) {
      return NextResponse.json(
        { error: `Cannot send reminder for ${appointment.status} appointment` },
        { status: 400 }
      )
    }

    // Get barbershop info for reminder content
    const { data: barbershop } = await supabase
      .from('barbershops')
      .select('name, address, phone')
      .eq('id', appointment.barbershop_id)
      .single()

    // Get service info
    const { data: service } = await supabase
      .from('services')
      .select('name, duration_minutes')
      .eq('id', appointment.service_id)
      .single()

    // Format appointment time for display
    const appointmentDate = new Date(appointment_time)
    const formattedTime = appointmentDate.toLocaleString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    })

    // Prepare reminder content
    const reminderMessage = `Hi ${customer_name}, this is a reminder about your appointment at ${barbershop?.name || 'our barbershop'} on ${formattedTime} for ${service?.name || 'your service'}. See you soon!`

    const channels = []

    // Send SMS reminder if phone number provided
    if (customer_phone) {
      try {
        // TODO: Integrate with SMS service (Twilio, etc.)
        // For now, create a notification record
        const { error: smsError } = await supabase
          .from('notifications')
          .insert({
            user_id: user.id,
            type: 'appointment_reminder',
            channel: 'sms',
            recipient: customer_phone,
            subject: 'Appointment Reminder',
            message: reminderMessage,
            metadata: {
              appointment_id,
              barbershop_id: appointment.barbershop_id
            },
            status: 'pending',
            created_at: new Date().toISOString()
          })

        if (!smsError) {
          channels.push('SMS')
        }
      } catch (smsError) {
        console.warn('Failed to queue SMS reminder:', smsError)
      }
    }

    // Send email reminder if email provided
    if (customer_email) {
      try {
        // TODO: Integrate with email service (SendGrid, etc.)
        // For now, create a notification record
        const { error: emailError } = await supabase
          .from('notifications')
          .insert({
            user_id: user.id,
            type: 'appointment_reminder',
            channel: 'email',
            recipient: customer_email,
            subject: `Appointment Reminder - ${barbershop?.name || 'Barbershop'}`,
            message: reminderMessage,
            metadata: {
              appointment_id,
              barbershop_id: appointment.barbershop_id,
              appointment_time: appointment_time,
              service_name: service?.name,
              barbershop_name: barbershop?.name,
              barbershop_address: barbershop?.address
            },
            status: 'pending',
            created_at: new Date().toISOString()
          })

        if (!emailError) {
          channels.push('Email')
        }
      } catch (emailError) {
        console.warn('Failed to queue email reminder:', emailError)
      }
    }

    if (channels.length === 0) {
      return NextResponse.json(
        { error: 'Failed to send reminder through any channel' },
        { status: 500 }
      )
    }

    // Update appointment with last_reminder_sent timestamp
    await supabase
      .from('appointments')
      .update({
        last_reminder_sent: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', appointment_id)

    return NextResponse.json({
      success: true,
      message: `Reminder sent via ${channels.join(' and ')}`,
      channels,
      appointment_id
    })

  } catch (error) {
    console.error('Send reminder API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
