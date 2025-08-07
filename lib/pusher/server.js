import Pusher from 'pusher'

// Server-side Pusher instance
export const pusherServer = new Pusher({
  appId: process.env.PUSHER_APP_ID,
  key: process.env.NEXT_PUBLIC_PUSHER_KEY,
  secret: process.env.PUSHER_SECRET,
  cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER,
  useTLS: true,
})

// Channel types
export const CHANNELS = {
  // Private channels for individual users
  userChannel: (userId) => `private-user-${userId}`,
  
  // Presence channels for real-time collaboration
  presenceChannel: (roomId) => `presence-${roomId}`,
  
  // Public channels for broadcasts
  publicChannel: () => 'public-updates',
  
  // Specific feature channels
  bookingUpdates: (shopId) => `private-bookings-${shopId}`,
  agentStatus: (userId) => `private-agent-${userId}`,
  chatRoom: (roomId) => `presence-chat-${roomId}`,
  dashboardLive: (userId) => `private-dashboard-${userId}`,
}

// Event types
export const EVENTS = {
  // Booking events
  BOOKING_CREATED: 'booking:created',
  BOOKING_UPDATED: 'booking:updated',
  BOOKING_CANCELLED: 'booking:cancelled',
  
  // Agent events
  AGENT_STARTED: 'agent:started',
  AGENT_PROGRESS: 'agent:progress',
  AGENT_COMPLETED: 'agent:completed',
  AGENT_ERROR: 'agent:error',
  
  // Chat events
  MESSAGE_SENT: 'message:sent',
  USER_TYPING: 'user:typing',
  USER_STOPPED_TYPING: 'user:stopped-typing',
  
  // Dashboard events
  METRICS_UPDATE: 'metrics:update',
  ALERT_TRIGGERED: 'alert:triggered',
  
  // System events
  SYSTEM_UPDATE: 'system:update',
  USER_ONLINE: 'user:online',
  USER_OFFLINE: 'user:offline',
}

// Helper functions
export async function triggerEvent(channel, event, data) {
  try {
    await pusherServer.trigger(channel, event, data)
    return { success: true }
  } catch (error) {
    console.error('Pusher trigger error:', error)
    return { success: false, error: error.message }
  }
}

export async function triggerBatch(events) {
  try {
    await pusherServer.triggerBatch(events)
    return { success: true }
  } catch (error) {
    console.error('Pusher batch trigger error:', error)
    return { success: false, error: error.message }
  }
}

export async function getChannelInfo(channel) {
  try {
    const response = await pusherServer.get({ path: `/channels/${channel}` })
    return response
  } catch (error) {
    console.error('Pusher channel info error:', error)
    return null
  }
}

export async function getPresenceUsers(channel) {
  try {
    const response = await pusherServer.get({ 
      path: `/channels/${channel}/users` 
    })
    return response.users || []
  } catch (error) {
    console.error('Pusher presence users error:', error)
    return []
  }
}