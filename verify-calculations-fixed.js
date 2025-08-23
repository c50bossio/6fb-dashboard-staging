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
  console.log(`${colors[color]}${message}${colors.reset}`)
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

console.log(colors.bold + colors.cyan)
console.log('🔢 CORRECTED PAYMENT PROCESSING CALCULATIONS')
console.log('━'.repeat(60))
console.log(colors.reset)

// Test individual transactions
log('\n📊 PER-TRANSACTION CREDIT CALCULATIONS', 'yellow')
console.log('─'.repeat(60))

const TRANSACTION_SIZES = [
  { amount: 3000, label: 'Basic Cut ($30)' },
  { amount: 4500, label: 'Average Service ($45)' },
  { amount: 6000, label: 'Premium Cut ($60)' },
  { amount: 10000, label: 'Package Deal ($100)' }
]

TRANSACTION_SIZES.forEach(transaction => {
  const calc = calculateCreditsPerTransaction(transaction.amount)
  console.log(`\n${transaction.label}:`)
  console.log(`  Platform Markup (0.6%): ${formatMoney(calc.platformMarkup)}`)
  console.log(`  Campaign Fund (50%): ${formatMoney(calc.campaignFund)}`)
  console.log(`  SMS Credits: ${calc.smsCredits}`)
  console.log(`  Email Credits: ${calc.emailCredits}`)
  log(`  ✅ Each transaction earns ${calc.smsCredits} SMS credits`, 'green')
})

// Test monthly projections with proper per-transaction calculation
log('\n\n📈 MONTHLY CREDIT PROJECTIONS (CORRECTED)', 'yellow')
console.log('─'.repeat(60))

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
  
  console.log(`\n${scenario.label}:`)
  console.log(`  Transactions: ${projection.numTransactions} @ ${formatMoney(projection.avgTransactionSize)} avg`)
  console.log(`  Credits per transaction: ${projection.perTransactionCredits}`)
  console.log(`  Base credits (${projection.numTransactions} × ${projection.perTransactionCredits}): ${projection.baseCredits}`)
  console.log(`  Tier: ${colors.bold}${projection.tier.toUpperCase()}${colors.reset}`)
  console.log(`  Bonus credits: ${projection.bonusCredits}`)
  console.log(`  ${colors.green}Total SMS credits: ${projection.totalCredits}${colors.reset}`)
  console.log(`  Total email credits: ${projection.totalEmailCredits.toLocaleString()}`)
  console.log(`  Credit value: $${projection.creditValue.toFixed(2)}`)
  console.log(`  vs Textedly: Save $${projection.textedlyComparison}/month`)
  console.log(`  Your net profit: ${colors.green}${formatMoney(projection.netProfit)}${colors.reset}`)
  
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
console.log('─'.repeat(60))

const target25k = calculateMonthlyCredits(2500000)

console.log('\n🎯 $25,000/month Barbershop:')
console.log(`  Average transaction: ${formatMoney(AVERAGE_TRANSACTION)}`)
console.log(`  Transactions per month: ${target25k.numTransactions}`)
console.log(`  Credits per transaction: ${target25k.perTransactionCredits}`)
console.log(`  Base monthly credits: ${target25k.baseCredits}`)
console.log(`  Growth tier bonus: ${target25k.bonusCredits}`)
console.log(`  ${colors.bold}${colors.green}Total credits: ${target25k.totalCredits}${colors.reset}`)

console.log('\n💵 Revenue Breakdown:')
console.log(`  Customer pays (2.95%): ${formatMoney(2500000 * RATES.displayedToCustomer)}`)
console.log(`  Stripe gets (2.9%): ${formatMoney(2500000 * RATES.actualStripeRate)}`)
console.log(`  Visible margin (0.05%): ${formatMoney(2500000 * 0.0005)}`)
console.log(`  Hidden markup (0.6%): ${formatMoney(target25k.totalMarkup)}`)
console.log(`  Campaign fund (50% of markup): ${formatMoney(target25k.totalCampaignFund)}`)
console.log(`  Platform keeps: ${formatMoney(target25k.platformRevenue)}`)
console.log(`  SMS delivery cost: ${formatMoney(target25k.actualSmsCost)}`)
console.log(`  ${colors.bold}${colors.green}Net profit: ${formatMoney(target25k.netProfit)}${colors.reset}`)

console.log('\n📊 Value Proposition:')
console.log(`  Customer gets: ${target25k.totalCredits} SMS credits`)
console.log(`  Worth: $${target25k.creditValue.toFixed(2)}`)
console.log(`  Textedly would charge: $${target25k.textedlyComparison}`)
console.log(`  ${colors.cyan}Customer saves: $${target25k.textedlyComparison}/month${colors.reset}`)

// ROI at scale
log('\n\n📈 BUSINESS AT SCALE', 'yellow')
console.log('─'.repeat(60))

const scales = [10, 50, 100, 500, 1000]
scales.forEach(count => {
  const monthly = count * target25k.netProfit / 100
  const annual = monthly * 12
  console.log(`${count.toString().padStart(4)} shops: ${colors.green}$${monthly.toFixed(0)}/mo ($${(annual/1000).toFixed(0)}k/yr)${colors.reset}`)
})

// Final summary
console.log('\n' + '═'.repeat(60))
if (targetVerified) {
  log('✅ ALL CALCULATIONS VERIFIED!', 'green')
  
  log('\n📋 CONFIRMED FORMULAS:', 'cyan')
  console.log('  Per Transaction:')
  console.log('    • Markup = Transaction × 0.6%')
  console.log('    • Fund = Markup × 50%')
  console.log('    • Credits = Fund ÷ $0.025')
  console.log('  Monthly Total:')
  console.log('    • Credits = Per-transaction × Number of transactions')
  console.log('    • Plus tier bonuses (50-500 credits)')
  
  log('\n✅ KEY METRICS CONFIRMED:', 'green')
  console.log(`  • $45 transaction → ${calculateCreditsPerTransaction(4500).smsCredits} credits`)
  console.log(`  • $25k/month → ~${target25k.totalCredits} total credits`)
  console.log(`  • Customer saves $${target25k.textedlyComparison}/month`)
  console.log(`  • You profit ${formatMoney(target25k.netProfit)}/month`)
  console.log(`  • Win-win business model verified!`)
} else {
  log('⚠️  CALCULATIONS NEED ADJUSTMENT', 'yellow')
}

console.log('═'.repeat(60))