import { NextResponse } from 'next/server'
import optimizedSupabase, { batchQueries } from '../../../lib/performance/optimized-supabase.js'

// GET - Retrieve monitoring data and system health
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') || 'health'
    const hours = parseInt(searchParams.get('hours')) || 24

    // Return mock data in development mode
    if (process.env.NEXT_PUBLIC_ENABLE_DEV_AUTH === 'true') {
      return NextResponse.json({
        health: {
          status: 'healthy',
          timestamp: new Date().toISOString(),
          dev_mode: true
        },
        errorCount: 0,
        alerts: [],
        metrics: [],
        message: 'Development mode - using mock monitoring data'
      })
    }

    const timeThreshold = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString()
    const client = optimizedSupabase.getClient()

    switch (type) {
      case 'health': {
        // Get latest system health snapshot - gracefully handle missing table
        let health = null
        let errorCount = 0
        
        try {
          const { data, error: healthError } = await client
            .from('system_health_snapshots')
            .select('*')
            .order('timestamp', { ascending: false })
            .limit(1)
            .single()
          
          if (healthError && healthError.code !== 'PGRST116' && !healthError.message.includes('does not exist')) {
            console.warn('Health snapshot query error:', healthError)
          } else if (!healthError) {
            health = data
          }
        } catch (err) {
          console.warn('Health monitoring table not available:', err.message)
        }

        // Get recent error count - gracefully handle missing table
        try {
          const { count } = await client
            .from('production_errors')
            .select('*', { count: 'exact', head: true })
            .gte('timestamp', timeThreshold)
            .eq('resolved', false)
          
          errorCount = count || 0
        } catch (err) {
          console.warn('Error monitoring table not available:', err.message)
        }

        return NextResponse.json({
          status: health?.status || 'operational',
          timestamp: health?.timestamp || new Date().toISOString(),
          metrics: {
            cpu_usage: health?.cpu_usage || 0,
            memory_usage: health?.memory_usage || 0,
            response_time_avg: health?.response_time_avg || 0,
            error_rate: health?.error_rate || 0,
            active_users: health?.active_users || 0,
            ai_cost_total: health?.ai_cost_total || 0
          },
          alerts: {
            unresolved_errors: errorCount
          },
          monitoring_status: {
            health_table: health ? 'available' : 'unavailable',
            error_table: errorCount !== null ? 'available' : 'unavailable'
          }
        })
      }

      case 'metrics': {
        // Get metrics for the specified time period
        const { data: metrics, error: metricsError } = await client
          .from('production_metrics')
          .select('*')
          .gte('timestamp', timeThreshold)
          .order('timestamp', { ascending: true })

        if (metricsError) throw metricsError

        // Aggregate metrics by hour
        const hourlyMetrics = metrics?.reduce((acc, metric) => {
          const hour = new Date(metric.timestamp).toISOString().slice(0, 13)
          if (!acc[hour]) {
            acc[hour] = {
              timestamp: hour,
              metrics: [],
              avgResponseTime: 0,
              errorRate: 0,
              totalCost: 0
            }
          }
          
          acc[hour].metrics.push(metric)
          
          // Calculate averages
          const count = acc[hour].metrics.length
          const data = metric.data
          
          acc[hour].avgResponseTime = (acc[hour].avgResponseTime * (count - 1) + (data.responseTime || 0)) / count
          acc[hour].errorRate = (acc[hour].errorRate * (count - 1) + (data.errorRate || 0)) / count
          acc[hour].totalCost += data.aiAverageCost || 0
          
          return acc
        }, {}) || {}

        return NextResponse.json({
          timeRange: { start: timeThreshold, end: new Date().toISOString() },
          hourlyData: Object.values(hourlyMetrics),
          totalMetrics: metrics?.length || 0
        })
      }

      case 'errors': {
        // Get recent errors with aggregation
        const { data: errors, error: errorsError } = await client
          .from('production_errors')
          .select('*')
          .gte('timestamp', timeThreshold)
          .order('timestamp', { ascending: false })
          .limit(100)

        if (errorsError) throw errorsError

        // Group by fingerprint for error frequency analysis
        const errorGroups = errors?.reduce((acc, error) => {
          const key = error.fingerprint || 'unknown'
          if (!acc[key]) {
            acc[key] = {
              fingerprint: key,
              message: error.message,
              level: error.level,
              count: 0,
              firstSeen: error.timestamp,
              lastSeen: error.timestamp,
              resolved: error.resolved
            }
          }
          
          acc[key].count += error.occurrences || 1
          acc[key].lastSeen = error.timestamp
          if (new Date(error.timestamp) < new Date(acc[key].firstSeen)) {
            acc[key].firstSeen = error.timestamp
          }
          
          return acc
        }, {}) || {}

        return NextResponse.json({
          recentErrors: errors?.slice(0, 10) || [],
          errorGroups: Object.values(errorGroups)
            .sort((a, b) => b.count - a.count)
            .slice(0, 20),
          summary: {
            totalErrors: errors?.length || 0,
            criticalErrors: errors?.filter(e => e.level === 'critical').length || 0,
            unresolvedErrors: errors?.filter(e => !e.resolved).length || 0
          }
        })
      }

      case 'ai-usage': {
        // Get AI usage statistics
        const { data: aiUsage, error: aiError } = await client
          .from('ai_model_usage')
          .select('*')
          .gte('timestamp', timeThreshold)
          .order('timestamp', { ascending: true })

        if (aiError) throw aiError

        // Aggregate by model and time
        const modelStats = aiUsage?.reduce((acc, usage) => {
          const model = usage.model_name || 'unknown'
          if (!acc[model]) {
            acc[model] = {
              model_name: model,
              provider: usage.provider,
              total_requests: 0,
              total_tokens: 0,
              total_cost: 0,
              avg_response_time: 0,
              success_rate: 0
            }
          }
          
          acc[model].total_requests += 1
          acc[model].total_tokens += usage.total_tokens || 0
          acc[model].total_cost += usage.cost || 0
          acc[model].avg_response_time = (acc[model].avg_response_time * (acc[model].total_requests - 1) + (usage.response_time || 0)) / acc[model].total_requests
          acc[model].success_rate = (acc[model].success_rate * (acc[model].total_requests - 1) + (usage.success ? 1 : 0)) / acc[model].total_requests
          
          return acc
        }, {}) || {}

        const hourlyUsage = aiUsage?.reduce((acc, usage) => {
          const hour = new Date(usage.timestamp).toISOString().slice(0, 13)
          if (!acc[hour]) {
            acc[hour] = { timestamp: hour, requests: 0, cost: 0, tokens: 0 }
          }
          
          acc[hour].requests += 1
          acc[hour].cost += usage.cost || 0
          acc[hour].tokens += usage.total_tokens || 0
          
          return acc
        }, {}) || {}

        return NextResponse.json({
          modelStats: Object.values(modelStats),
          hourlyUsage: Object.values(hourlyUsage),
          totalCost: aiUsage?.reduce((sum, usage) => sum + (usage.cost || 0), 0) || 0,
          totalRequests: aiUsage?.length || 0
        })
      }

      default:
        return NextResponse.json({ error: 'Invalid type parameter' }, { status: 400 })
    }

  } catch (error) {
    // Better error logging for debugging
    console.error('Monitoring API error:', {
      message: error.message,
      code: error.code,
      details: error.details,
      hint: error.hint,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    })
    return NextResponse.json(
      { error: error.message || 'Failed to fetch monitoring data' },
      { status: 500 }
    )
  }
}

