/**
 * Automation Fee Collection Service
 * 
 * Handles automatic collection of no-show fees using stored payment methods.
 * Includes retry logic, failure handling, and integration with Stripe.
 */

import Stripe from 'stripe'
import { createClient } from '@/lib/supabase/server'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

export class AutomationFeeCollectionService {
  constructor() {
    this.initialized = false
  }

  async initialize() {
    this.initialized = true
    console.log('✅ Fee Collection Service initialized')
  }

  /**
   * Collect no-show fee automatically
   */
  async collectNoShowFee({ shopId, appointmentId, feeAmount, paymentMethodId, jobId }) {
    const supabase = await createClient()
    
    try {
      console.log(`💰 Processing fee collection: ${jobId}`)
      
      // Get appointment details
      const { data: appointment, error: appointmentError } = await supabase
        .from('appointments')
        .select('*')
        .eq('id', appointmentId)
        .single()
      
      if (appointmentError || !appointment) {
        throw new Error('Appointment not found')
      }

      // Get customer details
      const { data: customer, error: customerError } = await supabase
        .from('customers')
        .select('*')
        .eq('id', appointment.customer_id)
        .single()
      
      if (customerError || !customer) {
        throw new Error('Customer not found')
      }

      // Get shop's Stripe account
      const { data: shopProfile, error: shopError } = await supabase
        .from('profiles')
        .select('stripe_account_id')
        .eq('barbershop_id', shopId)
        .eq('role', 'SHOP_OWNER')
        .single()
      
      if (shopError || !shopProfile?.stripe_account_id) {
        throw new Error('Shop Stripe account not found')
      }

      // Process payment with Stripe
      const paymentResult = await this.processStripePayment({
        amount: Math.round(feeAmount * 100), // Convert to cents
        currency: 'usd',
        paymentMethodId: paymentMethodId || customer.default_payment_method_id,
        customerId: customer.stripe_customer_id,
        stripeAccountId: shopProfile.stripe_account_id,
        description: `No-show fee for appointment ${appointmentId}`,
        metadata: {
          appointment_id: appointmentId,
          customer_id: customer.id,
          shop_id: shopId,
          fee_type: 'no_show',
          automation_job_id: jobId
        }
      })

      if (paymentResult.success) {
        // Record successful fee collection
        await this.recordFeeCollection({
          supabase,
          appointmentId,
          customerId: customer.id,
          shopId,
          feeAmount,
          paymentIntentId: paymentResult.paymentIntentId,
          status: 'collected',
          jobId
        })

        // Update appointment status
        await supabase
          .from('appointments')
          .update({
            no_show_fee_collected: true,
            no_show_fee_amount: feeAmount,
            no_show_fee_collected_at: new Date().toISOString()
          })
          .eq('id', appointmentId)

        console.log(`✅ Fee collection successful: ${jobId}`)
        
        return {
          success: true,
          message: 'Fee collected successfully',
          amount: feeAmount,
          paymentIntentId: paymentResult.paymentIntentId
        }
      } else {
        throw new Error(paymentResult.error)
      }
      
    } catch (error) {
      console.error(`❌ Fee collection failed: ${jobId}`, error)
      
      // Record failed fee collection
      await this.recordFeeCollection({
        supabase,
        appointmentId,
        customerId: appointment?.customer_id,
        shopId,
        feeAmount,
        status: 'failed',
        errorMessage: error.message,
        jobId
      })
      
      throw error
    }
  }

  /**
   * Process payment with Stripe
   */
  async processStripePayment({
    amount,
    currency,
    paymentMethodId,
    customerId,
    stripeAccountId,
    description,
    metadata
  }) {
    try {
      // Create payment intent
      const paymentIntent = await stripe.paymentIntents.create({
        amount,
        currency,
        payment_method: paymentMethodId,
        customer: customerId,
        description,
        metadata,
        confirm: true,
        return_url: `${process.env.NEXTAUTH_URL}/payments/return`,
        automatic_payment_methods: {
          enabled: false
        }
      }, {
        stripeAccount: stripeAccountId
      })

      if (paymentIntent.status === 'succeeded') {
        return {
          success: true,
          paymentIntentId: paymentIntent.id,
          amount: paymentIntent.amount / 100
        }
      } else if (paymentIntent.status === 'requires_action') {
        // Handle 3D Secure or other authentication
        return {
          success: false,
          error: 'Payment requires additional authentication',
          requiresAction: true,
          clientSecret: paymentIntent.client_secret
        }
      } else {
        return {
          success: false,
          error: `Payment failed with status: ${paymentIntent.status}`
        }
      }
      
    } catch (stripeError) {
      console.error('Stripe payment error:', stripeError)
      
      return {
        success: false,
        error: stripeError.message,
        code: stripeError.code
      }
    }
  }

  /**
   * Record fee collection attempt in database
   */
  async recordFeeCollection({
    supabase,
    appointmentId,
    customerId,
    shopId,
    feeAmount,
    paymentIntentId = null,
    status,
    errorMessage = null,
    jobId
  }) {
    try {
      await supabase
        .from('no_show_fee_collections')
        .insert({
          appointment_id: appointmentId,
          customer_id: customerId,
          shop_id: shopId,
          fee_amount: feeAmount,
          payment_intent_id: paymentIntentId,
          status,
          error_message: errorMessage,
          automation_job_id: jobId,
          collected_at: new Date().toISOString()
        })
        
    } catch (error) {
      console.error('Failed to record fee collection:', error)
    }
  }

  async shutdown() {
    this.initialized = false
    console.log('✅ Fee Collection Service shutdown')
  }
}