import { useEffect, useRef, useState, useCallback } from 'react'

/**
 * Custom hook for implementing pull-to-refresh gesture on mobile devices
 *
 * @param {Function} onRefresh - Callback function to execute when refresh is triggered
 * @param {Object} options - Configuration options
 * @param {number} options.threshold - Distance in pixels to trigger refresh (default: 80)
 * @param {number} options.resistance - Drag resistance factor (default: 2.5)
 * @param {boolean} options.enabled - Enable/disable pull-to-refresh (default: true)
 * @param {boolean} options.onlyMobile - Only enable on mobile devices (default: true)
 *
 * @returns {Object} Pull-to-refresh state and handlers
 */
export function usePullToRefresh(onRefresh, options = {}) {
  const {
    threshold = 80,
    resistance = 2.5,
    enabled = true,
    onlyMobile = true
  } = options

  const [isRefreshing, setIsRefreshing] = useState(false)
  const [pullDistance, setPullDistance] = useState(0)
  const [isPulling, setIsPulling] = useState(false)

  const touchStartY = useRef(0)
  const containerRef = useRef(null)
  const scrollableElement = useRef(null)

  // Determine if device is mobile
  const isMobile = typeof window !== 'undefined'
    ? window.matchMedia('(max-width: 767px)').matches
    : false

  // Check if pull-to-refresh should be active
  const isActive = enabled && (!onlyMobile || isMobile)

  /**
   * Check if the scrollable element is at the top
   */
  const isAtTop = useCallback(() => {
    if (!scrollableElement.current) return false
    return scrollableElement.current.scrollTop === 0
  }, [])

  /**
   * Handle touch start - capture initial Y position
   */
  const handleTouchStart = useCallback((e) => {
    if (!isActive || isRefreshing || !isAtTop()) return

    touchStartY.current = e.touches[0].clientY
  }, [isActive, isRefreshing, isAtTop])

  /**
   * Handle touch move - calculate pull distance with resistance
   */
  const handleTouchMove = useCallback((e) => {
    if (!isActive || isRefreshing || touchStartY.current === 0) return

    const touchY = e.touches[0].clientY
    const distance = touchY - touchStartY.current

    // Only handle downward pulls when at top
    if (distance > 0 && isAtTop()) {
      // Prevent default scroll behavior while pulling
      e.preventDefault()

      // Apply resistance formula: distance / (1 + distance / maxDistance)
      const resistedDistance = distance / resistance

      setPullDistance(resistedDistance)
      setIsPulling(true)
    }
  }, [isActive, isRefreshing, resistance, isAtTop])

  /**
   * Handle touch end - trigger refresh if threshold is met
   */
  const handleTouchEnd = useCallback(async () => {
    if (!isActive || !isPulling) return

    if (pullDistance >= threshold) {
      // Trigger refresh
      setIsRefreshing(true)

      try {
        await onRefresh()
      } catch (error) {
        console.error('Pull-to-refresh failed:', error)
      } finally {
        // Delay hiding the spinner for better UX (show success state)
        setTimeout(() => {
          setIsRefreshing(false)
        }, 500)
      }
    }

    // Reset pull state
    setPullDistance(0)
    setIsPulling(false)
    touchStartY.current = 0
  }, [isActive, isPulling, pullDistance, threshold, onRefresh])

  /**
   * Attach event listeners to container
   */
  useEffect(() => {
    const container = containerRef.current
    if (!container || !isActive) return

    // Find the scrollable element (FullCalendar scroller or container itself)
    const fcScroller = container.querySelector('.fc-scroller')
    const fcListView = container.querySelector('.fc-list')
    scrollableElement.current = fcScroller || fcListView || container

    // Add touch event listeners
    container.addEventListener('touchstart', handleTouchStart, { passive: true })
    container.addEventListener('touchmove', handleTouchMove, { passive: false })
    container.addEventListener('touchend', handleTouchEnd, { passive: true })

    return () => {
      container.removeEventListener('touchstart', handleTouchStart)
      container.removeEventListener('touchmove', handleTouchMove)
      container.removeEventListener('touchend', handleTouchEnd)
    }
  }, [isActive, handleTouchStart, handleTouchMove, handleTouchEnd])

  /**
   * Calculate progress percentage (0-100) for visual feedback
   */
  const progress = Math.min(100, (pullDistance / threshold) * 100)

  /**
   * Determine animation state for visual feedback
   */
  const getRefreshState = () => {
    if (isRefreshing) return 'refreshing'
    if (pullDistance >= threshold) return 'ready'
    if (isPulling) return 'pulling'
    return 'idle'
  }

  return {
    containerRef,
    isRefreshing,
    isPulling,
    pullDistance,
    progress,
    refreshState: getRefreshState(),
    isActive
  }
}

/**
 * PullToRefresh component wrapper that adds visual feedback
 *
 * Usage:
 * <PullToRefresh onRefresh={fetchData}>
 *   <YourContent />
 * </PullToRefresh>
 */
export function PullToRefreshIndicator({
  pullDistance,
  progress,
  refreshState,
  isActive
}) {
  if (!isActive) return null

  const getIndicatorContent = () => {
    switch (refreshState) {
      case 'refreshing':
        return (
          <>
            <svg
              className="animate-spin h-5 w-5 text-[#546355]"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            <span className="text-sm text-gray-600 mt-2">Refreshing...</span>
          </>
        )

      case 'ready':
        return (
          <>
            <svg
              className="h-5 w-5 text-green-500"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path d="M5 13l4 4L19 7" />
            </svg>
            <span className="text-sm text-green-600 mt-2">Release to refresh</span>
          </>
        )

      case 'pulling':
        return (
          <>
            <svg
              className="h-5 w-5 text-[#546355]"
              style={{ transform: `rotate(${progress * 3.6}deg)` }}
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <span className="text-sm text-gray-600 mt-2">Pull to refresh</span>
          </>
        )

      default:
        return null
    }
  }

  return (
    <div
      className="pull-to-refresh-indicator"
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: Math.min(pullDistance, 80),
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        opacity: pullDistance > 0 ? Math.min(1, pullDistance / 50) : 0,
        transition: refreshState === 'refreshing' ? 'opacity 0.3s ease' : 'none',
        pointerEvents: 'none',
        zIndex: 1000,
        background: 'linear-gradient(to bottom, rgba(255,255,255,0.95), rgba(255,255,255,0))',
      }}
    >
      {getIndicatorContent()}
    </div>
  )
}

export default usePullToRefresh
