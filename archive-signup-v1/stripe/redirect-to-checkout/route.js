import { createClient } from '@/lib/supabase/server-client'
import { NextResponse } from 'next/server'

export async function GET(request) {
  const requestUrl = new URL(request.url)
  const plan = requestUrl.searchParams.get('plan')
  const billing = requestUrl.searchParams.get('billing') || 'monthly'
  const origin = requestUrl.origin

  if (!plan) {
    return NextResponse.redirect(`${origin}/subscribe?error=missing_plan`)
  }

  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.redirect(`${origin}/login?redirect=/subscribe`)
  }

  try {
    // Create Stripe checkout session
    const response = await fetch(`${origin}/api/stripe/create-checkout-session`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        tierId: plan,
        billingPeriod: billing,
        userId: user.id,
        userEmail: user.email
      })
    })

    const data = await response.json()

    if (!response.ok) {
      console.error('Checkout creation error:', data.error)
      return NextResponse.redirect(`${origin}/subscribe?error=checkout_failed`)
    }

    // Redirect to Stripe Checkout
    if (data.checkoutUrl) {
      return NextResponse.redirect(data.checkoutUrl)
    } else {
      return NextResponse.redirect(`${origin}/subscribe?error=no_checkout_url`)
    }
  } catch (err) {
    console.error('Redirect to checkout error:', err)
    return NextResponse.redirect(`${origin}/subscribe?error=server_error`)
  }
}