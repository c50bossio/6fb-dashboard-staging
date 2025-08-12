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
 * POST - Send marketing campaign via email or SMS
 * 
 * This API endpoint:
 * 1. Validates campaign ID and user permissions
 * 2. Loads campaign details from database
 * 3. Loads customer segment based on audience settings
 * 4. Calls appropriate service (SendGrid for email, Twilio for SMS)
 * 5. Tracks sending progress and updates campaign status
 * 6. Handles billing through the selected account
 * 7. Returns detailed response with metrics
 */
export async function POST(request) {
  try {
    const body = await request.json()
    const {
      campaign_id,
      user_id,
      send_test = false,
      test_email = null,
      test_phone = null
    } = body

    // Validate required parameters
    if (!campaign_id || !user_id) {
      return NextResponse.json({
        error: 'Campaign ID and User ID are required'
      }, { status: 400 })
    }

    console.log(`[Campaign Send] Starting send process for campaign ${campaign_id}`)

    // Step 1: Load campaign details and verify permissions
    const campaignResult = await loadCampaignWithPermissions(campaign_id, user_id)
    if (!campaignResult.success) {
      return NextResponse.json({
        error: campaignResult.error,
        details: campaignResult.details
      }, { status: campaignResult.status })
    }

    const { campaign, billingAccount, paymentMethod } = campaignResult.data

    // Step 2: Handle test sends
    if (send_test) {
      return await handleTestSend(campaign, test_email, test_phone, user_id)
    }

    // Step 3: Validate campaign can be sent
    const validationResult = validateCampaignForSending(campaign)
    if (!validationResult.valid) {
      return NextResponse.json({
        error: 'Campaign validation failed',
        details: validationResult.errors
      }, { status: 400 })
    }

    // Step 4: Load customer segment
    const audienceResult = await loadCampaignAudience(campaign)
    if (!audienceResult.success) {
      return NextResponse.json({
        error: 'Failed to load campaign audience',
        details: audienceResult.error
      }, { status: 500 })
    }

    const { recipients } = audienceResult.data

    if (recipients.length === 0) {
      return NextResponse.json({
        error: 'No recipients found for campaign audience'
      }, { status: 400 })
    }

    // Step 5: Calculate final costs
    const costResult = calculateCampaignCosts(campaign, recipients.length, billingAccount)
    
    // Step 6: Validate payment method and process billing
    const billingResult = await processCampaignBilling(
      billingAccount, 
      paymentMethod, 
      costResult,
      campaign
    )
    if (!billingResult.success) {
      return NextResponse.json({
        error: 'Billing validation failed',
        details: billingResult.error
      }, { status: 402 })
    }

    // Step 7: Update campaign status to active
    await updateCampaignStatus(campaign_id, 'active', {
      audience_count: recipients.length,
      final_cost: costResult.totalCost,
      started_at: new Date().toISOString()
    })

    // Step 8: Send campaign via appropriate service
    let sendResult
    if (campaign.type === 'email') {
      sendResult = await sendEmailCampaign(campaign, recipients, costResult)
    } else if (campaign.type === 'sms') {
      sendResult = await sendSMSCampaign(campaign, recipients, costResult)
    } else {
      return NextResponse.json({
        error: 'Unsupported campaign type',
        details: `Campaign type '${campaign.type}' is not supported`
      }, { status: 400 })
    }

    // Step 9: Update campaign with final results
    const finalStatus = sendResult.success ? 'completed' : 'failed'
    await updateCampaignStatus(campaign_id, finalStatus, {
      completed_at: new Date().toISOString(),
      total_sent: sendResult.sent || 0,
      total_failed: sendResult.failed || 0,
      success_rate: sendResult.sent ? (sendResult.sent / (sendResult.sent + sendResult.failed) * 100).toFixed(2) : 0,
      error_details: sendResult.errors || null
    })

    // Step 10: Create billing record
    await createBillingRecord({
      campaign_id,
      billing_account_id: billingAccount.id,
      stripe_payment_intent_id: billingResult.paymentIntentId,
      amount_charged: costResult.totalCost,
      platform_fee: costResult.platformFee,
      service_cost: costResult.serviceCost,
      recipients_count: recipients.length,
      sent_count: sendResult.sent || 0,
      failed_count: sendResult.failed || 0
    })

    console.log(`[Campaign Send] Campaign ${campaign_id} completed successfully`)

    // Return comprehensive response
    return NextResponse.json({
      success: true,
      campaign_id,
      status: finalStatus,
      metrics: {
        recipients_targeted: recipients.length,
        messages_sent: sendResult.sent || 0,
        messages_failed: sendResult.failed || 0,
        success_rate: sendResult.sent ? (sendResult.sent / (sendResult.sent + sendResult.failed) * 100).toFixed(2) + '%' : '0%',
        estimated_delivery_rate: campaign.type === 'email' ? '95%' : '98%',
        estimated_open_rate: campaign.type === 'email' ? '22%' : '98%',
        estimated_click_rate: campaign.type === 'email' ? '3.5%' : '15%'
      },
      billing: {
        total_cost: costResult.totalCost,
        platform_fee: costResult.platformFee,
        service_cost: costResult.serviceCost,
        cost_per_recipient: (costResult.totalCost / recipients.length).toFixed(4),
        billing_account: billingAccount.account_name,
        payment_method: paymentMethod ? `**** ${paymentMethod.card_last4}` : 'Default'
      },
      timeline: {
        started_at: new Date().toISOString(),
        completed_at: new Date().toISOString(),
        duration_seconds: Math.round((Date.now() - Date.parse(new Date().toISOString())) / 1000)
      },
      next_steps: generateNextSteps(campaign, sendResult),
      campaign_details: {
        name: campaign.name,
        type: campaign.type,
        subject: campaign.subject,
        audience_type: campaign.audience_type
      }
    }, { status: 200 })

  } catch (error) {
    console.error('[Campaign Send] Unexpected error:', error)
    
    // Update campaign status to failed if we have campaign_id
    if (body?.campaign_id) {
      await updateCampaignStatus(body.campaign_id, 'failed', {
        error_details: error.message,
        failed_at: new Date().toISOString()
      }).catch(updateError => {
        console.error('Failed to update campaign status:', updateError)
      })
    }

    return NextResponse.json({
      error: 'Internal server error',
      details: error.message,
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}

/**
 * Load campaign with full details and verify user permissions
 */
async function loadCampaignWithPermissions(campaignId, userId) {
  try {
    // Load campaign with billing account and payment method
    const { data: campaign, error: campaignError } = await supabase
      .from('marketing_campaigns')
      .select(`
        *,
        billing_account:marketing_accounts!billing_account_id (
          *,
          payment_methods:marketing_payment_methods!account_id (
            id,
            stripe_payment_method_id,
            card_brand,
            card_last4,
            is_default,
            is_active
          )
        )
      `)
      .eq('id', campaignId)
      .single()

    if (campaignError || !campaign) {
      return {
        success: false,
        error: 'Campaign not found',
        details: campaignError?.message || 'Campaign does not exist',
        status: 404
      }
    }

    // Verify user has permission to send this campaign
    const hasPermission = await verifyCampaignSendPermission(userId, campaign)
    if (!hasPermission) {
      return {
        success: false,
        error: 'Permission denied',
        details: 'You do not have permission to send this campaign',
        status: 403
      }
    }

    // Get default payment method
    const defaultPaymentMethod = campaign.billing_account?.payment_methods?.find(pm => pm.is_default && pm.is_active)
    const anyActivePaymentMethod = campaign.billing_account?.payment_methods?.find(pm => pm.is_active)

    return {
      success: true,
      data: {
        campaign,
        billingAccount: campaign.billing_account,
        paymentMethod: defaultPaymentMethod || anyActivePaymentMethod
      }
    }

  } catch (error) {
    console.error('Error loading campaign:', error)
    return {
      success: false,
      error: 'Failed to load campaign',
      details: error.message,
      status: 500
    }
  }
}

/**
 * Verify user has permission to send campaign
 */
async function verifyCampaignSendPermission(userId, campaign) {
  try {
    // Campaign creator can always send
    if (campaign.created_by === userId) {
      return true
    }

    // Get user role and permissions
    const { data: user } = await supabase
      .from('profiles')
      .select('id, role, barbershop_id, enterprise_id')
      .eq('id', userId)
      .single()

    if (!user) return false

    // Enterprise owners can send campaigns in their enterprise
    if (user.role === 'enterprise_owner') {
      const { data: campaignShop } = await supabase
        .from('barbershops')
        .select('enterprise_id')
        .eq('id', campaign.billing_account?.barbershop_id)
        .single()

      if (campaignShop?.enterprise_id === user.enterprise_id) {
        return true
      }
    }

    // Shop owners can send shop campaigns
    if (user.role === 'shop_owner' && user.barbershop_id === campaign.billing_account?.barbershop_id) {
      return true
    }

    // Check custom permissions
    const { data: customRoles } = await supabase
      .from('user_custom_roles')
      .select('can_send_campaigns, can_manage_shop_campaigns, can_manage_enterprise_campaigns')
      .eq('user_id', userId)
      .eq('is_active', true)
      .single()

    return customRoles?.can_send_campaigns || 
           customRoles?.can_manage_shop_campaigns || 
           customRoles?.can_manage_enterprise_campaigns

  } catch (error) {
    console.error('Error verifying campaign permission:', error)
    return false
  }
}

/**
 * Validate campaign is ready for sending
 */
function validateCampaignForSending(campaign) {
  const errors = []

  // Check campaign status
  if (!['draft', 'approved', 'scheduled'].includes(campaign.status)) {
    errors.push(`Campaign status '${campaign.status}' is not sendable`)
  }

  // Check required fields
  if (!campaign.name) errors.push('Campaign name is required')
  if (!campaign.type) errors.push('Campaign type is required')
  if (!campaign.message) errors.push('Campaign message is required')
  
  if (campaign.type === 'email') {
    if (!campaign.subject) errors.push('Email subject is required')
  }

  // Check audience configuration
  if (!campaign.audience_type) errors.push('Audience type is required')
  if (!campaign.audience_filters) errors.push('Audience filters are required')

  // Check billing account
  if (!campaign.billing_account_id) errors.push('Billing account is required')

  return {
    valid: errors.length === 0,
    errors
  }
}

/**
 * Load campaign audience based on filters
 */
async function loadCampaignAudience(campaign) {
  try {
    let query = supabase.from('customers').select('*')

    // Apply audience filters
    const filters = campaign.audience_filters || {}
    
    // Base filters
    query = query.eq('is_active', true)
    
    // Shop filter
    if (filters.shop_id) {
      query = query.eq('barbershop_id', filters.shop_id)
    }

    // Audience type filters
    if (campaign.audience_type === 'segment') {
      if (filters.segment === 'vip') {
        query = query.eq('vip_status', true)
      } else if (filters.segment === 'new') {
        query = query.lte('total_visits', 1)
      } else if (filters.segment === 'lapsed') {
        const sixtyDaysAgo = new Date()
        sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60)
        query = query.lt('last_visit_at', sixtyDaysAgo.toISOString())
      } else if (filters.segment === 'frequent') {
        query = query.gte('total_visits', 5)
      }
    }

    // Channel-specific opt-in filters
    if (campaign.type === 'email') {
      query = query.eq('email_opt_in', true).not('email', 'is', null)
    } else if (campaign.type === 'sms') {
      query = query.eq('sms_opt_in', true).not('phone', 'is', null)
    }

    // Date range filters
    if (filters.last_visit_after) {
      query = query.gte('last_visit_at', filters.last_visit_after)
    }
    if (filters.last_visit_before) {
      query = query.lte('last_visit_at', filters.last_visit_before)
    }

    // Custom segment filters
    if (filters.custom_segment_id) {
      const { data: segmentCustomers } = await supabase
        .from('customer_segments')
        .select('customer_id')
        .eq('segment_id', filters.custom_segment_id)

      const customerIds = segmentCustomers?.map(cs => cs.customer_id) || []
      if (customerIds.length > 0) {
        query = query.in('id', customerIds)
      } else {
        // No customers in segment
        return { success: true, data: { recipients: [] } }
      }
    }

    const { data: recipients, error } = await query.limit(10000) // Safety limit

    if (error) {
      throw error
    }

    return {
      success: true,
      data: { recipients: recipients || [] }
    }

  } catch (error) {
    console.error('Error loading campaign audience:', error)
    return {
      success: false,
      error: error.message
    }
  }
}

/**
 * Calculate campaign costs including platform fees
 */
function calculateCampaignCosts(campaign, recipientCount, billingAccount) {
  let serviceCost = 0
  let platformFeeRate = 0.65 // Default 65% markup

  // Determine platform fee based on account type
  if (billingAccount.owner_type === 'barber') {
    platformFeeRate = 0.95 // 95% markup for individual barbers
  } else if (billingAccount.owner_type === 'shop') {
    platformFeeRate = 0.80 // 80% markup for shops
  } else if (billingAccount.owner_type === 'enterprise') {
    platformFeeRate = 0.50 // 50% markup for enterprises
  }

  if (campaign.type === 'email') {
    serviceCost = recipientCount * 0.001 // $0.001 per email (SendGrid cost)
  } else if (campaign.type === 'sms') {
    serviceCost = recipientCount * 0.0075 // $0.0075 per SMS (Twilio US cost)
  }

  const platformFee = serviceCost * platformFeeRate
  const totalCost = serviceCost + platformFee

  return {
    serviceCost: parseFloat(serviceCost.toFixed(4)),
    platformFee: parseFloat(platformFee.toFixed(4)),
    totalCost: parseFloat(totalCost.toFixed(4)),
    platformFeeRate: platformFeeRate,
    recipientCount,
    costPerRecipient: parseFloat((totalCost / recipientCount).toFixed(6))
  }
}

/**
 * Process campaign billing through Stripe
 */
async function processCampaignBilling(billingAccount, paymentMethod, costResult, campaign) {
  try {
    // Skip billing for very small amounts (under $0.01)
    if (costResult.totalCost < 0.01) {
      return {
        success: true,
        paymentIntentId: null,
        message: 'No charge required for amount under $0.01'
      }
    }

    if (!paymentMethod) {
      return {
        success: false,
        error: 'No active payment method found for billing account'
      }
    }

    if (!billingAccount.stripe_customer_id) {
      return {
        success: false,
        error: 'No Stripe customer ID found for billing account'
      }
    }

    // Create payment intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(costResult.totalCost * 100), // Convert to cents
      currency: 'usd',
      customer: billingAccount.stripe_customer_id,
      payment_method: paymentMethod.stripe_payment_method_id,
      confirmation_method: 'automatic',
      confirm: true,
      description: `Marketing Campaign: ${campaign.name}`,
      metadata: {
        campaign_id: campaign.id,
        campaign_name: campaign.name,
        campaign_type: campaign.type,
        recipient_count: costResult.recipientCount.toString(),
        billing_account_id: billingAccount.id,
        account_type: billingAccount.owner_type
      }
    })

    if (paymentIntent.status !== 'succeeded') {
      return {
        success: false,
        error: 'Payment failed',
        details: `Payment status: ${paymentIntent.status}`
      }
    }

    return {
      success: true,
      paymentIntentId: paymentIntent.id,
      message: 'Payment processed successfully'
    }

  } catch (error) {
    console.error('Billing processing error:', error)
    return {
      success: false,
      error: 'Payment processing failed',
      details: error.message
    }
  }
}

