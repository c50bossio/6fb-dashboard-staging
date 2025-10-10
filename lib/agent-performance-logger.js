/**
 * Agent Performance Logger
 * Logs AgentKit query performance, costs, and handoffs to Supabase
 */

import { createClient } from '@/lib/supabase/server'

/**
 * Log an AgentKit query to the performance tracking system
 *
 * @param {Object} params - Query logging parameters
 * @param {string} params.query - The user's query text
 * @param {string} params.agent_used - Primary agent that handled the query
 * @param {Array} params.handoffs - Array of agent handoffs/collaborations
 * @param {number} params.tokens_used - Total tokens consumed
 * @param {number} params.cost_usd - Cost in USD
 * @param {number} params.response_time_ms - Response time in milliseconds
 * @param {string} params.status - Query status ('success', 'error', 'timeout')
 * @param {string} params.barbershop_id - Barbershop UUID
 * @param {string} params.user_id - User UUID
 * @param {string} params.session_id - Session identifier
 * @param {string} params.query_type - Type of query (optional)
 * @param {string} params.collaboration_type - Collaboration type (optional)
 * @param {string} params.ai_provider - AI provider used (optional)
 * @param {string} params.model_used - Model used (optional)
 * @param {string} params.error_message - Error message if failed (optional)
 * @param {number} params.confidence_score - Confidence score 0-1 (optional)
 * @param {number} params.response_length - Response character length (optional)
 * @param {number} params.recommendations_count - Number of recommendations (optional)
 * @param {number} params.action_items_count - Number of action items (optional)
 * @param {Object} params.metadata - Additional metadata (optional)
 *
 * @returns {Promise<Object>} Logged entry or error
 */
