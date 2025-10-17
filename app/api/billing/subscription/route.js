import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'

export async function GET(request) {
  try {
    const supabase = await createClient()

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get user's profile to find shop/organization
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('barbershop_id, role')
      .eq('id', user.id)
      .single()

    if (profileError) {
      console.error('Error fetching profile:', profileError)
    }

    const shopId = profile?.barbershop_id

    // Try to fetch subscription data from database
    let subscriptionData = null
    if (shopId) {
      const { data, error } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('barbershop_id', shopId)
        .single()

      if (!error && data) {
        subscriptionData = data
      }
    }

    // Return subscription data or default structure
    const response = {
      subscription: subscriptionData || {
        status: 'active',
        plan: {
          name: 'Professional',
          price: 4900, // $49.00 in cents
          interval: 'month'
        },
        current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        trial_end: null
      },
      usage: {
        bookings_per_month: {
          current: 0,
          limit: 2000
        },
        ai_chats_per_month: {
          current: 0,
          limit: 5000
        },
        staff_accounts: {
          current: 0,
          limit: 15
        },
        locations: {
          current: 1,
          limit: 3
        }
      }
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Subscription API Error:', error)
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    )
  }
}