/**
 * Send email campaign via SendGrid service
 */
async function sendEmailCampaign(campaign, recipients, costResult) {
  try {
    // Get user details for personalization
    const { data: user } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', campaign.created_by)
      .single()

    // Prepare recipients for SendGrid format
    const sendGridRecipients = recipients.map(customer => ({
      email: customer.email,
      name: customer.name || `${customer.first_name || ''} ${customer.last_name || ''}`.trim(),
      firstName: customer.first_name,
      lastName: customer.last_name,
      id: customer.id
    }))

    // Determine plan tier for pricing
    let planTier = 'PROFESSIONAL'
    if (campaign.billing_account?.owner_type === 'barber') {
      planTier = 'STARTER'
    } else if (campaign.billing_account?.owner_type === 'enterprise') {
      planTier = 'ENTERPRISE'
    } else {
      planTier = 'BUSINESS'
    }

    const campaignConfig = {
      campaignName: campaign.name,
      recipients: sendGridRecipients,
      subject: campaign.subject,
      htmlContent: campaign.message,
      textContent: campaign.message_text || stripHtml(campaign.message),
      fromEmail: campaign.from_email || process.env.SENDGRID_FROM_EMAIL || 'noreply@6fb.com',
      fromName: campaign.from_name || user?.name || '6FB Barbershop',
      planTier: planTier,
      templateId: campaign.template_id,
      personalizationData: campaign.personalization_data || {},
      segmentCriteria: campaign.audience_filters || {},
      userId: campaign.created_by
    }

    const result = await sendGridService.sendEmailCampaign(campaignConfig)

    return {
      success: result.success,
      sent: result.analytics?.emailsSent || 0,
      failed: result.analytics?.emailsFailed || 0,
      errors: result.errors || [],
      serviceResponse: result
    }

  } catch (error) {
    console.error('Email campaign send error:', error)
    return {
      success: false,
      sent: 0,
      failed: recipients.length,
      errors: [error.message],
      serviceResponse: null
    }
  }
}

