import { NextResponse } from 'next/server'

import { triggerEvent, triggerBatch, CHANNELS, EVENTS } from '@/lib/pusher/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { type, data, batch } = await req.json()

    if (batch) {
      const result = await triggerBatch(batch)
      return NextResponse.json(result)
    }

    let result
    switch (type) {
      case 'booking_update':
        result = await triggerEvent(
          CHANNELS.bookingUpdates(data.shopId),
          EVENTS.BOOKING_UPDATED,
          data
        )
        break
        
      case 'agent_progress':
        result = await triggerEvent(
          CHANNELS.agentStatus(user.id),
          EVENTS.AGENT_PROGRESS,
          data
        )
        break
        
      case 'metrics_update':
        result = await triggerEvent(
          CHANNELS.dashboardLive(user.id),
          EVENTS.METRICS_UPDATE,
          data
        )
        break
        
      case 'system_alert':
        result = await triggerEvent(
          CHANNELS.userChannel(user.id),
          EVENTS.ALERT_TRIGGERED,
          data
        )
        break
        
      default:
        return NextResponse.json(
          { error: 'Invalid trigger type' }, 
          { status: 400 }
        )
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error('Pusher trigger error:', error)
    return NextResponse.json(
      { error: error.message }, 
      { status: 500 }
    )
  }
}