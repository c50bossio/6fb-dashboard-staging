/**
 * Competitive Pricing Strategy for BookedBarber
 * How to offer lower fees while maintaining profitability
 */

class CompetitivePricingStrategy {
  constructor() {
    // Current Stripe standard pricing
    this.stripeStandardRates = {
      card: { percentage: 2.9, fixed: 0.30 },
      ach: { percentage: 0.8, fixed: 0.00, cap: 5.00 }
    };

    // Negotiated Stripe rates at different volumes
    this.stripeVolumeRates = {
      tier1: { // $0-80K/month
        card: { percentage: 2.9, fixed: 0.30 },
        ach: { percentage: 0.8, fixed: 0.00, cap: 5.00 }
      },
      tier2: { // $80K-250K/month
        card: { percentage: 2.5, fixed: 0.25 },
        ach: { percentage: 0.6, fixed: 0.00, cap: 5.00 }
      },
      tier3: { // $250K-1M/month
        card: { percentage: 2.2, fixed: 0.22 },
        ach: { percentage: 0.5, fixed: 0.00, cap: 5.00 }
      },
      tier4: { // $1M+/month (Interchange++ pricing)
        card: { percentage: 1.8, fixed: 0.10 }, // Interchange + 0.25%
        ach: { percentage: 0.4, fixed: 0.00, cap: 5.00 }
      }
    };

    // Competitive merchant pricing (what competitors charge)
    this.competitorPricing = {
      square: { percentage: 2.6, fixed: 0.10 }, // For in-person
      paypal: { percentage: 3.49, fixed: 0.49 }, // For online
      toast: { percentage: 2.49, fixed: 0.15 }, // Restaurant-specific
      clover: { percentage: 2.3, fixed: 0.10 }  // Retail POS
    };
  }

  /**
   * STRATEGY 1: Pass-Through Savings Model
   * As you get better rates, pass savings to merchants
   */
  getPassThroughPricing(monthlyVolume) {
    let stripeTier = 'tier1';
    if (monthlyVolume >= 1000000) stripeTier = 'tier4';
    else if (monthlyVolume >= 250000) stripeTier = 'tier3';
    else if (monthlyVolume >= 80000) stripeTier = 'tier2';

    const stripeRate = this.stripeVolumeRates[stripeTier];
    
    // Add minimal markup for sustainability
    const merchantPricing = {
      starter: { // New businesses
        card: {
          percentage: stripeRate.card.percentage + 0.4, // 0.4% markup
          fixed: stripeRate.card.fixed + 0.05
        },
        ach: {
          percentage: stripeRate.ach.percentage + 0.3, // 0.3% markup
          fixed: 0
        },
        effectiveRate: `${stripeRate.card.percentage + 0.4}% + $${stripeRate.card.fixed + 0.05}`
      },
      growth: { // Growing businesses (volume discount)
        card: {
          percentage: stripeRate.card.percentage + 0.25, // 0.25% markup
          fixed: stripeRate.card.fixed
        },
        ach: {
          percentage: stripeRate.ach.percentage + 0.2, // 0.2% markup
          fixed: 0
        },
        effectiveRate: `${stripeRate.card.percentage + 0.25}% + $${stripeRate.card.fixed}`
      },
      enterprise: { // High volume (best rates)
        card: {
          percentage: stripeRate.card.percentage + 0.1, // 0.1% markup
          fixed: stripeRate.card.fixed
        },
        ach: {
          percentage: stripeRate.ach.percentage + 0.1, // 0.1% markup
          fixed: 0
        },
        effectiveRate: `${stripeRate.card.percentage + 0.1}% + $${stripeRate.card.fixed}`
      }
    };

    return {
      stripeTier,
      stripeRates: stripeRate,
      merchantPricing,
      competitiveAdvantage: this.compareToCompetitors(merchantPricing.growth)
    };
  }

  /**
   * STRATEGY 2: Interchange++ Optimization
   * Use actual interchange rates for maximum savings
   */
  getInterchangePlusPricing() {
    // Real interchange rates (what banks charge)
    const interchangeRates = {
      debitCard: 0.05, // 0.05% + $0.22 (Durbin regulated)
      creditCard: {
        basic: 1.51, // Basic credit cards
        rewards: 1.65, // Rewards cards  
        premium: 2.10, // Premium rewards
        business: 2.50 // Business cards
      },
      average: 1.81 // Blended average
    };

    // With Interchange++ you pay:
    // Interchange + Network fees (0.14%) + Stripe markup (0.25%)
    const effectiveCost = interchangeRates.average + 0.14 + 0.25; // = 2.20%

    return {
      explanation: 'Interchange++ Pricing Model',
      yourCost: `${effectiveCost}% + $0.10`,
      merchantRate: `${effectiveCost + 0.2}% + $0.10`, // Only 0.2% markup!
      savings: 'Save 0.7% vs standard Stripe pricing',
      requirements: [
        'Minimum $250K monthly volume',
        'Apply through Stripe sales team',
        'Provide business documentation'
      ]
    };
  }

  /**
   * STRATEGY 3: Alternative Payment Methods
   * Reduce costs by promoting lower-cost payment methods
   */
  getAlternativePaymentStrategy() {
    return {
      ach: {
        cost: '0.8% (capped at $5)',
        merchantRate: '1.0% (capped at $5)',
        benefit: 'Save 65% vs card payments',
        useCase: 'Large invoices, recurring payments'
      },
      bankTransfers: {
        cost: '$0 (free via Plaid)',
        merchantRate: '$1 flat fee',
        benefit: 'Nearly free for any amount',
        useCase: 'High-value transactions over $500'
      },
      crypto: {
        cost: '1% (via Coinbase Commerce)',
        merchantRate: '1.5%',
        benefit: 'No chargebacks, instant settlement',
        useCase: 'Tech-savvy customers, international'
      },
      bnpl: { // Buy Now Pay Later
        cost: '2.9% (Affirm/Klarna)',
        merchantRate: '3.5%',
        benefit: 'Higher conversion, larger tickets',
        useCase: 'Services over $100'
      }
    };
  }

