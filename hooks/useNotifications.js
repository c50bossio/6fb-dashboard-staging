'use client'

import { useEffect, useState } from 'react'
import { useHeadlessService } from '@novu/headless'
import { useAuth } from '@/components/SupabaseAuthProvider'

export function useNotifications() {
  const { user } = useAuth()
  const [notifications, setNotifications] = useState([])
  const [unseenCount, setUnseenCount] = useState(0)
  const [loading, setLoading] = useState(true)

  const headlessService = useHeadlessService({
    applicationIdentifier: process.env.NEXT_PUBLIC_NOVU_APP_IDENTIFIER,
    subscriberId: user?.id,
  })

  useEffect(() => {
    if (!user || !headlessService) return

    const fetchData = async () => {
      try {
        setLoading(true)
        
        // Fetch notifications
        const notificationsData = await headlessService.fetchNotifications({
          page: 1,
          limit: 20,
        })
        setNotifications(notificationsData.data || [])
        
        // Fetch unseen count
        const count = await headlessService.fetchUnseenCount()
        setUnseenCount(count.data?.count || 0)
      } catch (error) {
        console.error('Failed to fetch notifications:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()

    // Listen for real-time updates
    const unsubscribe = headlessService.listenUnseenCountChange((data) => {
      setUnseenCount(data.unseenCount)
    })

    return () => {
      unsubscribe?.()
    }
  }, [user, headlessService])

  const markAsRead = async (notificationId) => {
    try {
      await headlessService.markNotificationAsRead(notificationId)
      setNotifications(prev => 
        prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
      )
      setUnseenCount(prev => Math.max(0, prev - 1))
    } catch (error) {
      console.error('Failed to mark as read:', error)
    }
  }

  const markAllAsRead = async () => {
    try {
      await headlessService.markAllNotificationsAsRead()
      setNotifications(prev => prev.map(n => ({ ...n, read: true })))
      setUnseenCount(0)
    } catch (error) {
      console.error('Failed to mark all as read:', error)
    }
  }

  const deleteNotification = async (notificationId) => {
    try {
      await headlessService.removeNotification(notificationId)
      setNotifications(prev => prev.filter(n => n.id !== notificationId))
      
      // Update unseen count if the deleted notification was unread
      const notification = notifications.find(n => n.id === notificationId)
      if (notification && !notification.read) {
        setUnseenCount(prev => Math.max(0, prev - 1))
      }
    } catch (error) {
      console.error('Failed to delete notification:', error)
    }
  }

  return {
    notifications,
    unseenCount,
    loading,
    markAsRead,
    markAllAsRead,
    deleteNotification,
  }
}