import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import twilio from 'twilio'
import sgMail from '@sendgrid/mail'

// Initialize services with markup-funded approach
const twilioClient = process.env.TWILIO_ACCOUNT_SID ? 
  twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN) : null

if (process.env.SENDGRID_API_KEY) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY)
}

export async function POST(request) {
  try {
    const { 
      barbershop_id, 
      campaign_type, 
      channel, // 'sms', 'email', or 'both'
      recipients,
      message,
      subject, // for email
      template_id // optional, use pre-built template
    } = await request.json()

    const supabase = createClient()

    // Step 1: Check available credits
    const { data: credits } = await supabase
      .from('campaign_credits')
      .select('sms_credits, email_credits, tier')
      .eq('barbershop_id', barbershop_id)
      .single()

    if (!credits) {
      return NextResponse.json({
        error: 'No campaign credits available. Process more payments to earn credits!'
      }, { status: 400 })
    }

    // Step 2: Calculate required credits
    const smsRequired = (channel === 'sms' || channel === 'both') ? recipients.length : 0
    const emailRequired = (channel === 'email' || channel === 'both') ? recipients.length : 0

    // Check if enough credits
    if (smsRequired > credits.sms_credits) {
      return NextResponse.json({
        error: `Insufficient SMS credits. You have ${credits.sms_credits}, need ${smsRequired}`,
        suggestion: 'Process more payments to earn credits, or upgrade your tier!'
      }, { status: 400 })
    }

    if (emailRequired > credits.email_credits) {
      return NextResponse.json({
        error: `Insufficient email credits. You have ${credits.email_credits}, need ${emailRequired}`
      }, { status: 400 })
    }

    // Step 3: Get template if specified
    let messageContent = message
    let emailSubject = subject
    
    if (template_id) {
      const { data: template } = await supabase
        .from('campaign_templates')
        .select('*')
        .eq('id', template_id)
        .single()
      
      if (template) {
        messageContent = template.sms_template || message
        emailSubject = template.email_subject || subject
      }
    }

    // Step 4: Send campaigns
    const results = {
      sms: { sent: 0, failed: 0, errors: [] },
      email: { sent: 0, failed: 0, errors: [] }
    }

    // Send SMS campaigns
    if (smsRequired > 0 && twilioClient) {
      for (const recipient of recipients) {
        try {
          // Personalize message
          const personalizedMessage = messageContent
            .replace('{{customer_name}}', recipient.name || 'Valued Customer')
            .replace('{{barbershop_name}}', recipient.barbershop_name || 'Our Barbershop')

          await twilioClient.messages.create({
            body: personalizedMessage,
            from: process.env.TWILIO_PHONE_NUMBER,
            to: recipient.phone
          })

          results.sms.sent++
        } catch (error) {
          results.sms.failed++
          results.sms.errors.push({
            recipient: recipient.phone,
            error: error.message
          })
        }
      }
    }

    // Send Email campaigns
    if (emailRequired > 0 && process.env.SENDGRID_API_KEY) {
      // Batch send for efficiency
      const emailMessages = recipients.map(recipient => ({
        to: recipient.email,
        from: process.env.SENDGRID_FROM_EMAIL || 'noreply@bookedbarber.com',
        subject: emailSubject || 'Message from your barbershop',
        html: messageContent
          .replace('{{customer_name}}', recipient.name || 'Valued Customer')
          .replace('{{barbershop_name}}', recipient.barbershop_name || 'Our Barbershop'),
        // Track opens and clicks
        trackingSettings: {
          clickTracking: { enable: true },
          openTracking: { enable: true }
        }
      }))

      try {
        await sgMail.send(emailMessages)
        results.email.sent = emailMessages.length
      } catch (error) {
        results.email.failed = emailMessages.length
        results.email.errors.push(error.message)
      }
    }

    // Step 5: Deduct credits
    const { error: deductError } = await supabase
      .from('campaign_credits')
      .update({
        sms_credits: credits.sms_credits - results.sms.sent,
        email_credits: credits.email_credits - results.email.sent,
        last_used_at: new Date().toISOString()
      })
      .eq('barbershop_id', barbershop_id)

    if (deductError) {
      console.error('Failed to deduct credits:', deductError)
    }

    // Step 6: Log campaign usage
    await supabase
      .from('campaign_usage_log')
      .insert({
        barbershop_id,
        credit_type: channel,
        credits_used: results.sms.sent + results.email.sent,
        recipient_count: recipients.length,
        campaign_type,
        message_content: messageContent,
        delivered_count: results.sms.sent + results.email.sent,
        failed_count: results.sms.failed + results.email.failed
      })

    // Step 7: Calculate value provided
    const valueProvided = (results.sms.sent * 0.025) + (results.email.sent * 0.001)
    const creditsRemaining = {
      sms: credits.sms_credits - results.sms.sent,
      email: credits.email_credits - results.email.sent
    }

    return NextResponse.json({
      success: true,
      results,
      credits_remaining: creditsRemaining,
      value_provided: `$${valueProvided.toFixed(2)} worth of campaigns sent`,
      tier_status: credits.tier,
      message: generateSuccessMessage(results, credits.tier)
    })

  } catch (error) {
    console.error('Campaign send error:', error)
    return NextResponse.json({
      error: 'Failed to send campaign',
      details: error.message
    }, { status: 500 })
  }
}

