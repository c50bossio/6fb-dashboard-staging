import { NextResponse } from 'next/server'

const FASTAPI_BASE_URL = process.env.FASTAPI_BASE_URL || 'http://localhost:8001'

export async function GET(request) {
  try {
    // Extract bearer token from authorization header
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Missing or invalid authorization header' },
        { status: 401 }
      )
    }

    const token = authHeader.substring(7) // Remove 'Bearer ' prefix

    // Send request to FastAPI backend
    const response = await fetch(`${FASTAPI_BASE_URL}/api/v1/auth/me`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      }
    })

    const data = await response.json()

    if (!response.ok) {
      return NextResponse.json(
        { error: data.detail || 'Failed to get user profile' },
        { status: response.status }
      )
    }

    // Return user profile data directly (FastAPI returns user object directly)
    return NextResponse.json(data)

  } catch (error) {
    console.error('User profile API error:', error)
    
    // Fallback for development - return demo user
    if (process.env.NODE_ENV === 'development') {
      return NextResponse.json({
        success: true,
        user: {
          id: 1,
          email: 'demo@barbershop.com',
          full_name: 'Demo User',
          barbershop_name: 'Demo Barbershop',
          barbershop_id: 'demo_shop_001',
          is_active: true
        },
        demo: true
      })
    }

    return NextResponse.json(
      { error: 'Internal server error getting user profile' },
      { status: 500 }
    )
  }
}