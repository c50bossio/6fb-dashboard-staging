import { NextResponse } from 'next/server'
import { performanceAlerts } from '../alert/route.js'

/**
 * Performance Dashboard API Endpoint
 * Provides comprehensive performance metrics and analytics
 */

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const timeframe = searchParams.get('timeframe') || '24h' // 1h, 24h, 7d, 30d
    const url = searchParams.get('url') // Filter by specific URL

    const now = Date.now()
    const timeframes = {
      '1h': 60 * 60 * 1000,
      '24h': 24 * 60 * 60 * 1000,
      '7d': 7 * 24 * 60 * 60 * 1000,
      '30d': 30 * 24 * 60 * 60 * 1000
    }

    const timeRange = timeframes[timeframe] || timeframes['24h']
    const cutoffTime = now - timeRange

    // Filter alerts by timeframe and URL
    let filteredAlerts = performanceAlerts.filter(alert => 
      alert.timestamp >= cutoffTime && (!url || alert.url.includes(url))
    )

    // Calculate Core Web Vitals metrics
    const metrics = {
      LCP: [], // Largest Contentful Paint
      INP: [], // Interaction to Next Paint
      CLS: [], // Cumulative Layout Shift
      FCP: [], // First Contentful Paint
      TTFB: [] // Time to First Byte
    }

    // Group alerts by metric
    filteredAlerts.forEach(alert => {
      if (metrics[alert.metric]) {
        metrics[alert.metric].push(alert)
      }
    })

    // Calculate statistics for each metric
    const statistics = {}
    Object.keys(metrics).forEach(metric => {
      const values = metrics[metric].map(alert => alert.value)
      
      if (values.length > 0) {
        values.sort((a, b) => a - b)
        
        statistics[metric] = {
          count: values.length,
          min: values[0],
          max: values[values.length - 1],
          median: values[Math.floor(values.length / 2)],
          average: values.reduce((sum, val) => sum + val, 0) / values.length,
          p95: values[Math.floor(values.length * 0.95)],
          p99: values[Math.floor(values.length * 0.99)],
          ratings: {
            good: metrics[metric].filter(a => a.rating === 'good').length,
            needs_improvement: metrics[metric].filter(a => a.rating === 'needs-improvement').length,
            poor: metrics[metric].filter(a => a.rating === 'poor').length
          }
        }
      } else {
        statistics[metric] = {
          count: 0,
          min: null,
          max: null,
          median: null,
          average: null,
          p95: null,
          p99: null,
          ratings: { good: 0, needs_improvement: 0, poor: 0 }
        }
      }
    })

    // Calculate overall performance score
    const overallScore = calculateOverallScore(statistics)

    // Recent performance trends
    const trends = calculateTrends(filteredAlerts, timeRange)

    // Top performance issues
    const issues = identifyTopIssues(filteredAlerts)

    // Browser and device breakdown
    const breakdown = analyzeUserAgents(filteredAlerts)

    // Performance recommendations
    const recommendations = generateRecommendations(statistics, issues)

    return NextResponse.json({
      success: true,
      dashboard: {
        timeframe,
        url_filter: url,
        timestamp: now,
        summary: {
          total_alerts: filteredAlerts.length,
          overall_score: overallScore,
          critical_issues: filteredAlerts.filter(a => a.severity === 'critical').length,
          warnings: filteredAlerts.filter(a => a.severity === 'warning').length
        },
        core_web_vitals: statistics,
        trends,
        top_issues: issues,
        breakdown,
        recommendations
      }
    })

  } catch (error) {
    console.error('Performance dashboard API error:', error)
    
    return NextResponse.json(
      { error: 'Internal server error generating performance dashboard' },
      { status: 500 }
    )
  }
}

/**
 * Calculate overall performance score (0-100)
 */
function calculateOverallScore(statistics) {
  const weights = { LCP: 0.25, INP: 0.25, CLS: 0.25, FCP: 0.15, TTFB: 0.10 }
  let totalScore = 0
  let totalWeight = 0

  Object.keys(weights).forEach(metric => {
    const stats = statistics[metric]
    if (stats && stats.count > 0) {
      const ratings = stats.ratings
      const total = ratings.good + ratings.needs_improvement + ratings.poor
      
      if (total > 0) {
        const score = (ratings.good * 100 + ratings.needs_improvement * 50 + ratings.poor * 0) / total
        totalScore += score * weights[metric]
        totalWeight += weights[metric]
      }
    }
  })

  return totalWeight > 0 ? Math.round(totalScore / totalWeight) : null
}

/**
 * Calculate performance trends over time
 */
