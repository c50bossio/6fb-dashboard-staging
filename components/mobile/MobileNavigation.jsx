'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { 
  HomeIcon, 
  CalendarIcon, 
  UserGroupIcon, 
  ChartBarIcon,
  ChatBubbleLeftRightIcon,
  Bars3Icon,
  XMarkIcon
} from '@heroicons/react/24/outline'
import { useTouchGestures } from '@/hooks/useTouchGestures'
import { cn } from '@/lib/utils'

const navItems = [
  { href: '/dashboard', icon: HomeIcon, label: 'Home' },
  { href: '/dashboard/calendar', icon: CalendarIcon, label: 'Calendar' },
  { href: '/dashboard/customers', icon: UserGroupIcon, label: 'Customers' },
  { href: '/dashboard/analytics', icon: ChartBarIcon, label: 'Analytics' },
  { href: '/dashboard/chat', icon: ChatBubbleLeftRightIcon, label: 'AI Chat' }
]

export function MobileBottomNav() {
  const pathname = usePathname()
  const [activeTab, setActiveTab] = useState(pathname)

  useEffect(() => {
    setActiveTab(pathname)
  }, [pathname])

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50 safe-area-bottom">
      <div className="flex justify-around items-center h-16">
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = activeTab === item.href
          
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center justify-center flex-1 h-full py-2 px-1 transition-colors",
                "active:scale-95 touch-manipulation",
                isActive ? "text-olive-600" : "text-gray-600"
              )}
              onClick={() => setActiveTab(item.href)}
            >
              <Icon className="h-6 w-6 mb-1" />
              <span className="text-xs">{item.label}</span>
              {isActive && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-olive-600" />
              )}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}

export function MobileDrawerNav({ isOpen, onClose }) {
  const gestureRef = useTouchGestures({
    onSwipeLeft: onClose,
    swipeThreshold: 30
  })

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }

    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen])

  if (!isOpen) return null

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden"
        onClick={onClose}
      />
      
      {/* Drawer */}
      <div
        ref={gestureRef}
        className={cn(
          "fixed top-0 left-0 bottom-0 w-80 max-w-[85vw] bg-white z-50 md:hidden",
          "transform transition-transform duration-300 ease-out",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold">Menu</h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-100 active:scale-95"
            aria-label="Close menu"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>
        
        {/* Navigation Items */}
        <nav className="p-4 space-y-2">
          {navItems.map((item) => {
            const Icon = item.icon
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-gray-100 active:bg-gray-200 transition-colors"
              >
                <Icon className="h-5 w-5 text-gray-600" />
                <span className="font-medium">{item.label}</span>
              </Link>
            )
          })}
        </nav>
        
        {/* Footer */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t">
          <div className="text-sm text-gray-500">
            <p>6FB AI Agent System</p>
            <p>Version 1.0.0</p>
          </div>
        </div>
      </div>
    </>
  )
}

export function MobileHeader({ title = '6FB Agent' }) {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)

  return (
    <>
      <header className="md:hidden fixed top-0 left-0 right-0 bg-white border-b border-gray-200 z-40 safe-area-top">
        <div className="flex items-center justify-between h-14 px-4">
          <button
            onClick={() => setIsDrawerOpen(true)}
            className="p-2 -ml-2 rounded-lg hover:bg-gray-100 active:scale-95"
            aria-label="Open menu"
          >
            <Bars3Icon className="h-6 w-6" />
          </button>
          
          <h1 className="text-lg font-semibold">{title}</h1>
          
          <div className="w-10" /> {/* Spacer for balance */}
        </div>
      </header>
      
      <MobileDrawerNav 
        isOpen={isDrawerOpen} 
        onClose={() => setIsDrawerOpen(false)} 
      />
    </>
  )
}

// Pull to refresh indicator
export function PullToRefreshIndicator({ pullDistance, isRefreshing }) {
  if (pullDistance === 0 && !isRefreshing) return null

  return (
    <div 
      className="fixed top-0 left-0 right-0 flex justify-center pt-4 z-30 pointer-events-none"
      style={{
        transform: `translateY(${Math.min(pullDistance, 60)}px)`,
        opacity: Math.min(pullDistance / 60, 1)
      }}
    >
      <div className="bg-white rounded-full shadow-lg p-2">
        {isRefreshing ? (
          <div className="animate-spin h-6 w-6 border-2 border-olive-600 border-t-transparent rounded-full" />
        ) : (
          <svg 
            className="h-6 w-6 text-olive-600" 
            fill="none" 
            viewBox="0 0 24 24" 
            stroke="currentColor"
            style={{
              transform: `rotate(${pullDistance * 3}deg)`
            }}
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        )}
      </div>
    </div>
  )
}