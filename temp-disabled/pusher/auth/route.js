import { NextResponse } from 'next/server'
import Pusher from 'pusher'
import { auth } from '@clerk/nextjs'
import { supabase } from '@/lib/supabase'

const pusher = new Pusher({
  appId: process.env.PUSHER_APP_ID,
  key: process.env.PUSHER_KEY,
  secret: process.env.PUSHER_SECRET,
  cluster: process.env.PUSHER_CLUSTER,
  useTLS: true,
})

export async function POST(req) {
  try {
    const { userId } = auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const formData = await req.formData()
    const socketId = formData.get('socket_id')
    const channelName = formData.get('channel_name')

    // Get user data for presence channels
    const { data: user } = await supabase
      .from('users')
      .select('id, full_name, barbershop_name')
      .eq('clerk_id', userId)
      .single()

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Validate channel access
    if (channelName.startsWith('private-user-')) {
      // Ensure user can only access their own private channel
      const requestedUserId = channelName.replace('private-user-', '')
      if (requestedUserId !== user.id) {
        return NextResponse.json({ error: 'Access denied' }, { status: 403 })
      }
    }

    // Authenticate based on channel type
    let authResponse

    if (channelName.startsWith('presence-')) {
      // Presence channel - include user data
      const presenceData = {
        user_id: user.id,
        user_info: {
          name: user.full_name,
          barbershop: user.barbershop_name,
        },
      }

      authResponse = pusher.authorizeChannel(socketId, channelName, presenceData)
    } else {
      // Private channel - simple auth
      authResponse = pusher.authorizeChannel(socketId, channelName)
    }

    return NextResponse.json(authResponse)
  } catch (error) {
    console.error('Pusher auth error:', error)
    return NextResponse.json(
      { error: 'Authentication failed' },
      { status: 500 }
    )
  }
}