import { NextRequest, NextResponse } from 'next/server'
export const runtime = 'edge'

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001'

export async function GET(request) {
  try {
    const authHeader = request.headers.get('authorization')
    
    const backendResponse = await fetch(`${BACKEND_URL}/api/v1/settings/business-hours`, {
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
    console.error('API Proxy Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    )
  }
}

export async function PUT(request) {
  try {
    const authHeader = request.headers.get('authorization')
    const body = await request.json()
    
    const backendResponse = await fetch(`${BACKEND_URL}/api/v1/settings/business-hours`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...(authHeader && { 'Authorization': authHeader })
      },
      body: JSON.stringify(body)
    })

    const data = await backendResponse.json()
    
    return NextResponse.json(data, { 
      status: backendResponse.status 
    })
  } catch (error) {
    console.error('API Proxy Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    )
  }
}