/**
 * Send SMS campaign via Twilio service
 */
async function sendSMSCampaign(campaign, recipients, costResult) {
  try {
    // Create a temporary segment for this campaign
    const segmentId = `campaign_${campaign.id}_${Date.now()}`
    
    // Store recipients as segment (Twilio service expects segment-based sending)
    const segmentCustomers = recipients.map(customer => ({
      customer_id: customer.id,
      customers: {
        id: customer.id,
        phone: customer.phone,
        first_name: customer.first_name,
        last_name: customer.last_name,
        sms_opt_in: customer.sms_opt_in,
        timezone: customer.timezone,
        country_code: customer.country_code || 'US'
      }
    }))

    // Use Twilio service for bulk SMS sending
    const result = await twilioSMSService.sendBulkSMS({
      campaignId: campaign.id,
      recipients: segmentCustomers.map(sc => sc.customers),
      message: campaign.message,
      mediaUrls: campaign.media_urls || [],
      personalizeMessage: true,
      linkTracking: true
    })

    return {
      success: result.sent > 0 || result.failed === 0,
      sent: result.sent || 0,
      failed: result.failed || 0,
      errors: result.errors || [],
      serviceResponse: result
    }

  } catch (error) {
    console.error('SMS campaign send error:', error)
    return {
      success: false,
      sent: 0,
      failed: recipients.length,
      errors: [error.message],
      serviceResponse: null
    }
  }
}

