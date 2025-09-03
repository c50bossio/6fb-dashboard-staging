import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

// Inline phone utilities to fix module resolution issue
function normalizePhoneForTwilio(phoneNumber, defaultCountryCode = 'US') {
  if (!phoneNumber) return null
  
  // Remove all non-numeric characters
  let digits = phoneNumber.replace(/[^\d]/g, '')
  
  if (!digits) return null
  
  // Handle US/Canada phone numbers
  if (digits.length === 10) {
    // Standard 10-digit US number, add +1
    return `+1${digits}`
  } else if (digits.length === 11 && digits.startsWith('1')) {
    // 11-digit number starting with 1, add +
    return `+${digits}`
  } else if (digits.length === 11 && !digits.startsWith('1')) {
    // Assume first digit is country code
    return `+${digits}`
  } else if (digits.length > 11) {
    // International number, add + if not present
    return phoneNumber.startsWith('+') ? phoneNumber : `+${digits}`
  }
  
  // Fallback: if we can't determine format, try adding +1 for US
  if (digits.length === 10) {
    return `+1${digits}`
  }
  
  return phoneNumber.startsWith('+') ? phoneNumber : `+${digits}`
}

function validatePhoneNumber(phoneNumber) {
  if (!phoneNumber) {
    return { isValid: false, error: 'Phone number is required' }
  }
  
  const digits = phoneNumber.replace(/[^\d]/g, '')
  
  if (digits.length < 10) {
    return { isValid: false, error: 'Phone number must be at least 10 digits' }
  }
  
  if (digits.length > 15) {
    return { isValid: false, error: 'Phone number cannot exceed 15 digits' }
  }
  
  return { isValid: true, error: null }
}

function isSMSCapable(phoneNumber) {
  const normalized = normalizePhoneForTwilio(phoneNumber)
  if (!normalized) return false
  
  // Twilio supports SMS for most mobile numbers
  return normalized.startsWith('+') && normalized.length >= 12
}

