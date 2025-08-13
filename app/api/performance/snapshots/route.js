import { NextResponse } from 'next/server'
export const runtime = 'edge'

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8001'

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const timeWindow = searchParams.get('timeWindow') || '24'
    
    const response = await fetch(`${BACKEND_URL}/ai/performance/snapshots?time_window_hours=${timeWindow}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      throw new Error(`Backend responded with status: ${response.status}`)
    }

    const data = await response.json()
    return NextResponse.json(data)

  } catch (error) {
    console.error('Error fetching model snapshots:', error)
    
    // Return mock data for development/testing
    const mockSnapshots = {
      'openai_gpt-5': {
        model: 'gpt-5',
        provider: 'openai',
        timestamp: new Date().toISOString(),
        avg_response_time: 2.3,
        p95_response_time: 4.1,
        p99_response_time: 6.8,
        success_rate: 0.987,
        error_rate: 0.013,
        avg_confidence: 0.94,
        context_accuracy: 0.91,
        business_relevance: 0.88,
        tokens_per_second: 47.2,
        cost_per_token: 0.0001,
        cache_hit_rate: 0.23,
        memory_usage_mb: 512,
        cpu_utilization: 0.34,
        concurrent_requests: 8,
        user_satisfaction: 0.92,
        conversion_rate: 0.78,
        overall_score: 89.5,
        status: 'good'
      },
      'anthropic_claude-opus-4-1-20250805': {
        model: 'claude-opus-4-1-20250805',
        provider: 'anthropic',
        timestamp: new Date().toISOString(),
        avg_response_time: 1.8,
        p95_response_time: 3.2,
        p99_response_time: 5.1,
        success_rate: 0.994,
        error_rate: 0.006,
        avg_confidence: 0.96,
        context_accuracy: 0.94,
        business_relevance: 0.91,
        tokens_per_second: 52.1,
        cost_per_token: 0.00008,
        cache_hit_rate: 0.28,
        memory_usage_mb: 448,
        cpu_utilization: 0.29,
        concurrent_requests: 6,
        user_satisfaction: 0.95,
        conversion_rate: 0.82,
        overall_score: 93.2,
        status: 'excellent'
      },
      'google_gemini-2.0-flash-exp': {
        model: 'gemini-2.0-flash-exp',
        provider: 'google',
        timestamp: new Date().toISOString(),
        avg_response_time: 1.2,
        p95_response_time: 2.1,
        p99_response_time: 3.4,
        success_rate: 0.991,
        error_rate: 0.009,
        avg_confidence: 0.88,
        context_accuracy: 0.85,
        business_relevance: 0.83,
        tokens_per_second: 68.5,
        cost_per_token: 0.00003,
        cache_hit_rate: 0.31,
        memory_usage_mb: 384,
        cpu_utilization: 0.22,
        concurrent_requests: 12,
        user_satisfaction: 0.89,
        conversion_rate: 0.75,
        overall_score: 86.8,
        status: 'good'
      }
    }

    return NextResponse.json(mockSnapshots)
  }
}