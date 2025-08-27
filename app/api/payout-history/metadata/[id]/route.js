import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'

/**
 * Payout Transaction Metadata API Route
 * GET /api/payout-history/metadata/[id] - Get extended metadata for a payout
 * PATCH /api/payout-history/metadata/[id] - Update metadata (admin only)
 */

export async function GET(request, { params }) {
  const startTime = Date.now()
  
  try {
    const supabase = await createClient()
    const payoutId = params.id
    
    // Validate payout ID format
    if (!payoutId || !isValidUUID(payoutId)) {
      return NextResponse.json(
        { error: 'Valid payout ID is required' },
        { status: 400 }
      )
    }

    // Get current user and verify permissions
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Get user's barbershop ID and role
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('shop_id, role')
      .eq('id', user.id)
      .single()

    if (profileError || !profile?.shop_id) {
      return NextResponse.json(
        { error: 'Barbershop association required' },
        { status: 403 }
      )
    }

    // Verify the payout belongs to this barbershop
    const { data: payout, error: payoutError } = await supabase
      .from('commission_payout_records')
      .select('id, barbershop_id, barber_id, amount, status')
      .eq('id', payoutId)
      .eq('barbershop_id', profile.shop_id)
      .single()

    if (payoutError || !payout) {
      return NextResponse.json(
        { error: 'Payout not found' },
        { status: 404 }
      )
    }

    // Get extended metadata
    const { data: metadata, error: metadataError } = await supabase
      .from('payout_transaction_metadata')
      .select('*')
      .eq('payout_record_id', payoutId)
      .single()

    // Get related commission transactions
    const { data: commissionTransactions } = await supabase
      .from('commission_transactions')
      .select(`
        id,
        payment_intent_id,
        payment_amount,
        commission_amount,
        commission_percentage,
        arrangement_type,
        status,
        created_at,
        metadata
      `)
      .eq('barber_id', payout.barber_id)
      .eq('barbershop_id', payout.barbershop_id)
      .eq('status', 'paid_out')
      .order('created_at', { ascending: false })
      .limit(10)

    // Get failed attempts if any
    const { data: failedAttempts } = await supabase
      .from('payout_failed_attempts')
      .select('*')
      .eq('payout_record_id', payoutId)
      .order('attempted_at', { ascending: false })

    const processingTime = Date.now() - startTime

    return NextResponse.json({
      success: true,
      data: {
        payout_id: payoutId,
        extended_metadata: metadata,
        commission_transactions: commissionTransactions || [],
        failed_attempts: failedAttempts || [],
        calculated_fields: {
          total_commission_transactions: commissionTransactions?.length || 0,
          total_commission_amount: commissionTransactions?.reduce((sum, tx) => sum + parseFloat(tx.commission_amount || 0), 0) || 0,
          average_commission_rate: calculateAverageCommissionRate(commissionTransactions),
          retry_count: failedAttempts?.length || 0,
          last_retry_attempt: failedAttempts?.[0]?.attempted_at || null
        },
        permissions: {
          can_edit: ['admin', 'shop_owner'].includes(profile.role),
          can_view_sensitive: ['admin', 'shop_owner'].includes(profile.role) || payout.barber_id === user.id
        }
      },
      metadata: {
        processing_time_ms: processingTime,
        barbershop_id: profile.shop_id,
        generated_at: new Date().toISOString(),
        user_role: profile.role
      }
    })

  } catch (error) {
    console.error('Payout metadata API error:', error)
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    )
  }
}

export async function PATCH(request, { params }) {
  try {
    const supabase = await createClient()
    const payoutId = params.id
    const body = await request.json()
    
    // Validate payout ID format
    if (!payoutId || !isValidUUID(payoutId)) {
      return NextResponse.json(
        { error: 'Valid payout ID is required' },
        { status: 400 }
      )
    }

    // Get current user and verify permissions
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Get user's barbershop ID and role
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('shop_id, role')
      .eq('id', user.id)
      .single()

    if (profileError || !profile?.shop_id) {
      return NextResponse.json(
        { error: 'Barbershop association required' },
        { status: 403 }
      )
    }

    // Check admin permissions
    if (!['admin', 'shop_owner'].includes(profile.role)) {
      return NextResponse.json(
        { error: 'Admin permissions required to update metadata' },
        { status: 403 }
      )
    }

    // Verify the payout belongs to this barbershop
    const { data: payout, error: payoutError } = await supabase
      .from('commission_payout_records')
      .select('id, barbershop_id')
      .eq('id', payoutId)
      .eq('barbershop_id', profile.shop_id)
      .single()

    if (payoutError || !payout) {
      return NextResponse.json(
        { error: 'Payout not found' },
        { status: 404 }
      )
    }

    // Prepare update data
    const updateData = {}
    
    // Allow updating specific fields
    const allowedFields = [
      'reconciliation_notes',
      'reconciliation_status',
      'service_commission_amount',
      'product_commission_amount',
      'tier_bonus_amount',
      'adjustment_amount',
      'platform_fee_amount',
      'requires_1099'
    ]

    allowedFields.forEach(field => {
      if (body.hasOwnProperty(field)) {
        updateData[field] = body[field]
      }
    })

    // Add audit information
    updateData.updated_at = new Date().toISOString()
    
    if (body.reconciliation_status && body.reconciliation_status === 'resolved') {
      updateData.reconciled_at = new Date().toISOString()
      updateData.reconciled_by = user.id
    }

    // Update or create metadata record
    const { data: updatedMetadata, error: updateError } = await supabase
      .from('payout_transaction_metadata')
      .upsert({
        payout_record_id: payoutId,
        barbershop_id: profile.shop_id,
        ...updateData
      }, {
        onConflict: 'payout_record_id'
      })
      .select()
      .single()

    if (updateError) {
      console.error('Error updating payout metadata:', updateError)
      return NextResponse.json(
        { error: 'Failed to update metadata' },
        { status: 500 }
      )
    }

    // Log the metadata update in audit trail
    await supabase
      .from('payout_audit_trail')
      .insert({
        barbershop_id: profile.shop_id,
        action_type: 'metadata_updated',
        entity_type: 'metadata',
        entity_id: updatedMetadata.id,
        performed_by: user.id,
        performer_role: profile.role,
        previous_values: body.previous_values || {},
        new_values: updateData,
        change_summary: `Metadata updated by ${profile.role}`,
        api_endpoint: '/api/payout-history/metadata/[id]'
      })

    return NextResponse.json({
      success: true,
      data: {
        payout_id: payoutId,
        updated_metadata: updatedMetadata,
        updated_fields: Object.keys(updateData),
        updated_at: new Date().toISOString()
      }
    })

  } catch (error) {
    console.error('Payout metadata update error:', error)
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    )
  }
}

// Helper Functions

function isValidUUID(uuid) {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
  return uuidRegex.test(uuid)
}

function calculateAverageCommissionRate(transactions) {
  if (!transactions || transactions.length === 0) {
    return null
  }

  const rates = transactions
    .map(tx => parseFloat(tx.commission_percentage || 0))
    .filter(rate => rate > 0)

  if (rates.length === 0) {
    return null
  }

  const average = rates.reduce((sum, rate) => sum + rate, 0) / rates.length
  return Math.round(average * 100) / 100 // Round to 2 decimal places
}