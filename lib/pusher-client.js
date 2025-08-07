import Pusher from 'pusher-js'

// Initialize Pusher client
let pusherClient = null

export function getPusherClient() {
  if (!pusherClient) {
    pusherClient = new Pusher(process.env.NEXT_PUBLIC_PUSHER_KEY, {
      cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER,
      encrypted: true,
      authEndpoint: '/api/pusher/auth',
    })
  }
  return pusherClient
}

// Channel types
export const CHANNELS = {
  // Public channels
  PUBLIC_UPDATES: 'public-updates',
  
  // Private channels (require auth)
  USER_NOTIFICATIONS: (userId) => `private-user-${userId}`,
  SESSION_UPDATES: (sessionId) => `private-session-${sessionId}`,
  
  // Presence channels (show who's online)
  BARBERSHOP_PRESENCE: (barbershopId) => `presence-barbershop-${barbershopId}`,
  TEAM_PRESENCE: (teamId) => `presence-team-${teamId}`,
}

// Event types
export const EVENTS = {
  // AI Chat events
  AI_TYPING: 'ai-typing',
  AI_RESPONSE: 'ai-response',
  AI_INSIGHT: 'ai-insight',
  
  // Notification events
  NEW_NOTIFICATION: 'new-notification',
  NOTIFICATION_READ: 'notification-read',
  
  // Session events
  SESSION_UPDATE: 'session-update',
  SESSION_END: 'session-end',
  
  // Team events
  TEAM_MEMBER_ONLINE: 'team-member-online',
  TEAM_MEMBER_OFFLINE: 'team-member-offline',
  
  // System events
  SUBSCRIPTION_UPDATE: 'subscription-update',
  FEATURE_ANNOUNCEMENT: 'feature-announcement',
}

// Helper functions
export function subscribeToChannel(channelName, eventHandlers = {}) {
  const pusher = getPusherClient()
  const channel = pusher.subscribe(channelName)
  
  // Bind event handlers
  Object.entries(eventHandlers).forEach(([event, handler]) => {
    channel.bind(event, handler)
  })
  
  return channel
}

export function unsubscribeFromChannel(channelName) {
  const pusher = getPusherClient()
  pusher.unsubscribe(channelName)
}

// Presence channel helpers
export function subscribeToPresenceChannel(channelName, callbacks = {}) {
  const pusher = getPusherClient()
  const channel = pusher.subscribe(channelName)
  
  // Presence-specific events
  if (callbacks.onMemberAdded) {
    channel.bind('pusher:member_added', callbacks.onMemberAdded)
  }
  
  if (callbacks.onMemberRemoved) {
    channel.bind('pusher:member_removed', callbacks.onMemberRemoved)
  }
  
  if (callbacks.onSubscriptionSucceeded) {
    channel.bind('pusher:subscription_succeeded', (members) => {
      callbacks.onSubscriptionSucceeded(members)
    })
  }
  
  return channel
}

// Send client events (for presence channels)
export function triggerClientEvent(channel, eventName, data) {
  channel.trigger(`client-${eventName}`, data)
}