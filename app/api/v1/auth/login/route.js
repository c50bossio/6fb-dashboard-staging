import { NextRequest, NextResponse } from 'next/server'
export const runtime = 'edge'

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001'

export async function POST(request) {
  try {
    const body = await request.json()
    
    const backendResponse = await fetch(`${BACKEND_URL}/api/v1/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    })

    const data = await backendResponse.json()
    
    return NextResponse.json(data, { 
      status: backendResponse.status 
    })
  } catch (error) {
    console.error('Login API Proxy Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    )
  }
}