/**
 * Platform Fee Calculator for BookedBarber Revenue
 * Implements multiple revenue streams through payment processing
 */

class PlatformFeeCalculator {
  constructor() {
    // Stripe's base costs (what you pay Stripe)
    this.stripeCosts = {
      card: {
        percentage: 2.9,
        fixed: 0.30
      },
      ach: {
        percentage: 0.8,
        fixed: 0.00,
        cap: 5.00
      },
      instantPayout: {
        percentage: 1.0,
        fixed: 0.00
      }
    };

    // Your platform fees (what merchants pay you)
    // NO MARKUP STRATEGY - Match Stripe exactly to build trust & volume
    this.platformFees = {
      // ALL TIERS - Same transparent pricing (2.9% + $0.30)
      barber: {
        card: {
          percentage: 2.9,   // ZERO markup - match Stripe exactly
          fixed: 0.30        // ZERO markup - match Stripe exactly
        },
        ach: {
          percentage: 0.8,   // ZERO markup on ACH too
          fixed: 0.00,
          cap: 5.00          // Same cap as Stripe
        },
        instantPayout: {
          percentage: 1.0,   // Only charge for instant (premium feature)
          fixed: 0.50        // Small fee for instant access
        }
      },
      
      // Same for all tiers - differentiate with features not fees
      shop_owner: {
        card: {
          percentage: 2.9,   // ZERO markup
          fixed: 0.30        // ZERO markup
        },
        ach: {
          percentage: 0.8,   // ZERO markup
          fixed: 0.00,
          cap: 5.00
        },
        instantPayout: {
          percentage: 1.0,   // Premium feature
          fixed: 0.25        // Slightly lower for loyalty
        }
      },
      
      enterprise: {
        card: {
          percentage: 2.9,   // ZERO markup
          fixed: 0.30        // ZERO markup
        },
        ach: {
          percentage: 0.8,   // ZERO markup
          fixed: 0.00,
          cap: 5.00
        },
        instantPayout: {
          percentage: 1.0,   // Premium feature
          fixed: 0.00        // Free instant for enterprise
        }
      }
    };
  }

  /**
   * Calculate platform revenue from a transaction
   * @param {number} amount - Transaction amount in dollars
   * @param {string} paymentMethod - 'card' or 'ach'
   * @param {string} tier - Subscription tier
   * @returns {object} Fee breakdown and platform revenue
   */
  calculateRevenue(amount, paymentMethod = 'card', tier = 'barber') {
    const stripeCost = this.calculateStripeCost(amount, paymentMethod);
    const merchantFee = this.calculateMerchantFee(amount, paymentMethod, tier);
    const platformRevenue = merchantFee.total - stripeCost.total;
    
    return {
      transactionAmount: amount,
      stripeCost: stripeCost,
      merchantFee: merchantFee,
      platformRevenue: {
        amount: platformRevenue,
        percentage: (platformRevenue / amount) * 100
      },
      netMerchantPayout: amount - merchantFee.total
    };
  }

  /**
   * Calculate what Stripe charges the platform
   */
  calculateStripeCost(amount, paymentMethod) {
    const cost = this.stripeCosts[paymentMethod];
    let percentageFee = (amount * cost.percentage) / 100;
    
    // Apply cap for ACH if applicable
    if (paymentMethod === 'ach' && cost.cap) {
      percentageFee = Math.min(percentageFee, cost.cap);
    }
    
    const total = percentageFee + cost.fixed;
    
    return {
      percentage: percentageFee,
      fixed: cost.fixed,
      total: total
    };
  }

  /**
   * Calculate what the merchant pays to the platform
   */
  calculateMerchantFee(amount, paymentMethod, tier) {
    const fee = this.platformFees[tier][paymentMethod];
    let percentageFee = (amount * fee.percentage) / 100;
    
    // Apply cap for ACH if applicable
    if (paymentMethod === 'ach' && fee.cap) {
      percentageFee = Math.min(percentageFee, fee.cap);
    }
    
    const total = percentageFee + fee.fixed;
    
    return {
      percentage: percentageFee,
      fixed: fee.fixed,
      total: total,
      rate: fee.percentage
    };
  }

