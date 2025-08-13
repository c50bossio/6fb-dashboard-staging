import { NextRequest, NextResponse } from 'next/server'
export const runtime = 'edge'

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001'

export async function GET(request) {
  try {
    const authHeader = request.headers.get('authorization')
    
    const backendResponse = await fetch(`${BACKEND_URL}/api/v1/agentic-coach/learning-insights`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(authHeader && { 'Authorization': authHeader })
      }
    })

    const data = await backendResponse.json()
    
    return NextResponse.json(data, { 
      status: backendResponse.status 
    })
  } catch (error) {
    console.error('Learning Insights API Proxy Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    )
  }
}