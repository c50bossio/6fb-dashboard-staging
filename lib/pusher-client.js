import Pusher from 'pusher-js'

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

export const CHANNELS = {
  PUBLIC_UPDATES: 'public-updates',
  
  USER_NOTIFICATIONS: (userId) => `private-user-${userId}`,
  SESSION_UPDATES: (sessionId) => `private-session-${sessionId}`,
  
  BARBERSHOP_PRESENCE: (barbershopId) => `presence-barbershop-${barbershopId}`,
  TEAM_PRESENCE: (teamId) => `presence-team-${teamId}`,
}

export const EVENTS = {
  AI_TYPING: 'ai-typing',
  AI_RESPONSE: 'ai-response',
  AI_INSIGHT: 'ai-insight',
  
  NEW_NOTIFICATION: 'new-notification',
  NOTIFICATION_READ: 'notification-read',
  
  SESSION_UPDATE: 'session-update',
  SESSION_END: 'session-end',
  
  TEAM_MEMBER_ONLINE: 'team-member-online',
  TEAM_MEMBER_OFFLINE: 'team-member-offline',
  
  SUBSCRIPTION_UPDATE: 'subscription-update',
  FEATURE_ANNOUNCEMENT: 'feature-announcement',
}

export function subscribeToChannel(channelName, eventHandlers = {}) {
  const pusher = getPusherClient()
  const channel = pusher.subscribe(channelName)
  
  Object.entries(eventHandlers).forEach(([event, handler]) => {
    channel.bind(event, handler)
  })
  
  return channel
}

export function unsubscribeFromChannel(channelName) {
  const pusher = getPusherClient()
  pusher.unsubscribe(channelName)
}

export function subscribeToPresenceChannel(channelName, callbacks = {}) {
  const pusher = getPusherClient()
  const channel = pusher.subscribe(channelName)
  
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

export function triggerClientEvent(channel, eventName, data) {
  channel.trigger(`client-${eventName}`, data)
}