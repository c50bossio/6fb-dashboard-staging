#!/usr/bin/env node

/**
 * FIXED CALCULATION VERIFICATION
 * Properly calculates credits per transaction, not total volume
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

// CRITICAL FIX: Credits are earned PER TRANSACTION, not on total volume
const RATES = {
  displayedToCustomer: 0.0295,  // 2.95% shown to customer
  actualStripeRate: 0.029,      // 2.9% paid to Stripe
  platformMarkup: 0.006,         // 0.6% platform markup (hidden)
  campaignFundRatio: 0.5,        // 50% of markup goes to credits
  smsUnitCost: 2.5,              // $0.025 per SMS in cents
}

// Average transaction size for barbershops
const AVERAGE_TRANSACTION = 4500  // $45 average haircut

function calculateCreditsPerTransaction(paymentAmount) {
  // Per-transaction calculation (this is what actually happens)
  const platformMarkup = paymentAmount * RATES.platformMarkup
  const campaignFund = platformMarkup * RATES.campaignFundRatio
  const smsCredits = Math.floor(campaignFund / RATES.smsUnitCost)
  const emailCredits = 100
  
  return {
    paymentAmount,
    platformMarkup,
    campaignFund,
    smsCredits,
    emailCredits,
    smsValue: smsCredits * RATES.smsUnitCost / 100
  }
}

function calculateMonthlyCredits(monthlyVolume, avgTransactionSize = AVERAGE_TRANSACTION) {
  // Calculate number of transactions
  const numTransactions = Math.floor(monthlyVolume / avgTransactionSize)
  
  // Calculate credits per transaction
  const perTransaction = calculateCreditsPerTransaction(avgTransactionSize)
  
  // Total monthly credits
  const totalSmsCredits = perTransaction.smsCredits * numTransactions
  const totalEmailCredits = perTransaction.emailCredits * numTransactions
  
  // Tier bonuses based on volume
  let tier = 'starter'
  let bonusCredits = 0
  
  if (monthlyVolume >= 10000000) { // $100k+
    tier = 'enterprise'
    bonusCredits = 500
  } else if (monthlyVolume >= 5000000) { // $50k+
    tier = 'professional'
    bonusCredits = 200
  } else if (monthlyVolume >= 1000000) { // $10k+
    tier = 'growth'
    bonusCredits = 50
  }
  
  // Business calculations
  const totalMarkup = monthlyVolume * RATES.platformMarkup
  const totalCampaignFund = totalMarkup * RATES.campaignFundRatio
  const platformRevenue = totalMarkup - totalCampaignFund
  const actualSmsCost = (totalSmsCredits + bonusCredits) * 0.008 // Twilio cost $0.008
  const netProfit = platformRevenue - actualSmsCost
  
  return {
    monthlyVolume,
    avgTransactionSize,
    numTransactions,
    perTransactionCredits: perTransaction.smsCredits,
    baseCredits: totalSmsCredits,
    bonusCredits,
    totalCredits: totalSmsCredits + bonusCredits,
    totalEmailCredits,
    tier,
    
    // Financials
    totalMarkup,
    totalCampaignFund,
    platformRevenue,
    actualSmsCost,
    netProfit,
    
    // Customer value
    creditValue: (totalSmsCredits + bonusCredits) * 0.025,
    textedlyComparison: totalSmsCredits > 1200 ? 195 : (totalSmsCredits > 500 ? 95 : 25)
  }
}

)

// Test individual transactions
log('\n📊 PER-TRANSACTION CREDIT CALCULATIONS', 'yellow')
)

const TRANSACTION_SIZES = [
  { amount: 3000, label: 'Basic Cut ($30)' },
  { amount: 4500, label: 'Average Service ($45)' },
  { amount: 6000, label: 'Premium Cut ($60)' },
  { amount: 10000, label: 'Package Deal ($100)' }
]

TRANSACTION_SIZES.forEach(transaction => {
  const calc = calculateCreditsPerTransaction(transaction.amount)
  
  : ${formatMoney(calc.platformMarkup)}`)
  : ${formatMoney(calc.campaignFund)}`)

  log(`  ✅ Each transaction earns ${calc.smsCredits} SMS credits`, 'green')
})

// Test monthly projections with proper per-transaction calculation
log('\n\n📈 MONTHLY CREDIT PROJECTIONS (CORRECTED)', 'yellow')
)

const MONTHLY_SCENARIOS = [
  { volume: 500000, label: '$5,000/month' },
  { volume: 1000000, label: '$10,000/month' },
  { volume: 2500000, label: '$25,000/month (TARGET)' },
  { volume: 5000000, label: '$50,000/month' },
  { volume: 10000000, label: '$100,000/month' }
]

let targetVerified = false

MONTHLY_SCENARIOS.forEach(scenario => {
  const projection = calculateMonthlyCredits(scenario.volume)

  } avg`)
  
  : ${projection.baseCredits}`)
  }${colors.reset}`)

  }`)
  }`)
  
  }${colors.reset}`)
  
  // Verify the $25k target
  if (scenario.volume === 2500000) {
    if (projection.totalCredits >= 550 && projection.totalCredits <= 650) {
      log(`  ✅ TARGET VERIFIED: ~600 credits at $25k (actual: ${projection.totalCredits})`, 'green')
      targetVerified = true
    } else {
      log(`  ⚠️  Credits at $25k: ${projection.totalCredits} (expected ~600)`, 'yellow')
    }
  }
})

// Business model verification
log('\n\n💰 BUSINESS MODEL VERIFICATION', 'yellow')
)

const target25k = calculateMonthlyCredits(2500000)

}`)

: ${formatMoney(2500000 * RATES.displayedToCustomer)}`)
: ${formatMoney(2500000 * RATES.actualStripeRate)}`)
: ${formatMoney(2500000 * 0.0005)}`)
: ${formatMoney(target25k.totalMarkup)}`)
: ${formatMoney(target25k.totalCampaignFund)}`)
}`)
}`)
}${colors.reset}`)

}`)

// ROI at scale
log('\n\n📈 BUSINESS AT SCALE', 'yellow')
)

const scales = [10, 50, 100, 500, 1000]
scales.forEach(count => {
  const monthly = count * target25k.netProfit / 100
  const annual = monthly * 12
  .padStart(4)} shops: ${colors.green}$${monthly.toFixed(0)}/mo ($${(annual/1000).toFixed(0)}k/yr)${colors.reset}`)
})

// Final summary
)
if (targetVerified) {
  log('✅ ALL CALCULATIONS VERIFIED!', 'green')
  
  log('\n📋 CONFIRMED FORMULAS:', 'cyan')

  ')
  
  log('\n✅ KEY METRICS CONFIRMED:', 'green')
  .smsCredits} credits`)

  }/month`)
  
} else {
  log('⚠️  CALCULATIONS NEED ADJUSTMENT', 'yellow')
}

)