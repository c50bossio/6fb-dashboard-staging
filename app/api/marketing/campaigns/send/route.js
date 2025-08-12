import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import Stripe from 'stripe'

// Import marketing services
const { sendGridService } = require('../../../../../services/sendgrid-service')
const { twilioSMSService } = require('../../../../../services/twilio-service')

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_dummy')

/**
 * POST - Send marketing campaign via white-label platform infrastructure
 * 
 * This API endpoint:
 * 1. Validates campaign ID and user permissions
 * 2. Loads campaign and barbershop details from database
 * 3. Loads customer segment based on campaign audience settings
 * 4. Calls appropriate white-label service (SendGrid for email, Twilio for SMS)
 * 5. Tracks sending progress and updates campaign status
 * 6. Handles billing through the selected account with platform markup
 * 7. Returns detailed response with metrics
 */
export async function POST(request) {
  try {
    const body = await request.json()
    const { campaign_id, user_id, send_test = false, test_email, test_phone } = body

    if (!campaign_id || !user_id) {
      return NextResponse.json(
        { error: 'campaign_id and user_id are required' },
        { status: 400 }
      )
    }

    // 1. Load campaign with billing account details
    const { data: campaign, error: campaignError } = await supabase
      .from('marketing_campaigns')
      .select(`
        *,
        billing_account:marketing_accounts(*)
      `)
      .eq('id', campaign_id)
      .single()

    if (campaignError || !campaign) {
      return NextResponse.json(
        { error: 'Campaign not found' },
        { status: 404 }
      )
    }

    // 2. Validate user has permission to send this campaign
    const hasPermission = await validateCampaignPermission(user_id, campaign)
    if (!hasPermission) {
      return NextResponse.json(
        { error: 'You do not have permission to send this campaign' },
        { status: 403 }
      )
    }

    // 3. Validate campaign is in sendable status
    if (!['draft', 'scheduled', 'approved'].includes(campaign.status)) {
      return NextResponse.json(
        { error: `Cannot send campaign with status: ${campaign.status}` },
        { status: 400 }
      )
    }

    // 4. Load barbershop details for white-label branding
    const barbershop = await getBarbershopDetails(campaign.billing_account.owner_id)
    
    // 5. Load recipients based on campaign audience
    const recipients = send_test ? 
      await getTestRecipients(campaign.type, test_email, test_phone) :
      await loadCampaignRecipients(campaign)

    if (recipients.length === 0) {
      return NextResponse.json(
        { error: 'No eligible recipients found for this campaign' },
        { status: 400 }
      )
    }

    // 6. Update campaign status
    await supabase
      .from('marketing_campaigns')
      .update({ 
        status: 'active',
        started_at: new Date().toISOString(),
        audience_count: recipients.length
      })
      .eq('id', campaign_id)

    // 7. Send campaign via appropriate white-label service
    let sendResult
    
    try {
      if (campaign.type === 'email') {
        sendResult = await sendGridService.sendWhiteLabelCampaign(
          campaign, 
          barbershop, 
          recipients
        )
      } else if (campaign.type === 'sms') {
        sendResult = await twilioSMSService.sendWhiteLabelSMSCampaign(
          campaign, 
          barbershop, 
          recipients
        )
      } else {
        throw new Error(`Unsupported campaign type: ${campaign.type}`)
      }

      // 8. Process billing with platform markup
      if (!send_test && sendResult.success) {
        await processPlatformBilling(campaign, sendResult.metrics.billing)
      }

      // 9. Update campaign status to completed
      await supabase
        .from('marketing_campaigns')
        .update({ 
          status: 'completed',
          completed_at: new Date().toISOString(),
          total_sent: sendResult.metrics.totalSent,
          final_cost: sendResult.metrics.billing?.totalCharge || 0
        })
        .eq('id', campaign_id)

      // 10. Return success response with metrics
      return NextResponse.json({
        success: true,
        campaign_id: campaign_id,
        status: send_test ? 'test_completed' : 'completed',
        metrics: {
          recipients_targeted: sendResult.metrics.totalRecipients,
          messages_sent: sendResult.metrics.totalSent,
          messages_failed: sendResult.metrics.totalFailed,
          success_rate: `${((sendResult.metrics.totalSent / sendResult.metrics.totalRecipients) * 100).toFixed(2)}%`,
          estimated_delivery_rate: campaign.type === 'email' ? '95%' : '99%'
        },
        billing: sendResult.metrics.billing,
        platform_revenue: {
          service_cost: sendResult.metrics.billing?.serviceCost,
          platform_fee: sendResult.metrics.billing?.platformFee,
          profit_margin: `${sendResult.metrics.billing?.profitMargin}%`
        },
        next_steps: [
          'Monitor campaign performance in the analytics dashboard',
          `Track ${campaign.type === 'email' ? 'opens and clicks' : 'delivery confirmations'} in real-time`,
          'Schedule follow-up campaigns for non-responders in 3-5 days'
        ]
      })

    } catch (sendError) {
      // Mark campaign as failed
      await supabase
        .from('marketing_campaigns')
        .update({ 
          status: 'failed',
          failed_at: new Date().toISOString(),
          error_details: sendError.message
        })
        .eq('id', campaign_id)

      throw sendError
    }

  } catch (error) {
    console.error('Campaign send error:', error)
    return NextResponse.json(
      { error: 'Failed to send campaign', details: error.message },
      { status: 500 }
    )
  }
}

