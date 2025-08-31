import { NextRequest, NextResponse } from 'next/server'
import { apiLogger } from '@/lib/logger'
export const runtime = 'nodejs'

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001'

export async function GET(request) {
  try {
    const backendResponse = await fetch(`${BACKEND_URL}/api/v1/health`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    })

    const data = await backendResponse.json()
    
    return NextResponse.json(data, { 
      status: backendResponse.status 
    })
  } catch (error) {
    apiLogger.error('Health API proxy error', error, {
      context: 'health_proxy',
      backend_url: BACKEND_URL,
      endpoint: 'GET /api/v1/health'
    })
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    )
  }
}