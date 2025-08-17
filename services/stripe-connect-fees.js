/**
 * Stripe Connect Fee Implementation
 * Handles platform fees and revenue generation
 */

const Stripe = require('stripe');
const { PlatformFeeCalculator } = require('./platform-fees');

class StripeConnectFees {
  constructor(stripeSecretKey) {
    this.stripe = new Stripe(stripeSecretKey);
    this.calculator = new PlatformFeeCalculator();
  }

  /**
   * Create a payment intent with platform fees
   * This is how you actually collect your markup
   */
  async createPaymentWithPlatformFee(params) {
    const {
      amount,
      currency = 'usd',
      connectedAccountId,
      customerEmail,
      description,
      paymentMethod = 'card',
      subscriptionTier = 'barber'
    } = params;

    // Calculate platform fee based on tier and payment method
    const feeCalculation = this.calculator.calculateRevenue(
      amount / 100, // Convert from cents to dollars
      paymentMethod,
      subscriptionTier
    );

    // Platform fee in cents (what you keep)
    const applicationFeeAmount = Math.round(
      feeCalculation.platformRevenue.amount * 100
    );

    try {
      // Create payment intent with your platform fee
      const paymentIntent = await this.stripe.paymentIntents.create({
        amount: amount, // Total amount in cents
        currency: currency,
        application_fee_amount: applicationFeeAmount, // Your revenue!
        transfer_data: {
          destination: connectedAccountId, // Merchant's Connect account
        },
        metadata: {
          platform_fee_percentage: feeCalculation.merchantFee.rate,
          payment_method_type: paymentMethod,
          subscription_tier: subscriptionTier,
          customer_email: customerEmail
        },
        description: description
      });

      return {
        success: true,
        paymentIntent: paymentIntent,
        feeBreakdown: {
          totalAmount: amount / 100,
          platformFee: applicationFeeAmount / 100,
          merchantReceives: (amount - applicationFeeAmount) / 100,
          feePercentage: feeCalculation.merchantFee.rate
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Create ACH payment with lower fees (higher margin for you!)
   */
  async createACHPayment(params) {
    const {
      amount,
      connectedAccountId,
      bankAccountToken,
      customerEmail,
      subscriptionTier = 'barber'
    } = params;

    // ACH has much better margins!
    const feeCalculation = this.calculator.calculateRevenue(
      amount / 100,
      'ach',
      subscriptionTier
    );

    const applicationFeeAmount = Math.round(
      feeCalculation.platformRevenue.amount * 100
    );

    try {
      // Create ACH charge
      const charge = await this.stripe.charges.create({
        amount: amount,
        currency: 'usd',
        source: bankAccountToken,
        application_fee_amount: applicationFeeAmount, // Your higher margin!
        transfer_data: {
          destination: connectedAccountId
        },
        metadata: {
          payment_type: 'ach',
          platform_fee: applicationFeeAmount,
          tier: subscriptionTier
        }
      });

      return {
        success: true,
        charge: charge,
        feeBreakdown: {
          totalAmount: amount / 100,
          platformFee: applicationFeeAmount / 100,
          merchantReceives: (amount - applicationFeeAmount) / 100,
          achSavings: 'Merchant saves ~50% on fees vs card!'
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Handle instant payouts with additional fees
   * Another revenue stream!
   */
  async createInstantPayout(params) {
    const {
      amount,
      connectedAccountId,
      subscriptionTier = 'barber'
    } = params;

    const instantFee = this.calculator.calculateInstantPayoutFee(
      amount / 100,
      subscriptionTier
    );

    try {
      // Create instant payout with fee
      const payout = await this.stripe.payouts.create(
        {
          amount: amount - Math.round(instantFee.merchantPays * 100), // Deduct fee
          currency: 'usd',
          method: 'instant',
          metadata: {
            instant_fee: instantFee.merchantPays,
            platform_revenue: instantFee.platformRevenue
          }
        },
        {
          stripeAccount: connectedAccountId
        }
      );

      // Record the platform fee as revenue
      await this.recordPlatformRevenue({
        type: 'instant_payout_fee',
        amount: instantFee.platformRevenue,
        connectedAccountId: connectedAccountId
      });

      return {
        success: true,
        payout: payout,
        instantFee: instantFee.merchantPays,
        platformRevenue: instantFee.platformRevenue
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Set up subscription with recurring platform fees
   */
  async createSubscriptionWithFees(params) {
    const {
      customerId,
      priceId,
      connectedAccountId,
      applicationFeePercent = 10 // 10% of subscription goes to platform
    } = params;

    try {
      const subscription = await this.stripe.subscriptions.create({
        customer: customerId,
        items: [{ price: priceId }],
        application_fee_percent: applicationFeePercent,
        transfer_data: {
          destination: connectedAccountId
        }
      });

      return {
        success: true,
        subscription: subscription,
        recurringRevenue: 'Platform earns ' + applicationFeePercent + '% of all subscription revenue'
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Record platform revenue for analytics
   */
  async recordPlatformRevenue(data) {
    // This would save to your database for revenue tracking
    console.log('💰 Platform Revenue Recorded:', {
      type: data.type,
      amount: data.amount,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Get revenue report
   */
  async getRevenueReport(startDate, endDate) {
    // Fetch application fees from Stripe
    const fees = await this.stripe.applicationFees.list({
      created: {
        gte: Math.floor(startDate.getTime() / 1000),
        lte: Math.floor(endDate.getTime() / 1000)
      },
      limit: 100
    });

    let totalRevenue = 0;
    let feesByType = {
      card: 0,
      ach: 0,
      instant_payout: 0,
      subscription: 0
    };

    fees.data.forEach(fee => {
      totalRevenue += fee.amount;
      // Categorize by type from metadata
      const type = fee.charge?.metadata?.payment_type || 'card';
      feesByType[type] += fee.amount;
    });

    return {
      period: {
        start: startDate,
        end: endDate
      },
      totalRevenue: totalRevenue / 100, // Convert to dollars
      revenueByType: {
        card: feesByType.card / 100,
        ach: feesByType.ach / 100,
        instantPayout: feesByType.instant_payout / 100,
        subscription: feesByType.subscription / 100
      },
      transactionCount: fees.data.length,
      averageRevenuePerTransaction: (totalRevenue / fees.data.length) / 100
    };
  }
}

// Export for use in your payment processing
module.exports = { StripeConnectFees };

// Example implementation
if (require.main === module) {
  console.log('\n🚀 Stripe Connect Fee Implementation');
  console.log('=====================================\n');
  
  console.log('✅ Revenue Streams Enabled:');
  console.log('1. Card Processing Markup (0.3-0.6% + $0.05)');
  console.log('2. ACH Processing Markup (0.7-1.2% - much higher margin!)');
  console.log('3. Instant Payout Fees ($0.25-0.50 + 0.25-0.5%)');
  console.log('4. Subscription Revenue Share (10% of recurring payments)');
  console.log('5. Volume-Based Tiered Pricing');
  
  console.log('\n💡 Implementation Steps:');
  console.log('1. Use createPaymentWithPlatformFee() for all card payments');
  console.log('2. Promote ACH payments for higher margins');
  console.log('3. Offer instant payouts as premium feature');
  console.log('4. Set application_fee_amount on all transactions');
  console.log('5. Track revenue with getRevenueReport()');
  
  console.log('\n📈 Revenue Optimization Tips:');
  console.log('• Encourage ACH for large transactions (7x better margins)');
  console.log('• Bundle instant payouts with higher tiers');
  console.log('• Implement volume discounts to increase GMV');
  console.log('• Add premium features that justify higher fees');
}