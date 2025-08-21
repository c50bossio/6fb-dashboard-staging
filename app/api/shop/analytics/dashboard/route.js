import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'edge'

// FastAPI base URL
const FASTAPI_BASE_URL = process.env.FASTAPI_URL || 'http://localhost:8001'

export async function GET(request) {
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

    // Get query parameters for date range
    const { searchParams } = new URL(request.url)
    const periodDays = searchParams.get('period_days') || '30'

    // Forward request to FastAPI comprehensive analytics endpoint
    const fastApiResponse = await fetch(`${FASTAPI_BASE_URL}/api/v1/analytics/comprehensive?period_days=${periodDays}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json'
      }
    })

    if (!fastApiResponse.ok) {
      const errorText = await fastApiResponse.text()
      console.error('FastAPI analytics dashboard error:', errorText)
      
      // Fallback to basic analytics structure
      return NextResponse.json({
        period_days: parseInt(periodDays),
        date_range: {
          start: new Date(Date.now() - parseInt(periodDays) * 24 * 60 * 60 * 1000).toISOString(),
          end: new Date().toISOString()
        },
        summary: {
          total_revenue: 0,
          total_appointments: 0,
          total_customers: 0,
          average_appointment_value: 0,
          customer_retention_rate: 0
        },
        appointment_status: {},
        daily_revenue: {},
        popular_services: [],
        growth_metrics: {
          revenue_growth: 0,
          appointment_growth: 0,
          customer_growth: 0
        },
        data_source: "fallback",
        last_updated: new Date().toISOString(),
        error_fallback: true
      })
    }

    const analyticsData = await fastApiResponse.json()
    return NextResponse.json(analyticsData)

  } catch (error) {
    console.error('Error in GET /api/shop/analytics/dashboard:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}