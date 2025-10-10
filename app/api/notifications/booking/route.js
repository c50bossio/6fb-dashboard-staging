import { NextResponse } from 'next/server'
import { createClient } from '../../../../lib/supabase/client'
import { z } from 'zod'

export const runtime = 'edge'

// Validation schemas
const notificationSchema = z.object({
  type: z.enum(['confirmation', 'reminder', 'cancellation', 'reschedule']),
  booking_id: z.string().min(1),
  recipient_email: z.string().email().optional(),
  recipient_phone: z.string().optional(),
  custom_message: z.string().optional(),
  send_email: z.boolean().default(true),
  send_sms: z.boolean().default(false)
})

// POST /api/notifications/booking - Send booking notifications
export async function POST(request) {
  try {
    const supabase = createClient()
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    console.log('📧 Sending booking notification:', body)
    
    // Validate request body
    const validationResult = notificationSchema.safeParse(body)
    if (!validationResult.success) {
      return NextResponse.json({
        error: 'Validation failed',
        details: validationResult.error.errors
      }, { status: 400 })
    }

    const notificationData = validationResult.data

    // Get booking details
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select(`
        *,
        barber:profiles!bookings_barber_id_fkey(id, name, email),
        service:services(id, name, description, duration_minutes, price, category),
        barbershop:barbershops(id, name, address, phone, email)
      `)
      .eq('id', notificationData.booking_id)
      .single()

    if (bookingError || !booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
    }

    // Prepare notification content based on type
    const notificationContent = generateNotificationContent(
      notificationData.type, 
      booking, 
      notificationData.custom_message
    )

    const results = {
      email: { sent: false },
      sms: { sent: false }
    }

    // Send email notification
    if (notificationData.send_email) {
      const emailResult = await sendEmailNotification({
        to: notificationData.recipient_email || booking.client_email,
        subject: notificationContent.email.subject,
        template: notificationContent.email.template,
        data: notificationContent.email.data
      })
      results.email = emailResult
    }

    // Send SMS notification
    if (notificationData.send_sms && (notificationData.recipient_phone || booking.client_phone)) {
      const smsResult = await sendSMSNotification({
        to: notificationData.recipient_phone || booking.client_phone,
        message: notificationContent.sms.message
      })
      results.sms = smsResult
    }

    // Log the notification in database
    const { error: logError } = await supabase
      .from('notifications')
      .insert({
        booking_id: booking.id,
        type: notificationData.type,
        recipient_email: notificationData.recipient_email || booking.client_email,
        recipient_phone: notificationData.recipient_phone || booking.client_phone,
        email_sent: results.email.sent,
        sms_sent: results.sms.sent,
        content: notificationContent,
        sent_by: user.id,
        sent_at: new Date().toISOString()
      })

    if (logError) {
      console.error('Failed to log notification:', logError)
    }

    return NextResponse.json({
      success: true,
      results,
      message: 'Notifications sent successfully'
    })

  } catch (error) {
    console.error('Unexpected error sending notifications:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}

// GET /api/notifications/booking - Get notification templates
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type')

    const templates = {
      confirmation: {
        email: {
          subject: 'Booking Confirmation - {{serviceName}}',
          template: 'booking_confirmation'
        },
        sms: {
          template: 'Hi {{clientName}}! Your {{serviceName}} appointment is confirmed for {{appointmentDate}} at {{appointmentTime}}. See you soon!'
        }
      },
      reminder: {
        email: {
          subject: 'Appointment Reminder - Tomorrow',
          template: 'booking_reminder'
        },
        sms: {
          template: 'Reminder: You have a {{serviceName}} appointment tomorrow at {{appointmentTime}}. See you then!'
        }
      },
      cancellation: {
        email: {
          subject: 'Appointment Cancelled',
          template: 'booking_cancellation'
        },
        sms: {
          template: 'Your {{serviceName}} appointment scheduled for {{appointmentDate}} has been cancelled. Contact us to reschedule.'
        }
      },
      reschedule: {
        email: {
          subject: 'Appointment Rescheduled',
          template: 'booking_reschedule'
        },
        sms: {
          template: 'Your appointment has been rescheduled to {{appointmentDate}} at {{appointmentTime}}. See you then!'
        }
      }
    }

    if (type && templates[type]) {
      return NextResponse.json({
        success: true,
        template: templates[type]
      })
    }

    return NextResponse.json({
      success: true,
      templates
    })

  } catch (error) {
    console.error('Error fetching notification templates:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Helper functions
function generateNotificationContent(type, booking, customMessage) {
  const appointmentDate = new Date(booking.scheduled_at).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
  
  const appointmentTime = new Date(booking.scheduled_at).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  })

  const baseData = {
    clientName: booking.client_name,
    serviceName: booking.service?.name || 'Service',
    appointmentDate,
    appointmentTime,
    barberName: booking.barber?.name || 'Your barber',
    barbershopName: booking.barbershop?.name || 'Our location',
    barbershopAddress: booking.barbershop?.address,
    barbershopPhone: booking.barbershop?.phone,
    totalAmount: booking.total_amount,
    duration: booking.duration_minutes
  }

  const templates = {
    confirmation: {
      email: {
        subject: `Booking Confirmed - ${baseData.serviceName}`,
        template: 'booking_confirmation',
        data: {
          ...baseData,
          customMessage,
          bookingId: booking.id
        }
      },
      sms: {
        message: customMessage || 
          `Hi ${baseData.clientName}! Your ${baseData.serviceName} appointment is confirmed for ${appointmentDate} at ${appointmentTime} with ${baseData.barberName}. See you soon!`
      }
    },
    reminder: {
      email: {
        subject: 'Appointment Reminder - Tomorrow',
        template: 'booking_reminder',
        data: baseData
      },
      sms: {
        message: customMessage || 
          `Reminder: You have a ${baseData.serviceName} appointment tomorrow at ${appointmentTime} with ${baseData.barberName}. See you then!`
      }
    },
    cancellation: {
      email: {
        subject: 'Appointment Cancelled',
        template: 'booking_cancellation',
        data: baseData
      },
      sms: {
        message: customMessage || 
          `Your ${baseData.serviceName} appointment scheduled for ${appointmentDate} has been cancelled. Contact us at ${baseData.barbershopPhone} to reschedule.`
      }
    },
    reschedule: {
      email: {
        subject: 'Appointment Rescheduled',
        template: 'booking_reschedule',
        data: baseData
      },
      sms: {
        message: customMessage || 
          `Your appointment has been rescheduled to ${appointmentDate} at ${appointmentTime}. See you then!`
      }
    }
  }

  return templates[type] || templates.confirmation
}

async function sendEmailNotification(emailData) {
  try {
    // In a real implementation, this would integrate with an email service
    // like SendGrid, AWS SES, or Mailgun
    console.log('📧 Sending email notification:', emailData)
    
    // Simulate email sending
    return {
      sent: true,
      provider: 'mock',
      messageId: `email_${Date.now()}`,
      timestamp: new Date().toISOString()
    }
  } catch (error) {
    console.error('Email sending failed:', error)
    return {
      sent: false,
      error: error.message
    }
  }
}

async function sendSMSNotification(smsData) {
  try {
    // In a real implementation, this would integrate with an SMS service
    // like Twilio, AWS SNS, or similar
    console.log('📱 Sending SMS notification:', smsData)
    
    // Simulate SMS sending
    return {
      sent: true,
      provider: 'mock',
      messageId: `sms_${Date.now()}`,
      timestamp: new Date().toISOString()
    }
  } catch (error) {
    console.error('SMS sending failed:', error)
    return {
      sent: false,
      error: error.message
    }
  }
}