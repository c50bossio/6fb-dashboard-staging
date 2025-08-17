import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { stripeService } from '@/services/stripe-service'

export async function POST(request) {
  // Add CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  try {
    const supabase = createClient()
    
    // Authenticate user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers })
    }
    
    const body = await request.json()
    const { business_type, business_name, email, country = 'US', account_type = 'express' } = body
    
    // Check if user already has a connected account
    const { data: existing } = await supabase
      .from('stripe_connected_accounts')
      .select('*')
      .eq('user_id', user.id)
      .single()
    
    if (existing) {
      return NextResponse.json({
        account_id: existing.stripe_account_id,
        onboarding_completed: existing.onboarding_completed,
        charges_enabled: existing.charges_enabled,
        payouts_enabled: existing.payouts_enabled,
        verification_status: existing.verification_status || 'pending',
        requirements: existing.requirements || {}
      })
    }
    
    // Create Stripe Connect account
    const result = await stripeService.createConnectedAccount({
      email: email || user.email,
      country,
      type: account_type,
      businessType: business_type,
      businessName: business_name
    })
    
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }
    
    // Get user's barbershop
    const { data: barbershop } = await supabase
      .from('barbershops')
      .select('id')
      .eq('owner_id', user.id)
      .single()
    
    // Save to database
    const accountData = {
      user_id: user.id,
      barbershop_id: barbershop?.id || null,
      stripe_account_id: result.accountId,
      account_type,
      business_type,
      business_name,
      onboarding_completed: false,
      details_submitted: result.detailsSubmitted || false,
      charges_enabled: result.chargesEnabled || false,
      payouts_enabled: result.payoutsEnabled || false,
      verification_status: 'pending'
    }
    
    const { error: insertError } = await supabase
      .from('stripe_connected_accounts')
      .insert(accountData)
    
    if (insertError) {
      console.error('Error saving account:', insertError)
      return NextResponse.json({ error: 'Failed to save account' }, { status: 500 })
    }
    
    // Update profile
    await supabase
      .from('profiles')
      .update({
        stripe_connect_id: result.accountId,
        stripe_connect_onboarded: false
      })
      .eq('id', user.id)
    
    // Update barbershop if exists
    if (barbershop?.id) {
      await supabase
        .from('barbershops')
        .update({
          stripe_connected_account_id: result.accountId,
          accepts_online_payments: false
        })
        .eq('id', barbershop.id)
    }
    
    return NextResponse.json({
      account_id: result.accountId,
      onboarding_completed: false,
      charges_enabled: false,
      payouts_enabled: false,
      verification_status: 'pending',
      requirements: {}
    }, { headers })
    
  } catch (error) {
    console.error('Error creating connected account:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500, headers }
    )
  }
}

// Handle OPTIONS requests for CORS
export async function OPTIONS() {
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}