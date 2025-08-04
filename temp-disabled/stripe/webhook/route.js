import { stripe } from '@/lib/stripe'
import { createClient } from '@/lib/supabase/server'
import { captureException } from '@/lib/sentry'

export const dynamic = 'force-dynamic'

// Stripe requires raw body for webhook verification
export async function POST(req) {
  const body = await req.text()
  const signature = req.headers.get('stripe-signature')

  if (!signature) {
    return new Response('No signature', { status: 400 })
  }

  try {
    // Verify webhook signature
    const event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET
    )

    const supabase = createClient()

    // Handle different event types
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object
        
        // Update user's subscription status
        if (session.subscription) {
          const subscription = await stripe.subscriptions.retrieve(session.subscription)
          const planId = subscription.items.data[0].price.id
          
          await supabase
            .from('profiles')
            .update({
              subscription_status: 'active',
              subscription_id: subscription.id,
              subscription_plan: subscription.metadata.plan_id || 'starter',
              subscription_current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
            })
            .eq('stripe_customer_id', session.customer)
        }
        break
      }

      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const subscription = event.data.object
        
        await supabase
          .from('profiles')
          .update({
            subscription_status: subscription.status,
            subscription_plan: subscription.metadata.plan_id || 'starter',
            subscription_current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
          })
          .eq('stripe_customer_id', subscription.customer)
        break
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object
        
        await supabase
          .from('profiles')
          .update({
            subscription_status: 'canceled',
            subscription_plan: 'free',
            subscription_id: null,
          })
          .eq('stripe_customer_id', subscription.customer)
        break
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object
        
        // Record successful payment
        await supabase
          .from('payments')
          .insert({
            stripe_invoice_id: invoice.id,
            stripe_customer_id: invoice.customer,
            amount: invoice.amount_paid,
            currency: invoice.currency,
            status: 'succeeded',
            description: invoice.description,
            created_at: new Date(invoice.created * 1000).toISOString(),
          })
        break
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object
        
        // Record failed payment
        await supabase
          .from('payments')
          .insert({
            stripe_invoice_id: invoice.id,
            stripe_customer_id: invoice.customer,
            amount: invoice.amount_due,
            currency: invoice.currency,
            status: 'failed',
            description: invoice.description,
            created_at: new Date(invoice.created * 1000).toISOString(),
          })
        
        // Update subscription status
        await supabase
          .from('profiles')
          .update({
            subscription_status: 'past_due',
          })
          .eq('stripe_customer_id', invoice.customer)
        break
      }

      default:
        console.log(`Unhandled event type: ${event.type}`)
    }

    return new Response('Webhook processed', { status: 200 })
  } catch (error) {
    captureException(error, { 
      context: 'Stripe webhook processing',
      eventType: event?.type,
    })
    
    return new Response('Webhook error', { status: 400 })
  }
}