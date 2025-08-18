import { createClient as createServiceClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { stripeService } from '@/services/stripe-service'

export async function GET(request, { params }) {
  try {
    const supabase = createClient()
    const accountId = params.accountId
    
    // Handle authentication with fallback for demo user
    let currentUser = null
    
    try {
      const { data: { user }, error } = await supabase.auth.getUser()
      if (user && !error) {
        currentUser = user
      } else {
      }
    } catch (error) {
    }
    
    // For development or demo purposes, allow a test user
    if (!currentUser && (process.env.NODE_ENV === 'development' || process.env.ALLOW_DEMO_USER === 'true')) {
      currentUser = {
        id: 'befcd3e1-8722-449b-8dd3-cdf7e1f59483',
        email: 'demo@bookedbarber.com'
      }
    }
    
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    // Create service client for database operations (bypass RLS)
    const serviceClient = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    )
    
    // Verify account ownership using service client
    const { data: dbAccount } = await serviceClient
      .from('stripe_connected_accounts')
      .select('*')
      .eq('stripe_account_id', accountId)
      .eq('user_id', currentUser.id)
      .single()
    
    if (!dbAccount) {
      return NextResponse.json({ error: 'Account not found or unauthorized' }, { status: 403 })
    }
    
    // Get latest status from Stripe
    const result = await stripeService.retrieveAccount(accountId)
    
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }
    
    const account = result.account
    
    // Update database with latest status
    const updateData = {
      details_submitted: account.detailsSubmitted,
      charges_enabled: account.chargesEnabled,
      payouts_enabled: account.payoutsEnabled,
      capabilities: account.capabilities || {},
      requirements: account.requirements || {},
      verification_status: account.chargesEnabled && account.payoutsEnabled ? 'verified' : 'pending',
      onboarding_completed: account.detailsSubmitted && account.chargesEnabled && account.payoutsEnabled,
      updated_at: new Date().toISOString()
    }
    
    // Check if onboarding is complete
    if (updateData.onboarding_completed && !dbAccount.onboarding_completed) {
      // Update profile using service client
      await serviceClient
        .from('profiles')
        .update({
          stripe_connect_onboarded: true,
          payment_setup_completed: true,
          payment_setup_completed_at: new Date().toISOString()
        })
        .eq('id', currentUser.id)
      
      // Update barbershop using service client
      if (dbAccount.barbershop_id) {
        await serviceClient
          .from('barbershops')
          .update({
            accepts_online_payments: true
          })
          .eq('id', dbAccount.barbershop_id)
      }
    }
    
    await serviceClient
      .from('stripe_connected_accounts')
      .update(updateData)
      .eq('stripe_account_id', accountId)
    
    return NextResponse.json({
      account_id: account.id,
      onboarding_completed: updateData.onboarding_completed,
      charges_enabled: account.chargesEnabled,
      payouts_enabled: account.payoutsEnabled,
      verification_status: updateData.verification_status,
      requirements: account.requirements || {}
    })
    
  } catch (error) {
    console.error('Error getting account status:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}