// POST - Store monitoring data (from ProductionMonitor)
export async function POST(request) {
  try {
    const body = await request.json()
    const { type, data: monitoringData } = body

    if (!type || !monitoringData) {
      return NextResponse.json(
        { error: 'Missing required fields: type, data' },
        { status: 400 }
      )
    }

    // Skip database operations in development mode if tables don't exist
    if (process.env.NEXT_PUBLIC_ENABLE_DEV_AUTH === 'true') {
      console.log('[Monitoring] Development mode - skipping database storage')
      return NextResponse.json({ 
        success: true, 
        message: 'Development mode - monitoring data not stored',
        dev_mode: true 
      })
    }

    const client = optimizedSupabase.getClient()

    switch (type) {
      case 'metrics': {
        // Store system metrics
        const { error } = await client
          .from('production_metrics')
          .insert({
            timestamp: new Date().toISOString(),
            type: monitoringData.type || 'system_health',
            data: monitoringData
          })

        if (error) throw error

        return NextResponse.json({ success: true, message: 'Metrics stored successfully' })
      }

      case 'error': {
        // Store error information
        const { error } = await client
          .from('production_errors')
          .insert({
            timestamp: new Date().toISOString(),
            level: monitoringData.level || 'info',
            message: monitoringData.message,
            stack_trace: monitoringData.stack,
            context: monitoringData.context,
            fingerprint: monitoringData.fingerprint,
            occurrences: monitoringData.occurrences || 1
          })

        if (error) throw error

        return NextResponse.json({ success: true, message: 'Error logged successfully' })
      }

      case 'health-snapshot': {
        // Store system health snapshot
        const { error } = await client
          .from('system_health_snapshots')
          .insert({
            timestamp: new Date().toISOString(),
            cpu_usage: monitoringData.cpu_usage,
            memory_usage: monitoringData.memory_usage,
            memory_total: monitoringData.memory_total,
            disk_usage: monitoringData.disk_usage,
            active_users: monitoringData.active_users,
            response_time_avg: monitoringData.response_time_avg,
            error_rate: monitoringData.error_rate,
            ai_requests_count: monitoringData.ai_requests_count,
            ai_cost_total: monitoringData.ai_cost_total,
            db_connections: monitoringData.db_connections,
            status: monitoringData.status || 'healthy'
          })

        if (error) throw error

        return NextResponse.json({ success: true, message: 'Health snapshot stored successfully' })
      }

      case 'ai-usage': {
        // Store AI model usage
        const { error } = await client
          .from('ai_model_usage')
          .insert({
            timestamp: new Date().toISOString(),
            model_name: monitoringData.model_name,
            provider: monitoringData.provider,
            input_tokens: monitoringData.input_tokens,
            output_tokens: monitoringData.output_tokens,
            total_tokens: monitoringData.total_tokens,
            cost: monitoringData.cost,
            response_time: monitoringData.response_time,
            success: monitoringData.success !== false,
            error_message: monitoringData.error_message,
            agent_type: monitoringData.agent_type,
            user_id: monitoringData.user_id,
            session_id: monitoringData.session_id
          })

        if (error) throw error

        return NextResponse.json({ success: true, message: 'AI usage logged successfully' })
      }

      case 'alert': {
        // Store alert
        const { error } = await client
          .from('production_alerts')
          .insert({
            alert_type: monitoringData.alert_type || 'system',
            severity: monitoringData.severity || 'info',
            title: monitoringData.title,
            message: monitoringData.message,
            context: monitoringData.context,
            channels_sent: monitoringData.channels_sent || []
          })

        if (error) throw error

        return NextResponse.json({ success: true, message: 'Alert stored successfully' })
      }

      default:
        return NextResponse.json({ error: 'Invalid monitoring data type' }, { status: 400 })
    }

  } catch (error) {
    // Better error logging for debugging
    console.error('Monitoring storage error:', {
      message: error.message,
      code: error.code,
      details: error.details,
      hint: error.hint,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    })
    return NextResponse.json(
      { error: error.message || 'Failed to store monitoring data' },
      { status: 500 }
    )
  }
}

