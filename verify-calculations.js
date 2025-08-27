#!/usr/bin/env node

/**
 * CRITICAL CALCULATION VERIFICATION SCRIPT
 * Ensures all payment-to-credits math is accurate
 */

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m'
}

function log(message, color = 'reset') {
  
}

function formatMoney(cents) {
  return `$${(cents / 100).toFixed(2)}`
}

// Test scenarios with different payment amounts
const TEST_SCENARIOS = [
  { amount: 5000, description: 'Small payment ($50)' },
  { amount: 10000, description: 'Medium payment ($100)' },
  { amount: 50000, description: 'Large payment ($500)' },
  { amount: 100000, description: 'Very large payment ($1000)' },
  { amount: 2500000, description: 'Monthly volume test ($25,000)' }
]

// Expected rates and markups
const RATES = {
  displayedToCustomer: 0.0295,  // 2.95% shown to customer
  actualStripeRate: 0.029,      // 2.9% paid to Stripe
  platformMarkup: 0.006,         // 0.6% platform markup (hidden)
  campaignFundRatio: 0.5,        // 50% of markup goes to credits
  smsUnitCost: 2.5,              // $0.025 per SMS in cents
  
  // What we tell customers
  customerFacingRate: '2.95%',
  competitorRates: {
    square: '2.6%',
    booksy: '2.99%',
    stripe: '2.9%'
  }
}

// Tier thresholds (in cents)
const TIERS = {
  starter: { max: 1000000, bonus: 0, name: 'Starter' },      // < $10k
  growth: { min: 1000000, max: 5000000, bonus: 50, name: 'Growth' },    // $10k-50k
  professional: { min: 5000000, max: 10000000, bonus: 200, name: 'Professional' }, // $50k-100k
  enterprise: { min: 10000000, bonus: 500, name: 'Enterprise' }  // $100k+
}

function calculateCredits(paymentAmount) {
  // Step 1: Calculate platform markup
  const platformMarkup = paymentAmount * RATES.platformMarkup
  
  // Step 2: Calculate campaign fund (50% of markup)
  const campaignFund = platformMarkup * RATES.campaignFundRatio
  
  // Step 3: Calculate SMS credits (campaign fund / cost per SMS)
  const smsCredits = Math.floor(campaignFund / RATES.smsUnitCost)
  
  // Step 4: Email credits (always 100 per transaction)
  const emailCredits = 100
  
  return {
    paymentAmount,
    platformMarkup,
    campaignFund,
    smsCredits,
    emailCredits,
    
    // What customer sees vs reality
    customerCharge: paymentAmount * RATES.displayedToCustomer,
    stripeFee: paymentAmount * RATES.actualStripeRate,
    yourProfit: paymentAmount * (RATES.displayedToCustomer - RATES.actualStripeRate),
    
    // Value proposition
    smsValue: smsCredits * RATES.smsUnitCost / 100, // Convert to dollars
    competitorCost: smsCredits > 1200 ? 195 : (smsCredits > 500 ? 95 : 25) // Textedly pricing
  }
}

function calculateMonthlyProjection(monthlyVolume) {
  const totalMarkup = monthlyVolume * RATES.platformMarkup
  const totalCampaignFund = totalMarkup * RATES.campaignFundRatio
  const totalSmsCredits = Math.floor(totalCampaignFund / RATES.smsUnitCost)
  
  // Determine tier and bonuses
  let tier = 'starter'
  let bonusCredits = 0
  
  if (monthlyVolume >= TIERS.enterprise.min) {
    tier = 'enterprise'
    bonusCredits = TIERS.enterprise.bonus
  } else if (monthlyVolume >= TIERS.professional.min) {
    tier = 'professional'
    bonusCredits = TIERS.professional.bonus
  } else if (monthlyVolume >= TIERS.growth.min) {
    tier = 'growth'
    bonusCredits = TIERS.growth.bonus
  }
  
  return {
    monthlyVolume,
    totalMarkup,
    totalCampaignFund,
    baseCredits: totalSmsCredits,
    bonusCredits,
    totalCredits: totalSmsCredits + bonusCredits,
    tier,
    
    // Business metrics
    platformRevenue: totalMarkup - totalCampaignFund,
    creditsCost: (totalSmsCredits + bonusCredits) * 0.008, // Actual SMS cost
    netProfit: (totalMarkup - totalCampaignFund) - ((totalSmsCredits + bonusCredits) * 0.008),
    
    // Customer value
    customerSaves: totalSmsCredits > 1200 ? 195 : (totalSmsCredits > 500 ? 95 : 0),
    effectiveRate: ((monthlyVolume * RATES.displayedToCustomer) - ((totalSmsCredits > 1200 ? 195 : (totalSmsCredits > 500 ? 95 : 0)) * 100)) / monthlyVolume
  }
}

)

