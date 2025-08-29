import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export async function GET(request, { params }) {
  try {
    const { sessionId } = params

    if (!sessionId) {
      return NextResponse.json(
        { error: 'Session ID is required' },
        { status: 400 }
      )
    }

    // Get session from database with barbershop details
    const { data: qrSession, error: dbError } = await supabase
      .from('qr_payment_sessions')
      .select(`
        *,
        barbershops!inner(
          name,
          address,
          phone
        )
      `)
      .eq('session_id', sessionId)
      .single()

    if (dbError || !qrSession) {
      return NextResponse.json(
        { error: 'Payment session not found' },
        { status: 404 }
      )
    }

    // Check if expired
    if (new Date(qrSession.expires_at) < new Date()) {
      // Update status to expired if not already
      if (qrSession.status === 'pending') {
        await supabase
          .from('qr_payment_sessions')
          .update({ status: 'expired', processed_at: new Date().toISOString() })
          .eq('id', qrSession.id)
        
        qrSession.status = 'expired'
      }
    }

    // Return session data in a clean format
    const response = {
      id: qrSession.id,
      session_id: qrSession.session_id,
      barbershop_id: qrSession.barbershop_id,
      cart_items: qrSession.cart_items,
      total_amount: qrSession.total_amount,
      subtotal: qrSession.subtotal,
      tax_amount: qrSession.tax_amount,
      status: qrSession.status,
      stripe_session_url: qrSession.stripe_session_url,
      expires_at: qrSession.expires_at,
      created_at: qrSession.created_at,
      barbershop: {
        name: qrSession.barbershops.name,
        address: qrSession.barbershops.address,
        phone: qrSession.barbershops.phone
      }
    }

    return NextResponse.json(response)

  } catch (error) {
    console.error('Session details error:', error)
    return NextResponse.json(
      { error: 'Failed to load session details' },
      { status: 500 }
    )
  }
}