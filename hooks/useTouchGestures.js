/**
 * Custom hook for mobile touch gestures
 * Handles swipe, pinch, and long press gestures
 */

import { useEffect, useRef, useState, useCallback } from 'react'

export function useTouchGestures(options = {}) {
  const {
    onSwipeLeft,
    onSwipeRight,
    onSwipeUp,
    onSwipeDown,
    onPinchZoom,
    onLongPress,
    swipeThreshold = 50,
    longPressDelay = 500,
    preventDefault = true
  } = options

  const [touchStart, setTouchStart] = useState(null)
  const [touchEnd, setTouchEnd] = useState(null)
  const [isPinching, setIsPinching] = useState(false)
  const [initialPinchDistance, setInitialPinchDistance] = useState(null)
  const longPressTimer = useRef(null)
  const elementRef = useRef(null)

  // Calculate distance between two touch points
  const getDistance = (touch1, touch2) => {
    const dx = touch1.clientX - touch2.clientX
    const dy = touch1.clientY - touch2.clientY
    return Math.sqrt(dx * dx + dy * dy)
  }

  // Handle touch start
  const handleTouchStart = useCallback((e) => {
    if (preventDefault) e.preventDefault()

    // Handle pinch gesture start
    if (e.touches.length === 2) {
      setIsPinching(true)
      const distance = getDistance(e.touches[0], e.touches[1])
      setInitialPinchDistance(distance)
      return
    }

    // Single touch
    setTouchStart({
      x: e.touches[0].clientX,
      y: e.touches[0].clientY,
      time: Date.now()
    })

    // Start long press timer
    if (onLongPress) {
      longPressTimer.current = setTimeout(() => {
        onLongPress(e)
      }, longPressDelay)
    }
  }, [onLongPress, longPressDelay, preventDefault])

  // Handle touch move
  const handleTouchMove = useCallback((e) => {
    if (preventDefault) e.preventDefault()

    // Handle pinch zoom
    if (isPinching && e.touches.length === 2 && initialPinchDistance) {
      const currentDistance = getDistance(e.touches[0], e.touches[1])
      const scale = currentDistance / initialPinchDistance
      
      if (onPinchZoom) {
        onPinchZoom(scale)
      }
      return
    }

    // Cancel long press on move
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current)
      longPressTimer.current = null
    }

    setTouchEnd({
      x: e.touches[0].clientX,
      y: e.touches[0].clientY
    })
  }, [isPinching, initialPinchDistance, onPinchZoom, preventDefault])

  // Handle touch end
  const handleTouchEnd = useCallback((e) => {
    if (preventDefault) e.preventDefault()

    // Reset pinch
    if (isPinching) {
      setIsPinching(false)
      setInitialPinchDistance(null)
      return
    }

    // Clear long press timer
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current)
      longPressTimer.current = null
    }

    if (!touchStart || !touchEnd) return

    // Calculate swipe distance and direction
    const deltaX = touchEnd.x - touchStart.x
    const deltaY = touchEnd.y - touchStart.y
    const absDeltaX = Math.abs(deltaX)
    const absDeltaY = Math.abs(deltaY)
    const timeDiff = Date.now() - touchStart.time

    // Check if it's a swipe (not too slow)
    if (timeDiff < 1000) {
      // Horizontal swipe
      if (absDeltaX > absDeltaY && absDeltaX > swipeThreshold) {
        if (deltaX > 0 && onSwipeRight) {
          onSwipeRight()
        } else if (deltaX < 0 && onSwipeLeft) {
          onSwipeLeft()
        }
      }
      
      // Vertical swipe
      else if (absDeltaY > absDeltaX && absDeltaY > swipeThreshold) {
        if (deltaY > 0 && onSwipeDown) {
          onSwipeDown()
        } else if (deltaY < 0 && onSwipeUp) {
          onSwipeUp()
        }
      }
    }

    // Reset
    setTouchStart(null)
    setTouchEnd(null)
  }, [
    touchStart,
    touchEnd,
    isPinching,
    swipeThreshold,
    onSwipeLeft,
    onSwipeRight,
    onSwipeUp,
    onSwipeDown,
    preventDefault
  ])

  // Attach event listeners
  useEffect(() => {
    const element = elementRef.current
    if (!element) return

    element.addEventListener('touchstart', handleTouchStart, { passive: !preventDefault })
    element.addEventListener('touchmove', handleTouchMove, { passive: !preventDefault })
    element.addEventListener('touchend', handleTouchEnd, { passive: !preventDefault })

    return () => {
      element.removeEventListener('touchstart', handleTouchStart)
      element.removeEventListener('touchmove', handleTouchMove)
      element.removeEventListener('touchend', handleTouchEnd)
      
      if (longPressTimer.current) {
        clearTimeout(longPressTimer.current)
      }
    }
  }, [handleTouchStart, handleTouchMove, handleTouchEnd, preventDefault])

  return elementRef
}