function calculateTrends(alerts, timeRange) {
  const buckets = 24 // 24 time buckets
  const bucketSize = timeRange / buckets
  const now = Date.now()

  const trendData = []

  for (let i = 0; i < buckets; i++) {
    const bucketStart = now - timeRange + (i * bucketSize)
    const bucketEnd = bucketStart + bucketSize
    
    const bucketAlerts = alerts.filter(alert => 
      alert.timestamp >= bucketStart && alert.timestamp < bucketEnd
    )

    const bucketStats = {
      timestamp: bucketStart,
      total_alerts: bucketAlerts.length,
      critical: bucketAlerts.filter(a => a.severity === 'critical').length,
      warning: bucketAlerts.filter(a => a.severity === 'warning').length,
      by_metric: {}
    }

    // Count by metric in this bucket
    bucketAlerts.forEach(alert => {
      if (!bucketStats.by_metric[alert.metric]) {
        bucketStats.by_metric[alert.metric] = 0
      }
      bucketStats.by_metric[alert.metric]++
    })

    trendData.push(bucketStats)
  }

  return trendData
}

/**
 * Identify top performance issues
 */
function identifyTopIssues(alerts) {
  const issueMap = new Map()

  alerts.forEach(alert => {
    if (alert.severity === 'critical' || alert.severity === 'warning') {
      const key = `${alert.metric}_${alert.rating}`
      const issue = issueMap.get(key) || {
        metric: alert.metric,
        rating: alert.rating,
        count: 0,
        severity: alert.severity,
        urls: new Set(),
        average_value: 0,
        values: []
      }

      issue.count++
      issue.urls.add(alert.url)
      issue.values.push(alert.value)
      issueMap.set(key, issue)
    }
  })

  // Convert to array and calculate averages
  const issues = Array.from(issueMap.values()).map(issue => ({
    ...issue,
    urls: Array.from(issue.urls).slice(0, 5), // Top 5 affected URLs
    average_value: issue.values.reduce((sum, val) => sum + val, 0) / issue.values.length
  }))

  // Sort by count (most frequent first)
  return issues.sort((a, b) => b.count - a.count).slice(0, 10)
}

/**
 * Analyze user agents for browser/device breakdown
 */
function analyzeUserAgents(alerts) {
  const browsers = {}
  const devices = {}

  alerts.forEach(alert => {
    const userAgent = alert.userAgent || 'unknown'
    
    // Simple browser detection
    let browser = 'other'
    if (userAgent.includes('Chrome')) browser = 'chrome'
    else if (userAgent.includes('Firefox')) browser = 'firefox'
    else if (userAgent.includes('Safari')) browser = 'safari'
    else if (userAgent.includes('Edge')) browser = 'edge'

    // Simple device detection
    let device = 'desktop'
    if (userAgent.includes('Mobile')) device = 'mobile'
    else if (userAgent.includes('Tablet')) device = 'tablet'

    browsers[browser] = (browsers[browser] || 0) + 1
    devices[device] = (devices[device] || 0) + 1
  })

  return { browsers, devices }
}

/**
 * Generate performance recommendations
 */
function generateRecommendations(statistics, issues) {
  const recommendations = []

  // LCP recommendations
  if (statistics.LCP && statistics.LCP.p95 > 2.5) {
    recommendations.push({
      metric: 'LCP',
      priority: 'high',
      title: 'Optimize Largest Contentful Paint',
      description: 'LCP is slower than recommended. Consider optimizing images, fonts, and critical resources.',
      actions: [
        'Optimize and compress images',
        'Preload critical resources',
        'Minimize CSS and JavaScript',
        'Use a CDN for static assets'
      ]
    })
  }

  // INP recommendations
  if (statistics.INP && statistics.INP.p95 > 0.2) {
    recommendations.push({
      metric: 'INP',
      priority: 'high',
      title: 'Improve Interaction to Next Paint',
      description: 'Users are experiencing delays when interacting with your site.',
      actions: [
        'Optimize JavaScript execution',
        'Code split large bundles',
        'Use web workers for heavy computations',
        'Defer non-critical JavaScript'
      ]
    })
  }

  // CLS recommendations  
  if (statistics.CLS && statistics.CLS.p95 > 0.1) {
    recommendations.push({
      metric: 'CLS',
      priority: 'medium',
      title: 'Improve Layout Stability',
      description: 'Content is shifting during page load, affecting user experience.',
      actions: [
        'Set dimensions for images and videos',
        'Reserve space for ads and embeds',
        'Avoid inserting content above existing content',
        'Use transform animations instead of layout changes'
      ]
    })
  }

  // General recommendations based on top issues
  if (issues.length > 0) {
    recommendations.push({
      metric: 'general',
      priority: 'medium',
      title: 'Address Frequent Performance Issues',
      description: `${issues.length} performance issues are occurring frequently.`,
      actions: [
        'Monitor performance regularly',
        'Set up performance budgets',
        'Implement performance testing in CI/CD',
        'Consider using a performance monitoring service'
      ]
    })
  }

  return recommendations
}