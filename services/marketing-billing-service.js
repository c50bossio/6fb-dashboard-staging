/**
 * Marketing Billing Service
 * 
 * Comprehensive billing management for marketing campaigns with:
 * - Stripe payment processing integration
 * - Campaign cost calculation with platform fees
 * - Usage tracking and reporting
 * - Automated billing cycles
 * - Volume discounts
 * 
 * @version 1.0.0
 */

const { createClient } = require('@supabase/supabase-js')
const Stripe = require('stripe')

// Initialize services
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2023-10-16',
})

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

class MarketingBillingService {
  constructor() {
    // Platform fee configuration
    this.platformFees = {
      email: 0.20,    // 20% markup on email campaigns
      sms: 0.25,      // 25% markup on SMS campaigns
      starter: 0.25,  // 25% for starter accounts
      professional: 0.20, // 20% for professional accounts
      enterprise: 0.15    // 15% for enterprise accounts
    }

    // Base costs from providers
    this.baseCosts = {
      email: 0.002,   // $0.002 per email (SendGrid)
      sms: {
        domestic: 0.01,    // $0.01 per domestic SMS
        international: 0.05 // $0.05 per international SMS
      }
    }

    // Volume discount tiers
    this.volumeDiscounts = [
      { min: 10000, max: 50000, discount: 0.05 },    // 5% off
      { min: 50001, max: 100000, discount: 0.10 },   // 10% off
      { min: 100001, max: 500000, discount: 0.15 },  // 15% off
      { min: 500001, max: Infinity, discount: 0.20 }  // 20% off
    ]
  }

  /**
   * Calculate campaign cost with platform fees and discounts
   */
  async calculateCampaignCost(campaignType, recipientsCount, accountTier = 'starter', options = {}) {
    try {
      // Base cost calculation
      let baseCost = 0
      
      if (campaignType === 'email') {
        baseCost = this.baseCosts.email * recipientsCount
      } else if (campaignType === 'sms') {
        const smsType = options.international ? 'international' : 'domestic'
        baseCost = this.baseCosts.sms[smsType] * recipientsCount
        
        // Account for multi-segment messages
        if (options.messageLength > 160) {
          const segments = Math.ceil(options.messageLength / 153) // 153 chars per segment for multi-part
          baseCost *= segments
        }
      }

      // Apply volume discount
      const discount = this.getVolumeDiscount(recipientsCount)
      const discountedCost = baseCost * (1 - discount)

      // Calculate platform fee based on account tier
      const platformFeeRate = this.platformFees[accountTier] || this.platformFees.starter
      const platformFee = discountedCost * platformFeeRate

      // Total cost
      const totalCost = discountedCost + platformFee

      return {
        baseCost,
        discount,
        discountAmount: baseCost * discount,
        serviceCost: discountedCost,
        platformFeeRate,
        platformFee,
        totalCost,
        perUnitCost: totalCost / recipientsCount,
        recipientsCount
      }
    } catch (error) {
      console.error('Error calculating campaign cost:', error)
      throw error
    }
  }

  /**
   * Get volume discount based on recipients count
   */
  getVolumeDiscount(recipientsCount) {
    const tier = this.volumeDiscounts.find(
      tier => recipientsCount >= tier.min && recipientsCount <= tier.max
    )
    return tier ? tier.discount : 0
  }

  /**
   * Create or update Stripe customer for billing account
   */
  async createStripeCustomer(accountData) {
    try {
      const customer = await stripe.customers.create({
        email: accountData.billing_email,
        name: accountData.account_name,
        description: `BookedBarber Marketing Account - ${accountData.owner_type}`,
        metadata: {
          account_id: accountData.id,
          owner_id: accountData.owner_id,
          owner_type: accountData.owner_type,
          platform: 'bookedbarber'
        }
      })

      // Update account with Stripe customer ID
      await supabase
        .from('marketing_accounts')
        .update({
          stripe_customer_id: customer.id,
          updated_at: new Date().toISOString()
        })
        .eq('id', accountData.id)

      return customer
    } catch (error) {
      console.error('Error creating Stripe customer:', error)
      throw error
    }
  }

