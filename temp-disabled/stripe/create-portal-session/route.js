import { stripe } from '@/lib/stripe'
import { createClient } from '@/lib/supabase/server'
import { captureException } from '@/lib/sentry'

export async function POST(req) {
  try {
    const supabase = createClient()
    
    // Check authentication
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return new Response('Unauthorized', { status: 401 })
    }

    // Get user's Stripe customer ID
    const { data: profile } = await supabase
      .from('profiles')
      .select('stripe_customer_id')
      .eq('id', user.id)
      .single()

    if (!profile?.stripe_customer_id) {
      return new Response('No customer found', { status: 404 })
    }

    // Create portal session
    const session = await stripe.billingPortal.sessions.create({
      customer: profile.stripe_customer_id,
      return_url: `${req.headers.get('origin')}/dashboard/billing`,
    })

    return Response.json({ url: session.url })
  } catch (error) {
    captureException(error, { context: 'Stripe portal session creation' })
    return new Response('Internal Server Error', { status: 500 })
  }
}