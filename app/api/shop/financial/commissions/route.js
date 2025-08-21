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

    // Get query parameters
    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get('start_date')
    const endDate = searchParams.get('end_date')
    const barberId = searchParams.get('barber_id')

    // Validate required parameters
    if (!startDate || !endDate) {
      return NextResponse.json({ 
        error: 'start_date and end_date are required' 
      }, { status: 400 })
    }

    // Build query parameters
    let queryParams = `start_date=${startDate}&end_date=${endDate}`
    if (barberId) {
      queryParams += `&barber_id=${barberId}`
    }

    // Forward request to FastAPI
    const fastApiResponse = await fetch(`${FASTAPI_BASE_URL}/api/v1/shop/commissions?${queryParams}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json'
      }
    })

    if (!fastApiResponse.ok) {
      const errorText = await fastApiResponse.text()
      console.error('FastAPI commission reports error:', errorText)
      return NextResponse.json({ 
        error: 'Failed to fetch commission reports',
        details: errorText
      }, { status: fastApiResponse.status })
    }

    const commissionData = await fastApiResponse.json()
    return NextResponse.json(commissionData)

  } catch (error) {
    console.error('Error in GET /api/shop/financial/commissions:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}