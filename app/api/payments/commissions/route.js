import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '../../../../lib/supabase/server'

// Safe Stripe initialization
const getStripeInstance = () => {
  if (!process.env.STRIPE_SECRET_KEY || process.env.STRIPE_SECRET_KEY === 'your_stripe_secret_key_here') {
    return null
  }
  return new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: '2024-06-20'
  })
}

// Commission configuration
const COMMISSION_CONFIG = {
  default_rates: {
    barber: 0.60,       // 60% to barber
    shop: 0.35,         // 35% to shop
    platform: 0.05     // 5% platform fee
  },
  payout_schedule: {
    frequency: 'weekly',  // weekly, monthly, manual
    day_of_week: 'friday', // For weekly payouts
    minimum_amount: 25.00  // Minimum payout amount in dollars
  },
  payment_methods: {
    instant: 'express',     // Stripe Express payouts
    standard: 'standard'    // Standard bank transfer
  }
}

// GET endpoint for commission tracking and reports
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const barber_id = searchParams.get('barber_id')
    const shop_id = searchParams.get('shop_id')
    const period = searchParams.get('period') || 'current_month' // current_month, last_month, current_week, custom
    const start_date = searchParams.get('start_date')
    const end_date = searchParams.get('end_date')
    const report_type = searchParams.get('type') || 'summary' // summary, detailed, pending

    const supabase = createClient()

    // Build date filter based on period
    let dateFilter = {}
    const now = new Date()
    
    switch (period) {
      case 'current_week':
        const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay()))
        dateFilter.gte = startOfWeek.toISOString()
        break
      case 'last_week':
        const lastWeekStart = new Date(now.setDate(now.getDate() - now.getDay() - 7))
        const lastWeekEnd = new Date(now.setDate(now.getDate() - now.getDay() - 1))
        dateFilter.gte = lastWeekStart.toISOString()
        dateFilter.lte = lastWeekEnd.toISOString()
        break
      case 'current_month':
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
        dateFilter.gte = startOfMonth.toISOString()
        break
      case 'last_month':
        const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
        const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0)
        dateFilter.gte = lastMonth.toISOString()
        dateFilter.lte = lastMonthEnd.toISOString()
        break
      case 'custom':
        if (start_date) dateFilter.gte = start_date
        if (end_date) dateFilter.lte = end_date
        break
      default:
        // Current month default
        const defaultStart = new Date(now.getFullYear(), now.getMonth(), 1)
        dateFilter.gte = defaultStart.toISOString()
    }

    // Base query for payments
    let paymentsQuery = supabase
      .from('payments')
      .select(`
        id,
        amount,
        commission_barber,
        commission_shop,
        platform_fee,
        status,
        payment_type,
        transaction_date,
        stripe_payment_intent_id,
        barber_id,
        shop_id,
        service_name,
        customer_name,
        payout_status,
        payout_date,
        payout_id,
        appointments (
          id,
          scheduled_at,
          service_id,
          services (name, category, price)
        ),
        users!barber_id (
          id,
          name,
          email,
          stripe_account_id
        )
      `)
      .eq('status', 'completed')

    // Apply filters
    if (barber_id) {
      paymentsQuery = paymentsQuery.eq('barber_id', barber_id)
    }
    if (shop_id) {
      paymentsQuery = paymentsQuery.eq('shop_id', shop_id)
    }
    if (dateFilter.gte) {
      paymentsQuery = paymentsQuery.gte('transaction_date', dateFilter.gte)
    }
    if (dateFilter.lte) {
      paymentsQuery = paymentsQuery.lte('transaction_date', dateFilter.lte)
    }

    const { data: payments, error: paymentsError } = await paymentsQuery
      .order('transaction_date', { ascending: false })

    if (paymentsError) {
      throw paymentsError
    }

    // Process commission data based on report type
    if (report_type === 'summary') {
      // Summary report with totals and aggregations
      const commissionSummary = payments.reduce((acc, payment) => {
        const barberId = payment.barber_id
        const barberName = payment.users?.name || 'Unknown Barber'
        
        if (!acc[barberId]) {
          acc[barberId] = {
            barber_id: barberId,
            barber_name: barberName,
            stripe_account_id: payment.users?.stripe_account_id,
            total_revenue: 0,
            commission_earned: 0,
            platform_fees: 0,
            shop_revenue: 0,
            transactions_count: 0,
            pending_payout: 0,
            paid_out: 0,
            services_breakdown: {}
          }
        }

        const barberData = acc[barberId]
        barberData.total_revenue += payment.amount / 100 // Convert from cents
        barberData.commission_earned += (payment.commission_barber || 0) / 100
        barberData.platform_fees += (payment.platform_fee || 0) / 100
        barberData.shop_revenue += (payment.commission_shop || 0) / 100
        barberData.transactions_count += 1

        // Track pending vs paid payouts
        if (payment.payout_status === 'pending' || !payment.payout_status) {
          barberData.pending_payout += (payment.commission_barber || 0) / 100
        } else if (payment.payout_status === 'paid') {
          barberData.paid_out += (payment.commission_barber || 0) / 100
        }

        // Service breakdown
        const serviceName = payment.appointments?.services?.name || payment.service_name || 'Unknown Service'
        if (!barberData.services_breakdown[serviceName]) {
          barberData.services_breakdown[serviceName] = {
            count: 0,
            revenue: 0,
            commission: 0
          }
        }
        barberData.services_breakdown[serviceName].count += 1
        barberData.services_breakdown[serviceName].revenue += payment.amount / 100
        barberData.services_breakdown[serviceName].commission += (payment.commission_barber || 0) / 100

        return acc
      }, {})

      // Calculate platform totals
      const platformTotals = {
        total_revenue: payments.reduce((sum, p) => sum + (p.amount / 100), 0),
        total_commissions_paid: payments.reduce((sum, p) => sum + ((p.commission_barber || 0) / 100), 0),
        total_platform_fees: payments.reduce((sum, p) => sum + ((p.platform_fee || 0) / 100), 0),
        total_shop_revenue: payments.reduce((sum, p) => sum + ((p.commission_shop || 0) / 100), 0),
        total_transactions: payments.length,
        pending_payouts: Object.values(commissionSummary).reduce((sum, b) => sum + b.pending_payout, 0),
        completed_payouts: Object.values(commissionSummary).reduce((sum, b) => sum + b.paid_out, 0)
      }

      return NextResponse.json({
        success: true,
        report_type: 'summary',
        period,
        date_range: {
          start: dateFilter.gte || null,
          end: dateFilter.lte || null
        },
        platform_totals: platformTotals,
        barber_commissions: Object.values(commissionSummary),
        commission_config: COMMISSION_CONFIG
      })

    } else if (report_type === 'detailed') {
      // Detailed transaction-level report
      const detailedTransactions = payments.map(payment => ({
        id: payment.id,
        transaction_date: payment.transaction_date,
        stripe_payment_intent_id: payment.stripe_payment_intent_id,
        customer_name: payment.customer_name,
        service_name: payment.appointments?.services?.name || payment.service_name,
        service_category: payment.appointments?.services?.category,
        total_amount: payment.amount / 100,
        barber: {
          id: payment.barber_id,
          name: payment.users?.name,
          commission_amount: (payment.commission_barber || 0) / 100,
          commission_rate: payment.commission_barber ? (payment.commission_barber / payment.amount) : 0.6
        },
        shop: {
          id: payment.shop_id,
          commission_amount: (payment.commission_shop || 0) / 100,
          commission_rate: payment.commission_shop ? (payment.commission_shop / payment.amount) : 0.35
        },
        platform: {
          fee_amount: (payment.platform_fee || 0) / 100,
          fee_rate: payment.platform_fee ? (payment.platform_fee / payment.amount) : 0.05
        },
        payout_info: {
          status: payment.payout_status || 'pending',
          payout_date: payment.payout_date,
          payout_id: payment.payout_id
        }
      }))

      return NextResponse.json({
        success: true,
        report_type: 'detailed',
        period,
        date_range: {
          start: dateFilter.gte || null,
          end: dateFilter.lte || null
        },
        transactions: detailedTransactions,
        total_transactions: detailedTransactions.length,
        total_revenue: detailedTransactions.reduce((sum, t) => sum + t.total_amount, 0)
      })

    } else if (report_type === 'pending') {
      // Pending payouts report
      const pendingPayouts = payments
        .filter(payment => payment.payout_status !== 'paid' && payment.commission_barber > 0)
        .reduce((acc, payment) => {
          const barberId = payment.barber_id
          if (!acc[barberId]) {
            acc[barberId] = {
              barber_id: barberId,
              barber_name: payment.users?.name || 'Unknown Barber',
              barber_email: payment.users?.email,
              stripe_account_id: payment.users?.stripe_account_id,
              pending_amount: 0,
              transaction_count: 0,
              oldest_transaction: payment.transaction_date,
              newest_transaction: payment.transaction_date,
              transactions: []
            }
          }

          const barberData = acc[barberId]
          barberData.pending_amount += (payment.commission_barber || 0) / 100
          barberData.transaction_count += 1
          barberData.transactions.push({
            id: payment.id,
            date: payment.transaction_date,
            amount: (payment.commission_barber || 0) / 100,
            service: payment.service_name,
            customer: payment.customer_name
          })

          // Update date range
          if (payment.transaction_date < barberData.oldest_transaction) {
            barberData.oldest_transaction = payment.transaction_date
          }
          if (payment.transaction_date > barberData.newest_transaction) {
            barberData.newest_transaction = payment.transaction_date
          }

          return acc
        }, {})

      // Filter barbers eligible for payout (above minimum)
      const eligiblePayouts = Object.values(pendingPayouts)
        .filter(barber => barber.pending_amount >= COMMISSION_CONFIG.payout_schedule.minimum_amount)

      return NextResponse.json({
        success: true,
        report_type: 'pending',
        date_range: {
          start: dateFilter.gte || null,
          end: dateFilter.lte || null
        },
        eligible_payouts: eligiblePayouts,
        total_pending_amount: eligiblePayouts.reduce((sum, b) => sum + b.pending_amount, 0),
        total_barbers_eligible: eligiblePayouts.length,
        payout_config: COMMISSION_CONFIG.payout_schedule
      })
    }

  } catch (error) {
    console.error('Commission tracking error:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to retrieve commission data'
    }, { status: 500 })
  }
}

