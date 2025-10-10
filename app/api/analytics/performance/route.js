import { NextResponse } from 'next/server'

// Simple in-memory store for demo (use Redis or database in production)
let performanceMetrics = []
const MAX_METRICS = 10000

export async function POST(request) {
  try {
    const data = await request.json()
    
    // Validate the data
    if (!data.events || !Array.isArray(data.events)) {
      return NextResponse.json(
        { error: 'Invalid data format' }, 
        { status: 400 }
      )
    }
    
    // Add timestamp and metadata
    const timestamp = new Date().toISOString()
    const clientIP = request.headers.get('x-forwarded-for') || 
                    request.headers.get('x-real-ip') || 
                    'unknown'
    
    const processedEvents = data.events.map(event => ({
      ...event,
      serverTimestamp: timestamp,
      clientIP,
      userAgent: request.headers.get('user-agent'),
    }))
    
    // Store metrics (implement database storage in production)
    performanceMetrics.push(...processedEvents)
    
    // Keep only recent metrics to prevent memory issues
    if (performanceMetrics.length > MAX_METRICS) {
      performanceMetrics = performanceMetrics.slice(-MAX_METRICS)
    }
    
    // Log performance issues in development
    if (process.env.NODE_ENV === 'development') {
      processedEvents.forEach(event => {
        if (event.type === 'web_vital') {
          if (event.rating === 'poor') {
            console.warn(`🚨 Poor Web Vital: ${event.name} = ${event.value}`)
          } else if (event.rating === 'needs-improvement') {
            console.log(`⚠️ Web Vital Needs Improvement: ${event.name} = ${event.value}`)
          }
        }
        
        if (event.type === 'timing' && event.duration > 1000) {
          console.warn(`🐌 Slow Operation: ${event.name} took ${event.duration.toFixed(2)}ms`)
        }
        
        if (event.type === 'custom_event' && event.name.includes('error')) {
          console.error(`❌ Error Event: ${event.name}`, event.data)
        }
      })
    }
    
    return NextResponse.json({ 
      success: true, 
      processed: processedEvents.length 
    })
    
  } catch (error) {
    console.error('Performance analytics error:', error)
    return NextResponse.json(
      { error: 'Failed to process performance data' }, 
      { status: 500 }
    )
  }
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const hours = parseInt(searchParams.get('hours') || '24')
    const type = searchParams.get('type') // 'web_vital', 'timing', 'custom_event'
    const component = searchParams.get('component')
    
    // Filter metrics based on time range
    const cutoff = new Date(Date.now() - (hours * 60 * 60 * 1000))
    let filteredMetrics = performanceMetrics.filter(metric => 
      new Date(metric.serverTimestamp) > cutoff
    )
    
    // Apply additional filters
    if (type) {
      filteredMetrics = filteredMetrics.filter(metric => metric.type === type)
    }
    
    if (component) {
      filteredMetrics = filteredMetrics.filter(metric => 
        metric.data?.component === component || 
        metric.name?.includes(component)
      )
    }
    
    // Aggregate metrics for analysis
    const analysis = {
      totalEvents: filteredMetrics.length,
      timeRange: hours,
      webVitals: getWebVitalsAnalysis(filteredMetrics),
      timings: getTimingsAnalysis(filteredMetrics),
      errors: getErrorAnalysis(filteredMetrics),
      components: getComponentAnalysis(filteredMetrics),
      recommendations: [],
    }
    
    // Generate performance recommendations
    analysis.recommendations = generateRecommendations(analysis)
    
    return NextResponse.json(analysis)
    
  } catch (error) {
    console.error('Performance analytics fetch error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch performance data' }, 
      { status: 500 }
    )
  }
}

function getWebVitalsAnalysis(metrics) {
  const webVitalMetrics = metrics.filter(m => m.type === 'web_vital')
  
  const vitals = {
    LCP: [], // Largest Contentful Paint
    FID: [], // First Input Delay  
    CLS: [], // Cumulative Layout Shift
    FCP: [], // First Contentful Paint
    TTFB: [] // Time to First Byte
  }
  
  webVitalMetrics.forEach(metric => {
    if (vitals[metric.name]) {
      vitals[metric.name].push({
        value: metric.value,
        rating: metric.rating,
        timestamp: metric.timestamp
      })
    }
  })
  
  // Calculate averages and ratings
  const analysis = {}
  Object.entries(vitals).forEach(([vital, values]) => {
    if (values.length > 0) {
      analysis[vital] = {
        average: values.reduce((sum, v) => sum + v.value, 0) / values.length,
        count: values.length,
        ratings: {
          good: values.filter(v => v.rating === 'good').length,
          needs_improvement: values.filter(v => v.rating === 'needs-improvement').length,
          poor: values.filter(v => v.rating === 'poor').length,
        },
        latest: values[values.length - 1],
      }
    }
  })
  
  return analysis
}

