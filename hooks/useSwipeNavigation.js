import { useEffect, useRef, useState, useCallback } from 'react'

/**
 * Custom hook for implementing swipe navigation (left/right gestures)
 *
 * @param {Function} onSwipeLeft - Callback when user swipes left (next)
 * @param {Function} onSwipeRight - Callback when user swipes right (previous)
 * @param {Object} options - Configuration options
 * @param {number} options.threshold - Minimum distance in pixels to trigger swipe (default: 50)
 * @param {number} options.velocityThreshold - Minimum velocity to trigger quick swipe (default: 0.3)
 * @param {number} options.maxVerticalDistance - Max vertical movement to still count as horizontal swipe (default: 100)
 * @param {boolean} options.enabled - Enable/disable swipe navigation (default: true)
 * @param {boolean} options.onlyMobile - Only enable on mobile devices (default: true)
 * @param {boolean} options.preventScroll - Prevent scroll during swipe (default: false)
 *
 * @returns {Object} Swipe navigation state and handlers
 */
export function useSwipeNavigation(onSwipeLeft, onSwipeRight, options = {}) {
  const {
    threshold = 50,
    velocityThreshold = 0.3,
    maxVerticalDistance = 100,
    enabled = true,
    onlyMobile = true,
    preventScroll = false
  } = options

  const [isSwiping, setIsSwiping] = useState(false)
  const [swipeDistance, setSwipeDistance] = useState(0)
  const [swipeDirection, setSwipeDirection] = useState(null) // 'left' | 'right' | null

  const touchStartX = useRef(0)
  const touchStartY = useRef(0)
  const touchStartTime = useRef(0)
  const containerRef = useRef(null)

  // Determine if device is mobile
  const isMobile = typeof window !== 'undefined'
    ? window.matchMedia('(max-width: 767px)').matches
    : false

  // Check if swipe navigation should be active
  const isActive = enabled && (!onlyMobile || isMobile)

  /**
   * Handle touch start - capture initial position and time
   */
  const handleTouchStart = useCallback((e) => {
    if (!isActive) return

    const touch = e.touches[0]
    touchStartX.current = touch.clientX
    touchStartY.current = touch.clientY
    touchStartTime.current = Date.now()
  }, [isActive])

  /**
   * Handle touch move - track swipe distance
   */
  const handleTouchMove = useCallback((e) => {
    if (!isActive || touchStartX.current === 0) return

    const touch = e.touches[0]
    const deltaX = touch.clientX - touchStartX.current
    const deltaY = touch.clientY - touchStartY.current

    // Check if this is primarily a horizontal swipe
    const isHorizontalSwipe = Math.abs(deltaX) > Math.abs(deltaY)

    // Only handle if it's a horizontal swipe
    if (isHorizontalSwipe && Math.abs(deltaY) < maxVerticalDistance) {
      // Prevent scroll if configured
      if (preventScroll) {
        e.preventDefault()
      }

      setIsSwiping(true)
      setSwipeDistance(deltaX)
      setSwipeDirection(deltaX > 0 ? 'right' : 'left')
    }
  }, [isActive, maxVerticalDistance, preventScroll])

  /**
   * Handle touch end - trigger navigation if threshold is met
   */
  const handleTouchEnd = useCallback(() => {
    if (!isActive || !isSwiping) return

    const distance = Math.abs(swipeDistance)
    const duration = Date.now() - touchStartTime.current
    const velocity = distance / duration // pixels per ms

    // Trigger swipe action if:
    // 1. Distance threshold is met, OR
    // 2. Velocity threshold is met (quick swipe)
    const shouldTrigger = distance >= threshold || velocity >= velocityThreshold

    if (shouldTrigger) {
      if (swipeDirection === 'left' && onSwipeLeft) {
        console.log('👈 [SWIPE] Left swipe detected - Next')
        onSwipeLeft()
      } else if (swipeDirection === 'right' && onSwipeRight) {
        console.log('👉 [SWIPE] Right swipe detected - Previous')
        onSwipeRight()
      }
    }

    // Reset swipe state
    setIsSwiping(false)
    setSwipeDistance(0)
    setSwipeDirection(null)
    touchStartX.current = 0
    touchStartY.current = 0
    touchStartTime.current = 0
  }, [isActive, isSwiping, swipeDistance, swipeDirection, threshold, velocityThreshold, onSwipeLeft, onSwipeRight])

  /**
   * Attach event listeners to container
   */
  useEffect(() => {
    const container = containerRef.current
    if (!container || !isActive) return

    // Add touch event listeners
    container.addEventListener('touchstart', handleTouchStart, { passive: true })
    container.addEventListener('touchmove', handleTouchMove, { passive: !preventScroll })
    container.addEventListener('touchend', handleTouchEnd, { passive: true })
    container.addEventListener('touchcancel', handleTouchEnd, { passive: true })

    return () => {
      container.removeEventListener('touchstart', handleTouchStart)
      container.removeEventListener('touchmove', handleTouchMove)
      container.removeEventListener('touchend', handleTouchEnd)
      container.removeEventListener('touchcancel', handleTouchEnd)
    }
  }, [isActive, handleTouchStart, handleTouchMove, handleTouchEnd, preventScroll])

  /**
   * Calculate visual feedback (transform) for swipe animation
   */
  const getSwipeTransform = () => {
    if (!isSwiping || swipeDistance === 0) return 'translateX(0)'

    // Apply resistance to make it feel more natural
    const resistance = 0.3
    const transformDistance = swipeDistance * resistance

    return `translateX(${transformDistance}px)`
  }

  /**
   * Get swipe progress as percentage (0-100)
   */
  const getSwipeProgress = () => {
    if (!isSwiping) return 0
    return Math.min(100, (Math.abs(swipeDistance) / threshold) * 100)
  }

  return {
    containerRef,
    isSwiping,
    swipeDistance,
    swipeDirection,
    swipeTransform: getSwipeTransform(),
    swipeProgress: getSwipeProgress(),
    isActive
  }
}

