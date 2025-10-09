import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getPerformanceMetrics, aggregatePerformanceStats } from '@/lib/agent-performance-logger'

export const runtime = 'nodejs'

/**
 * GET /api/admin/agent-performance/metrics
 * Returns aggregated metrics for agent performance dashboard
 *
 * Query params:
 * - barbershop_id: Filter by barbershop (optional)
 * - start_date: Start date for metrics (optional)
 * - end_date: End date for metrics (optional)
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

    // Fetch performance logs
    const result = await getPerformanceMetrics(barbershopId, {
      startDate: startDate || defaultStartDate,
      endDate: endDate || defaultEndDate
    })

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to fetch metrics' },
        { status: 500 }
      )
    }

    const logs = result.data || []

    // Aggregate basic stats
    const stats = aggregatePerformanceStats(logs)

    // Calculate cost by day
    const costByDay = calculateCostByDay(logs)

    // Calculate response time distribution
    const responseTimeDistribution = calculateResponseTimeDistribution(logs)

    // Calculate queries by agent
    const queriesByAgent = calculateQueriesByAgent(logs)

    // Calculate daily query counts
    const queriesByDay = calculateQueriesByDay(logs)

    // Calculate agent performance breakdown
    const agentPerformance = calculateAgentPerformance(logs)

    // Calculate success/error rates
    const statusBreakdown = calculateStatusBreakdown(logs)

    return NextResponse.json({
      success: true,
      period: {
        start: startDate || defaultStartDate,
        end: endDate || defaultEndDate,
        days
      },
      overview: {
        total_queries: stats.totalQueries,
        total_cost: stats.totalCost,
        avg_response_time: stats.avgResponseTime,
        most_used_agent: stats.mostUsedAgent,
        success_rate: stats.successRate
      },
      queries_by_agent: queriesByAgent,
      cost_by_day: costByDay,
      queries_by_day: queriesByDay,
      response_time_distribution: responseTimeDistribution,
      agent_performance: agentPerformance,
      status_breakdown: statusBreakdown,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('[AgentMetrics] Error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * Calculate cost grouped by day
 */
function calculateCostByDay(logs) {
  const costMap = {}

  logs.forEach(log => {
    const date = new Date(log.created_at).toISOString().split('T')[0]
    if (!costMap[date]) {
      costMap[date] = 0
    }
    costMap[date] += parseFloat(log.cost_usd) || 0
  })

  return Object.entries(costMap)
    .map(([date, cost]) => ({
      date,
      cost: parseFloat(cost.toFixed(4))
    }))
    .sort((a, b) => a.date.localeCompare(b.date))
}

/**
 * Calculate queries grouped by day
 */
function calculateQueriesByDay(logs) {
  const queryMap = {}

  logs.forEach(log => {
    const date = new Date(log.created_at).toISOString().split('T')[0]
    if (!queryMap[date]) {
      queryMap[date] = 0
    }
    queryMap[date]++
  })

  return Object.entries(queryMap)
    .map(([date, count]) => ({
      date,
      count
    }))
    .sort((a, b) => a.date.localeCompare(b.date))
}

/**
 * Calculate response time distribution into buckets
 */
function calculateResponseTimeDistribution(logs) {
  const buckets = {
    '0-5': 0,
    '5-10': 0,
    '10-15': 0,
    '15-20': 0,
    '20+': 0
  }

  logs.forEach(log => {
    const timeInSeconds = (log.response_time_ms || 0) / 1000

    if (timeInSeconds < 5) buckets['0-5']++
    else if (timeInSeconds < 10) buckets['5-10']++
    else if (timeInSeconds < 15) buckets['10-15']++
    else if (timeInSeconds < 20) buckets['15-20']++
    else buckets['20+']++
  })

  // Calculate percentages
  const total = logs.length
  return Object.entries(buckets).map(([range, count]) => ({
    range,
    count,
    percentage: total > 0 ? parseFloat(((count / total) * 100).toFixed(1)) : 0
  }))
}

/**
 * Calculate queries by agent with counts
 */
function calculateQueriesByAgent(logs) {
  const agentMap = {}

  logs.forEach(log => {
    const agent = log.agent_used || 'unknown'
    if (!agentMap[agent]) {
      agentMap[agent] = 0
    }
    agentMap[agent]++
  })

  return Object.entries(agentMap)
    .map(([agent, count]) => ({
      agent,
      count
    }))
    .sort((a, b) => b.count - a.count)
}

/**
 * Calculate detailed agent performance metrics
 */
function calculateAgentPerformance(logs) {
  const agentStats = {}

  logs.forEach(log => {
    const agent = log.agent_used || 'unknown'

    if (!agentStats[agent]) {
      agentStats[agent] = {
        queries: 0,
        total_cost: 0,
        total_tokens: 0,
        total_response_time: 0,
        successes: 0,
        errors: 0
      }
    }

    const stats = agentStats[agent]
    stats.queries++
    stats.total_cost += parseFloat(log.cost_usd) || 0
    stats.total_tokens += log.tokens_used || 0
    stats.total_response_time += log.response_time_ms || 0

    if (log.status === 'success') stats.successes++
    else if (log.status === 'error') stats.errors++
  })

  // Calculate averages
  return Object.entries(agentStats).map(([agent, stats]) => ({
    agent,
    queries: stats.queries,
    total_cost: parseFloat(stats.total_cost.toFixed(4)),
    avg_cost: parseFloat((stats.total_cost / stats.queries).toFixed(4)),
    total_tokens: stats.total_tokens,
    avg_tokens: Math.round(stats.total_tokens / stats.queries),
    avg_response_time: Math.round(stats.total_response_time / stats.queries),
    success_rate: parseFloat(((stats.successes / stats.queries) * 100).toFixed(2))
  }))
}

/**
 * Calculate status breakdown
 */
function calculateStatusBreakdown(logs) {
  const statusMap = {}

  logs.forEach(log => {
    const status = log.status || 'unknown'
    if (!statusMap[status]) {
      statusMap[status] = 0
    }
    statusMap[status]++
  })

  const total = logs.length
  return Object.entries(statusMap).map(([status, count]) => ({
    status,
    count,
    percentage: total > 0 ? parseFloat(((count / total) * 100).toFixed(1)) : 0
  }))
}
