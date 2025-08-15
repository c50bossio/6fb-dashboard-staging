import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
export const runtime = 'edge'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

let metricsCache = {
  lastUpdate: null,
  data: null
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const range = searchParams.get('range') || '1h'
    
    if (metricsCache.lastUpdate && Date.now() - metricsCache.lastUpdate < 5000) {
      return NextResponse.json(metricsCache.data)
    }
    
    const now = new Date()
    const startTime = getStartTime(now, range)
    
    const systemMetrics = await getSystemMetrics()
    
    const performanceMetrics = await getPerformanceMetrics(startTime, now)
    
    const errorMetrics = await getErrorMetrics(startTime, now)
    
    const serviceStatus = await getServiceStatus()
    
    const metrics = {
      system: systemMetrics,
      performance: performanceMetrics,
      errors: errorMetrics,
      services: serviceStatus,
      timestamp: now.toISOString()
    }
    
    metricsCache = {
      lastUpdate: Date.now(),
      data: metrics
    }
    
    return NextResponse.json(metrics)
    
  } catch (error) {
    console.error('Metrics API error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch metrics' },
      { status: 500 }
    )
  }
}

async function getSystemMetrics() {
  return {
    uptime: 0,
    cpu: 0,
    memory: 0,
    disk: 0,
    connections: 0,
    data_available: false,
    message: 'System metrics require monitoring service integration'
  }
}

async function getPerformanceMetrics(startTime, endTime) {
  try {
    const { data: metrics } = await supabase
      .from('performance_metrics')
      .select('*')
      .gte('created_at', startTime.toISOString())
      .lte('created_at', endTime.toISOString())
      .order('created_at', { ascending: true })
    
    if (metrics && metrics.length > 0) {
      return {
        responseTime: metrics.map(m => m.response_time),
        throughput: metrics.map(m => m.throughput),
        errorRate: metrics.map(m => m.error_rate)
      }
    }
  } catch (error) {
    console.error('Failed to fetch performance metrics:', error)
  }
  
  return {
    responseTime: [],
    throughput: [],
    errorRate: [],
    data_available: false
  }
}

async function getErrorMetrics(startTime, endTime) {
  try {
    const { data: errors, count } = await supabase
      .from('error_logs')
      .select('*', { count: 'exact' })
      .gte('created_at', startTime.toISOString())
      .lte('created_at', endTime.toISOString())
    
    const criticalCount = errors?.filter(e => e.severity === 'critical').length || 0
    const warningCount = errors?.filter(e => e.severity === 'warning').length || 0
    
    return {
      total: count || 0,
      critical: criticalCount,
      warnings: warningCount,
      recent: errors?.slice(0, 10) || []
    }
  } catch (error) {
    console.error('Failed to fetch error metrics:', error)
  }
  
  return {
    total: 0,
    critical: 0,
    warnings: 0,
    recent: [],
    data_available: false
  }
}

async function getServiceStatus() {
  const services = [
    { name: 'API Server', endpoint: '/api/health' },
    { name: 'Database', endpoint: null },
    { name: 'Redis Cache', endpoint: null },
    { name: 'AI Service', endpoint: '/api/ai/health' },
    { name: 'Email Service', endpoint: null },
    { name: 'Payment Gateway', endpoint: null }
  ]
  
  const statuses = await Promise.all(
    services.map(async (service) => {
      let status = 'unknown'
      let responseTime = 0
      
      if (service.endpoint) {
        try {
          const start = Date.now()
          const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:9999'}${service.endpoint}`)
          responseTime = Date.now() - start
          status = response.ok ? 'healthy' : 'degraded'
        } catch (error) {
          status = 'critical'
        }
      } else {
        status = 'unknown'
        responseTime = 0
      }
      
      return {
        ...service,
        status,
        responseTime,
        uptime: status === 'healthy' ? 100 : status === 'degraded' ? 95 : 0
      }
    })
  )
  
  return statuses
}

function getStartTime(now, range) {
  const startTime = new Date(now)
  
  switch (range) {
    case '1h':
      startTime.setHours(startTime.getHours() - 1)
      break
    case '6h':
      startTime.setHours(startTime.getHours() - 6)
      break
    case '24h':
      startTime.setDate(startTime.getDate() - 1)
      break
    case '7d':
      startTime.setDate(startTime.getDate() - 7)
      break
    default:
      startTime.setHours(startTime.getHours() - 1)
  }
  
  return startTime
}

export async function POST(request) {
  try {
    const body = await request.json()
    
    const { error } = await supabase
      .from('performance_metrics')
      .insert({
        response_time: body.responseTime,
        throughput: body.throughput,
        error_rate: body.errorRate,
        cpu_usage: body.cpuUsage,
        memory_usage: body.memoryUsage,
        created_at: new Date().toISOString()
      })
    
    if (error) {
      throw error
    }
    
    return NextResponse.json({ success: true })
    
  } catch (error) {
    console.error('Failed to store metrics:', error)
    return NextResponse.json(
      { error: 'Failed to store metrics' },
      { status: 500 }
    )
  }
}