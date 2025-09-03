import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
/**
 * Comprehensive Payout History API Route
 * Provides detailed payout history with advanced filtering, pagination, and real-time status tracking
 * 
 * GET /api/payout-history - Get payout history with filters
 * Query parameters:
 * - barber_id: Filter by specific barber (UUID)
 * - status: Filter by payout status (pending, processing, completed, failed, cancelled)
 * - method: Filter by payout method (stripe_transfer, manual, cash, check, venmo, cashapp)
 * - date_from: Start date filter (ISO string)
 * - date_to: End date filter (ISO string)
 * - limit: Number of records to return (default: 50, max: 200)
 * - offset: Number of records to skip (default: 0)
 * - include_status_history: Include full status update history (default: false)
 * - include_metadata: Include extended metadata (default: false)
 * - search: Search by barber name, reference number, or notes
 * - sort: Sort field and direction (created_at_desc, amount_asc, etc.)
 */

export async function GET(request) {
  const startTime = Date.now()
  
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    
    // Get current user and barbershop context
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Get user's barbershop ID
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('barbershop_id')
      .eq('id', user.id)
      .single()

    if (profileError || !profile?.barbershop_id) {
      return NextResponse.json(
        { error: 'Barbershop association required' },
        { status: 403 }
      )
    }

    const barbershopId = profile.barbershop_id

    // Parse and validate query parameters
    const filters = {
      barber_id: searchParams.get('barber_id'),
      status: searchParams.get('status'),
      method: searchParams.get('method'),
      date_from: searchParams.get('date_from'),
      date_to: searchParams.get('date_to'),
      search: searchParams.get('search'),
      sort: searchParams.get('sort') || 'created_at_desc'
    }

    const options = {
      limit: Math.min(parseInt(searchParams.get('limit') || '50'), 200),
      offset: Math.max(parseInt(searchParams.get('offset') || '0'), 0),
      include_status_history: searchParams.get('include_status_history') === 'true',
      include_metadata: searchParams.get('include_metadata') === 'true',
      include_reconciliation: searchParams.get('include_reconciliation') === 'true'
    }

    // Validate UUID parameters
    if (filters.barber_id && !isValidUUID(filters.barber_id)) {
      return NextResponse.json(
        { error: 'Invalid barber_id format' },
        { status: 400 }
      )
    }

    // Validate date parameters
    if (filters.date_from && !isValidDate(filters.date_from)) {
      return NextResponse.json(
        { error: 'Invalid date_from format. Use ISO 8601 format.' },
        { status: 400 }
      )
    }

    if (filters.date_to && !isValidDate(filters.date_to)) {
      return NextResponse.json(
        { error: 'Invalid date_to format. Use ISO 8601 format.' },
        { status: 400 }
      )
    }

    // Get comprehensive payout history using database function
    const { data: payoutHistory, error: historyError } = await supabase
      .rpc('get_payout_history', {
        p_barbershop_id: barbershopId,
        p_barber_id: filters.barber_id || null,
        p_status: filters.status || null,
        p_method: filters.method || null,
        p_date_from: filters.date_from || null,
        p_date_to: filters.date_to || null,
        p_limit: options.limit,
        p_offset: options.offset
      })

    if (historyError) {
      console.error('Error fetching payout history:', historyError)
      return NextResponse.json(
        { error: 'Failed to fetch payout history' },
        { status: 500 }
      )
    }

    // Apply search filter if specified
    let filteredHistory = payoutHistory || []
    if (filters.search) {
      const searchTerm = filters.search.toLowerCase()
      filteredHistory = filteredHistory.filter(payout => 
        payout.barber_name?.toLowerCase().includes(searchTerm) ||
        payout.reference_number?.toLowerCase().includes(searchTerm) ||
        payout.metadata?.notes?.toLowerCase().includes(searchTerm)
      )
    }

    // Apply custom sorting
    filteredHistory = applySorting(filteredHistory, filters.sort)

    // Enrich with additional data if requested
    if (options.include_status_history || options.include_metadata || options.include_reconciliation) {
      filteredHistory = await enrichPayoutHistory(
        filteredHistory, 
        supabase, 
        options
      )
    }

    // Get summary statistics
    const summary = await getPayoutSummaryStats(
      barbershopId, 
      filters, 
      supabase
    )

    // Calculate processing time
    const processingTime = Date.now() - startTime

    return NextResponse.json({
      success: true,
      data: {
        payouts: filteredHistory,
        summary: summary,
        pagination: {
          limit: options.limit,
          offset: options.offset,
          total: filteredHistory.length,
          has_more: filteredHistory.length === options.limit
        },
        filters: {
          applied: filters,
          available: {
            statuses: ['pending', 'processing', 'completed', 'failed', 'cancelled'],
            methods: ['stripe_transfer', 'manual', 'cash', 'check', 'venmo', 'cashapp'],
            sort_options: [
              'created_at_desc', 'created_at_asc', 
              'amount_desc', 'amount_asc',
              'status_asc', 'barber_name_asc'
            ]
          }
        }
      },
      metadata: {
        processing_time_ms: processingTime,
        barbershop_id: barbershopId,
        generated_at: new Date().toISOString()
      }
    })

  } catch (error) {
    console.error('Payout history API error:', error)
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    )
  }
}

