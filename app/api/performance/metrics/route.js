import { NextResponse } from 'next/server'

// Performance metrics storage (in production, use Redis or database)
const metricsStore = new Map()

export async function POST(request) {
  try {
    const metrics = await request.json()
    
    // Store metrics with timestamp
    const timestamp = new Date().toISOString()
    const metricId = `${metrics.name}_${Date.now()}`
    
    metricsStore.set(metricId, {
      ...metrics,
      timestamp,
      url: metrics.url || 'unknown',
      userAgent: request.headers.get('user-agent')
    })
    
    // Keep only last 1000 metrics (in production, use proper storage)
    if (metricsStore.size > 1000) {
      const firstKey = metricsStore.keys().next().value
      metricsStore.delete(firstKey)
    }
    
    // Log critical metrics
    if (metrics.name === 'LCP' && metrics.value > 2500) {
      console.warn(`[Performance] High LCP: ${metrics.value}ms at ${metrics.url}`)
    }
    if (metrics.name === 'FID' && metrics.value > 100) {
      console.warn(`[Performance] High FID: ${metrics.value}ms at ${metrics.url}`)
    }
    if (metrics.name === 'CLS' && metrics.value > 0.1) {
      console.warn(`[Performance] High CLS: ${metrics.value} at ${metrics.url}`)
    }
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error storing performance metrics:', error)
    return NextResponse.json(
      { error: 'Failed to store metrics' },
      { status: 500 }
    )
  }
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const metricName = searchParams.get('metric')
    const limit = parseInt(searchParams.get('limit') || '100')
    
    // Filter and sort metrics
    let metrics = Array.from(metricsStore.values())
    
    if (metricName) {
      metrics = metrics.filter(m => m.name === metricName)
    }
    
    // Sort by timestamp descending
    metrics.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
    
    // Limit results
    metrics = metrics.slice(0, limit)
    
    // Calculate aggregates
    const aggregates = calculateAggregates(metrics)
    
    return NextResponse.json({
      metrics,
      aggregates,
      count: metrics.length,
      total: metricsStore.size
    })
  } catch (error) {
    console.error('Error fetching performance metrics:', error)
    return NextResponse.json(
      { error: 'Failed to fetch metrics' },
      { status: 500 }
    )
  }
}

function calculateAggregates(metrics) {
  const grouped = {}
  
  metrics.forEach(metric => {
    if (!grouped[metric.name]) {
      grouped[metric.name] = []
    }
    grouped[metric.name].push(metric.value)
  })
  
  const aggregates = {}
  
  Object.keys(grouped).forEach(name => {
    const values = grouped[name]
    const sorted = values.sort((a, b) => a - b)
    
    aggregates[name] = {
      count: values.length,
      min: Math.min(...values),
      max: Math.max(...values),
      avg: values.reduce((a, b) => a + b, 0) / values.length,
      p50: sorted[Math.floor(sorted.length * 0.5)],
      p75: sorted[Math.floor(sorted.length * 0.75)],
      p95: sorted[Math.floor(sorted.length * 0.95)],
      p99: sorted[Math.floor(sorted.length * 0.99)]
    }
  })
  
  return aggregates
}