function getTimingsAnalysis(metrics) {
  const timingMetrics = metrics.filter(m => m.type === 'timing')
  
  const timings = {}
  timingMetrics.forEach(metric => {
    if (!timings[metric.name]) {
      timings[metric.name] = []
    }
    timings[metric.name].push(metric.duration)
  })
  
  // Calculate statistics for each timing
  const analysis = {}
  Object.entries(timings).forEach(([name, durations]) => {
    durations.sort((a, b) => a - b)
    
    analysis[name] = {
      count: durations.length,
      average: durations.reduce((sum, d) => sum + d, 0) / durations.length,
      median: durations[Math.floor(durations.length / 2)],
      p95: durations[Math.floor(durations.length * 0.95)],
      min: durations[0],
      max: durations[durations.length - 1],
    }
  })
  
  return analysis
}

function getErrorAnalysis(metrics) {
  const errorMetrics = metrics.filter(m => 
    m.type === 'custom_event' && 
    (m.name.includes('error') || m.name.includes('failed'))
  )
  
  const errorTypes = {}
  errorMetrics.forEach(metric => {
    if (!errorTypes[metric.name]) {
      errorTypes[metric.name] = {
        count: 0,
        examples: []
      }
    }
    errorTypes[metric.name].count++
    if (errorTypes[metric.name].examples.length < 5) {
      errorTypes[metric.name].examples.push({
        timestamp: metric.timestamp,
        data: metric.data
      })
    }
  })
  
  return {
    totalErrors: errorMetrics.length,
    errorTypes,
    errorRate: errorMetrics.length / Math.max(metrics.length, 1) * 100
  }
}

function getComponentAnalysis(metrics) {
  const componentMetrics = metrics.filter(m => m.data?.component)
  
  const components = {}
  componentMetrics.forEach(metric => {
    const componentName = metric.data.component
    if (!components[componentName]) {
      components[componentName] = {
        renders: 0,
        errors: 0,
        avgMountTime: 0,
        mountTimes: []
      }
    }
    
    if (metric.name?.includes('render')) {
      components[componentName].renders++
    }
    
    if (metric.name?.includes('error')) {
      components[componentName].errors++
    }
    
    if (metric.name?.includes('mount') && metric.duration) {
      components[componentName].mountTimes.push(metric.duration)
    }
  })
  
  // Calculate averages
  Object.values(components).forEach(component => {
    if (component.mountTimes.length > 0) {
      component.avgMountTime = component.mountTimes.reduce((sum, t) => sum + t, 0) / component.mountTimes.length
    }
  })
  
  return components
}

function generateRecommendations(analysis) {
  const recommendations = []
  
  // Web Vitals recommendations
  if (analysis.webVitals.LCP?.average > 2500) {
    recommendations.push({
      type: 'critical',
      category: 'Core Web Vitals',
      metric: 'LCP',
      message: `Largest Contentful Paint (${analysis.webVitals.LCP.average.toFixed(0)}ms) is slower than recommended (2.5s)`,
      suggestions: [
        'Optimize images with proper sizing and modern formats (WebP, AVIF)',
        'Implement lazy loading for below-the-fold content',
        'Reduce server response times with caching',
        'Preload critical resources',
      ]
    })
  }
  
  if (analysis.webVitals.FID?.average > 100) {
    recommendations.push({
      type: 'warning',
      category: 'Core Web Vitals',
      metric: 'FID',
      message: `First Input Delay (${analysis.webVitals.FID.average.toFixed(0)}ms) could be improved`,
      suggestions: [
        'Reduce JavaScript execution time',
        'Split large JavaScript bundles',
        'Use web workers for heavy computations',
        'Defer non-critical JavaScript',
      ]
    })
  }
  
  if (analysis.webVitals.CLS?.average > 0.1) {
    recommendations.push({
      type: 'warning',
      category: 'Core Web Vitals',
      metric: 'CLS',
      message: `Cumulative Layout Shift (${analysis.webVitals.CLS.average.toFixed(3)}) indicates layout instability`,
      suggestions: [
        'Set explicit dimensions for images and videos',
        'Reserve space for dynamic content',
        'Use CSS aspect-ratio for responsive media',
        'Avoid inserting content above existing content',
      ]
    })
  }
  
  // Timing recommendations
  if (analysis.timings) {
    Object.entries(analysis.timings).forEach(([name, timing]) => {
      if (timing.p95 > 1000 && timing.count > 10) {
        recommendations.push({
          type: 'optimization',
          category: 'Performance',
          metric: name,
          message: `${name} has slow 95th percentile (${timing.p95.toFixed(0)}ms)`,
          suggestions: [
            'Profile and optimize the slow code path',
            'Consider caching results',
            'Implement progressive loading',
            'Use debouncing for frequent operations',
          ]
        })
      }
    })
  }
  
  // Error rate recommendations
  if (analysis.errors.errorRate > 5) {
    recommendations.push({
      type: 'critical',
      category: 'Reliability',
      message: `High error rate (${analysis.errors.errorRate.toFixed(1)}%)`,
      suggestions: [
        'Implement proper error boundaries',
        'Add retry logic for failed requests',
        'Improve error handling and user feedback',
        'Monitor and fix common error patterns',
      ]
    })
  }
  
  return recommendations
}