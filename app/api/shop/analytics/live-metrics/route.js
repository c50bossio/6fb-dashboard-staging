import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'edge'

// FastAPI base URL
const FASTAPI_BASE_URL = process.env.FASTAPI_URL || 'http://localhost:8001'

export async function GET() {
  try {
    const supabase = createClient()
    
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    // Get user's auth token
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.access_token) {
      return NextResponse.json({ error: 'No valid session' }, { status: 401 })
    }

    // Forward request to FastAPI live metrics endpoint
    const fastApiResponse = await fetch(`${FASTAPI_BASE_URL}/api/v1/analytics/live-metrics`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json'
      }
    })

    if (!fastApiResponse.ok) {
      const errorText = await fastApiResponse.text()
      console.error('FastAPI live metrics error:', errorText)
      
      // Fallback to basic live metrics
      return NextResponse.json({
        timestamp: new Date().toISOString(),
        active_users: 0,
        appointments_today: 0,
        revenue_today: 0,
        conversion_rate: 0.25,
        page_views: 0,
        bounce_rate: 0.30,
        average_session_duration: 300,
        top_services: [],
        data_source: "fallback",
        error_fallback: true
      })
    }

    const metricsData = await fastApiResponse.json()
    return NextResponse.json(metricsData)

  } catch (error) {
    console.error('Error in GET /api/shop/analytics/live-metrics:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}