import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
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
    
    // Handle authentication with fallback for SSR cookie issues
    // Try standard auth first, then use fallback methods if needed
    let currentUser = null
    let authError = null
    
    try {
      const { data: { user }, error } = await supabase.auth.getUser()
      if (user && !error) {
        currentUser = user
        console.log('✅ Standard auth successful:', user.id)
      } else {
        authError = error
        console.log('⚠️ Standard auth failed:', error?.message)
      }
    } catch (error) {
      console.log('⚠️ Auth check failed:', error.message)
      authError = error
    }
    
    // If standard auth fails, try alternative auth methods
    if (!currentUser) {
      // Check for auth header or session cookie as fallback
      const authHeader = request.headers.get('authorization')
      const userIdHeader = request.headers.get('x-user-id')
      
      if (authHeader && authHeader.startsWith('Bearer ')) {
        // Try to validate the bearer token
        console.log('🔐 Attempting bearer token auth')
        try {
          const { data: { user }, error } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''))
          if (user) {
            currentUser = user
            console.log('✅ Bearer token auth successful:', user.id)
          }
        } catch (error) {
          console.log('❌ Bearer token auth failed:', error.message)
        }
      }
      
      // For development or demo purposes, allow a test user
      if (!currentUser && (process.env.NODE_ENV === 'development' || process.env.ALLOW_DEMO_USER === 'true')) {
        console.log('🔓 Using demo user for testing')
        currentUser = {
          id: 'befcd3e1-8722-449b-8dd3-cdf7e1f59483',
          email: 'demo@bookedbarber.com',
          user_metadata: {
            full_name: 'Demo User'
          }
        }
      }
    }
    
    // If we still don't have a user, return unauthorized
    if (!currentUser) {
      console.log('❌ No valid authentication found')
      return NextResponse.json({ 
        error: 'Authentication required',
        details: authError?.message || 'No valid session found'
      }, { status: 401, headers })
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
    
    // Check if Stripe is configured
    if (!process.env.STRIPE_SECRET_KEY) {
      console.warn('⚠️ STRIPE_SECRET_KEY not configured')
      return NextResponse.json({ 
        error: 'Payment system not configured',
        details: 'Stripe API keys are missing from environment configuration'
      }, { status: 503, headers })
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
        accountParams.business_type = 'company'
        accountParams.company = {
          name: business_name
        }
      } else if (business_type === 'individual') {
        accountParams.business_type = 'individual'
      }
      
      const account = await stripe.accounts.create(accountParams)
      
      // Create service client for database operations (bypass RLS)
      const serviceClient = createServiceClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY
      )
      
      // Get user's barbershop
      const { data: barbershop } = await serviceClient
        .from('barbershops')
        .select('id')
        .eq('owner_id', currentUser.id)
        .single()
      
      // Save to database using service client
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
      
      const { error: insertError } = await serviceClient
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