  /**
   * Add payment method to account
   */
  async addPaymentMethod(accountId, paymentMethodId) {
    try {
      // Get account details
      const { data: account } = await supabase
        .from('marketing_accounts')
        .select('*')
        .eq('id', accountId)
        .single()

      if (!account) {
        throw new Error('Account not found')
      }

      // Attach payment method to Stripe customer
      await stripe.paymentMethods.attach(paymentMethodId, {
        customer: account.stripe_customer_id
      })

      // Get payment method details
      const paymentMethod = await stripe.paymentMethods.retrieve(paymentMethodId)

      // Check if this is the first payment method
      const { count } = await supabase
        .from('marketing_payment_methods')
        .select('*', { count: 'exact', head: true })
        .eq('account_id', accountId)
        .eq('is_active', true)

      // Save to database
      const { data: savedMethod, error } = await supabase
        .from('marketing_payment_methods')
        .insert({
          account_id: accountId,
          stripe_payment_method_id: paymentMethodId,
          stripe_customer_id: account.stripe_customer_id,
          card_brand: paymentMethod.card?.brand,
          card_last4: paymentMethod.card?.last4,
          card_exp_month: paymentMethod.card?.exp_month,
          card_exp_year: paymentMethod.card?.exp_year,
          is_default: count === 0, // Make default if first method
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single()

      if (error) throw error

      // Set as default payment method in Stripe if it's the default
      if (savedMethod.is_default) {
        await stripe.customers.update(account.stripe_customer_id, {
          invoice_settings: {
            default_payment_method: paymentMethodId
          }
        })
      }

      return savedMethod
    } catch (error) {
      console.error('Error adding payment method:', error)
      throw error
    }
  }

  /**
   * Process campaign payment
   */
  async processCampaignPayment(campaignData) {
    try {
      const {
        campaign_id,
        billing_account_id,
        campaign_type,
        recipients_count,
        account_tier = 'starter'
      } = campaignData

      // Calculate costs
      const costs = await this.calculateCampaignCost(
        campaign_type,
        recipients_count,
        account_tier
      )

      // Get billing account
      const { data: account } = await supabase
        .from('marketing_accounts')
        .select('*')
        .eq('id', billing_account_id)
        .single()

      if (!account) {
        throw new Error('Billing account not found')
      }

      // Check spending limit
      if (account.monthly_spend_limit) {
        const currentMonthSpend = await this.getCurrentMonthSpend(billing_account_id)
        if (currentMonthSpend + costs.totalCost > account.monthly_spend_limit) {
          throw new Error('Monthly spending limit would be exceeded')
        }
      }

      // Get default payment method
      const { data: paymentMethod } = await supabase
        .from('marketing_payment_methods')
        .select('*')
        .eq('account_id', billing_account_id)
        .eq('is_default', true)
        .eq('is_active', true)
        .single()

      if (!paymentMethod) {
        throw new Error('No default payment method found')
      }

      // Create payment intent
      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(costs.totalCost * 100), // Convert to cents
        currency: 'usd',
        customer: account.stripe_customer_id,
        payment_method: paymentMethod.stripe_payment_method_id,
        confirm: true,
        automatic_payment_methods: {
          enabled: false,
        },
        description: `Campaign #${campaign_id} - ${campaign_type.toUpperCase()}`,
        metadata: {
          campaign_id,
          billing_account_id,
          campaign_type,
          recipients_count: recipients_count.toString(),
          service_cost: costs.serviceCost.toFixed(4),
          platform_fee: costs.platformFee.toFixed(4),
          total_cost: costs.totalCost.toFixed(4)
        }
      })

      // Create billing record
      const billingRecord = await this.createBillingRecord({
        campaign_id,
        billing_account_id,
        stripe_payment_intent_id: paymentIntent.id,
        stripe_charge_id: paymentIntent.latest_charge,
        payment_status: paymentIntent.status,
        ...costs
      })

      return {
        paymentIntent,
        billingRecord,
        costs
      }
    } catch (error) {
      console.error('Error processing campaign payment:', error)
      throw error
    }
  }

