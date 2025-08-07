import { NextResponse } from 'next/server'

import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'
export const maxDuration = 30

export async function GET(request) {
  try {
    // Check authentication
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const reportType = searchParams.get('type') || 'realtime'

    try {
      let performanceData

      if (reportType === 'realtime') {
        performanceData = await getRealTimeMetrics()
      } else if (reportType === 'report') {
        performanceData = await getSystemPerformanceReport()
      } else if (reportType === 'status') {
        performanceData = await getMonitoringStatus()
      } else {
        throw new Error('Invalid report type')
      }
      
      return NextResponse.json({
        success: true,
        ...performanceData,
        timestamp: new Date().toISOString()
      })

    } catch (error) {
      console.error('AI Performance monitoring error:', error)
      return NextResponse.json({
        success: false,
        error: error.message,
        fallback_data: generateFallbackPerformanceData(reportType),
        fallback: true
      })
    }

  } catch (error) {
    console.error('Performance monitoring endpoint error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request) {
  try {
    // Check authentication
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { component, metric, value, metadata } = await request.json()

    if (!component || !metric || value === undefined) {
      return NextResponse.json(
        { error: 'Component, metric, and value are required' },
        { status: 400 }
      )
    }

    try {
      // Record performance metric via FastAPI
      const response = await recordPerformanceMetric({
        component,
        metric,
        value,
        metadata: metadata || {},
        userId: user.id
      })
      
      return NextResponse.json({
        success: true,
        ...response,
        timestamp: new Date().toISOString()
      })

    } catch (error) {
      console.error('Metric recording error:', error)
      return NextResponse.json({
        success: false,
        error: error.message,
        message: 'Failed to record performance metric',
        fallback: true
      })
    }

  } catch (error) {
    console.error('Performance metric endpoint error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

async function getRealTimeMetrics() {
  const fastAPIUrl = process.env.FASTAPI_BASE_URL || 'http://localhost:8001'
  
  try {
    const response = await fetch(`${fastAPIUrl}/api/v1/ai/performance/realtime`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      timeout: 10000
    })

    if (!response.ok) {
      throw new Error(`FastAPI responded with status: ${response.status}`)
    }

    const data = await response.json()
    
    if (!data.success) {
      throw new Error(data.error || 'Real-time metrics service failed')
    }

    return data
    
  } catch (error) {
    console.error('Failed to get real-time metrics from FastAPI:', error)
    throw new Error(`Real-time metrics service unavailable: ${error.message}`)
  }
}

async function getSystemPerformanceReport() {
  const fastAPIUrl = process.env.FASTAPI_BASE_URL || 'http://localhost:8001'
  
  try {
    const response = await fetch(`${fastAPIUrl}/api/v1/ai/performance/report`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      timeout: 25000 // Extended timeout for report generation
    })

    if (!response.ok) {
      throw new Error(`FastAPI responded with status: ${response.status}`)
    }

    const data = await response.json()
    
    if (!data.success) {
      throw new Error(data.error || 'Performance report service failed')
    }

    return data
    
  } catch (error) {
    console.error('Failed to get performance report from FastAPI:', error)
    throw new Error(`Performance report service unavailable: ${error.message}`)
  }
}

async function getMonitoringStatus() {
  const fastAPIUrl = process.env.FASTAPI_BASE_URL || 'http://localhost:8001'
  
  try {
    const response = await fetch(`${fastAPIUrl}/api/v1/ai/performance/status`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      timeout: 10000
    })

    if (!response.ok) {
      throw new Error(`FastAPI responded with status: ${response.status}`)
    }

    const data = await response.json()
    return data
    
  } catch (error) {
    console.error('Failed to get monitoring status from FastAPI:', error)
    throw new Error(`Monitoring status service unavailable: ${error.message}`)
  }
}

async function recordPerformanceMetric(options) {
  const fastAPIUrl = process.env.FASTAPI_BASE_URL || 'http://localhost:8001'
  
  try {
    const response = await fetch(`${fastAPIUrl}/api/v1/ai/performance/record`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        component: options.component,
        metric: options.metric,
        value: options.value,
        metadata: options.metadata
      }),
      timeout: 15000
    })

    if (!response.ok) {
      throw new Error(`FastAPI responded with status: ${response.status}`)
    }

    const data = await response.json()
    
    if (!data.success) {
      throw new Error(data.error || 'Metric recording service failed')
    }

    return data
    
  } catch (error) {
    console.error('Failed to record metric via FastAPI:', error)
    throw new Error(`Metric recording service unavailable: ${error.message}`)
  }
}

function generateFallbackPerformanceData(reportType) {
  if (reportType === 'realtime') {
    return {
      metrics: {
        ai_orchestrator: {
          response_time: { value: 1.8, status: 'good', timestamp: new Date().toISOString() },
          confidence_score: { value: 0.85, status: 'good', timestamp: new Date().toISOString() },
          success_rate: { value: 0.96, status: 'good', timestamp: new Date().toISOString() }
        },
        specialized_agents: {
          response_time: { value: 1.2, status: 'good', timestamp: new Date().toISOString() },
          confidence_score: { value: 0.88, status: 'good', timestamp: new Date().toISOString() },
          success_rate: { value: 0.98, status: 'good', timestamp: new Date().toISOString() }
        },
        recommendations_engine: {
          response_time: { value: 2.5, status: 'good', timestamp: new Date().toISOString() },
          confidence_score: { value: 0.82, status: 'good', timestamp: new Date().toISOString() },
          success_rate: { value: 0.94, status: 'good', timestamp: new Date().toISOString() }
        }
      }
    }
  } else if (reportType === 'report') {
    return {
      overall_health: 'good',
      overall_score: 0.86,
      component_health: {
        ai_orchestrator: {
          component_name: 'ai_orchestrator',
          status: 'good',
          overall_score: 0.88,
          metrics: { response_time: 1.8, confidence_score: 0.85, success_rate: 0.96 },
          issues: [],
          recommendations: ['Continue monitoring response times'],
          last_updated: new Date().toISOString()
        },
        specialized_agents: {
          component_name: 'specialized_agents',
          status: 'excellent',
          overall_score: 0.92,
          metrics: { response_time: 1.2, confidence_score: 0.88, success_rate: 0.98 },
          issues: [],
          recommendations: ['Performance is optimal'],
          last_updated: new Date().toISOString()
        },
        recommendations_engine: {
          component_name: 'recommendations_engine',
          status: 'good',
          overall_score: 0.78,
          metrics: { response_time: 2.5, confidence_score: 0.82, success_rate: 0.94 },
          issues: ['Response time slightly elevated'],
          recommendations: ['Consider implementing caching'],
          last_updated: new Date().toISOString()
        }
      },
      optimization_opportunities: [
        {
          component: 'recommendations_engine',
          opportunity: 'Response Time Optimization',
          impact: 'medium',
          effort: 'low',
          description: 'Implement request caching for common recommendation patterns',
          estimated_improvement: '20-30% response time reduction',
          priority_score: 75
        }
      ],
      cost_analysis: {
        total_monthly_cost: 120.00,
        cost_per_request: 0.04,
        efficiency_score: 0.87
      },
      generated_at: new Date().toISOString(),
      next_review_time: new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString()
    }
  } else if (reportType === 'status') {
    return {
      monitoring_active: true,
      components_monitored: 5,
      total_metrics_collected: 1247,
      last_collection: new Date().toISOString(),
      alert_thresholds_configured: 4,
      optimization_cache_size: 0
    }
  }
  
  return { fallback: true, message: 'Service temporarily unavailable' }
}