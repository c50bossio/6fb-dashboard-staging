'use client'

import { NovuProvider, PopoverNotificationCenter, NotificationBell } from '@novu/notification-center'
import { useUser } from '@clerk/nextjs'

export default function NovuNotificationCenter() {
  const { user } = useUser()
  
  if (!user || !process.env.NEXT_PUBLIC_NOVU_APP_IDENTIFIER) {
    return null
  }

  // Custom notification bell component
  function CustomBell({ unseenCount }) {
    return (
      <div className="relative">
        <NotificationBell unseenCount={unseenCount} />
        {unseenCount > 0 && (
          <span className="absolute -top-1 -right-1 h-5 w-5 bg-red-500 rounded-full text-white text-xs flex items-center justify-center animate-pulse">
            {unseenCount > 99 ? '99+' : unseenCount}
          </span>
        )}
      </div>
    )
  }

  // Handle notification clicks
  const handleNotificationClick = (notification) => {
    // Navigate to relevant page based on notification type
    if (notification.cta?.type === 'redirect' && notification.cta?.data?.url) {
      window.location.href = notification.cta.data.url
    }
    
    // Track notification interaction
    if (window.analytics) {
      window.analytics.events.notificationInteracted(notification.templateIdentifier)
    }
  }

  // Handle action clicks within notifications
  const handleActionClick = (templateIdentifier, actionType, notification) => {
    switch (actionType) {
      case 'primary':
        if (notification.cta?.data?.url) {
          window.location.href = notification.cta.data.url
        }
        break
      case 'secondary':
        // Handle secondary actions (e.g., dismiss, remind later)
        console.log('Secondary action clicked:', templateIdentifier)
        break
    }
  }

  return (
    <NovuProvider
      subscriberId={user.id}
      applicationIdentifier={process.env.NEXT_PUBLIC_NOVU_APP_IDENTIFIER}
      initialFetchingStrategy="eager"
      backendUrl={process.env.NEXT_PUBLIC_NOVU_BACKEND_URL}
    >
      <PopoverNotificationCenter
        colorScheme="light"
        position="bottom-right"
        offset={20}
        showUserPreferences={true}
        onNotificationClick={handleNotificationClick}
        onActionClick={handleActionClick}
        popoverArrow={true}
        
        // Customization
        theme={{
          dark: {
            loaderColor: '#6366f1',
          },
          light: {
            loaderColor: '#6366f1',
            popover: {
              arrowColor: 'white',
            },
          },
          common: {
            fontFamily: 'system-ui, -apple-system, sans-serif',
          },
        }}
        
        // Custom components
        listItem={(notification, handleActionButtonClick, handleNotificationClick) => (
          <div
            className={`p-4 hover:bg-gray-50 cursor-pointer border-b border-gray-100 ${
              !notification.read ? 'bg-blue-50' : ''
            }`}
            onClick={() => handleNotificationClick(notification)}
          >
            <div className="flex items-start gap-3">
              {/* Icon based on notification type */}
              <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${
                notification.templateIdentifier === 'booking-reminder' ? 'bg-blue-100' :
                notification.templateIdentifier === 'ai-insight' ? 'bg-amber-100' :
                notification.templateIdentifier === 'payment-received' ? 'bg-green-100' :
                'bg-gray-100'
              }`}>
                <span className="text-lg">
                  {notification.templateIdentifier === 'booking-reminder' ? '📅' :
                   notification.templateIdentifier === 'ai-insight' ? '💡' :
                   notification.templateIdentifier === 'payment-received' ? '💰' :
                   '📢'}
                </span>
              </div>
              
              {/* Content */}
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-medium text-gray-900 ${
                  !notification.read ? 'font-semibold' : ''
                }`}>
                  {notification.content}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {new Date(notification.createdAt).toLocaleString()}
                </p>
                
                {/* Action buttons */}
                {notification.cta && (
                  <div className="mt-2 flex gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleActionButtonClick(notification, 'primary')
                      }}
                      className="text-xs bg-indigo-600 text-white px-3 py-1 rounded hover:bg-indigo-700"
                    >
                      {notification.cta.action.label || 'View'}
                    </button>
                  </div>
                )}
              </div>
              
              {/* Unread indicator */}
              {!notification.read && (
                <div className="flex-shrink-0">
                  <div className="h-2 w-2 bg-blue-600 rounded-full" />
                </div>
              )}
            </div>
          </div>
        )}
        
        // Empty state
        emptyState={
          <div className="p-8 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl">🔔</span>
            </div>
            <p className="text-gray-600 text-sm">No notifications yet</p>
            <p className="text-gray-500 text-xs mt-1">
              We'll notify you when something important happens
            </p>
          </div>
        }
        
        // Footer
        footer={
          <div className="p-3 border-t bg-gray-50 text-center">
            <a
              href="/settings/notifications"
              className="text-sm text-indigo-600 hover:text-indigo-700 font-medium"
            >
              Manage notification preferences
            </a>
          </div>
        }
      >
        {({ unseenCount }) => <CustomBell unseenCount={unseenCount} />}
      </PopoverNotificationCenter>
    </NovuProvider>
  )
}