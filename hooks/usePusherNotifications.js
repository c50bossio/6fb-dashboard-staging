import { useEffect, useState, useCallback } from 'react'
import { useUser } from '@clerk/nextjs'
import { 
  getPusherClient, 
  subscribeToChannel, 
  unsubscribeFromChannel,
  CHANNELS,
  EVENTS 
} from '../lib/pusher-client'
import { supabase } from '../lib/supabase'

export function usePusherNotifications() {
  const { user } = useUser()
  const [notifications, setNotifications] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [isConnected, setIsConnected] = useState(false)

  useEffect(() => {
    if (!user) return

    let channel = null

    async function setupPusher() {
      try {
        // Get Supabase user ID
        const { data: supabaseUser } = await supabase
          .from('users')
          .select('id')
          .eq('clerk_id', user.id)
          .single()

        if (!supabaseUser) return

        // Load existing notifications
        const { data: existingNotifications } = await supabase
          .from('notifications')
          .select('*')
          .eq('user_id', supabaseUser.id)
          .order('created_at', { ascending: false })
          .limit(20)

        if (existingNotifications) {
          setNotifications(existingNotifications)
          setUnreadCount(existingNotifications.filter(n => !n.read).length)
        }

        // Subscribe to user's private channel
        const channelName = CHANNELS.USER_NOTIFICATIONS(supabaseUser.id)
        
        channel = subscribeToChannel(channelName, {
          [EVENTS.NEW_NOTIFICATION]: handleNewNotification,
          [EVENTS.NOTIFICATION_READ]: handleNotificationRead,
          'pusher:subscription_succeeded': () => {
            console.log('Connected to notifications channel')
            setIsConnected(true)
          },
          'pusher:subscription_error': (error) => {
            console.error('Pusher subscription error:', error)
            setIsConnected(false)
          }
        })
      } catch (error) {
        console.error('Error setting up Pusher:', error)
      }
    }

    setupPusher()

    // Cleanup
    return () => {
      if (channel) {
        unsubscribeFromChannel(channel.name)
      }
    }
  }, [user])

  const handleNewNotification = useCallback((data) => {
    setNotifications(prev => [data, ...prev])
    setUnreadCount(prev => prev + 1)

    // Show browser notification if permitted
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(data.title, {
        body: data.message,
        icon: '/icon-192x192.png',
        badge: '/badge-72x72.png',
      })
    }
  }, [])

  const handleNotificationRead = useCallback((data) => {
    setNotifications(prev => 
      prev.map(n => n.id === data.notificationId ? { ...n, read: true } : n)
    )
    setUnreadCount(prev => Math.max(0, prev - 1))
  }, [])

  const markAsRead = useCallback(async (notificationId) => {
    try {
      // Update in database
      await supabase
        .from('notifications')
        .update({ read: true })
        .eq('id', notificationId)

      // Update local state
      handleNotificationRead({ notificationId })
    } catch (error) {
      console.error('Error marking notification as read:', error)
    }
  }, [handleNotificationRead])

  const markAllAsRead = useCallback(async () => {
    try {
      const unreadIds = notifications
        .filter(n => !n.read)
        .map(n => n.id)

      if (unreadIds.length === 0) return

      // Update in database
      await supabase
        .from('notifications')
        .update({ read: true })
        .in('id', unreadIds)

      // Update local state
      setNotifications(prev => prev.map(n => ({ ...n, read: true })))
      setUnreadCount(0)
    } catch (error) {
      console.error('Error marking all as read:', error)
    }
  }, [notifications])

  const requestPermission = useCallback(async () => {
    if ('Notification' in window && Notification.permission === 'default') {
      const permission = await Notification.requestPermission()
      return permission === 'granted'
    }
    return false
  }, [])

  return {
    notifications,
    unreadCount,
    isConnected,
    markAsRead,
    markAllAsRead,
    requestPermission,
  }
}