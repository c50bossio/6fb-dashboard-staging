'use client'

import { useState, useEffect, useMemo } from 'react'

/**
 * Custom hook for responsive calendar behavior
 * Manages view defaults, dimensions, and touch settings based on screen size
 *
 * Breakpoints:
 * - Mobile Small: < 375px
 * - Mobile Standard: 375-767px
 * - Tablet: 768-1023px
 * - Desktop: 1024px+
 */
export function useResponsiveCalendar() {
  const [screenSize, setScreenSize] = useState('desktop')
  const [dimensions, setDimensions] = useState({
    width: typeof window !== 'undefined' ? window.innerWidth : 1024,
    height: typeof window !== 'undefined' ? window.innerHeight : 768,
  })

  useEffect(() => {
    // Initial detection
    const detectScreenSize = () => {
      const width = window.innerWidth
      const height = window.innerHeight

      setDimensions({ width, height })

      if (width < 375) {
        setScreenSize('mobile-small')
      } else if (width < 768) {
        setScreenSize('mobile')
      } else if (width < 1024) {
        setScreenSize('tablet')
      } else {
        setScreenSize('desktop')
      }
    }

    detectScreenSize()

    // Debounced resize handler
    let timeoutId
    const handleResize = () => {
      clearTimeout(timeoutId)
      timeoutId = setTimeout(detectScreenSize, 150)
    }

    window.addEventListener('resize', handleResize)
    return () => {
      clearTimeout(timeoutId)
      window.removeEventListener('resize', handleResize)
    }
  }, [])

  // Responsive configuration
  const config = useMemo(() => {
    const isMobile = screenSize === 'mobile' || screenSize === 'mobile-small'
    const isTablet = screenSize === 'tablet'
    const isDesktop = screenSize === 'desktop'
    const isSmallPhone = screenSize === 'mobile-small'

    return {
      // Screen detection
      screenSize,
      isMobile,
      isTablet,
      isDesktop,
      isSmallPhone,
      dimensions,

      // Default calendar view based on screen size
      defaultView: isMobile ? 'listWeek' : isTablet ? 'timeGridWeek' : 'resourceTimeGridDay',

      // Available views (hide resource views on mobile)
      availableViews: isMobile
        ? ['listWeek', 'timeGridDay', 'dayGridMonth']
        : isTablet
        ? ['timeGridWeek', 'timeGridDay', 'listWeek', 'dayGridMonth', 'resourceTimeGridDay']
        : ['resourceTimeGridDay', 'resourceTimeGridWeek', 'resourceTimelineWeek', 'timeGridWeek', 'listWeek'],

      // Header toolbar configuration
      headerToolbar: isMobile
        ? {
            left: 'prev,next',
            center: 'title',
            right: 'today',
          }
        : isTablet
        ? {
            left: 'prev,next today',
            center: 'title',
            right: 'timeGridDay,listWeek',
          }
        : {
            left: 'prev,next today',
            center: 'title',
            right: 'resourceTimeGridDay,resourceTimeGridWeek,resourceTimelineWeek,timeGridWeek,listWeek',
          },

      // Responsive height calculation
      height: isMobile
        ? `calc(${dimensions.height}px - 180px)` // Account for header (80px) + toolbar (60px) + padding (40px)
        : isTablet
        ? `calc(${dimensions.height}px - 140px)` // Account for header (60px) + toolbar (50px) + padding (30px)
        : '700px', // Desktop: keep fixed height

      // Content height for FullCalendar
      contentHeight: isMobile
        ? dimensions.height - 200
        : isTablet
        ? dimensions.height - 160
        : 600,

      // Touch interaction settings
      selectLongPressDelay: isMobile ? 300 : 250, // Longer delay on mobile for better accuracy
      eventDragMinDistance: isMobile ? 10 : 5, // Larger drag distance on mobile
      selectMinDistance: isMobile ? 5 : 0, // Prevent accidental selections

      // Event rendering
      eventMinHeight: isMobile ? 44 : isTablet ? 32 : 25, // 44px minimum touch target on mobile
      eventShortHeight: isMobile ? 48 : isTablet ? 36 : 35,
      dayMaxEvents: isMobile ? 2 : isTablet ? 3 : 3, // Fewer events visible on mobile

      // Slot configuration
      slotDuration: isMobile ? '00:30:00' : '00:30:00', // Keep 30min slots
      slotLabelInterval: isMobile ? '02:00:00' : '01:00:00', // 2-hour labels on mobile (less cluttered)

      // Resource area (barber columns)
      showResources: !isMobile, // Hide on mobile, show on tablet/desktop
      resourceAreaWidth: isTablet ? '120px' : '180px', // Narrower on tablet

      // Week view configuration
      weekViewDays: isSmallPhone ? 3 : isMobile ? 5 : 7, // 3-day view on small phones, 5 on standard phones

      // Typography
      fontSize: {
        base: isMobile ? '14px' : isTablet ? '15px' : '16px',
        labels: isMobile ? '12px' : isTablet ? '13px' : '14px',
        title: isMobile ? '18px' : isTablet ? '20px' : '24px',
      },

      // Modal/drawer behavior
      useBottomSheet: isMobile, // Bottom sheet on mobile, side drawer on tablet/desktop
      drawerWidth: isTablet ? '400px' : '448px', // Narrower drawer on tablet

      // Performance
      lazyFetching: true,
      progressiveEventRendering: true,

      // View-specific customizations
      views: {
        listWeek: {
          buttonText: isMobile ? 'List' : 'Agenda',
        },
        timeGridDay: {
          buttonText: isMobile ? 'Day' : 'Day',
        },
        timeGridWeek: {
          buttonText: isMobile ? 'Week' : 'Week',
          duration: { days: isSmallPhone ? 3 : isMobile ? 5 : 7 },
        },
        dayGridMonth: {
          buttonText: isMobile ? 'Month' : 'Month',
        },
        resourceTimeGridDay: {
          buttonText: isTablet ? 'Barbers' : 'Barber Day',
        },
        resourceTimeGridWeek: {
          buttonText: 'Barber Week',
        },
        resourceTimelineWeek: {
          buttonText: 'Timeline',
          slotDuration: isTablet ? '02:00:00' : '01:00:00', // 2-hour slots on tablet for readability
        },
      },
    }
  }, [screenSize, dimensions])

  return config
}

