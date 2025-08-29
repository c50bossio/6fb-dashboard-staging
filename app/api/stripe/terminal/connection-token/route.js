import { NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import Stripe from 'stripe'
import { createHash } from 'crypto'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2023-10-16',
})

/**
 * Generate Stripe Terminal connection token
 * Required for Terminal SDK initialization on the frontend
 */
export async function POST(request) {
  try {
    const supabase = createClient()
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { barbershopId } = await request.json()

    if (!barbershopId) {
      return NextResponse.json(
        { error: 'Barbershop ID is required' },
        { status: 400 }
      )
    }

    // Verify user has access to this barbershop
    const { data: profile } = await supabase
      .from('profiles')
      .select('barbershop_id, role')
      .eq('id', user.id)
      .single()

    const { data: barbershop } = await supabase
      .from('barbershops')
      .select('id, owner_id')
      .eq('id', barbershopId)
      .single()

    const hasAccess = profile?.barbershop_id === barbershopId || 
                     barbershop?.owner_id === user.id ||
                     profile?.role === 'admin'

    if (!hasAccess) {
      return NextResponse.json(
        { error: 'Access denied to this barbershop' },
        { status: 403 }
      )
    }

    // Create Stripe Terminal connection token
    const connectionToken = await stripe.terminal.connectionTokens.create({
      location: undefined, // Allow connection to any location for this account
    })

    // Hash the token secret for security audit trail
    const tokenHash = createHash('sha256')
      .update(connectionToken.secret)
      .digest('hex')

    // Store connection token in database for audit
    await supabase
      .from('terminal_connection_tokens')
      .insert({
        barbershop_id: barbershopId,
        token_secret: tokenHash,
        expires_at: new Date(Date.now() + (60 * 60 * 1000)), // 1 hour
        created_by: user.id
      })

    return NextResponse.json({
      secret: connectionToken.secret,
      expires_at: connectionToken.expires_at || Date.now() + (60 * 60 * 1000)
    })

  } catch (error) {
    console.error('Terminal connection token error:', error)
    
    // Handle specific Stripe errors
    if (error.type === 'StripeCardError') {
      return NextResponse.json(
        { error: 'Card error', details: error.message },
        { status: 402 }
      )
    }
    
    if (error.type === 'StripeInvalidRequestError') {
      return NextResponse.json(
        { error: 'Invalid request', details: error.message },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { 
        error: 'Failed to create connection token',
        details: process.env.NODE_ENV === 'development' ? error.message : 'Internal error'
      },
      { status: 500 }
    )
  }
}

// OPTIONS handler for CORS
export async function OPTIONS(request) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  })
}