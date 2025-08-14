import { NextResponse } from 'next/server'
export const runtime = 'edge'

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8001'

export async function GET(request) {
  let timeWindow = '24'
  
  try {
    const { searchParams } = new URL(request.url)
    timeWindow = searchParams.get('timeWindow') || '24'
    
    const response = await fetch(`${BACKEND_URL}/ai/performance/costs?time_window_hours=${timeWindow}`, {
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
    console.error('Error fetching cost analysis:', error)
    
    // Return empty state instead of mock data - follow NO MOCK DATA policy
    return NextResponse.json({
      error: 'Cost analysis unavailable',
      message: 'Unable to connect to backend service. Please ensure the backend is running.',
      time_window_hours: parseInt(timeWindow),
      total_cost: 0,
      provider_breakdown: [],
      model_breakdown: [],
      hourly_trend: [],
      optimization_recommendations: [],
      data_available: false
    }, { status: 503 })
  }
}