// Hook for pull-to-refresh
export function usePullToRefresh(onRefresh, options = {}) {
  const { threshold = 100, resistance = 2.5 } = options
  const [isPulling, setIsPulling] = useState(false)
  const [pullDistance, setPullDistance] = useState(0)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const startY = useRef(0)

  useEffect(() => {
    let element = document.body

    const handleTouchStart = (e) => {
      if (window.scrollY === 0) {
        startY.current = e.touches[0].clientY
        setIsPulling(true)
      }
    }

    const handleTouchMove = (e) => {
      if (!isPulling || isRefreshing) return

      const currentY = e.touches[0].clientY
      const diff = currentY - startY.current

      if (diff > 0) {
        e.preventDefault()
        setPullDistance(Math.min(diff / resistance, threshold * 1.5))
      }
    }

    const handleTouchEnd = async () => {
      if (!isPulling) return

      setIsPulling(false)

      if (pullDistance > threshold && onRefresh) {
        setIsRefreshing(true)
        await onRefresh()
        setIsRefreshing(false)
      }

      setPullDistance(0)
    }

    element.addEventListener('touchstart', handleTouchStart, { passive: true })
    element.addEventListener('touchmove', handleTouchMove, { passive: false })
    element.addEventListener('touchend', handleTouchEnd, { passive: true })

    return () => {
      element.removeEventListener('touchstart', handleTouchStart)
      element.removeEventListener('touchmove', handleTouchMove)
      element.removeEventListener('touchend', handleTouchEnd)
    }
  }, [isPulling, pullDistance, isRefreshing, onRefresh, threshold, resistance])

  return {
    isPulling,
    pullDistance,
    isRefreshing
  }
}

// Hook for detecting mobile viewport
export function useMobileViewport() {
  const [viewport, setViewport] = useState({
    width: typeof window !== 'undefined' ? window.innerWidth : 0,
    height: typeof window !== 'undefined' ? window.innerHeight : 0,
    isMobile: typeof window !== 'undefined' ? window.innerWidth < 768 : false,
    isTablet: typeof window !== 'undefined' ? window.innerWidth >= 768 && window.innerWidth < 1024 : false,
    isDesktop: typeof window !== 'undefined' ? window.innerWidth >= 1024 : false,
    orientation: typeof window !== 'undefined' ? 
      (window.innerWidth > window.innerHeight ? 'landscape' : 'portrait') : 'portrait'
  })

  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth
      const height = window.innerHeight

      setViewport({
        width,
        height,
        isMobile: width < 768,
        isTablet: width >= 768 && width < 1024,
        isDesktop: width >= 1024,
        orientation: width > height ? 'landscape' : 'portrait'
      })
    }

    window.addEventListener('resize', handleResize)
    window.addEventListener('orientationchange', handleResize)

    // Initial call
    handleResize()

    return () => {
      window.removeEventListener('resize', handleResize)
      window.removeEventListener('orientationchange', handleResize)
    }
  }, [])

  return viewport
}