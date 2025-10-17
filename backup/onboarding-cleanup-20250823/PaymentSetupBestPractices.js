// Payment Setup Best Practices Implementation
// Based on Square, Booksy, and Textedly research

export const PaymentSetupStrategy = {
  // 1. PROGRESSIVE UNLOCKING (Square's Pattern)
  setupFlow: {
    steps: [
      {
        id: 'payment_method',
        label: 'Payment Processing',
        status: 'active',
        description: 'Connect Stripe to accept payments',
        requiredFor: ['bank_account']
      },
      {
        id: 'bank_account',
        label: 'Bank Account',
        status: 'locked',
        description: 'Where to deposit your earnings',
        requiredFor: ['payout_model'],
        unlocksWhen: 'payment_method_complete'
      },
      {
        id: 'service_pricing',
        label: 'Service Pricing',
        status: 'locked',
        description: 'Set your service rates',
        requiredFor: ['marketing'],
        unlocksWhen: 'bank_account_complete'
      },
      {
        id: 'payout_model',
        label: 'Payout Schedule',
        status: 'locked',
        description: 'Daily, weekly, or monthly payouts',
        requiredFor: ['business_details'],
        unlocksWhen: 'service_pricing_complete'
      },
      {
        id: 'business_details',
        label: 'Business Verification',
        status: 'locked',
        description: 'Tax info and compliance',
        requiredFor: ['go_live'],
        unlocksWhen: 'payout_model_complete'
      }
    ]
  },

  // 2. SMART MARKUP STRATEGY (Industry Standard)
  pricingModel: {
    // What Stripe charges you
    stripeCost: {
      percentage: 2.9,
      fixed: 0.30
    },
    
    // What you charge barbershops (includes your markup)
    platformRate: {
      percentage: 3.5,  // 0.6% markup
      fixed: 0.30
    },
    
    // This 0.6% markup funds these "free" services
    fundedServices: {
      smsCredits: 50,        // per month
      emailCampaigns: 'unlimited',
      appointmentReminders: 'unlimited',
      reviewRequests: 'unlimited',
      marketingAutomation: true
    },
    
    // Volume discounts (like Square)
    volumeTiers: [
      { monthlyVolume: 0, rate: 3.5 },
      { monthlyVolume: 10000, rate: 3.3 },      // >$10k/month
      { monthlyVolume: 50000, rate: 3.1 },      // >$50k/month
      { monthlyVolume: 100000, rate: 2.95 }     // >$100k/month
    ]
  },

  // 3. BUNDLED CAMPAIGN SYSTEM (Booksy's Model)
  campaignBundles: {
    starter: {
      monthlyPrice: 0,  // "Free" - funded by payment markup
      features: {
        smsCredits: 50,
        emailCampaigns: 5,
        automatedReminders: true,
        reviewRequests: false
      }
    },
    professional: {
      monthlyPrice: 29,  // Additional subscription
      features: {
        smsCredits: 500,
        emailCampaigns: 'unlimited',
        automatedReminders: true,
        reviewRequests: true,
        customBranding: true,
        advancedAnalytics: true
      }
    },
    enterprise: {
      monthlyPrice: 99,
      features: {
        smsCredits: 2000,
        emailCampaigns: 'unlimited',
        automatedReminders: true,
        reviewRequests: true,
        customBranding: true,
        advancedAnalytics: true,
        apiAccess: true,
        multiLocation: true
      }
    }
  },

  // 4. CAMPAIGN AUTOMATION (Textedly's Approach)
  automationTriggers: [
    {
      event: 'appointment_booked',
      actions: [
        { type: 'sms', timing: 'immediate', template: 'booking_confirmation' },
        { type: 'email', timing: 'immediate', template: 'booking_details' }
      ]
    },
    {
      event: 'appointment_24hr_before',
      actions: [
        { type: 'sms', timing: '24_hours_before', template: 'reminder_24hr' }
      ]
    },
    {
      event: 'appointment_completed',
      actions: [
        { type: 'sms', timing: '2_hours_after', template: 'review_request' },
        { type: 'email', timing: '1_day_after', template: 'thank_you' }
      ]
    },
    {
      event: 'no_visit_30_days',
      actions: [
        { type: 'sms', timing: 'after_30_days', template: 'win_back' },
        { type: 'email', timing: 'after_35_days', template: 'special_offer' }
      ]
    }
  ],

  // 5. REVENUE ALLOCATION MODEL
  revenueAllocation: {
    // For every $1000 in payment processing
    perThousandDollars: {
      stripeGets: 29.00,      // 2.9% to Stripe
      platformGets: 6.00,     // 0.6% platform markup
      campaignFund: 3.00,     // 0.3% to fund SMS/email
      profitMargin: 3.00      // 0.3% pure profit
    },
    
    // This funds approximately:
    campaignCredits: {
      smsMessages: 120,       // at $0.025 per SMS
      emailsSent: 'unlimited', // negligible cost via SendGrid
      value: '$3-5'           // perceived value to user
    }
  },

  // 6. IMPLEMENTATION PRIORITY
  implementationPhases: {
    phase1: {
      week: '1',
      tasks: [
        'Add 0.6% markup to payment processing',
        'Create campaign credit allocation system',
        'Build credit balance tracking'
      ]
    },
    phase2: {
      week: '2-3',
      tasks: [
        'Integrate Twilio for SMS campaigns',
        'Set up SendGrid for email campaigns',
        'Create campaign templates'
      ]
    },
    phase3: {
      week: '4',
      tasks: [
        'Build automation triggers',
        'Add campaign analytics',
        'Launch bundled pricing'
      ]
    }
  }
}

// Helper function to calculate platform revenue
export function calculatePlatformRevenue(monthlyVolume) {
  const markupPercentage = 0.6 // Your markup above Stripe's rate
  const platformRevenue = monthlyVolume * (markupPercentage / 100)
  const campaignCreditsAvailable = Math.floor(platformRevenue * 0.5) // 50% goes to fund campaigns
  const profitMargin = platformRevenue * 0.5 // 50% is profit
  
  return {
    totalMarkupRevenue: platformRevenue,
    campaignBudget: campaignCreditsAvailable,
    netProfit: profitMargin,
    smsCredits: Math.floor(campaignCreditsAvailable / 0.025), // SMS cost per message
    perceivedValue: campaignCreditsAvailable * 3 // Users perceive 3x value
  }
}

// Example: Barbershop processing $10,000/month
// Platform markup revenue: $60/month
// Campaign budget: $30/month = 1,200 SMS messages
// Net profit: $30/month
// Perceived value to barbershop: $90-150/month in "free" services