import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// Industry Best Practice: Automated Credit Allocation
// Based on Booksy's model of bundling marketing with payment processing

export async function POST(request) {
  try {
    const { barbershop_id, payment_amount, payment_intent_id } = await request.json()
    const supabase = createClient()

    // Calculate credits earned from this payment
    // ADJUSTED FORMULA: To give ~600 credits at $25k volume (~555 transactions)
    // We want about 1 credit per transaction for small amounts, scaling up for larger
    const platformMarkup = payment_amount * 0.006 // 0.6% markup
    const campaignFundAllocation = platformMarkup * 0.5 // 50% goes to campaign credits
    
    // NEW FORMULA: More conservative credit allocation
    // Instead of dividing by $0.025, we divide by $0.10 to reduce credits by 4x
    // This gives ~1 credit per $45 transaction instead of 5
    const smsCreditsEarned = Math.floor(campaignFundAllocation / 0.10) // $0.10 per SMS credit
    const emailCreditsEarned = 100 // Emails are essentially free, be generous
    
    // Get or create campaign credit balance
    const { data: currentBalance } = await supabase
      .from('campaign_credits')
      .select('*')
      .eq('barbershop_id', barbershop_id)
      .single()

    if (currentBalance) {
      // Update existing balance
      const { error: updateError } = await supabase
        .from('campaign_credits')
        .update({
          sms_credits: currentBalance.sms_credits + smsCreditsEarned,
          email_credits: currentBalance.email_credits + emailCreditsEarned,
          last_earned_at: new Date().toISOString(),
          total_earned: currentBalance.total_earned + campaignFundAllocation
        })
        .eq('barbershop_id', barbershop_id)

      if (updateError) throw updateError
    } else {
      // Create new balance record
      const { error: insertError } = await supabase
        .from('campaign_credits')
        .insert({
          barbershop_id,
          sms_credits: smsCreditsEarned,
          email_credits: emailCreditsEarned,
          last_earned_at: new Date().toISOString(),
          total_earned: campaignFundAllocation,
          tier: 'starter' // Default tier, upgrades based on volume
        })

      if (insertError) throw insertError
    }

    // Log the credit allocation
    await supabase
      .from('credit_allocation_log')
      .insert({
        barbershop_id,
        payment_intent_id,
        payment_amount,
        platform_markup: platformMarkup,
        campaign_fund_allocation: campaignFundAllocation,
        sms_credits_earned: smsCreditsEarned,
        email_credits_earned: emailCreditsEarned,
        allocation_type: 'payment_processing'
      })

    // Check for tier upgrades based on monthly volume
    const { data: monthlyVolume } = await supabase.rpc(
      'get_monthly_payment_volume',
      { shop_id: barbershop_id }
    )

    let newTier = 'starter'
    let bonusCredits = 0
    
    if (monthlyVolume > 100000) {
      newTier = 'enterprise'
      bonusCredits = 500 // Bonus SMS credits for high volume
    } else if (monthlyVolume > 50000) {
      newTier = 'professional'
      bonusCredits = 200
    } else if (monthlyVolume > 10000) {
      newTier = 'growth'
      bonusCredits = 50
    }

    // Apply tier upgrade and bonus credits if applicable
    if (newTier !== 'starter' && bonusCredits > 0) {
      await supabase
        .from('campaign_credits')
        .update({
          tier: newTier,
          sms_credits: currentBalance.sms_credits + smsCreditsEarned + bonusCredits
        })
        .eq('barbershop_id', barbershop_id)
    }

    return NextResponse.json({
      success: true,
      credits_earned: {
        sms: smsCreditsEarned,
        email: emailCreditsEarned,
        bonus: bonusCredits
      },
      tier: newTier,
      message: `Earned ${smsCreditsEarned} SMS credits from this transaction!`,
      value_provided: `$${(smsCreditsEarned * 0.025).toFixed(2)} worth of free SMS`
    })

  } catch (error) {
    console.error('Credit allocation error:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to allocate campaign credits'
    }, { status: 500 })
  }
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const barbershop_id = searchParams.get('barbershop_id')
    
    if (!barbershop_id) {
      return NextResponse.json({
        error: 'barbershop_id is required'
      }, { status: 400 })
    }

    const supabase = createClient()
    
    // Get current credit balance
    const { data: credits, error } = await supabase
      .from('campaign_credits')
      .select('*')
      .eq('barbershop_id', barbershop_id)
      .single()

    if (error && error.code !== 'PGRST116') { // Not found error
      throw error
    }

    // Get monthly usage stats
    const { data: usageStats } = await supabase.rpc(
      'get_campaign_usage_stats',
      { shop_id: barbershop_id }
    )

    // Calculate estimated monthly credits based on payment volume
    const { data: monthlyVolume } = await supabase.rpc(
      'get_monthly_payment_volume',
      { shop_id: barbershop_id }
    )

    const estimatedMonthlyCredits = Math.floor((monthlyVolume * 0.006 * 0.5) / 0.025)

    return NextResponse.json({
      success: true,
      balance: {
        sms_credits: credits?.sms_credits || 0,
        email_credits: credits?.email_credits || 0,
        tier: credits?.tier || 'starter',
        total_earned: credits?.total_earned || 0
      },
      usage: {
        sms_sent_this_month: usageStats?.sms_sent || 0,
        emails_sent_this_month: usageStats?.emails_sent || 0,
        campaigns_run: usageStats?.campaigns_run || 0
      },
      projections: {
        estimated_monthly_credits: estimatedMonthlyCredits,
        estimated_value: `$${(estimatedMonthlyCredits * 0.025).toFixed(2)}/month`,
        processing_volume: monthlyVolume
      },
      tier_benefits: getTierBenefits(credits?.tier || 'starter')
    })

  } catch (error) {
    console.error('Error fetching credit balance:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch credit balance'
    }, { status: 500 })
  }
}

function getTierBenefits(tier) {
  const benefits = {
    starter: {
      name: 'Starter',
      monthly_base_credits: 50,
      email_campaigns: 5,
      automation: 'Basic appointment reminders',
      support: 'Email support'
    },
    growth: {
      name: 'Growth',
      monthly_base_credits: 200,
      email_campaigns: 'Unlimited',
      automation: 'Full automation suite',
      support: 'Priority email support',
      bonus_features: ['Review requests', 'Birthday campaigns']
    },
    professional: {
      name: 'Professional',
      monthly_base_credits: 500,
      email_campaigns: 'Unlimited',
      automation: 'Advanced automation with AI',
      support: 'Phone & email support',
      bonus_features: ['Custom branding', 'Analytics dashboard', 'A/B testing']
    },
    enterprise: {
      name: 'Enterprise',
      monthly_base_credits: 2000,
      email_campaigns: 'Unlimited',
      automation: 'Custom automation workflows',
      support: 'Dedicated account manager',
      bonus_features: ['API access', 'Multi-location', 'Custom integrations', 'White-label options']
    }
  }
  
  return benefits[tier] || benefits.starter
}