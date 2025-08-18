import { NextResponse } from 'next/server'

import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'

export async function POST(request) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { sessionId } = await request.json()
    
    const currentSession = sessionId || `session_${Date.now()}_${user.id}`
    
    try {
      const connectionResult = await startRealtimeStreaming(user.id, currentSession)
      
      return NextResponse.json({
        success: true,
        sessionId: currentSession,
        channelName: `dashboard-${user.id}`,
        pusherConfig: {
          key: process.env.NEXT_PUBLIC_PUSHER_KEY || 'mock-key',
          cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER || 'us2',
          forceTLS: true
        },
        connectionInfo: connectionResult,
        timestamp: new Date().toISOString()
      })

    } catch (streamingError) {
      console.error('Real-time streaming setup error:', streamingError)
      
      return NextResponse.json({
        success: false,
        error: 'Failed to initialize real-time streaming',
        sessionId: currentSession,
        fallback: true,
        timestamp: new Date().toISOString()
      }, { status: 500 })
    }

  } catch (error) {
    console.error('Real-time connection error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(request) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const sessionId = searchParams.get('sessionId')
    
    if (!sessionId) {
      return NextResponse.json({ error: 'Session ID required' }, { status: 400 })
    }

    try {
      await stopRealtimeStreaming(sessionId)
      
      return NextResponse.json({
        success: true,
        message: 'Real-time streaming stopped',
        sessionId: sessionId,
        timestamp: new Date().toISOString()
      })

    } catch (streamingError) {
      console.error('Failed to stop streaming:', streamingError)
      
      return NextResponse.json({
        success: true, // Don't fail the disconnect
        warning: 'Streaming may not have stopped cleanly',
        sessionId: sessionId,
        timestamp: new Date().toISOString()
      })
    }

  } catch (error) {
    console.error('Real-time disconnect error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

async function startRealtimeStreaming(userId, sessionId) {
  const connectionInfo = {
    userId: userId,
    sessionId: sessionId,
    channelName: `dashboard-${userId}`,
    services: {
      metrics: 'enabled',
      notifications: 'enabled',
      aiChat: 'enabled'
    },
    streamingInterval: {
      metrics: '5 seconds',
      notifications: '15 seconds',
      aiResponses: 'real-time'
    },
    status: 'connected'
  }
  
  return connectionInfo
}

async function stopRealtimeStreaming(sessionId) {
  
  return {
    sessionId,
    stopped: true,
    timestamp: new Date().toISOString()
  }
}