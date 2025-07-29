import { NextResponse } from 'next/server'

const FASTAPI_BASE_URL = process.env.FASTAPI_BASE_URL || 'http://localhost:8001'

export async function POST(request) {
  try {
    const body = await request.json()
    const { email, password } = body

    // Validate required fields
    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      )
    }

    // Send login request to FastAPI backend
    const response = await fetch(`${FASTAPI_BASE_URL}/api/v1/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email,
        password
      })
    })

    const data = await response.json()

    if (!response.ok) {
      return NextResponse.json(
        { error: data.detail || 'Login failed' },
        { status: response.status }
      )
    }

    // Return the JWT token and user info
    return NextResponse.json({
      success: true,
      access_token: data.access_token,
      token_type: data.token_type,
      message: 'Login successful'
    })

  } catch (error) {
    console.error('Login API error:', error)
    
    // Fallback for development - allow demo login
    if (process.env.NODE_ENV === 'development') {
      return NextResponse.json({
        success: true,
        access_token: 'demo_token_' + Date.now(),
        token_type: 'bearer',
        message: 'Demo login successful',
        demo: true
      })
    }

    return NextResponse.json(
      { error: 'Internal server error during login' },
      { status: 500 }
    )
  }
}