// POST endpoint for processing payouts
export async function POST(request) {
  try {
    const {
      payout_type = 'individual',  // 'individual', 'bulk', 'scheduled'
      barber_ids = [],             // For individual or bulk payouts
      payout_method = 'standard',  // 'standard', 'express'
      notes = '',
      admin_user_id
    } = await request.json()

    if (!admin_user_id) {
      return NextResponse.json({
        success: false,
        error: 'admin_user_id is required for payout processing'
      }, { status: 400 })
    }

    const stripe = getStripeInstance()
    if (!stripe) {
      return NextResponse.json({
        success: false,
        error: 'Payment processing not configured',
        mock_response: {
          payouts_created: barber_ids.length,
          total_amount: 0,
          status: 'simulated',
          note: 'Configure Stripe for real payouts'
        }
      }, { status: 200 })
    }

    const supabase = createClient()
    const payoutResults = []

    // Get pending commissions for specified barbers
    let barbersQuery = supabase
      .from('payments')
      .select(`
        barber_id,
        commission_barber,
        id,
        stripe_payment_intent_id,
        transaction_date,
        users!barber_id (
          id,
          name,
          email,
          stripe_account_id
        )
      `)
      .eq('status', 'completed')
      .neq('payout_status', 'paid')
      .not('commission_barber', 'is', null)
      .gt('commission_barber', 0)

    if (barber_ids.length > 0) {
      barbersQuery = barbersQuery.in('barber_id', barber_ids)
    }

    const { data: pendingCommissions, error: commissionsError } = await barbersQuery

    if (commissionsError) {
      throw commissionsError
    }

    // Group by barber for payout processing
    const barberPayouts = pendingCommissions.reduce((acc, payment) => {
      const barberId = payment.barber_id
      if (!acc[barberId]) {
        acc[barberId] = {
          barber_id: barberId,
          barber_info: payment.users,
          total_amount: 0,
          payment_ids: []
        }
      }
      acc[barberId].total_amount += payment.commission_barber
      acc[barberId].payment_ids.push(payment.id)
      return acc
    }, {})

    // Process payouts for each barber
    for (const [barberId, payoutData] of Object.entries(barberPayouts)) {
      try {
        const barberInfo = payoutData.barber_info
        const payoutAmountCents = payoutData.total_amount
        const payoutAmountDollars = payoutAmountCents / 100

        // Check minimum payout amount
        if (payoutAmountDollars < COMMISSION_CONFIG.payout_schedule.minimum_amount) {
          payoutResults.push({
            barber_id: barberId,
            barber_name: barberInfo.name,
            success: false,
            error: `Payout amount $${payoutAmountDollars} below minimum $${COMMISSION_CONFIG.payout_schedule.minimum_amount}`,
            amount: payoutAmountDollars
          })
          continue
        }

        // Check if barber has Stripe account
        if (!barberInfo.stripe_account_id) {
          payoutResults.push({
            barber_id: barberId,
            barber_name: barberInfo.name,
            success: false,
            error: 'Barber does not have a connected Stripe account',
            amount: payoutAmountDollars
          })
          continue
        }

        // Create Stripe transfer/payout
        const transfer = await stripe.transfers.create({
          amount: payoutAmountCents,
          currency: 'usd',
          destination: barberInfo.stripe_account_id,
          metadata: {
            barber_id: barberId,
            payout_type,
            payment_count: payoutData.payment_ids.length,
            processed_by: admin_user_id,
            notes
          }
        })

        // Update payment records with payout information
        const { error: updateError } = await supabase
          .from('payments')
          .update({
            payout_status: 'paid',
            payout_date: new Date().toISOString(),
            payout_id: transfer.id,
            payout_method: payout_method,
            updated_at: new Date().toISOString()
          })
          .in('id', payoutData.payment_ids)

        if (updateError) {
          console.error('Failed to update payment records:', updateError)
        }

        // Log payout activity
        try {
          await supabase
            .from('payout_activities')
            .insert({
              barber_id: barberId,
              stripe_transfer_id: transfer.id,
              amount: payoutAmountCents,
              payment_count: payoutData.payment_ids.length,
              payout_method,
              processed_by: admin_user_id,
              notes,
              metadata: {
                payment_ids: payoutData.payment_ids,
                barber_info: {
                  name: barberInfo.name,
                  email: barberInfo.email
                }
              },
              created_at: new Date().toISOString()
            })
        } catch (activityError) {
          console.warn('Failed to log payout activity:', activityError)
        }

        payoutResults.push({
          barber_id: barberId,
          barber_name: barberInfo.name,
          success: true,
          stripe_transfer_id: transfer.id,
          amount: payoutAmountDollars,
          payment_count: payoutData.payment_ids.length
        })

      } catch (barberError) {
        console.error(`Payout failed for barber ${barberId}:`, barberError)
        payoutResults.push({
          barber_id: barberId,
          barber_name: payoutData.barber_info?.name || 'Unknown',
          success: false,
          error: barberError.message,
          amount: payoutData.total_amount / 100
        })
      }
    }

    // Calculate summary
    const successfulPayouts = payoutResults.filter(r => r.success)
    const failedPayouts = payoutResults.filter(r => !r.success)

    return NextResponse.json({
      success: true,
      payout_summary: {
        total_attempted: payoutResults.length,
        successful: successfulPayouts.length,
        failed: failedPayouts.length,
        total_amount: successfulPayouts.reduce((sum, p) => sum + p.amount, 0),
        processing_date: new Date().toISOString()
      },
      payout_results: payoutResults
    })

  } catch (error) {
    console.error('Payout processing error:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to process payouts'
    }, { status: 500 })
  }
}