'use client'

import { NotificationCenter } from '@novu/notification-center'
import { useAuth } from '@/components/SupabaseAuthProvider'

export default function NovuNotificationCenter() {
  const { user } = useAuth()

  if (!user) return null

  return (
    <NotificationCenter
      subscriberId={user.id}
      applicationIdentifier={process.env.NEXT_PUBLIC_NOVU_APP_IDENTIFIER}
      initialFetchingStrategy={{
        fetchNotifications: true,
        fetchUnseenCount: true,
      }}
      colorScheme="light"
      styles={{
        root: {
          '.nc-bell': {
            width: '24px',
            height: '24px',
          },
        },
        bellButton: {
          root: {
            width: '40px',
            height: '40px',
            position: 'relative',
          },
        },
        popover: {
          root: {
            width: '380px',
            maxHeight: '600px',
          },
        },
        notifications: {
          listItem: {
            layout: {
              borderBottom: '1px solid #e5e7eb',
              padding: '16px',
              '&:hover': {
                backgroundColor: '#f9fafb',
              },
            },
          },
        },
      }}
      popoverConfig={{
        offset: 10,
        position: 'bottom-end',
      }}
      onNotificationClick={(notification) => {
        console.log('Notification clicked:', notification)
        // Handle notification click - navigate to relevant page
        if (notification.cta?.data?.url) {
          window.location.href = notification.cta.data.url
        }
      }}
      onActionClick={(actionId, notification) => {
        console.log('Action clicked:', actionId, notification)
        // Handle action button clicks
      }}
    />
  )
}