export async function logAgentQuery(params) {
  try {
    const supabase = createClient()

    // Validate required fields
    if (!params.query || !params.agent_used) {
      console.warn('[AgentLogger] Missing required fields:', { query: !!params.query, agent_used: !!params.agent_used })
      return { success: false, error: 'Missing required fields' }
    }

    // Prepare log entry
    const logEntry = {
      // Context
      barbershop_id: params.barbershop_id || null,
      user_id: params.user_id || null,
      session_id: params.session_id || null,

      // Query Information
      query: params.query.substring(0, 5000), // Limit to 5000 chars
      query_type: params.query_type || detectQueryType(params.query),

      // Agent Information
      agent_used: params.agent_used,
      handoffs: params.handoffs || [],
      collaboration_type: params.collaboration_type || (params.handoffs?.length > 0 ? 'handoff' : 'single'),

      // Performance Metrics
      tokens_used: params.tokens_used || 0,
      cost_usd: params.cost_usd || 0,
      response_time_ms: params.response_time_ms || 0,

      // Result Information
      status: params.status || 'success',
      error_message: params.error_message || null,
      confidence_score: params.confidence_score || null,

      // Provider Information
      ai_provider: params.ai_provider || 'agentkit',
      model_used: params.model_used || 'gpt-5',

      // Response Quality
      response_length: params.response_length || 0,
      recommendations_count: params.recommendations_count || 0,
      action_items_count: params.action_items_count || 0,

      // Metadata
      metadata: params.metadata || {}
    }

    // Insert into database
    const { data, error } = await supabase
      .from('agent_performance_logs')
      .insert(logEntry)
      .select()
      .single()

    if (error) {
      console.error('[AgentLogger] Database insert error:', error)
      return { success: false, error: error.message }
    }

    console.log('[AgentLogger] Query logged successfully:', {
      id: data.id,
      agent: data.agent_used,
      cost: data.cost_usd,
      time: data.response_time_ms
    })

    return { success: true, data }

  } catch (error) {
    console.error('[AgentLogger] Unexpected error:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Detect query type from query text
 * @param {string} query - Query text
 * @returns {string} Query type
 */
function detectQueryType(query) {
  const queryLower = query.toLowerCase()

  // Database query keywords
  const databaseKeywords = [
    'revenue', 'earned', 'made', 'income', 'sales', 'profit',
    'appointments', 'bookings', 'customers', 'clients',
    'how much', 'how many', 'show me', 'give me'
  ]

  // Multi-agent triggers
  const multiAgentKeywords = [
    'grow my business', 'increase revenue', 'expand', 'scale up',
    'analyze my business', 'improve my business', 'comprehensive',
    'should i', 'help me decide', 'what would you recommend'
  ]

  // Check for multi-agent query
  if (multiAgentKeywords.some(kw => queryLower.includes(kw))) {
    return 'multi_agent'
  }

  // Check for database query
  if (databaseKeywords.some(kw => queryLower.includes(kw))) {
    return 'database'
  }

  // Default to general
  return 'general'
}

/**
 * Get performance metrics for a barbershop
 * @param {string} barbershopId - Barbershop UUID
 * @param {Object} options - Query options (dateRange, agentFilter, etc.)
 * @returns {Promise<Object>} Performance metrics
 */
export async function getPerformanceMetrics(barbershopId, options = {}) {
  try {
    const supabase = createClient()

    // Build query
    let query = supabase
      .from('agent_performance_logs')
      .select('*')

    // Filter by barbershop
    if (barbershopId) {
      query = query.eq('barbershop_id', barbershopId)
    }

    // Date range filter
    if (options.startDate) {
      query = query.gte('created_at', options.startDate)
    }
    if (options.endDate) {
      query = query.lte('created_at', options.endDate)
    }

    // Agent filter
    if (options.agent) {
      query = query.eq('agent_used', options.agent)
    }

    // Status filter
    if (options.status) {
      query = query.eq('status', options.status)
    }

    // Order by date descending
    query = query.order('created_at', { ascending: false })

    // Execute query
    const { data, error } = await query

    if (error) {
      console.error('[AgentLogger] Failed to fetch metrics:', error)
      return { success: false, error: error.message }
    }

    return { success: true, data }

  } catch (error) {
    console.error('[AgentLogger] Unexpected error fetching metrics:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Get aggregated statistics from performance logs
 * @param {Array} logs - Array of performance log entries
 * @returns {Object} Aggregated statistics
 */
export function aggregatePerformanceStats(logs) {
  if (!logs || logs.length === 0) {
    return {
      totalQueries: 0,
      totalCost: 0,
      avgResponseTime: 0,
      mostUsedAgent: null,
      queriesByAgent: {},
      successRate: 0
    }
  }

  // Count queries by agent
  const queriesByAgent = logs.reduce((acc, log) => {
    acc[log.agent_used] = (acc[log.agent_used] || 0) + 1
    return acc
  }, {})

  // Find most used agent
  const mostUsedAgent = Object.entries(queriesByAgent)
    .sort(([, a], [, b]) => b - a)[0]?.[0] || null

  // Calculate aggregates
  const totalQueries = logs.length
  const totalCost = logs.reduce((sum, log) => sum + (parseFloat(log.cost_usd) || 0), 0)
  const totalResponseTime = logs.reduce((sum, log) => sum + (log.response_time_ms || 0), 0)
  const avgResponseTime = totalResponseTime / totalQueries
  const successCount = logs.filter(log => log.status === 'success').length
  const successRate = (successCount / totalQueries) * 100

  return {
    totalQueries,
    totalCost: parseFloat(totalCost.toFixed(4)),
    avgResponseTime: Math.round(avgResponseTime),
    mostUsedAgent,
    queriesByAgent,
    successRate: parseFloat(successRate.toFixed(2))
  }
}

/**
 * Export logs to CSV format
 * @param {Array} logs - Array of performance log entries
 * @returns {string} CSV string
 */
export function exportLogsToCSV(logs) {
  if (!logs || logs.length === 0) {
    return 'No data to export'
  }

  // CSV headers
  const headers = [
    'Timestamp',
    'Query',
    'Agent Used',
    'Response Time (ms)',
    'Tokens',
    'Cost (USD)',
    'Status',
    'Confidence',
    'Provider',
    'Model'
  ]

  // CSV rows
  const rows = logs.map(log => [
    new Date(log.created_at).toISOString(),
    `"${log.query.replace(/"/g, '""')}"`, // Escape quotes
    log.agent_used,
    log.response_time_ms || 0,
    log.tokens_used || 0,
    log.cost_usd || 0,
    log.status,
    log.confidence_score || '',
    log.ai_provider || '',
    log.model_used || ''
  ])

  // Combine headers and rows
  const csv = [
    headers.join(','),
    ...rows.map(row => row.join(','))
  ].join('\n')

  return csv
}

export default {
  logAgentQuery,
  getPerformanceMetrics,
  aggregatePerformanceStats,
  exportLogsToCSV
}
