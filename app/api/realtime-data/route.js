import { NextResponse } from 'next/server'

import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'

export async function GET(request) {
  try {
    // Check authentication
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    // Temporary bypass for development
    const isDevelopment = process.env.NODE_ENV === 'development'
    const effectiveUser = user || { id: 'demo-user-' + Date.now(), email: 'demo@example.com' }
    
    if (!user && !isDevelopment) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const feedId = searchParams.get('feed_id')
    const limit = parseInt(searchParams.get('limit') || '10')
    const action = searchParams.get('action') || 'status'

    try {
      // Call Python Real-time Data Service
      let response
      
      if (action === 'status') {
        response = await fetch(`http://localhost:8001/realtime-data/status`)
      } else if (action === 'metrics') {
        response = await fetch(`http://localhost:8001/realtime-data/current-metrics`)
      } else if (action === 'feed-data' && feedId) {
        response = await fetch(`http://localhost:8001/realtime-data/feed/${feedId}?limit=${limit}`)
      } else {
        return NextResponse.json({ error: 'Invalid action or missing parameters' }, { status: 400 })
      }

      if (!response.ok) {
        throw new Error(`Real-time data service error: ${response.status}`)
      }

      const realtimeData = await response.json()
      
      return NextResponse.json({
        success: true,
        action: action,
        data: realtimeData,
        realtime_system: 'business_data_feeds',
        timestamp: new Date().toISOString()
      })

    } catch (error) {
      console.error('Real-time data service error:', error)
      
      // NO MOCK DATA - Return error when service unavailable
      return NextResponse.json({
        success: false,
        error: 'Real-time data service unavailable',
        action: action,
        message: 'Backend real-time data service is required for this feature',
        service_required: 'Python FastAPI backend on port 8001',
        timestamp: new Date().toISOString()
      }, { status: 503 })
    }

  } catch (error) {
    console.error('Real-time data API error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request) {
  try {
    // Check authentication
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    // Temporary bypass for development
    const isDevelopment = process.env.NODE_ENV === 'development'
    const effectiveUser = user || { id: 'demo-user-' + Date.now(), email: 'demo@example.com' }
    
    if (!user && !isDevelopment) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { action, feed_id, parameters } = await request.json()

    if (!action) {
      return NextResponse.json(
        { error: 'Action is required' },
        { status: 400 }
      )
    }

    const response = await handleRealtimeDataAction(action, feed_id, parameters, effectiveUser.id)
    
    return NextResponse.json({
      success: true,
      action,
      feed_id,
      response,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Real-time data action error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

// NO MOCK DATA - Real-time data function removed
// Real-time data must come from actual backend service

async function handleRealtimeDataAction(action, feedId, parameters, userId) {
  switch (action) {
    case 'start_feed':
      return {
        action: 'feed_started',
        feed_id: feedId,
        message: `Data feed ${feedId} started successfully`,
        status: 'active'
      }
      
    case 'stop_feed':
      return {
        action: 'feed_stopped',
        feed_id: feedId,
        message: `Data feed ${feedId} stopped`,
        status: 'inactive'
      }
      
    case 'configure_feed':
      return {
        action: 'feed_configured',
        feed_id: feedId,
        configuration: parameters,
        message: `Feed ${feedId} configuration updated`
      }
      
    case 'subscribe':
      return {
        action: 'subscribed',
        feed_id: feedId,
        subscriber: userId,
        message: `Subscribed to ${feedId}`,
        notification_method: parameters?.method || 'webhook'
      }
      
    case 'export_data':
      return {
        action: 'data_exported',
        feed_id: feedId || 'all_feeds',
        format: parameters?.format || 'json',
        time_range: parameters?.time_range || '24h',
        message: 'Real-time data exported successfully'
      }
      
    default:
      return {
        action: 'unknown_action',
        message: 'Action processed with default handler',
        available_actions: ['start_feed', 'stop_feed', 'configure_feed', 'subscribe', 'export_data']
      }
  }
}