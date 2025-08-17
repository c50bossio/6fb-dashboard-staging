import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import Stripe from 'stripe'

export async function GET(request) {
  try {
    const supabase = createClient()
    
    // Handle authentication with fallback for SSR cookie issues
    let user = null
    let authError = null
    
    try {
      const { data: { user: authUser }, error } = await supabase.auth.getUser()
      if (authUser && !error) {
        user = authUser
        console.log('✅ Standard auth successful:', authUser.id)
      } else {
        authError = error
        console.log('⚠️ Standard auth failed:', error?.message)
      }
    } catch (error) {
      console.log('⚠️ Auth check failed:', error.message)
      authError = error
    }
    
    // Fallback for demo/testing
    if (!user && (process.env.NODE_ENV === 'development' || process.env.ALLOW_DEMO_USER === 'true')) {
      console.log('🔓 Using demo user for testing')
      user = {
        id: 'demo-user-id',
        email: 'demo@bookedbarber.com'
      }
    }
    
    if (!user) {
      return NextResponse.json({ 
        error: 'Authentication required',
        details: authError?.message || 'No valid session found'
      }, { status: 401 })
    }
    
    // Get payout settings
    const { data: settings, error } = await supabase
      .from('payout_settings')
      .select('*')
      .eq('user_id', user.id)
      .single()
    
    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
      console.error('Error fetching payout settings:', error)
      return NextResponse.json({ error: 'Failed to fetch payout settings' }, { status: 500 })
    }
    
    return NextResponse.json({
      settings: settings || null
    })
    
  } catch (error) {
    console.error('Error getting payout settings:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request) {
  try {
    const supabase = createClient()
    
    // Handle authentication with fallback for SSR cookie issues
    let user = null
    let authError = null
    
    try {
      const { data: { user: authUser }, error } = await supabase.auth.getUser()
      if (authUser && !error) {
        user = authUser
        console.log('✅ Standard auth successful:', authUser.id)
      } else {
        authError = error
        console.log('⚠️ Standard auth failed:', error?.message)
      }
    } catch (error) {
      console.log('⚠️ Auth check failed:', error.message)
      authError = error
    }
    
    // Fallback for demo/testing
    if (!user && (process.env.NODE_ENV === 'development' || process.env.ALLOW_DEMO_USER === 'true')) {
      console.log('🔓 Using demo user for testing')
      user = {
        id: 'demo-user-id',
        email: 'demo@bookedbarber.com'
      }
    }
    
    if (!user) {
      return NextResponse.json({ 
        error: 'Authentication required',
        details: authError?.message || 'No valid session found'
      }, { status: 401 })
    }
    
    const body = await request.json()
    const { schedule = 'daily', delay_days = 2, day_of_week, day_of_month, minimum_amount } = body
    
    // Get user's connected account
    const { data: account } = await supabase
      .from('stripe_connected_accounts')
      .select('*')
      .eq('user_id', user.id)
      .single()
    
    if (!account) {
      return NextResponse.json({ error: 'No connected account found' }, { status: 404 })
    }
    
    // Initialize Stripe
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2023-10-16'
    })
    
    // Update Stripe payout schedule
    try {
      await stripe.accounts.update(account.stripe_account_id, {
        settings: {
          payouts: {
            schedule: {
              interval: schedule,
              delay_days: delay_days
            }
          }
        }
      })
    } catch (stripeError) {
      console.error('Stripe payout schedule update error:', stripeError)
      return NextResponse.json({ error: 'Failed to update payout schedule' }, { status: 400 })
    }
    
    // Get barbershop
    const { data: barbershop } = await supabase
      .from('barbershops')
      .select('id')
      .eq('owner_id', user.id)
      .single()
    
    // Update database
    const payoutData = {
      user_id: user.id,
      barbershop_id: barbershop?.id || null,
      stripe_connected_account_id: account.id,
      payout_method: 'standard',
      payout_schedule: schedule,
      payout_day_of_week: day_of_week,
      payout_day_of_month: day_of_month,
      minimum_payout_amount: minimum_amount || 0,
      auto_payout: true,
      updated_at: new Date().toISOString()
    }
    
    // Upsert payout settings
    const { data: existing } = await supabase
      .from('payout_settings')
      .select('id')
      .eq('user_id', user.id)
      .single()
    
    if (existing) {
      await supabase
        .from('payout_settings')
        .update(payoutData)
        .eq('id', existing.id)
    } else {
      await supabase
        .from('payout_settings')
        .insert(payoutData)
    }
    
    // Update account payout schedule in database
    await supabase
      .from('stripe_connected_accounts')
      .update({
        payout_schedule: schedule
      })
      .eq('id', account.id)
    
    return NextResponse.json({
      success: true,
      message: 'Payout settings updated'
    })
    
  } catch (error) {
    console.error('Error updating payout settings:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}