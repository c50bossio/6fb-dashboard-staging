import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'edge'

/**
 * Performance Alert API Endpoint
 * Receives Core Web Vitals performance alerts and logs them for monitoring
 */

export async function POST(request) {
  try {
    const cookieStore = cookies()
    const supabase = createClient(cookieStore)
    
    const body = await request.json()
    const { metric, value, rating, url, userAgent, timestamp } = body

    if (!metric || value === undefined || !rating) {
      return NextResponse.json(
        { error: 'Missing required fields: metric, value, rating' },
        { status: 400 }
      )
    }

    const alert = {
      metric,
      value: parseFloat(value),
      rating,
      url: url || 'unknown',
      user_agent: userAgent || 'unknown',
      timestamp: timestamp ? new Date(timestamp).toISOString() : new Date().toISOString(),
      severity: getSeverity(metric, value, rating),
      created_at: new Date().toISOString()
    }

    const { data: savedAlert, error: saveError } = await supabase
      .from('performance_alerts')
      .insert(alert)
      .select()
      .single()

    if (saveError) {
      console.error('Failed to save performance alert:', saveError)
    }

    const alertId = savedAlert?.id || `alert_${Date.now()}`

    if (alert.severity === 'critical') {
      console.error(`🚨 CRITICAL PERFORMANCE ALERT: ${metric} = ${value} (${rating}) on ${url}`)
      
      await supabase
        .from('notifications')
        .insert({
          type: 'performance_critical',
          title: 'Critical Performance Issue',
          message: `${metric} metric is critically poor (${value}) on ${url}`,
          severity: 'critical',
          data: JSON.stringify(alert)
        })
    } else if (alert.severity === 'warning') {
      console.warn(`⚠️ PERFORMANCE WARNING: ${metric} = ${value} (${rating}) on ${url}`)
    }

    return NextResponse.json({
      success: true,
      alert_id: alertId,
      message: 'Performance alert received successfully',
      severity: alert.severity
    })

  } catch (error) {
    console.error('Performance alert API error:', error)
    
    return NextResponse.json(
      { error: 'Internal server error processing performance alert' },
      { status: 500 }
    )
  }
}

export async function GET(request) {
  try {
    const cookieStore = cookies()
    const supabase = createClient(cookieStore)
    
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '50')
    const metric = searchParams.get('metric')
    const severity = searchParams.get('severity')
    const hours = parseInt(searchParams.get('hours') || '24')

    const since = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString()

    let query = supabase
      .from('performance_alerts')
      .select('*')
      .gte('created_at', since)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (metric) {
      query = query.eq('metric', metric)
    }
    if (severity) {
      query = query.eq('severity', severity)
    }

    const { data: alerts, error: fetchError } = await query

    if (fetchError) {
      console.error('Failed to fetch performance alerts:', fetchError)
      return NextResponse.json({
        success: false,
        error: 'Failed to fetch performance alerts',
        alerts: [],
        summary: {
          total_alerts: 0,
          by_metric: {},
          by_severity: {},
          by_rating: {}
        },
        data_available: false
      })
    }

    const filteredAlerts = alerts || []

    const summary = {
      total_alerts: filteredAlerts.length,
      filtered_count: filteredAlerts.length,
      by_metric: {},
      by_severity: {},
      by_rating: {},
      average_values: {}
    }

    filteredAlerts.forEach(alert => {
      summary.by_metric[alert.metric] = (summary.by_metric[alert.metric] || 0) + 1
      
      summary.by_severity[alert.severity] = (summary.by_severity[alert.severity] || 0) + 1
      
      summary.by_rating[alert.rating] = (summary.by_rating[alert.rating] || 0) + 1
      
      if (!summary.average_values[alert.metric]) {
        summary.average_values[alert.metric] = { sum: 0, count: 0 }
      }
      summary.average_values[alert.metric].sum += alert.value
      summary.average_values[alert.metric].count += 1
    })

    Object.keys(summary.average_values).forEach(metric => {
      const data = summary.average_values[metric]
      summary.average_values[metric] = parseFloat((data.sum / data.count).toFixed(2))
    })

    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    const recentAlerts = filteredAlerts.filter(a => a.created_at >= oneDayAgo)
    const olderAlerts = filteredAlerts.filter(a => a.created_at < oneDayAgo)

    const trend = {
      recent_count: recentAlerts.length,
      older_count: olderAlerts.length,
      trend: recentAlerts.length > olderAlerts.length ? 'worsening' : 
             recentAlerts.length < olderAlerts.length ? 'improving' : 'stable'
    }

    return NextResponse.json({
      success: true,
      alerts: filteredAlerts,
      summary,
      trend,
      filters: { limit, metric, severity, hours },
      timestamp: new Date().toISOString(),
      data_available: filteredAlerts.length > 0
    })

  } catch (error) {
    console.error('Performance alert GET API error:', error)
    
    return NextResponse.json(
      { error: 'Internal server error fetching performance alerts' },
      { status: 500 }
    )
  }
}

/**
 * Determine alert severity based on metric and value
 */
function getSeverity(metric, value, rating) {
  const criticalThresholds = {
    LCP: 6.0,    // Extremely poor LCP
    FID: 1.0,    // Extremely poor FID
    CLS: 0.5,    // Extremely poor CLS
    FCP: 5.0,    // Extremely poor FCP
    TTFB: 3.0    // Extremely poor TTFB
  }

  if (value >= (criticalThresholds[metric] || Infinity)) {
    return 'critical'
  }

  if (rating === 'poor') {
    return 'warning'
  }

  return 'info'
}