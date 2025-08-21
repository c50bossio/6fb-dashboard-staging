import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// Import our payout scheduler (we'll need to handle this properly in production)
const PayoutScheduler = require('@/services/payout-scheduler')

export async function POST(request) {
  try {
    const supabase = createClient()
    
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Check if user is shop owner
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!profile || !['SHOP_OWNER', 'ENTERPRISE_OWNER', 'SUPER_ADMIN'].includes(profile.role)) {
      return NextResponse.json(
        { error: 'Forbidden - Must be a shop owner or admin' },
        { status: 403 }
      )
    }

    const { action, barber_id } = await request.json()

    const scheduler = new PayoutScheduler()

    switch (action) {
      case 'process_all':
        // Process all scheduled payouts
        const result = await scheduler.processScheduledPayouts()
        return NextResponse.json({
          success: true,
          message: `Processed ${result.processed} payouts, ${result.errors} errors`,
          details: result
        })

      case 'process_single':
        // Process payout for a specific barber
        if (!barber_id) {
          return NextResponse.json(
            { error: 'barber_id required for single payout' },
            { status: 400 }
          )
        }

        const singleResult = await scheduler.processSinglePayout(barber_id, user.id)
        return NextResponse.json(singleResult)

      case 'check_due':
        // Check which payouts are due
        const duePayouts = await scheduler.checkDuePayouts(user.id)
        return NextResponse.json({
          success: true,
          due_payouts: duePayouts
        })

      default:
        return NextResponse.json(
          { error: 'Invalid action. Use: process_all, process_single, or check_due' },
          { status: 400 }
        )
    }

  } catch (error) {
    console.error('Error in payout scheduling API:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}

export async function GET(request) {
  try {
    const supabase = createClient()
    
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get shop owner's barbershop
    const { data: shop } = await supabase
      .from('barbershops')
      .select('id')
      .eq('owner_id', user.id)
      .single()

    if (!shop) {
      return NextResponse.json({
        scheduled_payouts: [],
        next_run: null
      })
    }

    // Get upcoming scheduled payouts
    const { data: arrangements } = await supabase
      .from('financial_arrangements')
      .select(`
        *,
        profiles:barber_id (
          id,
          email,
          full_name
        ),
        barber_commission_balances (
          pending_amount,
          last_transaction_at
        )
      `)
      .eq('barbershop_id', shop.id)
      .eq('is_active', true)

    const scheduler = new PayoutScheduler()
    const scheduledPayouts = []

    for (const arrangement of arrangements || []) {
      const shouldProcess = await scheduler.shouldProcessPayout({
        ...arrangement,
        pending_balance: arrangement.barber_commission_balances?.[0]?.pending_amount || 0
      })

      if (shouldProcess.process || arrangement.barber_commission_balances?.[0]?.pending_amount > 0) {
        scheduledPayouts.push({
          barber_id: arrangement.barber_id,
          barber_name: arrangement.profiles?.full_name || arrangement.profiles?.email,
          pending_amount: arrangement.barber_commission_balances?.[0]?.pending_amount || 0,
          frequency: arrangement.payment_frequency,
          next_payout_due: shouldProcess.process,
          days_since_last: shouldProcess.daysSinceLastPayout,
          reason: shouldProcess.reason
        })
      }
    }

    return NextResponse.json({
      success: true,
      scheduled_payouts: scheduledPayouts,
      total_pending: scheduledPayouts.reduce((sum, p) => sum + (p.pending_amount || 0), 0),
      next_run: 'Daily at 9:00 AM' // This would be configured based on your cron schedule
    })

  } catch (error) {
    console.error('Error fetching scheduled payouts:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}