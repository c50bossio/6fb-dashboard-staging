import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'edge'

// FastAPI base URL
const FASTAPI_BASE_URL = process.env.FASTAPI_URL || 'http://localhost:8001'

export async function GET() {
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

    // Forward request to FastAPI
    const fastApiResponse = await fetch(`${FASTAPI_BASE_URL}/api/v1/shop/staff`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json'
      }
    })

    if (!fastApiResponse.ok) {
      const errorText = await fastApiResponse.text()
      console.error('FastAPI staff fetch error:', errorText)
      return NextResponse.json({ 
        error: 'Failed to fetch staff members',
        details: errorText
      }, { status: fastApiResponse.status })
    }

    const staffData = await fastApiResponse.json()
    return NextResponse.json(staffData)

  } catch (error) {
    console.error('Error in GET /api/shop/staff:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request) {
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

    // Get request body
    const staffData = await request.json()

    // Forward request to FastAPI
    const fastApiResponse = await fetch(`${FASTAPI_BASE_URL}/api/v1/shop/staff`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(staffData)
    })

    if (!fastApiResponse.ok) {
      const errorText = await fastApiResponse.text()
      console.error('FastAPI staff creation error:', errorText)
      return NextResponse.json({ 
        error: 'Failed to create staff member',
        details: errorText
      }, { status: fastApiResponse.status })
    }

    const newStaff = await fastApiResponse.json()
    return NextResponse.json(newStaff)

  } catch (error) {
    console.error('Error in POST /api/shop/staff:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}