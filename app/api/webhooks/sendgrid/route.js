import crypto from 'crypto'
import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export const runtime = 'nodejs'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

/**
 * POST /api/webhooks/sendgrid
 * Handle SendGrid webhooks for email events (delivery, opens, clicks, etc.)
 */
export async function POST(request) {
  try {
    const body = await request.text()
    const signature = request.headers.get('x-twilio-email-event-webhook-signature')
    
    // Verify webhook signature if configured
    if (process.env.SENDGRID_WEBHOOK_SECRET && signature) {
      const isValid = verifyWebhookSignature(body, signature)
      if (!isValid) {
        console.error('❌ SendGrid webhook signature verification failed')
        return NextResponse.json(
          { error: 'Webhook signature verification failed' },
          { status: 401 }
        )
      }
    }

    // Parse events (SendGrid sends an array of events)
    const events = JSON.parse(body)
    
    if (!Array.isArray(events)) {
      return NextResponse.json(
        { error: 'Invalid webhook payload - expected array of events' },
        { status: 400 }
      )
    }

    console.log(`📧 SendGrid webhook received ${events.length} events`)

    // Process each event
    for (const event of events) {
      await processEmailEvent(event)
    }

    return NextResponse.json({ 
      success: true, 
      processed: events.length 
    })

  } catch (error) {
    console.error('❌ SendGrid webhook error:', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}

/**
 * Verify SendGrid webhook signature
 */
function verifyWebhookSignature(body, signature) {
  try {
    const secret = process.env.SENDGRID_WEBHOOK_SECRET
    if (!secret) return true // Skip verification if no secret configured

    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(body)
      .digest('base64')

    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    )

  } catch (error) {
    console.error('Error verifying webhook signature:', error)
    return false
  }
}

/**
 * Process individual email event
 */
async function processEmailEvent(event) {
  try {
    const {
      event: eventType,
      email,
      timestamp,
      sg_message_id,
      sg_event_id,
      campaign_id,
      barbershop_id,
      recipient_id,
      url,
      useragent,
      ip,
      reason,
      status,
      response,
      attempt
    } = event

    // Log event for debugging
    console.log(`📧 Processing ${eventType} event for ${email}`)

    // Store email event in database
    const { error: eventError } = await supabase
      .from('email_events')
      .insert({
        event_type: eventType,
        email: email,
        sg_message_id: sg_message_id,
        sg_event_id: sg_event_id,
        campaign_id: campaign_id || null,
        barbershop_id: barbershop_id || null,
        recipient_id: recipient_id || null,
        timestamp: new Date(timestamp * 1000).toISOString(),
        url: url || null,
        user_agent: useragent || null,
        ip_address: ip || null,
        reason: reason || null,
        status: status || null,
        response: response || null,
        attempt_count: attempt || null,
        created_at: new Date().toISOString()
      })

    if (eventError) {
      console.error('Failed to store email event:', eventError)
    }

    // Handle specific event types
    switch (eventType) {
      case 'delivered':
        await handleEmailDelivered(event)
        break
      
      case 'open':
        await handleEmailOpened(event)
        break
      
      case 'click':
        await handleEmailClicked(event)
        break
      
      case 'bounce':
      case 'blocked':
      case 'dropped':
        await handleEmailFailed(event)
        break
      
      case 'unsubscribe':
      case 'spamreport':
        await handleEmailUnsubscribe(event)
        break
      
      case 'group_unsubscribe':
        await handleGroupUnsubscribe(event)
        break
      
      case 'group_resubscribe':
        await handleGroupResubscribe(event)
        break
      
      default:
        console.log(`📧 Unhandled event type: ${eventType}`)
    }

    // Update campaign analytics if campaign_id is present
    if (campaign_id) {
      await updateCampaignAnalytics(campaign_id, eventType)
    }

  } catch (error) {
    console.error('Error processing email event:', error)
  }
}

/**
 * Handle successful email delivery
 */
async function handleEmailDelivered(event) {
  try {
    const { email, campaign_id } = event

    // Update customer email status
    await supabase
      .from('customers')
      .update({
        last_email_delivered_at: new Date().toISOString(),
        email_delivery_status: 'delivered'
      })
      .eq('email', email)

    // Update campaign record if exists
    if (campaign_id) {
      await supabase
        .from('email_records')
        .update({
          delivery_status: 'delivered',
          delivered_at: new Date().toISOString()
        })
        .eq('campaign_id', campaign_id)
        .eq('recipient_email', email)
    }

    console.log(`📧 Email delivered to ${email}`)

  } catch (error) {
    console.error('Error handling email delivered:', error)
  }
}

/**
 * Handle email opened
 */
async function handleEmailOpened(event) {
  try {
    const { email, campaign_id, timestamp } = event

    // Update customer engagement
    await supabase
      .from('customers')
      .update({
        last_email_opened_at: new Date(timestamp * 1000).toISOString(),
        email_engagement_score: supabase.rpc('increment_email_engagement', { 
          customer_email: email 
        })
      })
      .eq('email', email)

    // Track open in campaign record
    if (campaign_id) {
      await supabase
        .from('email_records')
        .update({
          opened: true,
          first_opened_at: new Date(timestamp * 1000).toISOString()
        })
        .eq('campaign_id', campaign_id)
        .eq('recipient_email', email)
        .is('first_opened_at', null) // Only update if not already opened
    }

    console.log(`📧 Email opened by ${email}`)

  } catch (error) {
    console.error('Error handling email opened:', error)
  }
}

/**
 * Handle email clicked
 */
async function handleEmailClicked(event) {
  try {
    const { email, campaign_id, url, timestamp } = event

    // Store click event
    await supabase
      .from('email_clicks')
      .insert({
        campaign_id: campaign_id || null,
        recipient_email: email,
        clicked_url: url,
        clicked_at: new Date(timestamp * 1000).toISOString()
      })

    // Update customer engagement
    await supabase
      .from('customers')
      .update({
        last_email_clicked_at: new Date(timestamp * 1000).toISOString(),
        email_engagement_score: supabase.rpc('increment_email_engagement', { 
          customer_email: email,
          engagement_type: 'click'
        })
      })
      .eq('email', email)

    // Update campaign record
    if (campaign_id) {
      await supabase
        .from('email_records')
        .update({
          clicked: true,
          first_clicked_at: new Date(timestamp * 1000).toISOString(),
          click_count: supabase.rpc('increment_click_count', {
            campaign_id: campaign_id,
            recipient_email: email
          })
        })
        .eq('campaign_id', campaign_id)
        .eq('recipient_email', email)
    }

    console.log(`📧 Email clicked by ${email} - URL: ${url}`)

  } catch (error) {
    console.error('Error handling email clicked:', error)
  }
}

/**
 * Handle email delivery failures
 */
async function handleEmailFailed(event) {
  try {
    const { email, event: eventType, reason, response, campaign_id } = event

    // Update customer email status
    await supabase
      .from('customers')
      .update({
        email_delivery_status: eventType,
        email_failure_reason: reason || response,
        last_email_failed_at: new Date().toISOString()
      })
      .eq('email', email)

    // Update campaign record
    if (campaign_id) {
      await supabase
        .from('email_records')
        .update({
          delivery_status: eventType,
          failure_reason: reason || response,
          failed_at: new Date().toISOString()
        })
        .eq('campaign_id', campaign_id)
        .eq('recipient_email', email)
    }

    // Log for analysis
    await supabase
      .from('email_failures')
      .insert({
        email: email,
        failure_type: eventType,
        reason: reason || response,
        campaign_id: campaign_id || null,
        failed_at: new Date().toISOString()
      })

    console.log(`📧 Email ${eventType} for ${email}: ${reason || response}`)

  } catch (error) {
    console.error('Error handling email failed:', error)
  }
}

/**
 * Handle unsubscribe events
 */
async function handleEmailUnsubscribe(event) {
  try {
    const { email, event: eventType } = event

    // Update customer subscription status
    await supabase
      .from('customers')
      .update({
        email_opt_in: false,
        email_opt_out_date: new Date().toISOString(),
        email_opt_out_reason: eventType
      })
      .eq('email', email)

    // Log unsubscribe activity
    await supabase
      .from('customer_activity')
      .insert({
        email: email,
        activity_type: 'email_unsubscribe',
        activity_data: { 
          method: eventType,
          source: 'sendgrid_webhook'
        },
        created_at: new Date().toISOString()
      })

    console.log(`📧 Customer ${email} unsubscribed via ${eventType}`)

  } catch (error) {
    console.error('Error handling email unsubscribe:', error)
  }
}

/**
 * Handle group unsubscribe
 */
async function handleGroupUnsubscribe(event) {
  try {
    const { email, asm_group_id } = event

    // Store group unsubscribe
    await supabase
      .from('email_group_unsubscribes')
      .insert({
        email: email,
        group_id: asm_group_id,
        unsubscribed_at: new Date().toISOString()
      })

    console.log(`📧 Customer ${email} unsubscribed from group ${asm_group_id}`)

  } catch (error) {
    console.error('Error handling group unsubscribe:', error)
  }
}

/**
 * Handle group resubscribe
 */
async function handleGroupResubscribe(event) {
  try {
    const { email, asm_group_id } = event

    // Remove group unsubscribe
    await supabase
      .from('email_group_unsubscribes')
      .delete()
      .eq('email', email)
      .eq('group_id', asm_group_id)

    console.log(`📧 Customer ${email} resubscribed to group ${asm_group_id}`)

  } catch (error) {
    console.error('Error handling group resubscribe:', error)
  }
}

/**
 * Update campaign analytics
 */
async function updateCampaignAnalytics(campaignId, eventType) {
  try {
    const analyticsField = getAnalyticsField(eventType)
    if (!analyticsField) return

    await supabase
      .from('campaign_analytics')
      .upsert({
        campaign_id: campaignId,
        channel: 'email',
        [analyticsField]: supabase.rpc('increment_campaign_metric', {
          campaign_id: campaignId,
          metric_name: analyticsField
        }),
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'campaign_id,channel'
      })

  } catch (error) {
    console.error('Error updating campaign analytics:', error)
  }
}

/**
 * Map event types to analytics fields
 */
function getAnalyticsField(eventType) {
  const fieldMap = {
    'delivered': 'emails_delivered',
    'open': 'emails_opened',
    'click': 'emails_clicked',
    'bounce': 'emails_bounced',
    'blocked': 'emails_blocked',
    'dropped': 'emails_dropped',
    'unsubscribe': 'emails_unsubscribed',
    'spamreport': 'emails_spam_reported'
  }
  
  return fieldMap[eventType] || null
}