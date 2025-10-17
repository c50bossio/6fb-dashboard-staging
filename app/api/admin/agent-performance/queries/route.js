import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { exportLogsToCSV } from '@/lib/agent-performance-logger'

export const runtime = 'nodejs'

/**
 * GET /api/admin/agent-performance/queries
 * Returns paginated query log with filtering and sorting
 *
 * Query params:
 * - barbershop_id: Filter by barbershop (optional)
 * - agent: Filter by agent (optional)
 * - status: Filter by status (optional)
 * - start_date: Start date filter (optional)
 * - end_date: End date filter (optional)
 * - search: Search in query text (optional)
 * - page: Page number (default: 1)
 * - per_page: Items per page (default: 20)
 * - sort_by: Sort field (default: created_at)
 * - sort_order: Sort order asc/desc (default: desc)
 * - export: Export to CSV (optional)
 */
export async function GET(request) {
  try {
    // Check authentication
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    // Temporary bypass for development
    const isDevelopment = process.env.NODE_ENV === 'development'
    const usingPlaceholderAuth = !process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL.includes('placeholder')
    const allowDevelopmentBypass = isDevelopment || usingPlaceholderAuth

    if (!user && !allowDevelopmentBypass) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url)
    const barbershopId = searchParams.get('barbershop_id')
    const agent = searchParams.get('agent')
    const status = searchParams.get('status')
    const startDate = searchParams.get('start_date')
    const endDate = searchParams.get('end_date')
    const search = searchParams.get('search')
    const page = parseInt(searchParams.get('page') || '1')
    const perPage = parseInt(searchParams.get('per_page') || '20')
    const sortBy = searchParams.get('sort_by') || 'created_at'
    const sortOrder = searchParams.get('sort_order') || 'desc'
    const exportCSV = searchParams.get('export') === 'true'

    // Build query
    let query = supabase
      .from('agent_performance_logs')
      .select('*', { count: 'exact' })

    // Apply filters
    if (barbershopId) {
      query = query.eq('barbershop_id', barbershopId)
    }

    if (agent) {
      query = query.eq('agent_used', agent)
    }

    if (status) {
      query = query.eq('status', status)
    }

    if (startDate) {
      query = query.gte('created_at', startDate)
    }

    if (endDate) {
      query = query.lte('created_at', endDate)
    }

    if (search) {
      query = query.ilike('query', `%${search}%`)
    }

    // If export, get all data without pagination
    if (exportCSV) {
      query = query.order(sortBy, { ascending: sortOrder === 'asc' })

      const { data, error } = await query

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      const csv = exportLogsToCSV(data || [])

      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="agent-performance-${new Date().toISOString().split('T')[0]}.csv"`
        }
      })
    }

    // Apply sorting and pagination
    query = query
      .order(sortBy, { ascending: sortOrder === 'asc' })
      .range((page - 1) * perPage, page * perPage - 1)

    const { data, error, count } = await query

    if (error) {
      console.error('[QueryLogs] Database error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Format queries for frontend
    const queries = (data || []).map(log => ({
      id: log.id,
      timestamp: log.created_at,
      query: log.query,
      agent_used: log.agent_used,
      response_time_ms: log.response_time_ms,
      tokens_used: log.tokens_used,
      cost_usd: parseFloat(log.cost_usd) || 0,
      status: log.status,
      confidence_score: log.confidence_score,
      ai_provider: log.ai_provider,
      model_used: log.model_used,
      collaboration_type: log.collaboration_type,
      handoffs: log.handoffs || [],
      query_type: log.query_type,
      error_message: log.error_message
    }))

    return NextResponse.json({
      success: true,
      queries,
      pagination: {
        page,
        per_page: perPage,
        total: count || 0,
        total_pages: Math.ceil((count || 0) / perPage)
      },
      filters: {
        barbershop_id: barbershopId,
        agent,
        status,
        start_date: startDate,
        end_date: endDate,
        search
      },
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('[QueryLogs] Error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
