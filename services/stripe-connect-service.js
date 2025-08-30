import Stripe from 'stripe';
import { createClient } from '@/lib/supabase/server';

/**
 * Comprehensive Stripe Connect Service
 * Handles all Stripe Connect operations for the barbershop platform
 */
class StripeConnectService {
  constructor() {
    this.stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2023-10-16',
    });
    this.platformFeePercentage = parseFloat(process.env.PLATFORM_FEE_PERCENTAGE || '10');
  }

  /**
   * Create a new Stripe Connect account for a barber
   */
  async createConnectAccount({
    barberId,
    barberbarbershopId,
    email,
    firstName,
    lastName,
    businessType = 'individual',
    country = 'US'
  }) {
    try {
      const account = await this.stripe.accounts.create({
        type: 'express',
        country,
        email,
        business_type: businessType,
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
          us_bank_account_ach_payments: { requested: true }
        },
        settings: {
          payouts: {
            schedule: {
              interval: 'daily',
              delay_days: 2
            }
          }
        },
        metadata: {
          barberId,
          barberbarbershopId,
          platform: 'bookedbarber',
          created_at: new Date().toISOString()
        },
        individual: {
          first_name: firstName,
          last_name: lastName,
          email
        }
      });

      return {
        success: true,
        accountId: account.id,
        account
      };
    } catch (error) {
      console.error('Error creating Stripe Connect account:', error);
      throw error;
    }
  }

  /**
   * Generate onboarding link for Stripe Connect
   */
  async createOnboardingLink(accountId, returnUrl, refreshUrl) {
    try {
      const accountLink = await this.stripe.accountLinks.create({
        account: accountId,
        refresh_url: refreshUrl,
        return_url: returnUrl,
        type: 'account_onboarding'
      });

      return {
        success: true,
        url: accountLink.url,
        expiresAt: accountLink.expires_at
      };
    } catch (error) {
      console.error('Error creating onboarding link:', error);
      throw error;
    }
  }

  /**
   * Get account status and requirements
   */
  async getAccountStatus(accountId) {
    try {
      const account = await this.stripe.accounts.retrieve(accountId);
      
      return {
        success: true,
        isOnboarded: account.details_submitted && account.charges_enabled,
        chargesEnabled: account.charges_enabled,
        payoutsEnabled: account.payouts_enabled,
        requirements: {
          currentlyDue: account.requirements?.currently_due || [],
          eventuallyDue: account.requirements?.eventually_due || [],
          pastDue: account.requirements?.past_due || [],
          errors: account.requirements?.errors || []
        },
        capabilities: account.capabilities,
        businessType: account.business_type,
        country: account.country,
        email: account.email
      };
    } catch (error) {
      console.error('Error getting account status:', error);
      throw error;
    }
  }

  /**
   * Create login link for Express Dashboard
   */
  async createLoginLink(accountId) {
    try {
      const loginLink = await this.stripe.accounts.createLoginLink(accountId);
      
      return {
        success: true,
        url: loginLink.url
      };
    } catch (error) {
      console.error('Error creating login link:', error);
      throw error;
    }
  }

  /**
   * Process payment with platform fee
   */
  async processPayment({
    amount,
    currency = 'usd',
    customerId,
    connectedAccountId,
    description,
    metadata = {},
    paymentMethodId = null
  }) {
    try {
      const platformFee = Math.round(amount * (this.platformFeePercentage / 100));
      
      const paymentIntentData = {
        amount,
        currency,
        description,
        metadata: {
          ...metadata,
          platform: 'bookedbarber'
        },
        application_fee_amount: platformFee,
        transfer_data: {
          destination: connectedAccountId
        }
      };

      if (customerId) {
        paymentIntentData.customer = customerId;
      }

      if (paymentMethodId) {
        paymentIntentData.payment_method = paymentMethodId;
        paymentIntentData.confirm = true;
      }

      const paymentIntent = await this.stripe.paymentIntents.create(paymentIntentData);

      return {
        success: true,
        paymentIntent,
        platformFee,
        netAmount: amount - platformFee
      };
    } catch (error) {
      console.error('Error processing payment:', error);
      throw error;
    }
  }

  /**
   * Create payout to connected account
   */
  async createPayout({
    accountId,
    amount,
    currency = 'usd',
    description = 'Payout from BookedBarber',
    metadata = {}
  }) {
    try {
      const payout = await this.stripe.payouts.create(
        {
          amount,
          currency,
          description,
          metadata: {
            ...metadata,
            platform: 'bookedbarber'
          }
        },
        {
          stripeAccount: accountId
        }
      );

      return {
        success: true,
        payout
      };
    } catch (error) {
      console.error('Error creating payout:', error);
      throw error;
    }
  }

  /**
   * Get account balance
   */
  async getAccountBalance(accountId) {
    try {
      const balance = await this.stripe.balance.retrieve({
        stripeAccount: accountId
      });

      return {
        success: true,
        available: balance.available,
        pending: balance.pending,
        connectReserved: balance.connect_reserved
      };
    } catch (error) {
      console.error('Error getting account balance:', error);
      throw error;
    }
  }

  /**
   * List transactions for an account
   */
  async listTransactions(accountId, limit = 10, startingAfter = null) {
    try {
      const params = {
        limit
      };

      if (startingAfter) {
        params.starting_after = startingAfter;
      }

      const transactions = await this.stripe.balanceTransactions.list(
        params,
        {
          stripeAccount: accountId
        }
      );

      return {
        success: true,
        transactions: transactions.data,
        hasMore: transactions.has_more
      };
    } catch (error) {
      console.error('Error listing transactions:', error);
      throw error;
    }
  }

  /**
   * Create refund for a payment
   */
  async createRefund({
    paymentIntentId,
    amount = null,
    reason = 'requested_by_customer',
    metadata = {}
  }) {
    try {
      const refundData = {
        payment_intent: paymentIntentId,
        reason,
        metadata: {
          ...metadata,
          platform: 'bookedbarber'
        }
      };

      if (amount) {
        refundData.amount = amount;
      }

      const refund = await this.stripe.refunds.create(refundData);

      return {
        success: true,
        refund
      };
    } catch (error) {
      console.error('Error creating refund:', error);
      throw error;
    }
  }

  /**
   * Update account settings
   */
  async updateAccountSettings(accountId, settings) {
    try {
      const account = await this.stripe.accounts.update(accountId, settings);

      return {
        success: true,
        account
      };
    } catch (error) {
      console.error('Error updating account settings:', error);
      throw error;
    }
  }

  /**
   * Create subscription for recurring payments
   */
  async createSubscription({
    customerId,
    priceId,
    connectedAccountId,
    trialPeriodDays = null,
    metadata = {}
  }) {
    try {
      const subscriptionData = {
        customer: customerId,
        items: [{ price: priceId }],
        application_fee_percent: this.platformFeePercentage,
        transfer_data: {
          destination: connectedAccountId
        },
        metadata: {
          ...metadata,
          platform: 'bookedbarber'
        }
      };

      if (trialPeriodDays) {
        subscriptionData.trial_period_days = trialPeriodDays;
      }

      const subscription = await this.stripe.subscriptions.create(subscriptionData);

      return {
        success: true,
        subscription
      };
    } catch (error) {
      console.error('Error creating subscription:', error);
      throw error;
    }
  }

  /**
   * Handle webhook events
   */
  async handleWebhook(event) {
    try {
      switch (event.type) {
        case 'account.updated':
          return this.handleAccountUpdated(event.data.object);
        
        case 'account.application.authorized':
          return this.handleAccountAuthorized(event.data.object);
        
        case 'account.application.deauthorized':
          return this.handleAccountDeauthorized(event.data.object);
        
        case 'payment_intent.succeeded':
          return this.handlePaymentSucceeded(event.data.object);
        
        case 'payout.paid':
          return this.handlePayoutPaid(event.data.object);
        
        case 'payout.failed':
          return this.handlePayoutFailed(event.data.object);
        
        default:
          console.warn(`Unhandled webhook event type: ${event.type}`);
          return { success: true, message: 'Event type not handled' };
      }
    } catch (error) {
      console.error('Error handling webhook:', error);
      throw error;
    }
  }

  async handleAccountUpdated(account) {
    // Update database with account status
    const supabase = createClient();
    
    await supabase
      .from('financial_arrangements')
      .update({
        barber_stripe_onboarded: account.details_submitted && account.charges_enabled,
        stripe_charges_enabled: account.charges_enabled,
        stripe_payouts_enabled: account.payouts_enabled,
        updated_at: new Date().toISOString()
      })
      .eq('barber_stripe_account_id', account.id);

    return { success: true, message: 'Account updated' };
  }

  async handleAccountAuthorized(authorization) {
    console.info('Account authorized:', authorization);
    return { success: true, message: 'Account authorized' };
  }

  async handleAccountDeauthorized(authorization) {
    // Handle account deauthorization
    const supabase = createClient();
    
    await supabase
      .from('financial_arrangements')
      .update({
        barber_stripe_onboarded: false,
        stripe_charges_enabled: false,
        stripe_payouts_enabled: false,
        updated_at: new Date().toISOString()
      })
      .eq('barber_stripe_account_id', authorization.account);

    return { success: true, message: 'Account deauthorized' };
  }

  async handlePaymentSucceeded(paymentIntent) {
    // Record successful payment
    console.info('Payment succeeded:', paymentIntent.id);
    return { success: true, message: 'Payment recorded' };
  }

  async handlePayoutPaid(payout) {
    // Update payout status in database
    console.info('Payout paid:', payout.id);
    return { success: true, message: 'Payout recorded' };
  }

  async handlePayoutFailed(payout) {
    // Handle failed payout
    console.error('Payout failed:', payout.id, payout.failure_message);
    // Send notification to barber
    return { success: true, message: 'Payout failure handled' };
  }
}

// Export singleton instance
export const stripeConnectService = new StripeConnectService();

// Export class for testing
export default StripeConnectService;