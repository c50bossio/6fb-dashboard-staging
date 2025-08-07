'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { getPusherClient, CHANNELS, EVENTS } from '@/lib/pusher/client'
import { useAuth } from '@/components/SupabaseAuthProvider'

export function usePusher() {
  const { user } = useAuth()
  const [isConnected, setIsConnected] = useState(false)
  const pusherRef = useRef(null)
  const channelsRef = useRef({})

  useEffect(() => {
    if (!user) return

    // Initialize Pusher client
    const pusher = getPusherClient()
    pusherRef.current = pusher

    // Connection state handlers
    pusher.connection.bind('connected', () => {
      console.log('Pusher connected')
      setIsConnected(true)
    })

    pusher.connection.bind('disconnected', () => {
      console.log('Pusher disconnected')
      setIsConnected(false)
    })

    pusher.connection.bind('error', (error) => {
      console.error('Pusher connection error:', error)
    })

    // Cleanup
    return () => {
      // Unbind all channels
      Object.values(channelsRef.current).forEach(channel => {
        channel.unbind_all()
        pusher.unsubscribe(channel.name)
      })
      channelsRef.current = {}
      
      // Disconnect
      pusher.disconnect()
    }
  }, [user])

  const subscribe = useCallback((channelName, events = {}) => {
    if (!pusherRef.current || !user) return null

    // Check if already subscribed
    if (channelsRef.current[channelName]) {
      return channelsRef.current[channelName]
    }

    // Subscribe to channel
    const channel = pusherRef.current.subscribe(channelName)
    channelsRef.current[channelName] = channel

    // Bind events
    Object.entries(events).forEach(([event, handler]) => {
      channel.bind(event, handler)
    })

    // Handle subscription success/error
    channel.bind('pusher:subscription_succeeded', () => {
      console.log(`Subscribed to ${channelName}`)
    })

    channel.bind('pusher:subscription_error', (error) => {
      console.error(`Failed to subscribe to ${channelName}:`, error)
    })

    return channel
  }, [user])

  const unsubscribe = useCallback((channelName) => {
    if (!pusherRef.current) return

    const channel = channelsRef.current[channelName]
    if (channel) {
      channel.unbind_all()
      pusherRef.current.unsubscribe(channelName)
      delete channelsRef.current[channelName]
    }
  }, [])

  const trigger = useCallback((channelName, eventName, data) => {
    const channel = channelsRef.current[channelName]
    if (channel) {
      channel.trigger(eventName, data)
    }
  }, [])

  return {
    isConnected,
    subscribe,
    unsubscribe,
    trigger,
    CHANNELS,
    EVENTS,
  }
}

// Hook for presence channels
export function usePresenceChannel(roomId) {
  const { user } = useAuth()
  const [members, setMembers] = useState([])
  const [myInfo, setMyInfo] = useState(null)
  const { subscribe, unsubscribe, isConnected } = usePusher()

  useEffect(() => {
    if (!user || !roomId || !isConnected) return

    const channelName = CHANNELS.presenceChannel(roomId)
    
    const channel = subscribe(channelName, {
      'pusher:subscription_succeeded': (members) => {
        setMyInfo(members.me)
        setMembers(Object.values(members.members))
      },
      'pusher:member_added': (member) => {
        setMembers(prev => [...prev, member])
      },
      'pusher:member_removed': (member) => {
        setMembers(prev => prev.filter(m => m.id !== member.id))
      },
    })

    return () => {
      unsubscribe(channelName)
    }
  }, [user, roomId, isConnected, subscribe, unsubscribe])

  return { members, myInfo }
}

// Hook for real-time notifications
export function useRealtimeNotifications() {
  const { user } = useAuth()
  const [notifications, setNotifications] = useState([])
  const { subscribe, unsubscribe, isConnected, EVENTS } = usePusher()

  useEffect(() => {
    if (!user || !isConnected) return

    const channelName = CHANNELS.userChannel(user.id)
    
    subscribe(channelName, {
      [EVENTS.BOOKING_CREATED]: (data) => {
        setNotifications(prev => [{
          id: Date.now(),
          type: 'booking',
          message: `New booking created: ${data.serviceName}`,
          data,
          timestamp: new Date(),
        }, ...prev])
      },
      [EVENTS.AGENT_COMPLETED]: (data) => {
        setNotifications(prev => [{
          id: Date.now(),
          type: 'agent',
          message: `Agent task completed: ${data.taskName}`,
          data,
          timestamp: new Date(),
        }, ...prev])
      },
      [EVENTS.METRICS_UPDATE]: (data) => {
        setNotifications(prev => [{
          id: Date.now(),
          type: 'metrics',
          message: 'Dashboard metrics updated',
          data,
          timestamp: new Date(),
        }, ...prev])
      },
    })

    return () => {
      unsubscribe(channelName)
    }
  }, [user, isConnected, subscribe, unsubscribe, EVENTS])

  const clearNotifications = useCallback(() => {
    setNotifications([])
  }, [])

  return { notifications, clearNotifications }
}