export async function POST(request) {
  try {
    const body = await request.json()
    const { type, appointment_id, customer_name, barber_id, barbershop_id, message, phone, email } = body

    if (!type) {
      return NextResponse.json({
        success: false,
        error: 'Notification type is required'
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

    // Get barbershop notification settings
    const { data: barbershop, error: barbershopError } = await supabase
      .from('barbershops')
      .select('id, name, notification_settings, business_phone, email')
      .eq('id', barbershop_id)
      .single()

    if (barbershopError) {
      console.warn('Barbershop lookup error:', barbershopError, 'for ID:', barbershop_id)
    }

    const notificationSettings = barbershop?.notification_settings || {}
    
    // Process different notification types
    const results = []

    switch (type) {
      case 'customer_checked_in':
        await handleCustomerCheckedIn({
          supabase,
          appointment_id,
          customer_name,
          barber_id,
          barbershop,
          notificationSettings,
          results
        })
        break

      case 'appointment_reminder':
        await handleAppointmentReminder({
          supabase,
          appointment_id,
          customer_name,
          phone,
          email,
          barbershop,
          notificationSettings,
          results
        })
        break

      case 'appointment_confirmed':
        await handleAppointmentConfirmed({
          supabase,
          appointment_id,
          customer_name,
          phone,
          email,
          barbershop,
          notificationSettings,
          results
        })
        break

      case 'custom_message':
        await handleCustomMessage({
          message,
          phone,
          email,
          barbershop,
          results
        })
        break

      case 'walk_in_added':
        await handleWalkInAdded({
          supabase,
          customer_name,
          phone,
          queue_position: body.queue_position,
          estimated_wait: body.estimated_wait,
          appointment_id,
          barbershop,
          notificationSettings,
          results
        })
        break

      case 'queue_update':
        await handleQueueUpdate({
          message,
          phone,
          email,
          barbershop,
          results
        })
        break

      case 'walk_in_status_update':
        await handleWalkInStatusUpdate({
          message,
          phone,
          email,
          barbershop,
          results
        })
        break

      default:
        throw new Error(`Unknown notification type: ${type}`)
    }

    // Log notification attempts for tracking
    try {
      await supabase
        .from('notification_logs')
        .insert({
          barbershop_id,
          appointment_id,
          type,
          results: results,
          created_at: new Date().toISOString()
        })
    } catch (logError) {
      console.warn('Failed to log notification:', logError)
      // Don't fail the notification if logging fails
    }

    return NextResponse.json({
      success: true,
      results,
      message: 'Notifications processed'
    })

  } catch (error) {
    console.error('Notification API error:', error)
    return NextResponse.json({
      success: false,
      error: error.message || 'Internal server error'
    }, { status: 500 })
  }
}

async function handleCustomerCheckedIn({ supabase, appointment_id, customer_name, barber_id, barbershop, notificationSettings, results }) {
  // Notify barber about customer check-in
  if (notificationSettings.check_in_alerts !== false && barber_id) {
    try {
      const { data: barber } = await supabase
        .from('profiles')
        .select('phone, email, full_name')
        .eq('id', barber_id)
        .single()

      if (barber?.phone) {
        const message = `${customer_name} has checked in for their appointment. Ready when you are! 💈`
        await sendSMS(barber.phone, message)
        results.push({ type: 'sms', recipient: 'barber', status: 'sent' })
      }

      // Optional: Send push notification if implemented
      // await sendPushNotification(barber_id, { title: 'Customer Checked In', body: `${customer_name} is ready` })
      
    } catch (error) {
      console.error('Error notifying barber:', error)
      results.push({ type: 'barber_notification', status: 'failed', error: error.message })
    }
  }
}

async function handleAppointmentReminder({ supabase, appointment_id, customer_name, phone, email, barbershop, notificationSettings, results }) {
  // Get appointment details
  const { data: appointment } = await supabase
    .from('appointments')
    .select('date, start_time, service_name, barber_name')
    .eq('id', appointment_id)
    .single()

  if (!appointment) {
    throw new Error('Appointment not found')
  }

  const appointmentTime = new Date(`${appointment.date} ${appointment.start_time}`).toLocaleTimeString([], {
    hour: 'numeric',
    minute: '2-digit'
  })

  // Send SMS reminder
  if (notificationSettings.sms_reminders !== false && phone) {
    try {
      const message = `Hi ${customer_name}! Reminder: You have an appointment for ${appointment.service_name} tomorrow at ${appointmentTime} with ${appointment.barber_name}. See you then! 💈 - ${barbershop?.name || 'Your Barber'}`
      await sendSMS(phone, message)
      results.push({ type: 'sms', recipient: 'customer', status: 'sent' })
    } catch (error) {
      console.error('Error sending SMS reminder:', error)
      results.push({ type: 'sms', status: 'failed', error: error.message })
    }
  }

  // Send email reminder  
  if (notificationSettings.email_reminders !== false && email) {
    try {
      const emailContent = {
        to: email,
        subject: `Appointment Reminder - ${barbershop?.name || 'Your Barber'}`,
        html: generateReminderEmail(customer_name, appointment, barbershop)
      }
      await sendEmail(emailContent)
      results.push({ type: 'email', recipient: 'customer', status: 'sent' })
    } catch (error) {
      console.error('Error sending email reminder:', error)
      results.push({ type: 'email', status: 'failed', error: error.message })
    }
  }
}

async function handleAppointmentConfirmed({ appointment_id, customer_name, phone, email, barbershop, notificationSettings, results }) {
  // Send confirmation SMS
  if (notificationSettings.confirmation_sms !== false && phone) {
    try {
      const message = `✅ Appointment confirmed! We'll see you soon, ${customer_name}. Reply STOP to opt out. - ${barbershop?.name || 'Your Barber'}`
      await sendSMS(phone, message)
      results.push({ type: 'sms', recipient: 'customer', status: 'sent' })
    } catch (error) {
      console.error('Error sending confirmation SMS:', error)
      results.push({ type: 'sms', status: 'failed', error: error.message })
    }
  }
}

async function handleCustomMessage({ message, phone, email, barbershop, results }) {
  // Send custom SMS
  if (phone && message) {
    try {
      await sendSMS(phone, `${message} - ${barbershop?.name || 'Your Barber'}`)
      results.push({ type: 'sms', recipient: 'custom', status: 'sent' })
    } catch (error) {
      console.error('Error sending custom SMS:', error)
      results.push({ type: 'sms', status: 'failed', error: error.message })
    }
  }

  // Send custom email
  if (email && message) {
    try {
      const emailContent = {
        to: email,
        subject: `Message from ${barbershop?.name || 'Your Barber'}`,
        html: `<p>${message}</p><br><p>Best regards,<br>${barbershop?.name || 'Your Barber'}</p>`
      }
      await sendEmail(emailContent)
      results.push({ type: 'email', recipient: 'custom', status: 'sent' })
    } catch (error) {
      console.error('Error sending custom email:', error)
      results.push({ type: 'email', status: 'failed', error: error.message })
    }
  }
}

async function handleWalkInAdded({ supabase, customer_name, phone, queue_position, estimated_wait, appointment_id, barbershop, notificationSettings, results }) {
  // Send welcome SMS to walk-in customer
  if (phone && notificationSettings.walk_in_notifications !== false) {
    try {
      const businessName = barbershop?.name || 'Your Barbershop'
      const message = `Welcome to ${businessName}! 👋\n\nYou're #${queue_position} in line\nEstimated wait: ${estimated_wait} minutes\n\nWe'll text you when you're next!\n\nTrack status: ${process.env.NEXT_PUBLIC_BASE_URL || 'https://app.bookedbarber.com'}/walk-in-status/${appointment_id}`
      
      await sendSMS(phone, message)
      results.push({ type: 'sms', recipient: 'customer', status: 'sent', queue_position, estimated_wait })
      
      console.log(`Walk-in welcome SMS sent to ${customer_name} at ${phone}`)
    } catch (error) {
      console.error('Error sending walk-in welcome SMS:', error)
      results.push({ type: 'sms', recipient: 'customer', status: 'failed', error: error.message })
    }
  }
  
  // Optional: Send welcome email if email address is available
  // This could be extended to collect email during walk-in check-in
}

async function handleQueueUpdate({ message, phone, email, barbershop, results }) {
  // Send queue update SMS
  if (phone && message) {
    try {
      const smsResult = await sendSMS(phone, `${message} - ${barbershop?.name || 'Your Barber'}`)
      results.push({ 
        type: 'sms', 
        recipient: 'customer', 
        status: 'sent',
        phone: phone,
        message_sid: smsResult.sid,
        details: `SMS sent successfully to ${phone}`
      })
    } catch (error) {
      console.error('Error sending queue update SMS:', error)
      results.push({ 
        type: 'sms', 
        status: 'failed', 
        error: error.message,
        phone: phone,
        details: `Failed to send SMS to ${phone}: ${error.message}`
      })
    }
  }

  // Send queue update email if provided
  if (email && message) {
    try {
      const emailContent = {
        to: email,
        subject: `Queue Update - ${barbershop?.name || 'Your Barber'}`,
        html: `<p>${message}</p><br><p>Best regards,<br>${barbershop?.name || 'Your Barber'}</p>`
      }
      await sendEmail(emailContent)
      results.push({ type: 'email', recipient: 'customer', status: 'sent' })
    } catch (error) {
      console.error('Error sending queue update email:', error)
      results.push({ type: 'email', status: 'failed', error: error.message })
    }
  }
}

async function handleWalkInStatusUpdate({ message, phone, email, barbershop, results }) {
  // Send walk-in status update SMS
  if (phone && message) {
    try {
      const smsResult = await sendSMS(phone, `${message} - ${barbershop?.name || 'Your Barber'}`)
      results.push({ 
        type: 'sms', 
        recipient: 'customer', 
        status: 'sent',
        phone: phone,
        message_sid: smsResult.sid,
        details: `SMS sent successfully to ${phone}`
      })
    } catch (error) {
      console.error('Error sending walk-in status SMS:', error)
      results.push({ 
        type: 'sms', 
        status: 'failed', 
        error: error.message,
        phone: phone,
        details: `Failed to send SMS to ${phone}: ${error.message}`
      })
    }
  }

  // Send walk-in status email if provided
  if (email && message) {
    try {
      const emailContent = {
        to: email,
        subject: `Service Update - ${barbershop?.name || 'Your Barber'}`,
        html: `<p>${message}</p><br><p>Best regards,<br>${barbershop?.name || 'Your Barber'}</p>`
      }
      await sendEmail(emailContent)
      results.push({ type: 'email', recipient: 'customer', status: 'sent' })
    } catch (error) {
      console.error('Error sending walk-in status email:', error)
      results.push({ type: 'email', status: 'failed', error: error.message })
    }
  }
}

async function sendSMS(phone, message) {
  const twilioSid = process.env.TWILIO_ACCOUNT_SID
  const twilioToken = process.env.TWILIO_AUTH_TOKEN
  const twilioFrom = process.env.TWILIO_FROM_NUMBER

  if (!twilioSid || !twilioToken || !twilioFrom) {
    const error = 'Twilio credentials not configured in environment variables'
    console.warn(error)
    throw new Error(error)
  }

  // Validate phone number format
  const phoneValidation = validatePhoneNumber(phone)
  if (!phoneValidation.isValid) {
    throw new Error(`Invalid phone number: ${phoneValidation.error}`)
  }

  // Normalize phone number for Twilio (add country code if missing)
  const normalizedPhone = normalizePhoneForTwilio(phone)
  if (!normalizedPhone) {
    throw new Error('Unable to format phone number for SMS delivery')
  }

  // Check if number is SMS capable
  if (!isSMSCapable(normalizedPhone)) {
    throw new Error('Phone number is not capable of receiving SMS messages')
  }

  console.log(`[SMS] Sending to normalized phone: ${normalizedPhone} (original: ${phone})`)

  const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${twilioSid}/Messages.json`, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${Buffer.from(`${twilioSid}:${twilioToken}`).toString('base64')}`,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: new URLSearchParams({
      From: twilioFrom,
      To: normalizedPhone, // Use normalized phone number
      Body: message
    })
  })

  if (!response.ok) {
    let errorDetails = 'Unknown Twilio error'
    try {
      const errorResponse = await response.json()
      // Extract meaningful error information from Twilio
      if (errorResponse.message) {
        errorDetails = errorResponse.message
      } else if (errorResponse.more_info) {
        errorDetails = `Twilio Error: ${errorResponse.more_info}`
      } else {
        errorDetails = await response.text()
      }
    } catch (parseError) {
      errorDetails = await response.text()
    }
    
    console.error(`[SMS] Twilio API error for ${normalizedPhone}:`, errorDetails)
    throw new Error(`SMS delivery failed: ${errorDetails}`)
  }

  const result = await response.json()
  console.log(`[SMS] Successfully sent to ${normalizedPhone}, SID: ${result.sid}`)
  
  return result
}

async function sendEmail(emailContent) {
  const sendgridKey = process.env.SENDGRID_API_KEY
  const fromEmail = process.env.SENDGRID_FROM_EMAIL || 'noreply@bookedbarber.com'

  if (!sendgridKey) {
    console.warn('SendGrid not configured, skipping email')
    return
  }

  const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${sendgridKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      personalizations: [{ to: [{ email: emailContent.to }] }],
      from: { email: fromEmail, name: 'BookedBarber' },
      subject: emailContent.subject,
      content: [{ type: 'text/html', value: emailContent.html }]
    })
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Email failed: ${error}`)
  }
}

function generateReminderEmail(customerName, appointment, barbershop) {
  const appointmentDate = new Date(appointment.date).toLocaleDateString()
  const appointmentTime = new Date(`${appointment.date} ${appointment.start_time}`).toLocaleTimeString([], {
    hour: 'numeric',
    minute: '2-digit'
  })

  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #333;">Appointment Reminder</h2>
      <p>Hi ${customerName},</p>
      <p>This is a friendly reminder about your upcoming appointment:</p>
      
      <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <p><strong>Service:</strong> ${appointment.service_name}</p>
        <p><strong>Date:</strong> ${appointmentDate}</p>
        <p><strong>Time:</strong> ${appointmentTime}</p>
        <p><strong>Barber:</strong> ${appointment.barber_name}</p>
      </div>
      
      <p>We look forward to seeing you!</p>
      <p>Best regards,<br>${barbershop?.name || 'Your Barber'}</p>
      
      <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
      <p style="font-size: 12px; color: #666;">
        Need to reschedule? Please call us as soon as possible.
      </p>
    </div>
  `
}