/**
 * Handle test sends for campaign preview
 */
async function handleTestSend(campaign, testEmail, testPhone, userId) {
  try {
    if (campaign.type === 'email' && testEmail) {
      // Send test email
      const testResult = await sendGridService.sendEmailCampaign({
        campaignName: `${campaign.name} (Test)`,
        recipients: [{ 
          email: testEmail, 
          name: 'Test User',
          firstName: 'Test',
          id: 'test'
        }],
        subject: `[TEST] ${campaign.subject}`,
        htmlContent: campaign.message,
        textContent: campaign.message_text || stripHtml(campaign.message),
        fromEmail: campaign.from_email || process.env.SENDGRID_FROM_EMAIL || 'noreply@6fb.com',
        fromName: campaign.from_name || 'Test Sender',
        planTier: 'PROFESSIONAL',
        userId: userId
      })

      return NextResponse.json({
        success: testResult.success,
        message: 'Test email sent successfully',
        details: testResult.analytics || {}
      })

    } else if (campaign.type === 'sms' && testPhone) {
      // Send test SMS
      const testResult = await twilioSMSService.sendSMS({
        to: testPhone,
        message: `[TEST] ${campaign.message}`,
        mediaUrls: campaign.media_urls || []
      })

      return NextResponse.json({
        success: testResult.success,
        message: 'Test SMS sent successfully',
        details: { messageSid: testResult.messageSid }
      })

    } else {
      return NextResponse.json({
        error: 'Invalid test configuration',
        details: `Test ${campaign.type === 'email' ? 'email' : 'phone'} is required for ${campaign.type} campaigns`
      }, { status: 400 })
    }

  } catch (error) {
    console.error('Test send error:', error)
    return NextResponse.json({
      error: 'Test send failed',
      details: error.message
    }, { status: 500 })
  }
}

