import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'edge'

// FastAPI base URL
const FASTAPI_BASE_URL = process.env.FASTAPI_URL || 'http://localhost:8001'

export async function PUT(request, { params }) {
  try {
    const supabase = createClient()
    const { staffId } = params
    
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
    const fastApiResponse = await fetch(`${FASTAPI_BASE_URL}/api/v1/shop/staff/${staffId}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(staffData)
    })

    if (!fastApiResponse.ok) {
      const errorText = await fastApiResponse.text()
      console.error('FastAPI staff update error:', errorText)
      return NextResponse.json({ 
        error: 'Failed to update staff member',
        details: errorText
      }, { status: fastApiResponse.status })
    }

    const updatedStaff = await fastApiResponse.json()
    return NextResponse.json(updatedStaff)

  } catch (error) {
    console.error('Error in PUT /api/shop/staff/[staffId]:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(request, { params }) {
  try {
    const supabase = createClient()
    const { staffId } = params
    
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
    const fastApiResponse = await fetch(`${FASTAPI_BASE_URL}/api/v1/shop/staff/${staffId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json'
      }
    })

    if (!fastApiResponse.ok) {
      const errorText = await fastApiResponse.text()
      console.error('FastAPI staff deletion error:', errorText)
      return NextResponse.json({ 
        error: 'Failed to remove staff member',
        details: errorText
      }, { status: fastApiResponse.status })
    }

    const result = await fastApiResponse.json()
    return NextResponse.json(result)

  } catch (error) {
    console.error('Error in DELETE /api/shop/staff/[staffId]:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}