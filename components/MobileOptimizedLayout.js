'use client'

import { useState, useEffect, useRef } from 'react'
import { ChevronUpIcon, XMarkIcon } from '@heroicons/react/24/outline'

export default function MobileOptimizedLayout({ children }) {
  const [showBottomSheet, setShowBottomSheet] = useState(false)
  const [pullToRefreshDistance, setPullToRefreshDistance] = useState(0)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const touchStartY = useRef(0)
  const scrollContainerRef = useRef(null)

  // Pull-to-refresh functionality
  const handleTouchStart = (e) => {
    touchStartY.current = e.touches[0].clientY
  }

  const handleTouchMove = (e) => {
    if (!scrollContainerRef.current) return
    
    const currentY = e.touches[0].clientY
    const deltaY = currentY - touchStartY.current
    const scrollTop = scrollContainerRef.current.scrollTop

    // Only trigger pull-to-refresh when at the top
    if (scrollTop === 0 && deltaY > 0) {
      e.preventDefault()
      const distance = Math.min(deltaY * 0.5, 100) // Dampen the pull distance
      setPullToRefreshDistance(distance)
    }
  }

  const handleTouchEnd = () => {
    if (pullToRefreshDistance > 60) {
      setIsRefreshing(true)
      // Simulate refresh
      setTimeout(() => {
        setIsRefreshing(false)
        setPullToRefreshDistance(0)
        
        // Trigger a custom refresh event
        window.dispatchEvent(new CustomEvent('pullToRefresh'))
      }, 1500)
    } else {
      setPullToRefreshDistance(0)
    }
  }

  return (
    <div className="h-screen flex flex-col bg-gray-50 relative overflow-hidden">
      {/* Pull-to-refresh indicator */}
      {pullToRefreshDistance > 0 && (
        <div 
          className="absolute top-0 left-0 right-0 z-50 flex items-center justify-center bg-blue-500 text-white transition-all duration-200"
          style={{ 
            height: `${pullToRefreshDistance}px`,
            opacity: pullToRefreshDistance / 60 
          }}
        >
          <div className="flex items-center space-x-2">
            {isRefreshing ? (
              <>
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                <span className="text-sm">Refreshing...</span>
              </>
            ) : (
              <>
                <ChevronUpIcon className="h-4 w-4" />
                <span className="text-sm">
                  {pullToRefreshDistance > 60 ? 'Release to refresh' : 'Pull to refresh'}
                </span>
              </>
            )}
          </div>
        </div>
      )}

      {/* Main scrollable content */}
      <div 
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto overscroll-y-contain"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{ 
          paddingTop: isRefreshing ? '60px' : `${pullToRefreshDistance}px`,
          transition: isRefreshing ? 'padding-top 0.3s ease-out' : 'none'
        }}
      >
        {children}
      </div>

      {/* Bottom sheet overlay */}
      {showBottomSheet && (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-50" onClick={() => setShowBottomSheet(false)}>
          <div 
            className="absolute bottom-0 left-0 right-0 bg-white rounded-t-2xl shadow-2xl transform transition-transform duration-300 ease-out"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">Quick Actions</h3>
                <button
                  onClick={() => setShowBottomSheet(false)}
                  className="p-2 rounded-full hover:bg-gray-100 transition-colors"
                >
                  <XMarkIcon className="h-5 w-5 text-gray-500" />
                </button>
              </div>
            </div>
            <div className="p-4 space-y-3 max-h-80 overflow-y-auto">
              <QuickAction 
                icon="🤖" 
                title="Ask AI Agents" 
                description="Get business advice from specialized AI agents"
                onClick={() => {
                  setShowBottomSheet(false)
                  // Navigate to AI agents
                }}
              />
              <QuickAction 
                icon="📊" 
                title="View Analytics" 
                description="Check your business performance metrics"
                onClick={() => setShowBottomSheet(false)}
              />
              <QuickAction 
                icon="🎯" 
                title="Business Recommendations" 
                description="Get AI-powered improvement suggestions"
                onClick={() => setShowBottomSheet(false)}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// Quick action component for bottom sheet
function QuickAction({ icon, title, description, onClick }) {
  const [isPressed, setIsPressed] = useState(false)

  return (
    <button
      className={`
        w-full flex items-center space-x-3 p-4 rounded-xl bg-gray-50 hover:bg-gray-100 
        transition-all duration-150 text-left min-h-[64px]
        ${isPressed ? 'transform scale-98 bg-gray-200' : ''}
      `}
      onClick={onClick}
      onTouchStart={() => setIsPressed(true)}
      onTouchEnd={() => setIsPressed(false)}
      onMouseDown={() => setIsPressed(true)}
      onMouseUp={() => setIsPressed(false)}
      onMouseLeave={() => setIsPressed(false)}
    >
      <div className="text-2xl">{icon}</div>
      <div className="flex-1 min-w-0">
        <div className="font-medium text-gray-900">{title}</div>
        <div className="text-sm text-gray-600 truncate">{description}</div>
      </div>
    </button>
  )
}

// Swipe gesture handler hook
export function useSwipeGesture(onSwipeLeft, onSwipeRight, threshold = 50) {
  const [touchStart, setTouchStart] = useState(null)
  const [touchEnd, setTouchEnd] = useState(null)

  const minSwipeDistance = threshold

  const onTouchStart = (e) => {
    setTouchEnd(null)
    setTouchStart(e.targetTouches[0].clientX)
  }

  const onTouchMove = (e) => setTouchEnd(e.targetTouches[0].clientX)

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return
    
    const distance = touchStart - touchEnd
    const isLeftSwipe = distance > minSwipeDistance
    const isRightSwipe = distance < -minSwipeDistance

    if (isLeftSwipe && onSwipeLeft) {
      onSwipeLeft()
    }
    if (isRightSwipe && onSwipeRight) {
      onSwipeRight()
    }
  }

  return {
    onTouchStart,
    onTouchMove,
    onTouchEnd
  }
}

// Mobile-friendly card with swipe actions
export function SwipeCard({ children, onSwipeLeft, onSwipeRight, leftAction, rightAction, className = '' }) {
  const [swipeOffset, setSwipeOffset] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const touchStartX = useRef(0)
  const cardRef = useRef(null)

  const handleTouchStart = (e) => {
    touchStartX.current = e.touches[0].clientX
    setIsDragging(true)
  }

  const handleTouchMove = (e) => {
    if (!isDragging) return
    
    const currentX = e.touches[0].clientX
    const deltaX = currentX - touchStartX.current
    
    // Limit swipe distance
    const maxSwipe = 120
    const limitedDelta = Math.max(-maxSwipe, Math.min(maxSwipe, deltaX))
    setSwipeOffset(limitedDelta)
  }

  const handleTouchEnd = () => {
    setIsDragging(false)
    
    if (Math.abs(swipeOffset) > 60) {
      if (swipeOffset > 0 && onSwipeRight) {
        onSwipeRight()
      } else if (swipeOffset < 0 && onSwipeLeft) {
        onSwipeLeft()
      }
    }
    
    // Reset position
    setSwipeOffset(0)
  }

  return (
    <div className="relative overflow-hidden rounded-lg">
      {/* Background actions */}
      {leftAction && (
        <div className="absolute inset-y-0 left-0 flex items-center justify-start pl-4 bg-red-500 text-white">
          {leftAction}
        </div>
      )}
      {rightAction && (
        <div className="absolute inset-y-0 right-0 flex items-center justify-end pr-4 bg-green-500 text-white">
          {rightAction}
        </div>
      )}
      
      {/* Card content */}
      <div
        ref={cardRef}
        className={`
          transform transition-transform duration-200 ease-out bg-white
          ${isDragging ? '' : 'transition-transform'}
          ${className}
        `}
        style={{ 
          transform: `translateX(${swipeOffset}px)`,
          transition: isDragging ? 'none' : 'transform 0.2s ease-out'
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {children}
      </div>
    </div>
  )
}