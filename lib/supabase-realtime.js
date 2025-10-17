import { createClient } from '@/lib/supabase/UNIFIED_CLIENT'

let realtimeChannels = new Map()

/**
 * Get or create a Supabase Realtime channel
 * @param {string} channelName - Unique channel identifier
 * @returns {object} Supabase Realtime channel
 */
export function getRealtimeChannel(channelName) {
  if (realtimeChannels.has(channelName)) {
    return realtimeChannels.get(channelName)
  }

  const supabase = createClient()
  const channel = supabase.channel(channelName)
  realtimeChannels.set(channelName, channel)

  return channel
}

/**
 * Subscribe to broadcast events (replaces Pusher channels)
 * @param {string} channelName - Channel identifier
 * @param {object} eventHandlers - Map of event names to handler functions
 * @returns {object} Channel instance
 */
export function subscribeToChannel(channelName, eventHandlers = {}) {
  const channel = getRealtimeChannel(channelName)

  // Subscribe to each event using broadcast
  Object.entries(eventHandlers).forEach(([event, handler]) => {
    channel.on('broadcast', { event }, (payload) => {
      handler(payload.payload)
    })
  })

  // Subscribe to the channel
  channel.subscribe((status) => {
    if (status === 'SUBSCRIBED') {
      console.log(`✅ Subscribed to channel: ${channelName}`)
    } else if (status === 'CHANNEL_ERROR') {
      console.error(`❌ Error subscribing to channel: ${channelName}`)
    }
  })

  return channel
}

/**
 * Unsubscribe from a channel
 * @param {string} channelName - Channel identifier
 */
export function unsubscribeFromChannel(channelName) {
  const channel = realtimeChannels.get(channelName)
  if (channel) {
    channel.unsubscribe()
    realtimeChannels.delete(channelName)
    console.log(`✅ Unsubscribed from channel: ${channelName}`)
  }
}

/**
 * Subscribe to presence channel (replaces Pusher presence)
 * @param {string} channelName - Channel identifier
 * @param {object} callbacks - Presence callbacks
 * @returns {object} Channel instance
 */
export function subscribeToPresenceChannel(channelName, callbacks = {}) {
  const channel = getRealtimeChannel(channelName)

  // Track presence
  const presenceState = {}

  channel
    .on('presence', { event: 'sync' }, () => {
      const state = channel.presenceState()
      if (callbacks.onSubscriptionSucceeded) {
        callbacks.onSubscriptionSucceeded(state)
      }
    })
    .on('presence', { event: 'join' }, ({ key, newPresences }) => {
      if (callbacks.onMemberAdded) {
        newPresences.forEach(presence => {
          callbacks.onMemberAdded(presence)
        })
      }
    })
    .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
      if (callbacks.onMemberRemoved) {
        leftPresences.forEach(presence => {
          callbacks.onMemberRemoved(presence)
        })
      }
    })
    .subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        // Track this client's presence
        await channel.track({
          online_at: new Date().toISOString(),
          user_agent: navigator.userAgent
        })
        console.log(`✅ Subscribed to presence channel: ${channelName}`)
      }
    })

  return channel
}

/**
 * Broadcast an event to a channel (replaces Pusher trigger)
 * @param {object} channel - Channel instance
 * @param {string} eventName - Event name
 * @param {object} data - Event payload
 */
export async function broadcastEvent(channel, eventName, data) {
  if (!channel) {
    console.warn('⚠️ Cannot broadcast event: Channel not available')
    return
  }

  await channel.send({
    type: 'broadcast',
    event: eventName,
    payload: data
  })
}

/**
 * Trigger a client event (for presence/broadcast channels)
 * @param {object} channel - Channel instance
 * @param {string} eventName - Event name
 * @param {object} data - Event payload
 */
export async function triggerClientEvent(channel, eventName, data) {
  await broadcastEvent(channel, `client-${eventName}`, data)
}

/**
 * Subscribe to database changes (Postgres Changes)
 * @param {string} tableName - Table to watch
 * @param {object} options - Filter options
 * @param {function} callback - Handler function
 * @returns {object} Channel instance
 */
export function subscribeToTableChanges(tableName, options = {}, callback) {
  const channelName = `db-changes-${tableName}`
  const channel = getRealtimeChannel(channelName)

  const { event = '*', filter, schema = 'public' } = options

  const config = {
    event,
    schema,
    table: tableName
  }

  if (filter) {
    config.filter = filter
  }

  channel
    .on('postgres_changes', config, (payload) => {
      callback(payload)
    })
    .subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        console.log(`✅ Subscribed to table changes: ${tableName}`)
      }
    })

  return channel
}

/**
 * Cleanup all channels
 */
export function disconnectAll() {
  realtimeChannels.forEach((channel, channelName) => {
    channel.unsubscribe()
    console.log(`✅ Disconnected from channel: ${channelName}`)
  })
  realtimeChannels.clear()
}

// Channel name helpers (compatible with existing code)
export const CHANNELS = {
  PUBLIC_UPDATES: 'public-updates',

  USER_NOTIFICATIONS: (userId) => `user-${userId}-notifications`,
  SESSION_UPDATES: (sessionId) => `session-${sessionId}`,

  BARBERSHOP_PRESENCE: (barbershopId) => `barbershop-${barbershopId}-presence`,
  TEAM_PRESENCE: (teamId) => `team-${teamId}-presence`,
}

// Event name helpers (compatible with existing code)
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
