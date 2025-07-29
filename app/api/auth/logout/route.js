import { NextResponse } from 'next/server'

const FASTAPI_BASE_URL = process.env.FASTAPI_BASE_URL || 'http://localhost:8001'

export async function POST(request) {
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

    // Send logout request to FastAPI backend
    const response = await fetch(`${FASTAPI_BASE_URL}/api/v1/auth/logout`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      }
    })

    if (!response.ok) {
      const data = await response.json()
      return NextResponse.json(
        { error: data.detail || 'Logout failed' },
        { status: response.status }
      )
    }

    // Return success response
    return NextResponse.json({
      success: true,
      message: 'Successfully logged out'
    })

  } catch (error) {
    console.error('Logout API error:', error)
    
    // Even if backend fails, we can still return success
    // since logout is mainly about client-side token removal
    return NextResponse.json({
      success: true,
      message: 'Logged out (client-side)',
      demo: process.env.NODE_ENV === 'development'
    })
  }
}