// Test 1: Individual Payment Calculations
log('\n📊 TESTING INDIVIDUAL PAYMENT CALCULATIONS', 'yellow')
)

let allTestsPassed = true

TEST_SCENARIOS.forEach(scenario => {
  const calc = calculateCredits(scenario.amount)

  }`)
  : ${formatMoney(calc.platformMarkup)}`)
  : ${formatMoney(calc.campaignFund)}`)

  // Verify calculations
  const expectedMarkup = scenario.amount * 0.006
  const expectedFund = expectedMarkup * 0.5
  const expectedSms = Math.floor(expectedFund / 2.5)
  
  if (Math.abs(calc.platformMarkup - expectedMarkup) > 0.01) {
    log(`  ❌ Markup calculation error!`, 'red')
    allTestsPassed = false
  } else if (Math.abs(calc.campaignFund - expectedFund) > 0.01) {
    log(`  ❌ Campaign fund calculation error!`, 'red')
    allTestsPassed = false
  } else if (calc.smsCredits !== expectedSms) {
    log(`  ❌ SMS credit calculation error!`, 'red')
    allTestsPassed = false
  } else {
    log(`  ✅ All calculations correct`, 'green')
  }
  
  // Show value proposition
  }${colors.reset}`)
})

// Test 2: Monthly Volume Projections
log('\n\n📈 TESTING MONTHLY VOLUME PROJECTIONS', 'yellow')
)

const MONTHLY_VOLUMES = [
  { amount: 500000, label: '$5,000/month (Below Growth)' },
  { amount: 1500000, label: '$15,000/month (Growth Tier)' },
  { amount: 2500000, label: '$25,000/month (Growth Tier)' },
  { amount: 7500000, label: '$75,000/month (Professional)' },
  { amount: 15000000, label: '$150,000/month (Enterprise)' }
]

MONTHLY_VOLUMES.forEach(volume => {
  const projection = calculateMonthlyProjection(volume.amount)

  }${colors.reset}`)

  }`)
  }`)
  }${colors.reset}`)
  
  .toFixed(3)}%`)
})

// Test 3: Key Business Scenarios
log('\n\n💰 KEY BUSINESS SCENARIO VERIFICATION', 'yellow')
)

// Scenario 1: The $25k/month barbershop (your target customer)
const targetCustomer = calculateMonthlyProjection(2500000)
:')
}`)
}`)
)}`)
}`)

.toFixed(2)}`)
}`)

// Verify the key claim: 600 credits at $25k volume
const expectedCreditsAt25k = 600
const actualCreditsAt25k = targetCustomer.baseCredits + targetCustomer.bonusCredits

if (Math.abs(actualCreditsAt25k - expectedCreditsAt25k) <= 50) {
  log(`\n✅ KEY METRIC VERIFIED: ~600 credits at $25k volume (actual: ${actualCreditsAt25k})`, 'green')
} else {
  log(`\n❌ KEY METRIC FAILED: Expected ~600 credits, got ${actualCreditsAt25k}`, 'red')
  allTestsPassed = false
}

// Test 4: Competitive Analysis
log('\n\n🏆 COMPETITIVE ANALYSIS', 'yellow')
)

`)

// Final Summary
)
if (allTestsPassed) {
  log('✅ ALL CALCULATIONS VERIFIED AND WORKING!', 'green')
  
  log('\n📋 VERIFIED FORMULAS:', 'cyan')

  log('\n💡 BUSINESS MODEL CONFIRMED:', 'cyan')

} else {
  log('❌ SOME CALCULATIONS FAILED - CHECK THE MATH!', 'red')

}

// ROI Calculator
)
log('💵 QUICK ROI CALCULATOR', 'yellow')
)

const shopCounts = [10, 50, 100, 500, 1000]
shopCounts.forEach(count => {
  const monthlyRevenue = count * targetCustomer.netProfit / 100
  const annualRevenue = monthlyRevenue * 12
  .padStart(4)} shops @ $25k/month: ${colors.green}$${monthlyRevenue.toFixed(0)}/month ($${(annualRevenue/1000).toFixed(0)}k/year)${colors.reset}`)
})

)
log('📊 CALCULATION VERIFICATION COMPLETE', 'cyan')
)