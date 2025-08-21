import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const shopId = searchParams.get('shop_id')
    
    if (!shopId) {
      return NextResponse.json(
        { error: 'shop_id parameter is required' },
        { status: 400 }
      )
    }

    const supabase = createClient()

    // Get shop owner to find their payment method settings
    const { data: shop, error: shopError } = await supabase
      .from('barbershops')
      .select('owner_id')
      .eq('id', shopId)
      .single()

    if (shopError || !shop) {
      return NextResponse.json(
        { error: 'Shop not found' },
        { status: 404 }
      )
    }

    // Get the shop owner's payment method settings
    const { data: paymentMethods, error: methodsError } = await supabase
      .from('business_payment_methods')
      .select('method_type, enabled')
      .eq('user_id', shop.owner_id)
      .eq('enabled', true)

    if (methodsError) {
      console.error('Error fetching payment methods:', methodsError)
      // Default to accepting cards if no settings found
      return NextResponse.json({
        accepted_methods: ['card'],
        fallback: true
      })
    }

    // Extract enabled payment method types
    const acceptedMethods = paymentMethods?.map(pm => pm.method_type) || ['card']

    // Ensure we always have card as an option if no specific methods configured
    if (acceptedMethods.length === 0) {
      acceptedMethods.push('card')
    }

    return NextResponse.json({
      accepted_methods: acceptedMethods,
      fallback: false
    })

  } catch (error) {
    console.error('Error in payment methods API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}