import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { twilioSMSService } from '@/services/twilio-service'

export const runtime = 'nodejs'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

/**
 * POST /api/webhooks/twilio
 * Handle Twilio webhooks for SMS status updates and incoming messages
 */
export async function POST(request) {
  try {
    const formData = await request.formData()
    const webhookData = Object.fromEntries(formData.entries())
    
    // Log webhook for debugging
    console.log('📱 Twilio webhook received:', {
      type: webhookData.MessageStatus ? 'status_update' : 'incoming_message',
      from: webhookData.From,
      to: webhookData.To,
      status: webhookData.MessageStatus,
      timestamp: new Date().toISOString()
    })

    // Handle SMS status updates
    if (webhookData.MessageStatus) {
      await handleSMSStatusUpdate(webhookData)
    }
    
    // Handle incoming SMS messages
    if (webhookData.Body) {
      await handleIncomingSMS(webhookData)
    }

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('❌ Twilio webhook error:', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}

/**
 * Handle SMS delivery status updates
 */
async function handleSMSStatusUpdate(webhookData) {
  try {
    const {
      MessageSid: messageSid,
      MessageStatus: status,
      ErrorCode: errorCode,
      ErrorMessage: errorMessage,
      From: from,
      To: to
    } = webhookData

    // Update SMS record in database
    const { error: updateError } = await supabase
      .from('sms_records')
      .update({
        status,
        error_code: errorCode || null,
        error_message: errorMessage || null,
        delivery_updated_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('message_sid', messageSid)

    if (updateError) {
      console.error('Failed to update SMS status:', updateError)
      return
    }

    // If delivered, update campaign analytics
    if (status === 'delivered') {
      await updateCampaignDeliveryCount(messageSid)
    }

    // If failed, log for analysis
    if (status === 'failed' || status === 'undelivered') {
      await logFailedSMS(messageSid, errorCode, errorMessage, from, to)
    }

    console.log(`📱 SMS ${messageSid} status updated to: ${status}`)

  } catch (error) {
    console.error('Error handling SMS status update:', error)
    throw error
  }
}

/**
 * Handle incoming SMS messages (opt-in/opt-out, customer replies)
 */
async function handleIncomingSMS(webhookData) {
  try {
    const {
      From: fromPhone,
      To: toPhone,
      Body: messageBody,
      MessageSid: messageSid
    } = webhookData

    // Clean phone number (remove +1, etc.)
    const cleanPhone = fromPhone.replace(/^\+?1?/, '')

    // Store incoming message
    const { error: storeError } = await supabase
      .from('incoming_sms')
      .insert({
        phone: cleanPhone,
        from_number: fromPhone,
        to_number: toPhone,
        message_body: messageBody,
        message_sid: messageSid,
        processed_at: new Date().toISOString(),
        created_at: new Date().toISOString()
      })

    if (storeError) {
      console.error('Failed to store incoming SMS:', storeError)
    }

    // Handle opt-out keywords
    const message = messageBody.trim().toLowerCase()
    const optOutKeywords = ['stop', 'stopall', 'unsubscribe', 'cancel', 'end', 'quit']
    const optInKeywords = ['start', 'yes', 'subscribe', 'unstop']

    if (optOutKeywords.some(keyword => message.includes(keyword))) {
      await processOptOut(cleanPhone, fromPhone)
      await sendOptOutConfirmation(fromPhone)
      return
    }

    if (optInKeywords.some(keyword => message.includes(keyword))) {
      await processOptIn(cleanPhone, fromPhone)
      await sendOptInConfirmation(fromPhone)
      return
    }

    // Check if this is a reply to a specific campaign
    await processCampaignReply(cleanPhone, messageBody, messageSid)

    console.log(`📱 Incoming SMS processed from ${fromPhone}: ${messageBody.substring(0, 50)}...`)

  } catch (error) {
    console.error('Error handling incoming SMS:', error)
    throw error
  }
}

/**
 * Update campaign delivery count
 */
async function updateCampaignDeliveryCount(messageSid) {
  try {
    // Get campaign ID from SMS record
    const { data: smsRecord } = await supabase
      .from('sms_records')
      .select('campaign_id')
      .eq('message_sid', messageSid)
      .single()

    if (!smsRecord?.campaign_id) {
      return
    }

    // Increment delivered count
    const { error } = await supabase.rpc('increment_sms_delivered', {
      campaign_id: smsRecord.campaign_id
    })

    if (error) {
      console.error('Failed to increment delivery count:', error)
    }

  } catch (error) {
    console.error('Error updating campaign delivery count:', error)
  }
}

/**
 * Log failed SMS for analysis
 */
async function logFailedSMS(messageSid, errorCode, errorMessage, from, to) {
  try {
    await supabase
      .from('sms_failures')
      .insert({
        message_sid: messageSid,
        error_code: errorCode,
        error_message: errorMessage,
        from_number: from,
        to_number: to,
        failed_at: new Date().toISOString()
      })

  } catch (error) {
    console.error('Error logging failed SMS:', error)
  }
}

/**
 * Process customer opt-out
 */
async function processOptOut(phone, fullPhone) {
  try {
    // Update customer opt-in status
    const { error: customerError } = await supabase
      .from('customers')
      .update({
        sms_opt_in: false,
        sms_opt_out_date: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('phone', phone)

    if (customerError) {
      console.error('Failed to update customer opt-out:', customerError)
    }

    // Log opt-out activity
    await supabase
      .from('customer_activity')
      .insert({
        phone: phone,
        activity_type: 'sms_opt_out',
        activity_data: { 
          method: 'sms_reply',
          full_phone: fullPhone
        },
        created_at: new Date().toISOString()
      })

    console.log(`📱 Customer ${phone} opted out via SMS`)

  } catch (error) {
    console.error('Error processing opt-out:', error)
  }
}

/**
 * Process customer opt-in
 */
async function processOptIn(phone, fullPhone) {
  try {
    // Update customer opt-in status
    const { error: customerError } = await supabase
      .from('customers')
      .update({
        sms_opt_in: true,
        sms_opt_in_date: new Date().toISOString(),
        sms_opt_out_date: null,
        updated_at: new Date().toISOString()
      })
      .eq('phone', phone)

    if (customerError) {
      console.error('Failed to update customer opt-in:', customerError)
    }

    // Log opt-in activity
    await supabase
      .from('customer_activity')
      .insert({
        phone: phone,
        activity_type: 'sms_opt_in',
        activity_data: { 
          method: 'sms_reply',
          full_phone: fullPhone
        },
        created_at: new Date().toISOString()
      })

    console.log(`📱 Customer ${phone} opted in via SMS`)

  } catch (error) {
    console.error('Error processing opt-in:', error)
  }
}

/**
 * Send opt-out confirmation
 */
async function sendOptOutConfirmation(toPhone) {
  try {
    if (!twilioSMSService.isInitialized) {
      console.log('📱 Twilio not initialized, skipping opt-out confirmation')
      return
    }

    await twilioSMSService.sendSMS({
      to: toPhone,
      message: 'You have been unsubscribed from SMS notifications. Reply START to opt back in.'
    })

  } catch (error) {
    console.error('Error sending opt-out confirmation:', error)
  }
}

/**
 * Send opt-in confirmation
 */
async function sendOptInConfirmation(toPhone) {
  try {
    if (!twilioSMSService.isInitialized) {
      console.log('📱 Twilio not initialized, skipping opt-in confirmation')
      return
    }

    await twilioSMSService.sendSMS({
      to: toPhone,
      message: 'You have been subscribed to SMS notifications. Reply STOP to unsubscribe.'
    })

  } catch (error) {
    console.error('Error sending opt-in confirmation:', error)
  }
}

/**
 * Process campaign reply
 */
async function processCampaignReply(phone, messageBody, messageSid) {
  try {
    // Find recent campaigns sent to this customer
    const { data: recentSMS } = await supabase
      .from('sms_records')
      .select('campaign_id, sent_at')
      .eq('phone', phone)
      .gte('sent_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()) // Last 7 days
      .order('sent_at', { ascending: false })
      .limit(1)

    if (recentSMS && recentSMS.length > 0) {
      // Store as campaign reply
      await supabase
        .from('campaign_replies')
        .insert({
          campaign_id: recentSMS[0].campaign_id,
          customer_phone: phone,
          reply_message: messageBody,
          reply_message_sid: messageSid,
          replied_at: new Date().toISOString()
        })

      console.log(`📱 Campaign reply logged for campaign ${recentSMS[0].campaign_id}`)
    }

  } catch (error) {
    console.error('Error processing campaign reply:', error)
  }
}