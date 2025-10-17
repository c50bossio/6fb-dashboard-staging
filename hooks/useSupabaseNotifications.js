import { useEffect, useState, useCallback } from 'react'
import { useAuth } from '@/components/SupabaseAuthProvider'
import {
  subscribeToChannel,
  subscribeToTableChanges,
  unsubscribeFromChannel,
  CHANNELS,
  EVENTS
} from '@/lib/supabase-realtime'
import { createClient } from '@/lib/supabase/UNIFIED_CLIENT'

export function useSupabaseNotifications() {
  const { user } = useAuth()
  const [notifications, setNotifications] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [isConnected, setIsConnected] = useState(false)

  useEffect(() => {
    if (!user) return

    let channel = null
    let dbChannel = null

    async function setupRealtimeNotifications() {
      try {
        const supabase = createClient()

        // Fetch existing notifications
        const { data: existingNotifications } = await supabase
          .from('notifications')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(20)

        if (existingNotifications) {
          setNotifications(existingNotifications)
          setUnreadCount(existingNotifications.filter(n => !n.read).length)
        }

        // Subscribe to broadcast channel for real-time notifications
        const channelName = CHANNELS.USER_NOTIFICATIONS(user.id)

        channel = subscribeToChannel(channelName, {
          [EVENTS.NEW_NOTIFICATION]: handleNewNotification,
          [EVENTS.NOTIFICATION_READ]: handleNotificationRead,
        })

        // Subscribe to database changes on notifications table
        dbChannel = subscribeToTableChanges(
          'notifications',
          {
            event: 'INSERT',
            filter: `user_id=eq.${user.id}`
          },
          (payload) => {
            if (payload.new) {
              handleNewNotification(payload.new)
            }
          }
        )

        setIsConnected(true)
        console.log('✅ Connected to notifications channel:', channelName)

      } catch (error) {
        console.error('Error setting up real-time notifications:', error)
        setIsConnected(false)
      }
    }

    setupRealtimeNotifications()

    return () => {
      if (channel) {
        const channelName = CHANNELS.USER_NOTIFICATIONS(user.id)
        unsubscribeFromChannel(channelName)
      }
      if (dbChannel) {
        unsubscribeFromChannel(`db-changes-notifications`)
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
      const supabase = createClient()

      await supabase
        .from('notifications')
        .update({ read: true })
        .eq('id', notificationId)

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

      const supabase = createClient()

      await supabase
        .from('notifications')
        .update({ read: true })
        .in('id', unreadIds)

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
