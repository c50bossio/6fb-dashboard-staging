import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { stripeService } from '@/services/stripe-service'

export async function GET(request, { params }) {
  try {
    const supabase = createClient()
    const accountId = params.accountId
    
    // Authenticate user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    // Verify account ownership
    const { data: dbAccount } = await supabase
      .from('stripe_connected_accounts')
      .select('*')
      .eq('stripe_account_id', accountId)
      .eq('user_id', user.id)
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
      // Update profile
      await supabase
        .from('profiles')
        .update({
          stripe_connect_onboarded: true,
          payment_setup_completed: true,
          payment_setup_completed_at: new Date().toISOString()
        })
        .eq('id', user.id)
      
      // Update barbershop
      if (dbAccount.barbershop_id) {
        await supabase
          .from('barbershops')
          .update({
            accepts_online_payments: true
          })
          .eq('id', dbAccount.barbershop_id)
      }
    }
    
    await supabase
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