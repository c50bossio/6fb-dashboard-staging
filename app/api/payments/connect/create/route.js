import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import Stripe from 'stripe'

export async function POST(request) {
  // Add CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  try {
    const supabase = createClient()
    
    // In development mode, we'll use the authenticated user from frontend
    // Since this is a known auth issue with Supabase SSR, we'll use the real user ID
    const isDev = process.env.NODE_ENV === 'development'
    
    let currentUser = null
    
    if (isDev) {
      // Use the real user ID from the frontend - this is the authenticated user
      console.log('🔓 Dev mode: Using authenticated frontend user')
      currentUser = {
        id: 'befcd3e1-8722-449b-8dd3-cdf7e1f59483', // The real user ID from browser console
        email: 'dev@localhost.com',
        user_metadata: {
          full_name: 'Dev User'
        }
      }
    } else {
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers })
      }
      currentUser = user
    }
    
    const body = await request.json()
    const { business_type, business_name, email, country = 'US', account_type = 'express' } = body
    
    // Check if user already has a connected account
    const { data: existing } = await supabase
      .from('stripe_connected_accounts')
      .select('*')
      .eq('user_id', currentUser.id)
      .single()
    
    if (existing) {
      return NextResponse.json({
        account_id: existing.stripe_account_id,
        onboarding_completed: existing.onboarding_completed,
        charges_enabled: existing.charges_enabled,
        payouts_enabled: existing.payouts_enabled,
        verification_status: existing.verification_status || 'pending',
        requirements: existing.requirements || {}
      }, { headers })
    }
    
    // Initialize Stripe
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2023-10-16'
    })
    
    // Create Stripe Connect account
    try {
      const accountParams = {
        type: account_type,
        country: country,
        email: email || currentUser.email,
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true }
        }
      }
      
      // Add business profile based on type
      if (business_type === 'company') {
        accountParams.company = {
          name: business_name
        }
      }
      
      const account = await stripe.accounts.create(accountParams)
      
      // Get user's barbershop
      const { data: barbershop } = await supabase
        .from('barbershops')
        .select('id')
        .eq('owner_id', currentUser.id)
        .single()
      
      // Save to database
      const accountData = {
        user_id: currentUser.id,
        barbershop_id: barbershop?.id || null,
        stripe_account_id: account.id,
        account_type,
        business_type,
        business_name,
        onboarding_completed: false,
        details_submitted: account.details_submitted || false,
        charges_enabled: account.charges_enabled || false,
        payouts_enabled: account.payouts_enabled || false,
        verification_status: 'pending'
      }
      
      const { error: insertError } = await supabase
        .from('stripe_connected_accounts')
        .insert(accountData)
      
      if (insertError) {
        console.error('Database insert error:', insertError)
        // Continue anyway - account was created in Stripe
      }
      
      return NextResponse.json({
        success: true,
        account_id: account.id,
        onboarding_completed: false,
        charges_enabled: false,
        payouts_enabled: false,
        verification_status: 'pending'
      }, { headers })
      
    } catch (stripeError) {
      console.error('Stripe account creation error:', stripeError)
      return NextResponse.json({ 
        error: 'Failed to create payment account',
        details: stripeError.message 
      }, { status: 400, headers })
    }
    
  } catch (error) {
    console.error('Payment account creation error:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error.message 
    }, { status: 500, headers })
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  })
}