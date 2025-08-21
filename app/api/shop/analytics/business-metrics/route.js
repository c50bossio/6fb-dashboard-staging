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

    // Forward request to FastAPI business metrics endpoint
    const fastApiResponse = await fetch(`${FASTAPI_BASE_URL}/api/v1/business-data/metrics`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json'
      }
    })

    if (!fastApiResponse.ok) {
      const errorText = await fastApiResponse.text()
      console.error('FastAPI business metrics error:', errorText)
      
      // Fallback to basic business metrics structure
      const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun"]
      return NextResponse.json({
        revenue: Object.fromEntries(months.map(month => [month, 0])),
        appointments: Object.fromEntries(months.map(month => [month, 0])),
        customer_satisfaction: 0,
        growth_rate: 0,
        period: "last_6_months",
        last_updated: new Date().toISOString(),
        trends: {
          revenue_trend: "stable",
          customer_growth: 0,
          service_popularity: []
        },
        data_source: "fallback",
        error_fallback: true
      })
    }

    const businessData = await fastApiResponse.json()
    return NextResponse.json(businessData)

  } catch (error) {
    console.error('Error in GET /api/shop/analytics/business-metrics:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}