/**
 * Automated Payout Scheduling Service
 * 
 * This service automatically schedules and processes payouts based on:
 * - Financial arrangement frequency (daily, weekly, bi-weekly, monthly)
 * - Minimum payout thresholds
 * - Barber preferences
 * 
 * Production-ready for live barbershop use.
 */

const { createClient } = require('@supabase/supabase-js')
const Stripe = require('stripe')

class PayoutScheduler {
  constructor() {
    this.supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    )
    
    this.stripe = process.env.STRIPE_SECRET_KEY ? 
      new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2023-10-16' }) : 
      null
  }

  /**
   * Main scheduling function - called by cron job or manual trigger
   */
  async processScheduledPayouts() {
    console.log('🔄 Starting automated payout processing...')
    
    try {
      // Get all active financial arrangements
      const arrangements = await this.getActiveArrangements()
      console.log(`📋 Found ${arrangements.length} active arrangements`)

      let processedCount = 0
      let errorCount = 0

      for (const arrangement of arrangements) {
        try {
          const shouldProcess = await this.shouldProcessPayout(arrangement)
          
          if (shouldProcess.process) {
            console.log(`💰 Processing payout for ${arrangement.barber_name} (${shouldProcess.reason})`)
            
            const result = await this.processPayout(arrangement, shouldProcess.amount)
            
            if (result.success) {
              processedCount++
              console.log(`✅ Payout processed: $${shouldProcess.amount} to ${arrangement.barber_name}`)
            } else {
              errorCount++
              console.error(`❌ Payout failed for ${arrangement.barber_name}: ${result.error}`)
            }
          }
        } catch (error) {
          errorCount++
          console.error(`❌ Error processing arrangement ${arrangement.id}:`, error.message)
        }
      }

      console.log(`🎉 Payout processing complete: ${processedCount} successful, ${errorCount} errors`)
      
      return {
        success: true,
        processed: processedCount,
        errors: errorCount,
        total: arrangements.length
      }

    } catch (error) {
      console.error('❌ Automated payout processing failed:', error)
      return {
        success: false,
        error: error.message
      }
    }
  }

  /**
   * Get all active financial arrangements with commission balances
   */
  async getActiveArrangements() {
    const { data: arrangements, error } = await this.supabase
      .from('financial_arrangements')
      .select(`
        *,
        profiles:barber_id (
          id,
          email,
          full_name
        ),
        barbershops (
          id,
          name,
          owner_id
        ),
        barber_commission_balances (
          pending_amount,
          total_earned,
          last_transaction_at
        )
      `)
      .eq('is_active', true)

    if (error) {
      throw new Error(`Failed to fetch arrangements: ${error.message}`)
    }

    return (arrangements || []).map(arr => ({
      ...arr,
      barber_name: arr.profiles?.full_name || arr.profiles?.email || 'Unknown Barber',
      pending_balance: arr.barber_commission_balances?.[0]?.pending_amount || 0
    }))
  }

  /**
   * Determine if a payout should be processed for this arrangement
   */
  async shouldProcessPayout(arrangement) {
    const frequency = arrangement.payment_frequency || 'weekly'
    const pendingAmount = arrangement.pending_balance || 0
    const minimumPayout = 10.00 // Minimum $10 payout threshold

    // Check if there's enough money to pay out
    if (pendingAmount < minimumPayout) {
      return {
        process: false,
        reason: `Balance $${pendingAmount} below minimum $${minimumPayout}`
      }
    }

    // Check if it's time for a payout based on frequency
    const lastPayout = await this.getLastPayoutDate(arrangement.barber_id, arrangement.barbershop_id)
    const daysSinceLastPayout = lastPayout ? 
      Math.floor((Date.now() - new Date(lastPayout).getTime()) / (1000 * 60 * 60 * 24)) : 
      999 // If no previous payout, process it

    let shouldProcess = false
    let reason = ''

    switch (frequency) {
      case 'daily':
        shouldProcess = daysSinceLastPayout >= 1
        reason = `Daily payout due (${daysSinceLastPayout} days since last)`
        break
      case 'weekly':
        shouldProcess = daysSinceLastPayout >= 7
        reason = `Weekly payout due (${daysSinceLastPayout} days since last)`
        break
      case 'bi-weekly':
        shouldProcess = daysSinceLastPayout >= 14
        reason = `Bi-weekly payout due (${daysSinceLastPayout} days since last)`
        break
      case 'monthly':
        shouldProcess = daysSinceLastPayout >= 30
        reason = `Monthly payout due (${daysSinceLastPayout} days since last)`
        break
      default:
        shouldProcess = daysSinceLastPayout >= 7 // Default to weekly
        reason = `Default weekly payout (${daysSinceLastPayout} days since last)`
    }

    return {
      process: shouldProcess,
      reason: reason,
      amount: pendingAmount,
      daysSinceLastPayout
    }
  }

  /**
   * Get the date of the last payout for a barber
   */
  async getLastPayoutDate(barberId, barbershopId) {
    const { data: lastPayout } = await this.supabase
      .from('payout_transactions')
      .select('completed_at')
      .eq('barber_id', barberId)
      .eq('barbershop_id', barbershopId)
      .eq('status', 'completed')
      .order('completed_at', { ascending: false })
      .limit(1)
      .single()

    return lastPayout?.completed_at
  }

  /**
   * Process a payout to a barber
   */
  async processPayout(arrangement, amount) {
    try {
      // Get barber's Stripe Connect account (if using automated transfers)
      const { data: stripeAccount } = await this.supabase
        .from('stripe_connected_accounts')
        .select('stripe_account_id, payouts_enabled')
        .eq('user_id', arrangement.barber_id)
        .single()

      const payoutMethod = stripeAccount?.payouts_enabled ? 'stripe_transfer' : 'manual'
      
      // Create payout transaction record
      const { data: payoutTransaction, error: payoutError } = await this.supabase
        .from('payout_transactions')
        .insert({
          barber_id: arrangement.barber_id,
          barbershop_id: arrangement.barbershop_id,
          amount: amount,
          payout_method: payoutMethod,
          status: payoutMethod === 'stripe_transfer' ? 'processing' : 'pending',
          reference_number: `AUTO_${Date.now()}`,
          notes: `Automated ${arrangement.payment_frequency} payout`,
          initiated_by: null, // System-initiated
          metadata: {
            arrangement_id: arrangement.id,
            frequency: arrangement.payment_frequency,
            automated: true
          }
        })
        .select()
        .single()

      if (payoutError) {
        throw new Error(`Failed to create payout record: ${payoutError.message}`)
      }

      let transferResult = { success: true, transfer_id: null }

      // If Stripe Connect is available, process automatic transfer
      if (payoutMethod === 'stripe_transfer' && this.stripe && stripeAccount?.stripe_account_id) {
        transferResult = await this.processStripeTransfer(
          stripeAccount.stripe_account_id,
          amount,
          payoutTransaction.id
        )
      }

      if (transferResult.success) {
        // Update commission balances
        await this.updateCommissionBalances(
          arrangement.barber_id,
          arrangement.barbershop_id,
          amount,
          payoutTransaction.id
        )

        // Mark commission transactions as paid out
        await this.markCommissionsAsPaidOut(
          arrangement.barber_id,
          arrangement.barbershop_id,
          payoutTransaction.id
        )

        // Update payout transaction status
        await this.supabase
          .from('payout_transactions')
          .update({
            status: payoutMethod === 'stripe_transfer' ? 'completed' : 'pending',
            completed_at: payoutMethod === 'stripe_transfer' ? new Date().toISOString() : null,
            stripe_transfer_id: transferResult.transfer_id
          })
          .eq('id', payoutTransaction.id)

        // Send notification (if notification system is available)
        await this.sendPayoutNotification(arrangement, amount, payoutMethod, payoutTransaction.id)

        return {
          success: true,
          payout_id: payoutTransaction.id,
          method: payoutMethod,
          transfer_id: transferResult.transfer_id
        }

      } else {
        // Mark payout as failed
        await this.supabase
          .from('payout_transactions')
          .update({
            status: 'failed',
            notes: `Transfer failed: ${transferResult.error}`
          })
          .eq('id', payoutTransaction.id)

        return {
          success: false,
          error: transferResult.error
        }
      }

    } catch (error) {
      return {
        success: false,
        error: error.message
      }
    }
  }

  /**
   * Process Stripe Connect transfer
   */
  async processStripeTransfer(connectAccountId, amount, payoutTransactionId) {
    try {
      if (!this.stripe) {
        return {
          success: false,
          error: 'Stripe not configured'
        }
      }

      const transfer = await this.stripe.transfers.create({
        amount: Math.round(amount * 100), // Convert to cents
        currency: 'usd',
        destination: connectAccountId,
        metadata: {
          payout_transaction_id: payoutTransactionId,
          automated: 'true'
        }
      })

      return {
        success: true,
        transfer_id: transfer.id
      }

    } catch (error) {
      return {
        success: false,
        error: error.message
      }
    }
  }

  /**
   * Update barber commission balances after payout
   */
  async updateCommissionBalances(barberId, barbershopId, amount, payoutTransactionId) {
    const { error } = await this.supabase
      .from('barber_commission_balances')
      .update({
        pending_amount: 0, // Reset pending amount
        paid_amount: this.supabase.raw(`paid_amount + ${amount}`),
        updated_at: new Date().toISOString()
      })
      .eq('barber_id', barberId)
      .eq('barbershop_id', barbershopId)

    if (error) {
      throw new Error(`Failed to update commission balances: ${error.message}`)
    }
  }

  /**
   * Mark commission transactions as paid out
   */
  async markCommissionsAsPaidOut(barberId, barbershopId, payoutTransactionId) {
    const { error } = await this.supabase
      .from('commission_transactions')
      .update({
        status: 'paid_out',
        paid_out_at: new Date().toISOString(),
        payout_transaction_id: payoutTransactionId
      })
      .eq('barber_id', barberId)
      .eq('barbershop_id', barbershopId)
      .eq('status', 'pending_payout')

    if (error) {
      throw new Error(`Failed to mark commissions as paid out: ${error.message}`)
    }
  }

  /**
   * Send payout notification to barber
   */
  async sendPayoutNotification(arrangement, amount, method, payoutId) {
    try {
      const notification = {
        type: 'payout_processed',
        recipient: arrangement.barber_id,
        email: arrangement.profiles?.email,
        data: {
          amount: amount,
          method: method,
          barbershop: arrangement.barbershops?.name,
          payout_id: payoutId,
          frequency: arrangement.payment_frequency
        }
      }

      // Log notification (could integrate with email service here)
      console.log(`📧 Payout notification: $${amount} to ${arrangement.barber_name} via ${method}`)

      // TODO: Integrate with actual notification service (email, SMS, etc.)
      
    } catch (error) {
      console.error('❌ Failed to send payout notification:', error.message)
      // Don't fail the payout if notification fails
    }
  }

  /**
   * Process payout for a single barber (manual trigger)
   */
  async processSinglePayout(barberId, shopOwnerId) {
    try {
      // Get the barber's arrangement
      const { data: shop } = await this.supabase
        .from('barbershops')
        .select('id')
        .eq('owner_id', shopOwnerId)
        .single()

      if (!shop) {
        return {
          success: false,
          error: 'Shop not found'
        }
      }

      const { data: arrangement } = await this.supabase
        .from('financial_arrangements')
        .select(`
          *,
          profiles:barber_id (
            id,
            email,
            full_name
          ),
          barbershops (
            id,
            name,
            owner_id
          ),
          barber_commission_balances (
            pending_amount,
            total_earned,
            last_transaction_at
          )
        `)
        .eq('barber_id', barberId)
        .eq('barbershop_id', shop.id)
        .eq('is_active', true)
        .single()

      if (!arrangement) {
        return {
          success: false,
          error: 'No active arrangement found for this barber'
        }
      }

      const arrangementWithBalance = {
        ...arrangement,
        barber_name: arrangement.profiles?.full_name || arrangement.profiles?.email || 'Unknown Barber',
        pending_balance: arrangement.barber_commission_balances?.[0]?.pending_amount || 0
      }

      if (arrangementWithBalance.pending_balance < 10.00) {
        return {
          success: false,
          error: `Insufficient balance: $${arrangementWithBalance.pending_balance} (minimum $10.00)`
        }
      }

      const result = await this.processPayout(arrangementWithBalance, arrangementWithBalance.pending_balance)
      
      if (result.success) {
        return {
          success: true,
          message: `Payout of $${arrangementWithBalance.pending_balance} processed for ${arrangementWithBalance.barber_name}`,
          payout_id: result.payout_id,
          method: result.method
        }
      } else {
        return {
          success: false,
          error: result.error
        }
      }

    } catch (error) {
      return {
        success: false,
        error: error.message
      }
    }
  }

  /**
   * Check which payouts are due for a shop owner
   */
  async checkDuePayouts(shopOwnerId) {
    try {
      const { data: shop } = await this.supabase
        .from('barbershops')
        .select('id')
        .eq('owner_id', shopOwnerId)
        .single()

      if (!shop) {
        return []
      }

      const arrangements = await this.getActiveArrangements()
      const shopArrangements = arrangements.filter(arr => arr.barbershop_id === shop.id)
      
      const duePayouts = []

      for (const arrangement of shopArrangements) {
        const shouldProcess = await this.shouldProcessPayout(arrangement)
        
        if (shouldProcess.process) {
          duePayouts.push({
            barber_id: arrangement.barber_id,
            barber_name: arrangement.barber_name,
            amount: shouldProcess.amount,
            frequency: arrangement.payment_frequency,
            reason: shouldProcess.reason,
            days_overdue: shouldProcess.daysSinceLastPayout
          })
        }
      }

      return duePayouts

    } catch (error) {
      console.error('Error checking due payouts:', error)
      return []
    }
  }
}

module.exports = PayoutScheduler