/**
 * Hook to manage view preference storage
 * Stores different preferences per device type
 */
export function useCalendarViewPreference(defaultView = 'timeGridDay') {
  const { screenSize } = useResponsiveCalendar()
  const [view, setView] = useState(defaultView)

  useEffect(() => {
    // Load preference from localStorage based on screen size
    const storageKey = `calendar-view-${screenSize}`
    const stored = localStorage.getItem(storageKey)

    if (stored) {
      setView(stored)
    }
  }, [screenSize])

  const saveView = (newView) => {
    setView(newView)
    const storageKey = `calendar-view-${screenSize}`
    localStorage.setItem(storageKey, newView)
  }

  return [view, saveView]
}

/**
 * Hook for detecting touch device
 */
export function useTouchDevice() {
  const [isTouch, setIsTouch] = useState(false)

  useEffect(() => {
    const checkTouch = () => {
      setIsTouch(
        'ontouchstart' in window ||
        navigator.maxTouchPoints > 0 ||
        navigator.msMaxTouchPoints > 0
      )
    }

    checkTouch()
  }, [])

  return isTouch
}

/**
 * Hook for detecting orientation changes
 */
export function useOrientation() {
  const [orientation, setOrientation] = useState('portrait')

  useEffect(() => {
    const handleOrientationChange = () => {
      if (window.innerHeight > window.innerWidth) {
        setOrientation('portrait')
      } else {
        setOrientation('landscape')
      }
    }

    handleOrientationChange()
    window.addEventListener('resize', handleOrientationChange)
    window.addEventListener('orientationchange', handleOrientationChange)

    return () => {
      window.removeEventListener('resize', handleOrientationChange)
      window.removeEventListener('orientationchange', handleOrientationChange)
    }
  }, [])

  return orientation
}
