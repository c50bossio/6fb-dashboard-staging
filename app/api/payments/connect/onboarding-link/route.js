import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import Stripe from 'stripe'

export async function POST(request) {
  try {
    const supabase = createClient()
    
    // Authenticate user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const body = await request.json()
    const { account_id, refresh_url, return_url } = body
    
    // Verify account ownership
    const { data: account } = await supabase
      .from('stripe_connected_accounts')
      .select('*')
      .eq('stripe_account_id', account_id)
      .eq('user_id', user.id)
      .single()
    
    if (!account) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 })
    }
    
    // Initialize Stripe
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2023-10-16'
    })
    
    // Create account link
    const accountLink = await stripe.accountLinks.create({
      account: account_id,
      refresh_url: refresh_url || `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/settings#payments`,
      return_url: return_url || `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/settings?section=payments&success=true`,
      type: 'account_onboarding',
    })
    
    return NextResponse.json({
      url: accountLink.url,
      expires_at: accountLink.expires_at
    })
    
  } catch (error) {
    console.error('Onboarding link error:', error)
    return NextResponse.json({ 
      error: 'Failed to generate onboarding link',
      details: error.message
    }, { status: 500 })
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