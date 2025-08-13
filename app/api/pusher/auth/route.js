import { NextResponse } from 'next/server'

import { pusherServer } from '@/lib/pusher/server'
import { createClient } from '@/lib/supabase/server'
export const runtime = 'edge'

export async function POST(req) {
  try {
    // Check authentication
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { socket_id, channel_name } = await req.json()

    // Validate channel access
    if (channel_name.startsWith('private-')) {
      // Check if user has access to this private channel
      const userIdFromChannel = channel_name.match(/private-user-(.+)/)?.[1]
      const dashboardIdFromChannel = channel_name.match(/private-dashboard-(.+)/)?.[1]
      const agentIdFromChannel = channel_name.match(/private-agent-(.+)/)?.[1]
      
      if (
        (userIdFromChannel && userIdFromChannel !== user.id) ||
        (dashboardIdFromChannel && dashboardIdFromChannel !== user.id) ||
        (agentIdFromChannel && agentIdFromChannel !== user.id)
      ) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
    }

    // For presence channels, include user data
    if (channel_name.startsWith('presence-')) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      const presenceData = {
        user_id: user.id,
        user_info: {
          email: user.email,
          name: profile?.full_name || profile?.email || 'Anonymous',
          avatar: profile?.avatar_url,
        },
      }

      const authResponse = pusherServer.authorizeChannel(
        socket_id,
        channel_name,
        presenceData
      )

      return NextResponse.json(authResponse)
    }

    // For private channels
    const authResponse = pusherServer.authorizeChannel(socket_id, channel_name)
    
    return NextResponse.json(authResponse)
  } catch (error) {
    console.error('Pusher auth error:', error)
    return NextResponse.json(
      { error: 'Authentication failed' }, 
      { status: 500 }
    )
  }
}