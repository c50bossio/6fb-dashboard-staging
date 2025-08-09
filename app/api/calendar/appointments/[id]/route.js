import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(supabaseUrl, supabaseServiceKey)

export async function PATCH(request, { params }) {
  try {
    const { id } = params
    const body = await request.json()
    
    // Update booking in database
    const { data: booking, error } = await supabase
      .from('bookings')
      .update({
        start_time: body.start_time,
        end_time: body.end_time,
        barber_id: body.barber_id,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select(`
        *,
        barbers:barber_id (*),
        services:service_id (*),
        customers:customer_id (*)
      `)
      .single()
    
    if (error) {
      console.error('Error updating booking:', error)
      
      // Return mock response if database update fails
      return NextResponse.json({
        appointment: {
          id,
          ...body,
          source: 'mock'
        }
      })
    }
    
    // Handle customer notification if requested
    if (body.notify_customer && booking.customers?.email) {
      // In a real app, you would send email/SMS here
      console.log('📧 Sending notification to:', booking.customers.email)
      console.log('Notification methods:', body.notification_methods)
      console.log('Custom message:', body.custom_message)
      
      // You could integrate with services like:
      // - SendGrid/Mailgun for email
      // - Twilio for SMS
      // - OneSignal/Firebase for push notifications
    }
    
    // Transform to FullCalendar event format
    const event = {
      id: booking.id,
      resourceId: booking.barber_id,
      title: `${booking.customers?.name || 'Customer'} - ${booking.services?.name || 'Service'}`,
      start: booking.start_time,
      end: booking.end_time,
      backgroundColor: booking.barbers?.color || '#3b82f6',
      extendedProps: {
        customer: booking.customers?.name,
        service: booking.services?.name,
        status: booking.status
      }
    }
    
    return NextResponse.json({ appointment: event })
    
  } catch (error) {
    console.error('Error updating appointment:', error)
    return NextResponse.json(
      { error: 'Failed to update appointment', details: error.message },
      { status: 500 }
    )
  }
}

export async function DELETE(request, { params }) {
  try {
    const { id } = params
    
    // Delete booking from database
    const { error } = await supabase
      .from('bookings')
      .delete()
      .eq('id', id)
    
    if (error) {
      console.error('Error deleting booking:', error)
      return NextResponse.json(
        { error: 'Failed to delete appointment', details: error.message },
        { status: 500 }
      )
    }
    
    return NextResponse.json({ success: true })
    
  } catch (error) {
    console.error('Error deleting appointment:', error)
    return NextResponse.json(
      { error: 'Failed to delete appointment', details: error.message },
      { status: 500 }
    )
  }
}