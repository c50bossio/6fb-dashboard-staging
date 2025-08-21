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

    // Forward request to FastAPI
    const fastApiResponse = await fetch(`${FASTAPI_BASE_URL}/api/v1/shop/dashboard`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json'
      }
    })

    if (!fastApiResponse.ok) {
      const errorText = await fastApiResponse.text()
      console.error('FastAPI financial dashboard error:', errorText)
      
      // Fallback to basic financial metrics
      return NextResponse.json({
        total_revenue: 0,
        today_revenue: 0,
        week_revenue: 0,
        month_revenue: 0,
        total_appointments: 0,
        today_appointments: 0,
        completed_appointments: 0,
        cancellation_rate: 0,
        average_service_value: 0,
        top_services: [],
        revenue_trend: [],
        error_fallback: true
      })
    }

    const dashboardData = await fastApiResponse.json()
    return NextResponse.json(dashboardData)

  } catch (error) {
    console.error('Error in GET /api/shop/financial/dashboard:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}