// PUT - Update monitoring data (mark errors as resolved, etc.)
export async function PUT(request) {
  try {
    const body = await request.json()
    const { type, id, updates } = body

    if (!type || !id || !updates) {
      return NextResponse.json(
        { error: 'Missing required fields: type, id, updates' },
        { status: 400 }
      )
    }

    const client = optimizedSupabase.getClient()

    switch (type) {
      case 'error': {
        // Update error status (mark as resolved)
        const { error } = await client
          .from('production_errors')
          .update({
            ...updates,
            resolved: updates.resolved !== false,
            resolved_at: updates.resolved ? new Date().toISOString() : null,
            updated_at: new Date().toISOString()
          })
          .eq('id', id)

        if (error) throw error

        return NextResponse.json({ success: true, message: 'Error updated successfully' })
      }

      case 'alert': {
        // Update alert status (acknowledge, resolve)
        const { error } = await client
          .from('production_alerts')
          .update({
            ...updates,
            acknowledged_at: updates.acknowledged ? new Date().toISOString() : null,
            resolved_at: updates.resolved ? new Date().toISOString() : null
          })
          .eq('id', id)

        if (error) throw error

        return NextResponse.json({ success: true, message: 'Alert updated successfully' })
      }

      default:
        return NextResponse.json({ error: 'Invalid update type' }, { status: 400 })
    }

  } catch (error) {
    // Better error logging for debugging
    console.error('Monitoring update error:', {
      message: error.message,
      code: error.code,
      details: error.details,
      hint: error.hint,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    })
    return NextResponse.json(
      { error: error.message || 'Failed to update monitoring data' },
      { status: 500 }
    )
  }
}