  /**
   * STRATEGY 4: Cost Reduction Techniques
   */
  getCostReductionTechniques() {
    return {
      cardOnFile: {
        technique: 'Store cards for repeat customers',
        savings: '0.10% lower interchange',
        implementation: 'Use Stripe Customer objects'
      },
      levelII_III: {
        technique: 'Provide additional transaction data',
        savings: '0.20-0.50% lower interchange',
        implementation: 'Add tax, customer code, invoice number'
      },
      networkTokens: {
        technique: 'Use network tokenization',
        savings: '0.10% lower + fewer declines',
        implementation: 'Enable in Stripe Dashboard'
      },
      localPaymentMethods: {
        technique: 'Offer local payment options',
        savings: '1-2% lower than cards',
        implementation: 'iDEAL, SEPA, Alipay, etc.'
      },
      preventDeclines: {
        technique: 'Reduce failed payments',
        savings: 'Save retry fees',
        implementation: 'Smart retry logic, card updater'
      }
    };
  }

  /**
   * Compare your rates to competitors
   */
  compareToCompetitors(yourPricing) {
    const comparisons = {};
    
    for (const [name, rates] of Object.entries(this.competitorPricing)) {
      const yourRate = yourPricing.card.percentage + (yourPricing.card.fixed * 100 / 100); // Normalized
      const theirRate = rates.percentage + (rates.fixed * 100 / 100);
      
      comparisons[name] = {
        theirRate: `${rates.percentage}% + $${rates.fixed}`,
        yourRate: `${yourPricing.card.percentage}% + $${yourPricing.card.fixed}`,
        youSave: yourRate < theirRate ? 
          `${(theirRate - yourRate).toFixed(2)}% cheaper` : 
          `${(yourRate - theirRate).toFixed(2)}% more`
      };
    }
    
    return comparisons;
  }

  /**
   * Implementation roadmap
   */
  getImplementationRoadmap() {
    return {
      immediate: [
        '1. Enable ACH payments (0.8% vs 2.9%)',
        '2. Implement card-on-file for lower interchange',
        '3. Add Level II/III data for B2B transactions',
        '4. Enable network tokenization in Stripe'
      ],
      month1: [
        '1. Reach out to Stripe for volume pricing',
        '2. Implement bank transfer option via Plaid',
        '3. Add invoice/bulk payment features',
        '4. Optimize retry logic for failed payments'
      ],
      month3: [
        '1. Qualify for $80K+ volume tier',
        '2. Apply for Interchange++ pricing',
        '3. Launch "BookedBarber Preferred" ACH program',
        '4. Implement dynamic routing for lowest cost'
      ],
      month6: [
        '1. Negotiate custom enterprise deal with Stripe',
        '2. Consider becoming a PayFac for ultimate control',
        '3. Launch white-label payment solution',
        '4. Explore international payment corridors'
      ]
    };
  }
}

// Calculate and display competitive strategy
const strategy = new CompetitivePricingStrategy();

console.log('💰 BookedBarber Competitive Pricing Strategy\n');
console.log('='.repeat(50));

// Show pass-through pricing at different volumes
console.log('\n📊 Volume-Based Pricing Strategy:');
const volumes = [50000, 100000, 300000, 1500000];
volumes.forEach(volume => {
  const pricing = strategy.getPassThroughPricing(volume);
  console.log(`\nAt $${volume.toLocaleString()}/month volume:`);
  console.log(`  Stripe charges you: ${pricing.stripeRates.card.percentage}% + $${pricing.stripeRates.card.fixed}`);
  console.log(`  You charge (Growth tier): ${pricing.merchantPricing.growth.effectiveRate}`);
  console.log(`  Your margin: ${(pricing.merchantPricing.growth.card.percentage - pricing.stripeRates.card.percentage).toFixed(2)}%`);
});

// Show Interchange++ opportunity
console.log('\n💎 Interchange++ Opportunity:');
const interchangePlus = strategy.getInterchangePlusPricing();
console.log(`  Your cost: ${interchangePlus.yourCost}`);
console.log(`  Merchant rate: ${interchangePlus.merchantRate}`);
console.log(`  ${interchangePlus.savings}`);

// Show alternative payments
console.log('\n🎯 Alternative Payment Methods:');
const alternatives = strategy.getAlternativePaymentStrategy();
console.log(`  ACH: ${alternatives.ach.merchantRate} - ${alternatives.ach.benefit}`);
console.log(`  Bank Transfer: ${alternatives.bankTransfers.merchantRate} - ${alternatives.bankTransfers.benefit}`);

// Show cost reduction techniques
console.log('\n⚡ Quick Wins for Lower Costs:');
const techniques = strategy.getCostReductionTechniques();
Object.values(techniques).slice(0, 3).forEach(t => {
  console.log(`  • ${t.technique}: Save ${t.savings}`);
});

// Implementation roadmap
console.log('\n🗓️ Implementation Roadmap:');
const roadmap = strategy.getImplementationRoadmap();
console.log('Immediate Actions:');
roadmap.immediate.forEach(action => console.log(`  ${action}`));

module.exports = { CompetitivePricingStrategy };