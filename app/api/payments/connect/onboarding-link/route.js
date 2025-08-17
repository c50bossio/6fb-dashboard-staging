import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { stripeService } from '@/services/stripe-service'

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
      return NextResponse.json({ error: 'Account not found or unauthorized' }, { status: 403 })
    }
    
    // Create account link
    const result = await stripeService.createAccountLink(
      account_id,
      refresh_url,
      return_url
    )
    
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }
    
    return NextResponse.json({
      url: result.url,
      expires_at: result.expiresAt
    })
    
  } catch (error) {
    console.error('Error creating onboarding link:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}