/**
 * POST /api/payout-history/status-update
 * Create a manual status update for a payout (admin only)
 */
export async function POST(request) {
  try {
    const supabase = await createClient()
    const body = await request.json()
    
    // Validate authentication
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Validate admin permissions
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, barbershop_id')
      .eq('id', user.id)
      .single()

    if (!profile || !['admin', 'shop_owner'].includes(profile.role)) {
      return NextResponse.json(
        { error: 'Admin permissions required' },
        { status: 403 }
      )
    }

    // Validate request body
    const { payout_record_id, new_status, status_reason, metadata } = body
    
    if (!payout_record_id || !new_status) {
      return NextResponse.json(
        { error: 'payout_record_id and new_status are required' },
        { status: 400 }
      )
    }

    if (!isValidUUID(payout_record_id)) {
      return NextResponse.json(
        { error: 'Invalid payout_record_id format' },
        { status: 400 }
      )
    }

    // Get current payout record to verify ownership and get current status
    const { data: payoutRecord, error: payoutError } = await supabase
      .from('commission_payout_records')
      .select('id, barbershop_id, status')
      .eq('id', payout_record_id)
      .eq('barbershop_id', profile.barbershop_id)
      .single()

    if (payoutError || !payoutRecord) {
      return NextResponse.json(
        { error: 'Payout record not found' },
        { status: 404 }
      )
    }

    // Create status update using database function
    const { data: updateId, error: updateError } = await supabase
      .rpc('create_payout_status_update', {
        p_payout_record_id: payout_record_id,
        p_barbershop_id: payoutRecord.barbershop_id,
        p_previous_status: payoutRecord.status,
        p_new_status: new_status,
        p_status_reason: status_reason || 'Manual update by admin',
        p_metadata: metadata || {},
        p_performed_by: user.id
      })

    if (updateError) {
      console.error('Error creating status update:', updateError)
      return NextResponse.json(
        { error: 'Failed to create status update' },
        { status: 500 }
      )
    }

    // Update the main payout record status
    const { error: recordUpdateError } = await supabase
      .from('commission_payout_records')
      .update({
        status: new_status,
        updated_at: new Date().toISOString()
      })
      .eq('id', payout_record_id)

    if (recordUpdateError) {
      console.error('Error updating payout record:', recordUpdateError)
      return NextResponse.json(
        { error: 'Failed to update payout record' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: {
        status_update_id: updateId,
        payout_record_id: payout_record_id,
        new_status: new_status,
        updated_at: new Date().toISOString()
      }
    })

  } catch (error) {
    console.error('Status update API error:', error)
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

function isValidDate(dateString) {
  try {
    const date = new Date(dateString)
    return date instanceof Date && !isNaN(date.getTime())
  } catch {
    return false
  }
}

function applySorting(data, sortOption) {
  const [field, direction] = sortOption.split('_')
  const isDescending = direction === 'desc'
  
  return data.sort((a, b) => {
    let aValue = a[field]
    let bValue = b[field]
    
    // Handle special cases
    if (field === 'barber_name') {
      aValue = a.barber_name || ''
      bValue = b.barber_name || ''
    }
    
    // Handle dates
    if (field === 'created_at' || field === 'completed_at') {
      aValue = new Date(aValue)
      bValue = new Date(bValue)
    }
    
    // Handle numbers
    if (field === 'amount') {
      aValue = parseFloat(aValue) || 0
      bValue = parseFloat(bValue) || 0
    }
    
    // Compare values
    if (aValue < bValue) return isDescending ? 1 : -1
    if (aValue > bValue) return isDescending ? -1 : 1
    return 0
  })
}

async function enrichPayoutHistory(payouts, supabase, options) {
  const enrichedPayouts = []
  
  for (const payout of payouts) {
    const enrichedPayout = { ...payout }
    
    // Add status history if requested
    if (options.include_status_history) {
      const { data: statusHistory } = await supabase
        .rpc('get_payout_status_timeline', {
          p_payout_record_id: payout.payout_id
        })
      
      enrichedPayout.status_history = statusHistory || []
    }
    
    // Add extended metadata if requested
    if (options.include_metadata) {
      const { data: extendedMetadata } = await supabase
        .from('payout_transaction_metadata')
        .select('*')
        .eq('payout_record_id', payout.payout_id)
        .single()
      
      if (extendedMetadata) {
        enrichedPayout.extended_metadata = extendedMetadata
      }
    }
    
    // Add reconciliation info if requested
    if (options.include_reconciliation) {
      const { data: reconciliationData } = await supabase
        .from('payout_transaction_metadata')
        .select('reconciliation_status, reconciliation_notes, reconciled_at, source_transactions')
        .eq('payout_record_id', payout.payout_id)
        .single()
      
      if (reconciliationData) {
        enrichedPayout.reconciliation = reconciliationData
      }
    }
    
    enrichedPayouts.push(enrichedPayout)
  }
  
  return enrichedPayouts
}

async function getPayoutSummaryStats(barbershopId, filters, supabase) {
  try {
    // Base query for summary statistics
    let query = supabase
      .from('commission_payout_records')
      .select('amount, status, payout_method, created_at')
      .eq('barbershop_id', barbershopId)
    
    // Apply filters to summary query
    if (filters.barber_id) {
      query = query.eq('barber_id', filters.barber_id)
    }
    
    if (filters.status) {
      query = query.eq('status', filters.status)
    }
    
    if (filters.method) {
      query = query.eq('payout_method', filters.method)
    }
    
    if (filters.date_from) {
      query = query.gte('created_at', filters.date_from)
    }
    
    if (filters.date_to) {
      query = query.lte('created_at', filters.date_to)
    }
    
    const { data: summaryData, error } = await query
    
    if (error) {
      console.error('Error fetching summary stats:', error)
      return null
    }
    
    // Calculate summary statistics
    const total_payouts = summaryData.length
    const total_amount = summaryData.reduce((sum, payout) => sum + parseFloat(payout.amount || 0), 0)
    
    const status_breakdown = summaryData.reduce((acc, payout) => {
      acc[payout.status] = (acc[payout.status] || 0) + 1
      return acc
    }, {})
    
    const method_breakdown = summaryData.reduce((acc, payout) => {
      acc[payout.payout_method] = (acc[payout.payout_method] || 0) + 1
      return acc
    }, {})
    
    // Calculate average processing time for completed payouts
    const completedPayouts = summaryData.filter(p => p.status === 'completed' && p.completed_at)
    const avg_processing_time = completedPayouts.length > 0 
      ? completedPayouts.reduce((sum, payout) => {
          const created = new Date(payout.created_at)
          const completed = new Date(payout.completed_at)
          return sum + (completed - created)
        }, 0) / completedPayouts.length / (1000 * 60 * 60) // Convert to hours
      : 0
    
    return {
      total_payouts,
      total_amount: Math.round(total_amount * 100) / 100,
      status_breakdown,
      method_breakdown,
      success_rate: total_payouts > 0 
        ? Math.round(((status_breakdown.completed || 0) / total_payouts) * 100)
        : 0,
      average_processing_time_hours: Math.round(avg_processing_time * 100) / 100,
      generated_at: new Date().toISOString()
    }
    
  } catch (error) {
    console.error('Error calculating summary stats:', error)
    return null
  }
}