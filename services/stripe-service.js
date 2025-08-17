/**
 * Real Stripe Service
 * Production Stripe API integration
 */

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

class StripeService {
  constructor() {
    this.stripe = stripe;
    this.initialized = !!process.env.STRIPE_SECRET_KEY;
    
    if (!this.initialized) {
      console.warn('⚠️ Stripe service: No API key provided');
    }
  }

  async createCheckoutSession(options = {}) {
    if (!this.initialized) {
      throw new Error('Stripe not initialized - missing API key');
    }

    const {
      amount,
      currency = 'usd',
      description = 'Payment',
      successUrl,
      cancelUrl,
      metadata = {}
    } = options;

    try {
      const session = await this.stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [{
          price_data: {
            currency,
            product_data: {
              name: description,
            },
            unit_amount: Math.round(amount * 100), // Convert to cents
          },
          quantity: 1,
        }],
        mode: 'payment',
        success_url: successUrl,
        cancel_url: cancelUrl,
        metadata
      });

      return {
        success: true,
        sessionId: session.id,
        url: session.url
      };
    } catch (error) {
      console.error('Stripe checkout session error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async verifySession(sessionId) {
    if (!this.initialized) {
      throw new Error('Stripe not initialized - missing API key');
    }

    try {
      const session = await this.stripe.checkout.sessions.retrieve(sessionId);
      
      return {
        success: true,
        status: session.payment_status,
        amount: session.amount_total / 100, // Convert from cents
        currency: session.currency,
        metadata: session.metadata
      };
    } catch (error) {
      console.error('Stripe session verification error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  constructEvent(body, signature) {
    if (!this.initialized) {
      throw new Error('Stripe not initialized - missing API key');
    }

    const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!endpointSecret) {
      throw new Error('Stripe webhook secret not configured');
    }

    try {
      return this.stripe.webhooks.constructEvent(body, signature, endpointSecret);
    } catch (error) {
      console.error('Stripe webhook verification failed:', error);
      throw error;
    }
  }

  async createSubscription(options = {}) {
    if (!this.initialized) {
      throw new Error('Stripe not initialized - missing API key');
    }

    const {
      customerId,
      priceId,
      metadata = {}
    } = options;

    try {
      const subscription = await this.stripe.subscriptions.create({
        customer: customerId,
        items: [{
          price: priceId,
        }],
        payment_behavior: 'default_incomplete',
        payment_settings: { save_default_payment_method: 'on_subscription' },
        expand: ['latest_invoice.payment_intent'],
        metadata
      });

      return {
        success: true,
        subscriptionId: subscription.id,
        clientSecret: subscription.latest_invoice.payment_intent.client_secret
      };
    } catch (error) {
      console.error('Stripe subscription creation error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async getSubscription(subscriptionId) {
    if (!this.initialized) {
      throw new Error('Stripe not initialized - missing API key');
    }

    try {
      const subscription = await this.stripe.subscriptions.retrieve(subscriptionId);
      
      return {
        success: true,
        status: subscription.status,
        currentPeriodStart: new Date(subscription.current_period_start * 1000),
        currentPeriodEnd: new Date(subscription.current_period_end * 1000),
        cancelAtPeriodEnd: subscription.cancel_at_period_end
      };
    } catch (error) {
      console.error('Stripe subscription retrieval error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async healthCheck() {
    if (!this.initialized) {
      return {
        status: 'not_configured',
        message: 'Stripe API key not provided'
      };
    }

    try {
      await this.stripe.products.list({ limit: 1 });
      
      return {
        status: 'healthy',
        message: 'Stripe API connection successful'
      };
    } catch (error) {
      return {
        status: 'error',
        message: `Stripe API error: ${error.message}`
      };
    }
  }

  // ==========================================
  // Stripe Connect Methods
  // ==========================================

  async createConnectedAccount(options = {}) {
    if (!this.initialized) {
      throw new Error('Stripe not initialized - missing API key');
    }

    const {
      email,
      country = 'US',
      type = 'express',
      businessType = 'individual',
      businessName,
      metadata = {}
    } = options;

    try {
      const accountParams = {
        type,
        country,
        email,
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true }
        },
        business_type: businessType,
        metadata
      };

      if (businessName) {
        accountParams.company = { name: businessName };
      }

      const account = await this.stripe.accounts.create(accountParams);

      return {
        success: true,
        accountId: account.id,
        detailsSubmitted: account.details_submitted,
        chargesEnabled: account.charges_enabled,
        payoutsEnabled: account.payouts_enabled
      };
    } catch (error) {
      console.error('Stripe Connect account creation error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async createAccountLink(accountId, refreshUrl, returnUrl) {
    if (!this.initialized) {
      throw new Error('Stripe not initialized - missing API key');
    }

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
      console.error('Stripe account link creation error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async retrieveAccount(accountId) {
    if (!this.initialized) {
      throw new Error('Stripe not initialized - missing API key');
    }

    try {
      const account = await this.stripe.accounts.retrieve(accountId);

      return {
        success: true,
        account: {
          id: account.id,
          email: account.email,
          detailsSubmitted: account.details_submitted,
          chargesEnabled: account.charges_enabled,
          payoutsEnabled: account.payouts_enabled,
          requirements: account.requirements,
          capabilities: account.capabilities,
          payoutSchedule: account.settings?.payouts?.schedule
        }
      };
    } catch (error) {
      console.error('Stripe account retrieval error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async createBankAccount(accountId, bankAccountToken) {
    if (!this.initialized) {
      throw new Error('Stripe not initialized - missing API key');
    }

    try {
      const bankAccount = await this.stripe.accounts.createExternalAccount(accountId, {
        external_account: bankAccountToken,
        default_for_currency: true
      });

      return {
        success: true,
        bankAccountId: bankAccount.id,
        last4: bankAccount.last4,
        bankName: bankAccount.bank_name
      };
    } catch (error) {
      console.error('Stripe bank account creation error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async updatePayoutSchedule(accountId, schedule = 'daily', delayDays = 2) {
    if (!this.initialized) {
      throw new Error('Stripe not initialized - missing API key');
    }

    try {
      const scheduleParams = {
        interval: schedule,
        ...(schedule === 'daily' && { delay_days: delayDays })
      };

      const account = await this.stripe.accounts.update(accountId, {
        settings: {
          payouts: {
            schedule: scheduleParams
          }
        }
      });

      return {
        success: true,
        payoutSchedule: account.settings?.payouts?.schedule
      };
    } catch (error) {
      console.error('Stripe payout schedule update error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async createPayout(accountId, amount, currency = 'usd', description = null) {
    if (!this.initialized) {
      throw new Error('Stripe not initialized - missing API key');
    }

    try {
      const payout = await this.stripe.payouts.create({
        amount: Math.round(amount * 100), // Convert to cents
        currency,
        description,
        method: 'standard'
      }, {
        stripeAccount: accountId
      });

      return {
        success: true,
        payoutId: payout.id,
        amount: payout.amount / 100,
        arrivalDate: new Date(payout.arrival_date * 1000),
        status: payout.status
      };
    } catch (error) {
      console.error('Stripe payout creation error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async createLoginLink(accountId) {
    if (!this.initialized) {
      throw new Error('Stripe not initialized - missing API key');
    }

    try {
      const loginLink = await this.stripe.accounts.createLoginLink(accountId);

      return {
        success: true,
        url: loginLink.url
      };
    } catch (error) {
      console.error('Stripe login link creation error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

const stripeService = new StripeService();

module.exports = {
  stripeService,
  StripeService
};