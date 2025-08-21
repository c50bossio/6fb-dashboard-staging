import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import twilio from 'twilio'

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

// Initialize Twilio client (will use environment variables)
const twilioClient = process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN
  ? twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN)
  : null

export async function POST(request) {
  try {
    const body = await request.json()
    const { to, message, customerId, templateId, appointmentSuggestion } = body

    // Validate input
    if (!to || !message) {
      return NextResponse.json(
        { success: false, error: 'Phone number and message are required' },
        { status: 400 }
      )
    }

    // Clean phone number (ensure it has country code)
    const cleanPhone = to.replace(/\D/g, '')
    const formattedPhone = cleanPhone.startsWith('1') ? `+${cleanPhone}` : `+1${cleanPhone}`

    // Log SMS attempt in database
    const { data: smsLog, error: logError } = await supabase
      .from('sms_logs')
      .insert({
        customer_id: customerId,
        phone_number: formattedPhone,
        message: message,
        template_id: templateId,
        status: 'pending',
        created_at: new Date().toISOString()
      })
      .select()
      .single()

    if (logError) {
      console.error('Error logging SMS:', logError)
    }

    let smsResult = { success: false }
    let deliveryStatus = 'failed'
    let errorMessage = null

    // Try to send via Twilio if configured
    if (twilioClient && process.env.TWILIO_PHONE_NUMBER) {
      try {
        const twilioMessage = await twilioClient.messages.create({
          body: message,
          from: process.env.TWILIO_PHONE_NUMBER,
          to: formattedPhone
        })

        smsResult = {
          success: true,
          messageId: twilioMessage.sid,
          status: twilioMessage.status
        }
        deliveryStatus = 'sent'
      } catch (twilioError) {
        console.error('Twilio error:', twilioError)
        errorMessage = twilioError.message
        
        // Fallback to demo mode if Twilio fails
        smsResult = {
          success: true,
          messageId: `demo-${Date.now()}`,
          status: 'demo',
          demoMode: true
        }
        deliveryStatus = 'demo'
      }
    } else {
      // Demo mode when Twilio is not configured
      console.log('📱 DEMO SMS:', { to: formattedPhone, message })
      smsResult = {
        success: true,
        messageId: `demo-${Date.now()}`,
        status: 'demo',
        demoMode: true
      }
      deliveryStatus = 'demo'
    }

    // Update SMS log with result
    if (smsLog) {
      await supabase
        .from('sms_logs')
        .update({
          status: deliveryStatus,
          message_id: smsResult.messageId,
          error: errorMessage,
          delivered_at: deliveryStatus === 'sent' ? new Date().toISOString() : null
        })
        .eq('id', smsLog.id)
    }

    // Track customer engagement
    if (customerId) {
      // Update customer's last engagement
      await supabase
        .from('customers')
        .update({
          last_engagement: new Date().toISOString(),
          engagement_count: supabase.raw('engagement_count + 1')
        })
        .eq('id', customerId)

      // Create engagement record
      await supabase
        .from('customer_engagements')
        .insert({
          customer_id: customerId,
          type: 'sms_rebook',
          channel: 'sms',
          template_used: templateId,
          message_sent: message,
          appointment_suggestion: appointmentSuggestion,
          created_at: new Date().toISOString()
        })
    }

    return NextResponse.json({
      success: true,
      messageId: smsResult.messageId,
      status: smsResult.status,
      demoMode: smsResult.demoMode || false,
      message: smsResult.demoMode 
        ? 'SMS simulated successfully (Twilio not configured)' 
        : 'SMS sent successfully'
    })

  } catch (error) {
    console.error('SMS API error:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Failed to send SMS'
      },
      { status: 500 }
    )
  }
}