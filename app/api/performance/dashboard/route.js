import { NextResponse } from 'next/server'
export const runtime = 'edge'

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8001'

/**
 * AI Performance Dashboard API Endpoint
 * Provides comprehensive AI performance metrics and analytics
 */

export async function GET(request) {
  try {
    const response = await fetch(`${BACKEND_URL}/ai/performance/dashboard`, {
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
    console.error('Error fetching AI dashboard data:', error)
    
    // Return empty state instead of mock data - follow NO MOCK DATA policy
    return NextResponse.json({
      error: 'Performance dashboard unavailable',
      message: 'Unable to connect to backend service. Please ensure the backend is running.',
      timestamp: new Date().toISOString(),
      model_stats: {},
      active_alerts: [],
      total_requests_last_hour: 0,
      system_health: 'unknown',
      data_available: false
    }, { status: 503 })
  }
}