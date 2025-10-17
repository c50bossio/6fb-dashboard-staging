import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'

/**
 * GET /api/admin/agent-performance/handoffs
 * Returns agent handoff flow data for visualization
 *
 * Query params:
 * - barbershop_id: Filter by barbershop (optional)
 * - start_date: Start date filter (optional)
 * - end_date: End date filter (optional)
 * - days: Number of days to look back (default: 30)
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
    const startDate = searchParams.get('start_date')
    const endDate = searchParams.get('end_date')
    const days = parseInt(searchParams.get('days') || '30')

    // Calculate date range if not provided
    const defaultEndDate = new Date().toISOString()
    const defaultStartDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()

    // Build query
    let query = supabase
      .from('agent_performance_logs')
      .select('agent_used, handoffs, collaboration_type')

    // Apply filters
    if (barbershopId) {
      query = query.eq('barbershop_id', barbershopId)
    }

    query = query
      .gte('created_at', startDate || defaultStartDate)
      .lte('created_at', endDate || defaultEndDate)

    const { data, error } = await query

    if (error) {
      console.error('[Handoffs] Database error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Process handoff data
    const handoffFlows = processHandoffFlows(data || [])
    const collaborationStats = calculateCollaborationStats(data || [])

    return NextResponse.json({
      success: true,
      flows: handoffFlows,
      collaboration_stats: collaborationStats,
      period: {
        start: startDate || defaultStartDate,
        end: endDate || defaultEndDate,
        days
      },
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('[Handoffs] Error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * Process handoff flows from logs
 * Returns array of {from, to, count} objects for flow visualization
 */
function processHandoffFlows(logs) {
  const flowMap = new Map()

  logs.forEach(log => {
    const primaryAgent = log.agent_used
    const handoffs = log.handoffs || []

    // If no handoffs, it's a direct query to the agent
    if (handoffs.length === 0) {
      const key = `master_triage_agent -> ${primaryAgent}`
      flowMap.set(key, (flowMap.get(key) || 0) + 1)
    } else {
      // Process handoff chain
      handoffs.forEach((handoff, index) => {
        if (typeof handoff === 'string') {
          // Simple handoff string
          const from = index === 0 ? 'master_triage_agent' : handoffs[index - 1]
          const to = handoff
          const key = `${from} -> ${to}`
          flowMap.set(key, (flowMap.get(key) || 0) + 1)
        } else if (handoff && handoff.agent) {
          // Handoff object with agent property
          const from = index === 0 ? 'master_triage_agent' : handoffs[index - 1].agent
          const to = handoff.agent
          const key = `${from} -> ${to}`
          flowMap.set(key, (flowMap.get(key) || 0) + 1)
        }
      })
    }
  })

  // Convert map to array of flow objects
  const flows = []
  flowMap.forEach((count, key) => {
    const [from, to] = key.split(' -> ')
    flows.push({
      from: cleanAgentName(from),
      to: cleanAgentName(to),
      count
    })
  })

  return flows.sort((a, b) => b.count - a.count)
}

/**
 * Calculate collaboration statistics
 */
function calculateCollaborationStats(logs) {
  const stats = {
    total_queries: logs.length,
    single_agent: 0,
    multi_agent: 0,
    handoff: 0,
    avg_handoffs_per_query: 0
  }

  let totalHandoffs = 0

  logs.forEach(log => {
    const type = log.collaboration_type || 'single'
    const handoffs = log.handoffs || []

    if (type === 'single') {
      stats.single_agent++
    } else if (type === 'multi_agent') {
      stats.multi_agent++
    } else if (type === 'handoff') {
      stats.handoff++
    }

    totalHandoffs += handoffs.length
  })

  stats.avg_handoffs_per_query = stats.total_queries > 0
    ? parseFloat((totalHandoffs / stats.total_queries).toFixed(2))
    : 0

  // Calculate percentages
  if (stats.total_queries > 0) {
    stats.single_agent_pct = parseFloat(((stats.single_agent / stats.total_queries) * 100).toFixed(1))
    stats.multi_agent_pct = parseFloat(((stats.multi_agent / stats.total_queries) * 100).toFixed(1))
    stats.handoff_pct = parseFloat(((stats.handoff / stats.total_queries) * 100).toFixed(1))
  }

  return stats
}

/**
 * Clean agent name for display
 */
function cleanAgentName(name) {
  if (!name) return 'Unknown'

  // Convert snake_case to Title Case
  return name
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
    .replace('Agent', '')
    .trim()
}
