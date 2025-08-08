import { NextResponse } from 'next/server'

/**
 * Performance Alert API Endpoint
 * Receives Core Web Vitals performance alerts and logs them for monitoring
 */

// In-memory store for development (use database in production)
const performanceAlerts = []

export async function POST(request) {
  try {
    const body = await request.json()
    const { metric, value, rating, url, userAgent, timestamp } = body

    // Validate required fields
    if (!metric || value === undefined || !rating) {
      return NextResponse.json(
        { error: 'Missing required fields: metric, value, rating' },
        { status: 400 }
      )
    }

    // Create performance alert record
    const alert = {
      id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      metric,
      value: parseFloat(value),
      rating,
      url: url || 'unknown',
      userAgent: userAgent || 'unknown',
      timestamp: timestamp || Date.now(),
      severity: getSeverity(metric, value, rating),
      received_at: Date.now()
    }

    // Store alert (in production, save to database)
    performanceAlerts.push(alert)

    // Keep only last 1000 alerts to prevent memory issues
    if (performanceAlerts.length > 1000) {
      performanceAlerts.shift()
    }

    // Log critical performance issues
    if (alert.severity === 'critical') {
      console.error(`🚨 CRITICAL PERFORMANCE ALERT: ${metric} = ${value} (${rating}) on ${url}`)
    } else if (alert.severity === 'warning') {
      console.warn(`⚠️ PERFORMANCE WARNING: ${metric} = ${value} (${rating}) on ${url}`)
    }

    // In production, you could:
    // - Send to monitoring service (DataDog, New Relic, etc.)
    // - Send Slack/email notifications
    // - Save to database
    // - Trigger automated performance optimizations

    return NextResponse.json({
      success: true,
      alert_id: alert.id,
      message: 'Performance alert received successfully'
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
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '50')
    const metric = searchParams.get('metric')
    const severity = searchParams.get('severity')

    let filteredAlerts = [...performanceAlerts]

    // Filter by metric if specified
    if (metric) {
      filteredAlerts = filteredAlerts.filter(alert => alert.metric === metric)
    }

    // Filter by severity if specified
    if (severity) {
      filteredAlerts = filteredAlerts.filter(alert => alert.severity === severity)
    }

    // Sort by timestamp (most recent first) and limit results
    filteredAlerts = filteredAlerts
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit)

    // Calculate summary statistics
    const summary = {
      total_alerts: performanceAlerts.length,
      filtered_count: filteredAlerts.length,
      by_metric: {},
      by_severity: {},
      by_rating: {}
    }

    performanceAlerts.forEach(alert => {
      // By metric
      summary.by_metric[alert.metric] = (summary.by_metric[alert.metric] || 0) + 1
      
      // By severity
      summary.by_severity[alert.severity] = (summary.by_severity[alert.severity] || 0) + 1
      
      // By rating
      summary.by_rating[alert.rating] = (summary.by_rating[alert.rating] || 0) + 1
    })

    return NextResponse.json({
      success: true,
      alerts: filteredAlerts,
      summary,
      filters: { limit, metric, severity },
      timestamp: Date.now()
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
  // Critical thresholds for immediate attention
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

// Export for external use
export { performanceAlerts }