  /**
   * Create billing record in database
   */
  async createBillingRecord(data) {
    try {
      const { data: record, error } = await supabase
        .from('marketing_billing_records')
        .insert({
          campaign_id: data.campaign_id,
          billing_account_id: data.billing_account_id,
          stripe_payment_intent_id: data.stripe_payment_intent_id,
          stripe_charge_id: data.stripe_charge_id,
          payment_status: data.payment_status,
          amount_charged: data.totalCost,
          platform_fee: data.platformFee,
          service_cost: data.serviceCost,
          recipients_count: data.recipientsCount,
          sent_count: 0,
          delivered_count: 0,
          failed_count: 0,
          billing_period: new Date().toISOString().substring(0, 7),
          status: 'active',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single()

      if (error) throw error

      return record
    } catch (error) {
      console.error('Error creating billing record:', error)
      throw error
    }
  }

  /**
   * Get current month spending for an account
   */
  async getCurrentMonthSpend(accountId) {
    try {
      const startOfMonth = new Date()
      startOfMonth.setDate(1)
      startOfMonth.setHours(0, 0, 0, 0)

      const { data: records } = await supabase
        .from('marketing_billing_records')
        .select('amount_charged')
        .eq('billing_account_id', accountId)
        .eq('payment_status', 'succeeded')
        .gte('created_at', startOfMonth.toISOString())

      const totalSpend = (records || []).reduce((sum, record) => {
        return sum + (record.amount_charged || 0)
      }, 0)

      return totalSpend
    } catch (error) {
      console.error('Error getting current month spend:', error)
      return 0
    }
  }

  /**
   * Generate billing report
   */
  async generateBillingReport(accountId, startDate, endDate) {
    try {
      // Fetch billing records
      const { data: records } = await supabase
        .from('marketing_billing_records')
        .select(`
          *,
          marketing_campaigns (
            name,
            type,
            status
          )
        `)
        .eq('billing_account_id', accountId)
        .gte('created_at', startDate)
        .lte('created_at', endDate)
        .order('created_at', { ascending: false })

      // Calculate summary statistics
      const summary = records.reduce((acc, record) => {
        acc.totalAmount += record.amount_charged || 0
        acc.totalPlatformFees += record.platform_fee || 0
        acc.totalServiceCost += record.service_cost || 0
        acc.totalCampaigns += 1
        acc.totalRecipients += record.recipients_count || 0
        
        if (record.payment_status === 'succeeded') {
          acc.successfulCharges += 1
        } else if (record.payment_status === 'failed') {
          acc.failedCharges += 1
        }
        
        return acc
      }, {
        totalAmount: 0,
        totalPlatformFees: 0,
        totalServiceCost: 0,
        totalCampaigns: 0,
        totalRecipients: 0,
        successfulCharges: 0,
        failedCharges: 0
      })

      return {
        records,
        summary,
        period: {
          start: startDate,
          end: endDate
        }
      }
    } catch (error) {
      console.error('Error generating billing report:', error)
      throw error
    }
  }

  /**
   * Handle webhook events from Stripe
   */
  async handleStripeWebhook(event) {
    try {
      switch (event.type) {
        case 'payment_intent.succeeded':
          await this.handlePaymentSuccess(event.data.object)
          break
        
        case 'payment_intent.payment_failed':
          await this.handlePaymentFailure(event.data.object)
          break
        
        case 'customer.subscription.created':
        case 'customer.subscription.updated':
        case 'customer.subscription.deleted':
          await this.handleSubscriptionChange(event.data.object)
          break
        
        case 'payment_method.attached':
          await this.handlePaymentMethodAttached(event.data.object)
          break
        
        default:
          console.log(`Unhandled webhook event type: ${event.type}`)
      }
    } catch (error) {
      console.error('Error handling Stripe webhook:', error)
      throw error
    }
  }

  /**
   * Handle successful payment
   */
  async handlePaymentSuccess(paymentIntent) {
    const { campaign_id, billing_account_id } = paymentIntent.metadata

    // Update billing record
    await supabase
      .from('marketing_billing_records')
      .update({
        payment_status: 'succeeded',
        updated_at: new Date().toISOString()
      })
      .eq('stripe_payment_intent_id', paymentIntent.id)

    // Update campaign status
    await supabase
      .from('marketing_campaigns')
      .update({
        status: 'paid',
        updated_at: new Date().toISOString()
      })
      .eq('id', campaign_id)

    console.log(`Payment succeeded for campaign ${campaign_id}`)
  }

  /**
   * Handle failed payment
   */
  async handlePaymentFailure(paymentIntent) {
    const { campaign_id } = paymentIntent.metadata

    // Update billing record
    await supabase
      .from('marketing_billing_records')
      .update({
        payment_status: 'failed',
        updated_at: new Date().toISOString()
      })
      .eq('stripe_payment_intent_id', paymentIntent.id)

    // Update campaign status
    await supabase
      .from('marketing_campaigns')
      .update({
        status: 'payment_failed',
        updated_at: new Date().toISOString()
      })
      .eq('id', campaign_id)

    console.log(`Payment failed for campaign ${campaign_id}`)
  }

  /**
   * Handle subscription changes
   */
  async handleSubscriptionChange(subscription) {
    // Implementation for subscription-based billing if needed
    console.log('Subscription event:', subscription.id)
  }

  /**
   * Handle payment method attached
   */
  async handlePaymentMethodAttached(paymentMethod) {
    console.log('Payment method attached:', paymentMethod.id)
    // The payment method attachment is already handled in addPaymentMethod
  }
}

// Export singleton instance
const marketingBillingService = new MarketingBillingService()

module.exports = {
  marketingBillingService,
  MarketingBillingService
}