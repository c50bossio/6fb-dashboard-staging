#!/usr/bin/env node

/**
 * FINAL CALCULATION VERIFICATION
 * With adjusted formula to match business promise of ~600 credits at $25k
 */

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m',
  underline: '\x1b[4m'
}

function log(message, color = 'reset') {
  
}

function formatMoney(cents) {
  return `$${(cents / 100).toFixed(2)}`
}

// ADJUSTED RATES FOR BUSINESS MODEL
const RATES = {
  displayedToCustomer: 0.0295,     // 2.95% shown to customer
  actualStripeRate: 0.029,          // 2.9% paid to Stripe  
  platformMarkup: 0.006,            // 0.6% platform markup
  campaignFundRatio: 0.5,           // 50% of markup goes to credits
  
  // ADJUSTED: Changed from $0.025 to $0.10 per credit
  // This makes credits more valuable and reduces quantity
  smsUnitValue: 10.0,              // $0.10 per SMS credit (was 2.5 cents)
  
  // Actual SMS costs
  twilioSmsCost: 0.8,              // $0.008 actual cost per SMS
  customerPerceivedValue: 2.5      // $0.025 what we tell customers
}

const AVERAGE_TRANSACTION = 4500  // $45 average service

function calculateCreditsPerTransaction(amount) {
  const platformMarkup = amount * RATES.platformMarkup
  const campaignFund = platformMarkup * RATES.campaignFundRatio
  const smsCredits = Math.floor(campaignFund / RATES.smsUnitValue)
  
  return {
    amount,
    platformMarkup,
    campaignFund,
    smsCredits,
    emailCredits: 100,
    
    // Value calculations
    actualCost: smsCredits * RATES.twilioSmsCost / 100,
    perceivedValue: smsCredits * RATES.customerPerceivedValue / 100
  }
}

function calculateMonthlyMetrics(monthlyVolume, avgTransaction = AVERAGE_TRANSACTION) {
  const numTransactions = Math.floor(monthlyVolume / avgTransaction)
  const perTx = calculateCreditsPerTransaction(avgTransaction)
  
  // Base credits from transactions
  const baseCredits = perTx.smsCredits * numTransactions
  
  // Tier bonuses
  let tier = 'starter'
  let bonusCredits = 0
  
  if (monthlyVolume >= 10000000) {
    tier = 'enterprise'
    bonusCredits = 500
  } else if (monthlyVolume >= 5000000) {
    tier = 'professional'
    bonusCredits = 200
  } else if (monthlyVolume >= 1000000) {
    tier = 'growth'
    bonusCredits = 50
  }
  
  const totalCredits = baseCredits + bonusCredits
  
  // Financial calculations
  const totalMarkup = monthlyVolume * RATES.platformMarkup
  const campaignFund = totalMarkup * RATES.campaignFundRatio
  const platformRevenue = totalMarkup - campaignFund
  const actualSmsCost = totalCredits * RATES.twilioSmsCost / 100
  const netProfit = platformRevenue - actualSmsCost
  
  // Customer value
  const perceivedValue = totalCredits * RATES.customerPerceivedValue / 100
  const textedlySavings = totalCredits > 1200 ? 195 : (totalCredits > 500 ? 95 : 25)
  
  return {
    volume: monthlyVolume,
    transactions: numTransactions,
    creditsPerTx: perTx.smsCredits,
    baseCredits,
    bonusCredits,
    totalCredits,
    tier,
    
    // Money flow
    customerPays: monthlyVolume * RATES.displayedToCustomer / 100,
    stripeTakes: monthlyVolume * RATES.actualStripeRate / 100,
    visibleMargin: monthlyVolume * 0.0005 / 100,
    hiddenMarkup: totalMarkup / 100,
    campaignFund: campaignFund / 100,
    platformRevenue: platformRevenue / 100,
    smsCost: actualSmsCost,
    netProfit,
    
    // Value prop
    perceivedValue,
    textedlySavings
  }
}

// Header

)

// Test per-transaction credits
log('\n📱 SMS CREDITS PER TRANSACTION', 'yellow')
)

const transactions = [
  { amount: 3000, label: 'Basic Cut ($30)' },
  { amount: 4500, label: 'Average Service ($45)' },
  { amount: 6000, label: 'Premium Cut ($60)' },
  { amount: 10000, label: 'Package Deal ($100)' }
]

transactions.forEach(tx => {
  const calc = calculateCreditsPerTransaction(tx.amount)
  
  : ${formatMoney(calc.platformMarkup)}`)
  }`)
  
  }`)
  }`)
})

// Monthly projections
log('\n\n📊 MONTHLY PROJECTIONS', 'yellow')
)

const monthlyVolumes = [
  5000 * 100,    // $5k
  10000 * 100,   // $10k
  25000 * 100,   // $25k TARGET
  50000 * 100,   // $50k
  100000 * 100   // $100k
]

let targetMet = false

monthlyVolumes.forEach(volume => {
  const m = calculateMonthlyMetrics(volume)
  const volumeStr = `$${(volume/100).toLocaleString()}/month`

  }${colors.reset} (+${m.bonusCredits} bonus)`)
  
  }`)
  
  }/mo${colors.reset}`)
  
  // Check $25k target
  if (volume === 2500000) {
    if (m.totalCredits >= 550 && m.totalCredits <= 650) {
      log(`  ✅ TARGET MET: ${m.totalCredits} credits (goal: ~600)`, 'green')
      targetMet = true
    } else {
      log(`  ❌ NEEDS ADJUSTMENT: ${m.totalCredits} credits (goal: ~600)`, 'red')
    }
  }
})

// Detailed $25k breakdown
const target = calculateMonthlyMetrics(2500000)

log('\n\n💰 $25,000/MONTH DETAILED BREAKDOWN', 'yellow')
)

: $${target.customerPays.toFixed(2)}`)
: $${target.stripeTakes.toFixed(2)}`)
}`)
: $${target.hiddenMarkup.toFixed(2)}`)
: $${target.campaignFund.toFixed(2)}`)
: $${target.platformRevenue.toFixed(2)}`)
}`)
}/month${colors.reset}`)

}`)

// Scale projections
log('\n\n📈 REVENUE AT SCALE', 'yellow')
)

const shopCounts = [1, 10, 50, 100, 500, 1000]
shopCounts.forEach(count => {
  const monthly = count * target.netProfit
  const annual = monthly * 12
  const label = count === 1 ? 'shop' : 'shops'
  .padStart(4)} ${label}: ${colors.green}$${monthly.toFixed(0)}/mo ($${(annual/1000).toFixed(0)}k/yr)${colors.reset}`)
})

// Final verdict
)

if (targetMet) {
  log('✅ BUSINESS MODEL VERIFIED AND WORKING!', 'green')

  : ${colors.green}YES${colors.reset}`)
  
  }/month${colors.reset}`)

} else {
  log('⚠️  FORMULA NEEDS FINE-TUNING', 'yellow')

}

)