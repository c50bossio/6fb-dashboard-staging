import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'

/**
 * Get Payout Status Timeline API Route
 * GET /api/payout-history/timeline/[id] - Get complete status update timeline for a specific payout
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

    // Get user's barbershop ID and verify access to this payout
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
      .select('id, barbershop_id, barber_id')
      .eq('id', payoutId)
      .eq('barbershop_id', profile.shop_id)
      .single()

    if (payoutError || !payout) {
      return NextResponse.json(
        { error: 'Payout not found' },
        { status: 404 }
      )
    }

    // Additional permission check for individual barbers
    if (profile.role === 'barber' && payout.barber_id !== user.id) {
      return NextResponse.json(
        { error: 'Access denied - can only view your own payouts' },
        { status: 403 }
      )
    }

    // Get status timeline using database function
    const { data: timeline, error: timelineError } = await supabase
      .rpc('get_payout_status_timeline', {
        p_payout_record_id: payoutId
      })

    if (timelineError) {
      console.error('Error fetching payout timeline:', timelineError)
      return NextResponse.json(
        { error: 'Failed to fetch payout timeline' },
        { status: 500 }
      )
    }

    // Calculate processing time metrics
    const processingTime = Date.now() - startTime
    
    // Get additional context like recent similar payouts timeline
    const { data: recentPayouts } = await supabase
      .from('commission_payout_records')
      .select('id, status, created_at, completed_at')
      .eq('barber_id', payout.barber_id)
      .eq('barbershop_id', payout.barbershop_id)
      .order('created_at', { ascending: false })
      .limit(5)

    return NextResponse.json({
      success: true,
      data: {
        payout_id: payoutId,
        timeline: timeline || [],
        timeline_count: timeline?.length || 0,
        processing_metrics: {
          total_status_changes: timeline?.length || 0,
          first_status_change: timeline?.[0]?.occurred_at || null,
          last_status_change: timeline?.[timeline.length - 1]?.occurred_at || null,
          average_time_between_updates: calculateAverageTimeBetweenUpdates(timeline),
        },
        context: {
          recent_payouts: recentPayouts || [],
          barber_id: payout.barber_id
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
    console.error('Payout timeline API error:', error)
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

function calculateAverageTimeBetweenUpdates(timeline) {
  if (!timeline || timeline.length < 2) {
    return null
  }

  const times = timeline.map(update => new Date(update.occurred_at).getTime())
  times.sort((a, b) => a - b)
  
  let totalTimeDiff = 0
  for (let i = 1; i < times.length; i++) {
    totalTimeDiff += times[i] - times[i - 1]
  }
  
  const averageMs = totalTimeDiff / (times.length - 1)
  return Math.round(averageMs / (1000 * 60 * 60)) // Convert to hours
}