  /**
   * Project monthly revenue based on transaction volume
   */
  projectMonthlyRevenue(volumeByTier) {
    let totalRevenue = 0;
    const breakdown = {};
    
    for (const [tier, volumes] of Object.entries(volumeByTier)) {
      breakdown[tier] = {
        card: this.calculateRevenue(volumes.card || 0, 'card', tier),
        ach: this.calculateRevenue(volumes.ach || 0, 'ach', tier)
      };
      
      totalRevenue += breakdown[tier].card.platformRevenue.amount;
      totalRevenue += breakdown[tier].ach.platformRevenue.amount;
    }
    
    return {
      totalMonthlyRevenue: totalRevenue,
      annualizedRevenue: totalRevenue * 12,
      breakdown: breakdown
    };
  }

  /**
   * Calculate instant payout fees (additional revenue stream)
   */
  calculateInstantPayoutFee(amount, tier = 'barber') {
    const stripeCost = (amount * this.stripeCosts.instantPayout.percentage) / 100;
    const fee = this.platformFees[tier].instantPayout;
    const merchantFee = (amount * fee.percentage) / 100 + fee.fixed;
    
    return {
      merchantPays: merchantFee,
      stripeCost: stripeCost,
      platformRevenue: merchantFee - stripeCost
    };
  }
}

// Example usage and revenue projections
function demonstrateRevenueModel() {
  const calculator = new PlatformFeeCalculator();
  
  console.log('💰 BookedBarber Revenue Model Examples\n');
  console.log('=' .repeat(50));
  
  // Example 1: Single $100 card transaction
  console.log('\n📊 Example 1: $100 Card Payment (Barber Tier)');
  const cardExample = calculator.calculateRevenue(100, 'card', 'barber');
  console.log(`Transaction Amount: $${cardExample.transactionAmount}`);
  console.log(`Stripe Charges You: $${cardExample.stripeCost.total.toFixed(2)}`);
  console.log(`Merchant Pays: $${cardExample.merchantFee.total.toFixed(2)}`);
  console.log(`YOUR REVENUE: $${cardExample.platformRevenue.amount.toFixed(2)}`);
  
  // Example 2: $1000 ACH payment (much better margins!)
  console.log('\n📊 Example 2: $1,000 ACH Payment (Shop Owner Tier)');
  const achExample = calculator.calculateRevenue(1000, 'ach', 'shop_owner');
  console.log(`Transaction Amount: $${achExample.transactionAmount}`);
  console.log(`Stripe Charges You: $${achExample.stripeCost.total.toFixed(2)}`);
  console.log(`Merchant Pays: $${achExample.merchantFee.total.toFixed(2)}`);
  console.log(`YOUR REVENUE: $${achExample.platformRevenue.amount.toFixed(2)}`);
  
  // Example 3: Monthly projections
  console.log('\n📊 Example 3: Monthly Revenue Projections');
  console.log('Assuming moderate volume across tiers:');
  
  const monthlyVolumes = {
    barber: {
      card: 50000,   // $50k in card payments
      ach: 10000     // $10k in ACH payments
    },
    shop_owner: {
      card: 200000,  // $200k in card payments
      ach: 100000    // $100k in ACH payments
    },
    enterprise: {
      card: 500000,  // $500k in card payments
      ach: 300000    // $300k in ACH payments
    }
  };
  
  const projections = calculator.projectMonthlyRevenue(monthlyVolumes);
  console.log(`\nTotal Monthly Platform Revenue: $${projections.totalMonthlyRevenue.toFixed(2)}`);
  console.log(`Projected Annual Revenue: $${projections.annualizedRevenue.toFixed(2)}`);
  
  // Instant payout revenue (additional stream)
  console.log('\n📊 Example 4: Instant Payout Fees');
  const instantPayout = calculator.calculateInstantPayoutFee(500, 'barber');
  console.log(`Payout Amount: $500`);
  console.log(`Merchant Pays for Instant: $${instantPayout.merchantPays.toFixed(2)}`);
  console.log(`YOUR INSTANT PAYOUT REVENUE: $${instantPayout.platformRevenue.toFixed(2)}`);
}

module.exports = {
  PlatformFeeCalculator,
  demonstrateRevenueModel
};

// Run demonstration if called directly
if (require.main === module) {
  demonstrateRevenueModel();
}