// Helper Functions

async function validateCampaignPermission(userId, campaign) {
  // Check if user created the campaign
  if (campaign.created_by === userId) return true
  
  // Check if user has permission to manage campaigns
  const { data: user } = await supabase
    .from('profiles')
    .select('role, barbershop_id, enterprise_id')
    .eq('id', userId)
    .single()
  
  if (user?.role === 'enterprise_owner' || user?.role === 'shop_owner') {
    return true
  }
  
  // Check custom permissions
  const { data: customRoles } = await supabase
    .from('user_custom_roles')
    .select('can_manage_shop_campaigns')
    .eq('user_id', userId)
    .eq('is_active', true)
    .single()
  
  return customRoles?.can_manage_shop_campaigns || false
}

async function getBarbershopDetails(ownerId) {
  // Try to get barbershop details - fallback to user profile
  const { data: user } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', ownerId)
    .single()
  
  return {
    id: user?.barbershop_id || ownerId,
    name: user?.business_name || user?.name || 'Professional Barbershop',
    email: user?.email || 'info@barbershop.com',
    phone: user?.phone || '',
    address: user?.address || '',
    account_type: user?.role === 'enterprise_owner' ? 'enterprise' : 
                  user?.role === 'shop_owner' ? 'shop' : 'barber'
  }
}

async function loadCampaignRecipients(campaign) {
  // Load customers based on audience type and filters
  let query = supabase
    .from('customers')
    .select('id, name, email, phone, first_name, last_name')
    .eq('is_active', true)
  
  // Apply audience filters
  if (campaign.audience_type === 'segment' && campaign.audience_filters?.segment) {
    const segment = campaign.audience_filters.segment
    
    if (segment === 'vip') {
      query = query.eq('vip_status', true)
    } else if (segment === 'new') {
      query = query.lte('total_visits', 1)
    } else if (segment === 'lapsed') {
      const sixtyDaysAgo = new Date()
      sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60)
      query = query.lt('last_visit_at', sixtyDaysAgo.toISOString())
    }
  }
  
  // Filter by contact preferences
  if (campaign.type === 'email') {
    query = query.not('email', 'is', null)
  } else if (campaign.type === 'sms') {
    query = query.not('phone', 'is', null)
  }
  
  const { data: customers } = await query.limit(1000)
  return customers || []
}

async function getTestRecipients(campaignType, testEmail, testPhone) {
  if (campaignType === 'email' && testEmail) {
    return [{
      id: 'test-recipient',
      name: 'Test Recipient',
      email: testEmail,
      first_name: 'Test'
    }]
  } else if (campaignType === 'sms' && testPhone) {
    return [{
      id: 'test-recipient', 
      name: 'Test Recipient',
      phone: testPhone,
      first_name: 'Test'
    }]
  }
  
  return []
}

async function processPlatformBilling(campaign, billing) {
  // Charge the barbershop's payment method
  try {
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(billing.totalCharge * 100), // Convert to cents
      currency: 'usd',
      customer: campaign.billing_account.stripe_customer_id,
      payment_method: campaign.billing_account.payment_method_id,
      confirm: true,
      metadata: {
        campaign_id: campaign.id,
        service_cost: billing.serviceCost,
        platform_fee: billing.platformFee,
        recipient_count: billing.recipientCount
      }
    })
    
    // Record billing in database
    await supabase
      .from('marketing_billing_records')
      .insert({
        campaign_id: campaign.id,
        billing_account_id: campaign.billing_account_id,
        stripe_payment_intent_id: paymentIntent.id,
        amount_charged: billing.totalCharge,
        platform_fee: billing.platformFee,
        service_cost: billing.serviceCost,
        recipients_count: billing.recipientCount,
        payment_status: 'succeeded'
      })
    
    return paymentIntent
    
  } catch (error) {
    console.error('Platform billing error:', error)
    throw new Error(`Billing failed: ${error.message}`)
  }
}