/**
 * SwipeNavigationIndicator component - shows visual feedback during swipe
 *
 * Usage:
 * <SwipeNavigationIndicator
 *   isSwiping={swipe.isSwiping}
 *   swipeDirection={swipe.swipeDirection}
 *   swipeProgress={swipe.swipeProgress}
 *   isActive={swipe.isActive}
 * />
 */
export function SwipeNavigationIndicator({
  isSwiping,
  swipeDirection,
  swipeProgress,
  isActive
}) {
  if (!isActive || !isSwiping) return null

  return (
    <>
      {/* Left indicator (swipe right to go to previous day) */}
      {swipeDirection === 'right' && (
        <div
          className="swipe-indicator swipe-indicator-left"
          style={{
            position: 'absolute',
            top: '50%',
            left: 0,
            transform: 'translateY(-50%)',
            opacity: Math.min(1, swipeProgress / 50),
            transition: 'opacity 0.1s ease',
            pointerEvents: 'none',
            zIndex: 1000,
            padding: '1rem'
          }}
        >
          <div className="flex items-center gap-2 bg-[#546355] text-white rounded-full px-4 py-2 shadow-lg">
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
            <span className="text-sm font-semibold">Previous</span>
          </div>
        </div>
      )}

      {/* Right indicator (swipe left to go to next day) */}
      {swipeDirection === 'left' && (
        <div
          className="swipe-indicator swipe-indicator-right"
          style={{
            position: 'absolute',
            top: '50%',
            right: 0,
            transform: 'translateY(-50%)',
            opacity: Math.min(1, swipeProgress / 50),
            transition: 'opacity 0.1s ease',
            pointerEvents: 'none',
            zIndex: 1000,
            padding: '1rem'
          }}
        >
          <div className="flex items-center gap-2 bg-[#546355] text-white rounded-full px-4 py-2 shadow-lg">
            <span className="text-sm font-semibold">Next</span>
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5l7 7-7 7"
              />
            </svg>
          </div>
        </div>
      )}
    </>
  )
}

export default useSwipeNavigation