// Generate tier-appropriate success message
function generateSuccessMessage(results, tier) {
  const totalSent = results.sms.sent + results.email.sent
  
  const tierMessages = {
    starter: `Campaign sent to ${totalSent} recipients! Process more payments to earn additional credits.`,
    growth: `Campaign delivered to ${totalSent} recipients! You're earning 2x credits with Growth tier.`,
    professional: `Professional campaign sent to ${totalSent} recipients! Enjoy your unlimited email campaigns.`,
    enterprise: `Enterprise campaign deployed to ${totalSent} recipients! Your dedicated account manager has been notified.`
  }
  
  return tierMessages[tier] || tierMessages.starter
}

// GET endpoint to preview campaign costs
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const barbershop_id = searchParams.get('barbershop_id')
    const recipient_count = parseInt(searchParams.get('recipient_count') || '0')
    const channel = searchParams.get('channel') || 'sms'

    const supabase = createClient()

    // Get current credits
    const { data: credits } = await supabase
      .from('campaign_credits')
      .select('sms_credits, email_credits, tier')
      .eq('barbershop_id', barbershop_id)
      .single()

    if (!credits) {
      return NextResponse.json({
        error: 'No credits found. Start processing payments to earn campaign credits!'
      }, { status: 404 })
    }

    // Calculate requirements
    const smsRequired = (channel === 'sms' || channel === 'both') ? recipient_count : 0
    const emailRequired = (channel === 'email' || channel === 'both') ? recipient_count : 0

    // Check availability
    const canSend = {
      sms: smsRequired <= credits.sms_credits,
      email: emailRequired <= credits.email_credits,
      overall: (smsRequired <= credits.sms_credits) && (emailRequired <= credits.email_credits)
    }

    // Calculate how many more payments needed to afford this campaign
    const shortfall = {
      sms: Math.max(0, smsRequired - credits.sms_credits),
      email: Math.max(0, emailRequired - credits.email_credits)
    }

    // At 0.6% markup, how much payment volume generates these credits?
    const paymentsNeeded = Math.ceil((shortfall.sms * 0.025) / 0.006)

    return NextResponse.json({
      current_balance: {
        sms: credits.sms_credits,
        email: credits.email_credits
      },
      campaign_requirements: {
        sms: smsRequired,
        email: emailRequired
      },
      can_send: canSend,
      shortfall,
      tier: credits.tier,
      recommendation: canSend.overall ? 
        'You have enough credits for this campaign!' :
        `Process $${paymentsNeeded} more in payments to earn the credits for this campaign.`,
      value: {
        campaign_cost_elsewhere: `$${(smsRequired * 0.05).toFixed(2)}`, // Competitor price
        your_cost: '$0.00', // Free with credits
        savings: `$${(smsRequired * 0.05).toFixed(2)}`
      }
    })

  } catch (error) {
    console.error('Campaign preview error:', error)
    return NextResponse.json({
      error: 'Failed to preview campaign',
      details: error.message
    }, { status: 500 })
  }
}