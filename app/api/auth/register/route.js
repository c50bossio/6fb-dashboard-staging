import { NextResponse } from 'next/server'

const FASTAPI_BASE_URL = process.env.FASTAPI_BASE_URL || 'http://localhost:8001'

export async function POST(request) {
  try {
    const body = await request.json()
    const { email, password, full_name, barbershop_name } = body

    // Validate required fields
    if (!email || !password || !full_name) {
      return NextResponse.json(
        { error: 'Email, password, and full name are required' },
        { status: 400 }
      )
    }

    // Basic validation
    if (password.length < 6) {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters long' },
        { status: 400 }
      )
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Please enter a valid email address' },
        { status: 400 }
      )
    }

    // Send registration request to FastAPI backend
    const response = await fetch(`${FASTAPI_BASE_URL}/api/v1/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email,
        password,
        full_name,
        barbershop_name: barbershop_name || null
      })
    })

    const data = await response.json()

    if (!response.ok) {
      return NextResponse.json(
        { error: data.detail || 'Registration failed' },
        { status: response.status }
      )
    }

    // Return the JWT token and success message
    return NextResponse.json({
      success: true,
      access_token: data.access_token,
      token_type: data.token_type,
      message: 'Registration successful'
    })

  } catch (error) {
    console.error('Registration API error:', error)
    
    // Fallback for development - allow demo registration
    if (process.env.NODE_ENV === 'development') {
      return NextResponse.json({
        success: true,
        access_token: 'demo_token_' + Date.now(),
        token_type: 'bearer',
        message: 'Demo registration successful',
        demo: true
      })
    }

    return NextResponse.json(
      { error: 'Internal server error during registration' },
      { status: 500 }
    )
  }
}

// Handle other HTTP methods
export async function GET() {
  return NextResponse.json(
    { message: 'Method not allowed' },
    { status: 405 }
  )
}

export async function PUT() {
  return NextResponse.json(
    { message: 'Method not allowed' },
    { status: 405 }
  )
}

export async function DELETE() {
  return NextResponse.json(
    { message: 'Method not allowed' },
    { status: 405 }
  )
}