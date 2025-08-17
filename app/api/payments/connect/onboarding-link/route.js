import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import Stripe from 'stripe'

export async function POST(request) {
  try {
    const supabase = createClient()
    
    // Handle authentication with fallback for demo user
    let currentUser = null
    
    try {
      const { data: { user }, error } = await supabase.auth.getUser()
      if (user && !error) {
        currentUser = user
        console.log('✅ Standard auth successful:', user.id)
      } else {
        console.log('⚠️ Standard auth failed:', error?.message)
      }
    } catch (error) {
      console.log('⚠️ Auth check failed:', error.message)
    }
    
    // For development or demo purposes, allow a test user
    if (!currentUser && (process.env.NODE_ENV === 'development' || process.env.ALLOW_DEMO_USER === 'true')) {
      console.log('🔓 Using demo user for testing')
      currentUser = {
        id: 'befcd3e1-8722-449b-8dd3-cdf7e1f59483',
        email: 'demo@bookedbarber.com'
      }
    }
    
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const body = await request.json()
    const { account_id, refresh_url, return_url } = body
    
    // Create service client for database operations (bypass RLS)
    const serviceClient = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    )
    
    // Verify account ownership using service client
    const { data: account } = await serviceClient
      .from('stripe_connected_accounts')
      .select('*')
      .eq('stripe_account_id', account_id)
      .eq('user_id', currentUser.id)
      .single()
    
    if (!account) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 })
    }
    
    // Check if Stripe is configured
    if (!process.env.STRIPE_SECRET_KEY) {
      // Return a demo onboarding URL
      return NextResponse.json({
        url: return_url || `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:9999'}/dashboard/settings?section=payments&demo=true`,
        expires_at: Date.now() + 3600000, // 1 hour from now
        demo_mode: true,
        message: 'Demo mode: Stripe is not configured. This is a simulated onboarding flow.'
      })
    }
    
    // Initialize Stripe
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2023-10-16'
    })
    
    // Check if we're using live or test Stripe keys
    const isLiveMode = process.env.STRIPE_SECRET_KEY && process.env.STRIPE_SECRET_KEY.startsWith('sk_live')
    
    // For test mode, use localhost. For live mode, use production domain
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 
                   (isLiveMode ? 'https://bookedbarber.com' : 'http://localhost:9999')
    
    // Format URLs based on Stripe mode
    const formatUrl = (url) => {
      if (!url) return null
      
      if (isLiveMode) {
        // In live mode, replace localhost with production domain
        if (url.includes('localhost') || url.startsWith('http://')) {
          return url.replace(/http:\/\/localhost:?\d*/, 'https://bookedbarber.com')
                   .replace('http://', 'https://')
        }
      } else {
        // In test mode, keep localhost URLs as-is for local development
        return url
      }
      return url
    }
    
    // Create account link
    const accountLink = await stripe.accountLinks.create({
      account: account_id,
      refresh_url: formatUrl(refresh_url) || `${appUrl}/dashboard/settings#payments`,
      return_url: formatUrl(return_url) || `${appUrl}/dashboard/settings?section=payments&success=true`,
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