/**
 * Update campaign status and metadata
 */
async function updateCampaignStatus(campaignId, status, metadata = {}) {
  try {
    const { error } = await supabase
      .from('marketing_campaigns')
      .update({
        status,
        ...metadata,
        updated_at: new Date().toISOString()
      })
      .eq('id', campaignId)

    if (error) {
      console.error('Error updating campaign status:', error)
    }
  } catch (error) {
    console.error('Error in updateCampaignStatus:', error)
  }
}

/**
 * Create billing record for campaign
 */
async function createBillingRecord(billingData) {
  try {
    // Ensure marketing_billing_records table exists
    await ensureBillingRecordsTable()

    const { error } = await supabase
      .from('marketing_billing_records')
      .insert([{
        ...billingData,
        created_at: new Date().toISOString()
      }])

    if (error) {
      console.error('Error creating billing record:', error)
    }
  } catch (error) {
    console.error('Error in createBillingRecord:', error)
  }
}

/**
 * Ensure billing records table exists
 */
async function ensureBillingRecordsTable() {
  try {
    const { error } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS marketing_billing_records (
          id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
          campaign_id UUID REFERENCES marketing_campaigns(id) NOT NULL,
          billing_account_id UUID REFERENCES marketing_accounts(id) NOT NULL,
          stripe_payment_intent_id TEXT,
          amount_charged DECIMAL(10,4) NOT NULL,
          platform_fee DECIMAL(10,4) NOT NULL,
          service_cost DECIMAL(10,4) NOT NULL,
          recipients_count INTEGER NOT NULL,
          sent_count INTEGER DEFAULT 0,
          failed_count INTEGER DEFAULT 0,
          status TEXT DEFAULT 'completed',
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
        );

        CREATE INDEX IF NOT EXISTS idx_billing_records_campaign_id ON marketing_billing_records(campaign_id);
        CREATE INDEX IF NOT EXISTS idx_billing_records_account_id ON marketing_billing_records(billing_account_id);
        CREATE INDEX IF NOT EXISTS idx_billing_records_created_at ON marketing_billing_records(created_at);
      `
    })

    if (error) {
      console.error('Error creating marketing_billing_records table:', error)
    }
  } catch (err) {
    console.error('Error ensuring marketing_billing_records table:', err)
  }
}

/**
 * Generate next steps recommendations
 */
function generateNextSteps(campaign, sendResult) {
  const steps = []

  if (sendResult.success) {
    steps.push('Monitor campaign performance in the analytics dashboard')
    steps.push(`Track ${campaign.type === 'email' ? 'opens and clicks' : 'delivery and responses'} in real-time`)
    
    if (campaign.type === 'email') {
      steps.push('Schedule follow-up campaigns for non-openers in 3-5 days')
      steps.push('Create retargeting campaigns for high-engagement recipients')
    } else {
      steps.push('Monitor for opt-out responses and update customer preferences')
      steps.push('Consider follow-up campaigns based on response rates')
    }
    
    steps.push('Analyze recipient segments for optimization insights')
  } else {
    steps.push('Review error details and fix campaign configuration')
    steps.push('Check billing account and payment method status')
    steps.push('Verify audience targeting and recipient opt-in status')
    steps.push('Test campaign with a small segment before full send')
  }

  return steps
}

/**
 * Strip HTML tags from content
 */
function stripHtml(html) {
  return html
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .trim()
}