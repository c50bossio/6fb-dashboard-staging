import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// POST - Create a simple demo barbershop for testing
export async function POST(request) {
  try {
    const supabase = createClient()

    // Check if demo barbershop already exists
    const { data: existing } = await supabase
      .from('barbershops')
      .select('id, shop_slug')
      .eq('name', '6FB Demo Barbershop')
      .maybeSingle()

    if (existing) {
      return NextResponse.json({ 
        message: 'Demo barbershop already exists',
        shopId: existing.id 
      })
    }

    // Create simple barbershop record
    const { data: barbershop, error: shopError } = await supabase
      .from('barbershops')
      .insert({
        name: '6FB Demo Barbershop',
        description: 'Demo barbershop for testing customization features',
        address: '123 Main Street',
        city: 'Demo City', 
        state: 'CA',
        phone: '(555) 123-4567',
        email: 'demo@6fb.com',
        booking_enabled: true,
        online_booking_enabled: true
      })
      .select()
      .single()

    if (shopError) {
      console.error('Error creating demo barbershop:', shopError)
      return NextResponse.json({ 
        error: 'Failed to create demo barbershop: ' + (shopError.message || JSON.stringify(shopError))
      }, { status: 500 })
    }

    return NextResponse.json({
      message: 'Demo barbershop created successfully',
      shopId: barbershop.id,
      data: barbershop
    })

  } catch (error) {
    console.error('Error in POST /api/demo/simple-setup:', error)
    return NextResponse.json(
      { error: 'Internal server error: ' + error.message },
      { status: 500 }
    )
  }
}

// GET - Check if demo data exists
export async function GET(request) {
  try {
    const supabase = createClient()

    const { data: barbershop } = await supabase
      .from('barbershops')
      .select('id, name')
      .eq('name', '6FB Demo Barbershop')
      .maybeSingle()

    return NextResponse.json({
      exists: !!barbershop,
      data: barbershop
    })

  } catch (error) {
    console.error('Error in GET /api/demo/simple-setup:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}