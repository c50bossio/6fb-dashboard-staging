import { useState, useEffect, useCallback, useMemo } from 'react';

/**
 * Comprehensive device detection hook for 6FB AI Agent System
 * 
 * Features:
 * - Mobile/Tablet/Desktop detection with Tailwind CSS breakpoints
 * - Touch device detection with edge case handling
 * - Performance optimized with debounced resize events
 * - Server-Side Safe for Next.js SSR
 * - Orientation change handling
 * - TypeScript compatible
 * 
 * Tailwind CSS Breakpoints:
 * - sm: 640px
 * - md: 768px (tablet start)
 * - lg: 1024px (desktop start)
 * - xl: 1280px
 * - 2xl: 1536px
 */

// Breakpoint constants aligned with Tailwind CSS
const BREAKPOINTS = {
  mobile: 768,      // < 768px (md breakpoint)
  tablet: 1024,     // 768px - 1024px (md to lg)
  desktop: 1024     // >= 1024px (lg breakpoint)
};

// Device type enumeration
const DEVICE_TYPES = {
  MOBILE: 'mobile',
  TABLET: 'tablet',
  DESKTOP: 'desktop'
};

// Debounce utility for performance optimization
const debounce = (func, wait) => {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};

// Server-safe window detection
const isClient = typeof window !== 'undefined';

// User agent analysis for device detection
const analyzeUserAgent = () => {
  if (!isClient) return { isMobile: false, isTablet: false, isTouch: false };

  const userAgent = navigator.userAgent.toLowerCase();
  
  // Mobile device patterns
  const mobilePatterns = [
    /android/i,
    /webos/i,
    /iphone/i,
    /ipod/i,
    /blackberry/i,
    /windows phone/i
  ];

  // Tablet device patterns
  const tabletPatterns = [
    /ipad/i,
    /android(?!.*mobile)/i,
    /tablet/i
  ];

  const isMobile = mobilePatterns.some(pattern => pattern.test(userAgent));
  const isTablet = tabletPatterns.some(pattern => pattern.test(userAgent));
  
  // Touch capability detection
  const isTouch = isClient && (
    'ontouchstart' in window ||
    navigator.maxTouchPoints > 0 ||
    navigator.msMaxTouchPoints > 0
  );

  return { isMobile, isTablet, isTouch };
};

// Get viewport dimensions safely
const getViewportDimensions = () => {
  if (!isClient) return { width: 1024, height: 768 }; // SSR fallback
  
  return {
    width: window.innerWidth,
    height: window.innerHeight
  };
};

// Determine device type based on screen size
const getDeviceType = (width) => {
  if (width < BREAKPOINTS.mobile) return DEVICE_TYPES.MOBILE;
  if (width < BREAKPOINTS.tablet) return DEVICE_TYPES.TABLET;
  return DEVICE_TYPES.DESKTOP;
};

// Get orientation
const getOrientation = () => {
  if (!isClient) return 'landscape'; // SSR fallback
  
  return window.innerHeight > window.innerWidth ? 'portrait' : 'landscape';
};

/**
 * useDeviceDetection Hook
 * 
 * @returns {Object} Device detection information
 */
export const useDeviceDetection = () => {
  // Initialize with server-safe defaults
  const [dimensions, setDimensions] = useState(() => getViewportDimensions());
  const [orientation, setOrientation] = useState(() => getOrientation());
  const [userAgentData, setUserAgentData] = useState(() => analyzeUserAgent());
  const [isHydrated, setIsHydrated] = useState(false);

  // Debounced resize handler for performance
  const handleResize = useCallback(
    debounce(() => {
      const newDimensions = getViewportDimensions();
      const newOrientation = getOrientation();
      
      setDimensions(newDimensions);
      setOrientation(newOrientation);
    }, 150), // 150ms debounce for smooth performance
    []
  );

  // Orientation change handler
  const handleOrientationChange = useCallback(() => {
    // Delay to ensure dimensions are updated after orientation change
    setTimeout(() => {
      const newDimensions = getViewportDimensions();
      const newOrientation = getOrientation();
      
      setDimensions(newDimensions);
      setOrientation(newOrientation);
    }, 100);
  }, []);

  // Effect for client-side hydration and event listeners
  useEffect(() => {
    if (!isClient) return;

    // Mark as hydrated to prevent SSR mismatch
    setIsHydrated(true);

    // Update with actual client values
    setDimensions(getViewportDimensions());
    setOrientation(getOrientation());
    setUserAgentData(analyzeUserAgent());

    // Add event listeners
    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleOrientationChange);

    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleOrientationChange);
    };
  }, [handleResize, handleOrientationChange]);

  // Memoized device detection results
  const deviceInfo = useMemo(() => {
    const { width, height } = dimensions;
    const deviceType = getDeviceType(width);
    
    // Screen size based detection
    const isMobileSize = width < BREAKPOINTS.mobile;
    const isTabletSize = width >= BREAKPOINTS.mobile && width < BREAKPOINTS.tablet;
    const isDesktopSize = width >= BREAKPOINTS.desktop;
    
    // Combined detection (size + user agent)
    const isMobile = isMobileSize || (userAgentData.isMobile && !userAgentData.isTablet);
    const isTablet = isTabletSize || userAgentData.isTablet;
    const isDesktop = isDesktopSize && !userAgentData.isMobile && !userAgentData.isTablet;
    
    // Touch device detection with edge cases
    const isTouchDevice = userAgentData.isTouch;
    const isTouchDesktop = isTouchDevice && isDesktopSize;
    
    // Responsive breakpoint flags (Tailwind CSS compatible)
    const breakpoints = {
      xs: width < 640,      // Extra small
      sm: width >= 640,     // Small and up
      md: width >= 768,     // Medium and up
      lg: width >= 1024,    // Large and up
      xl: width >= 1280,    // Extra large and up
      '2xl': width >= 1536  // 2x Extra large and up
    };
    
    // Device-specific optimization flags
    const optimizations = {
      shouldUseVirtualScrolling: isMobile || isTablet,
      shouldLazyLoadImages: isMobile || (isTablet && orientation === 'portrait'),
      shouldUseReducedMotion: isMobile && width < 480,
      shouldOptimizeTouch: isTouchDevice,
      shouldShowMobileMenu: isMobile,
      shouldUseSwipeGestures: isTouchDevice && (isMobile || isTablet)
    };
    
    return {
      // Core device type
      deviceType,
      
      // Device category flags
      isMobile,
      isTablet,
      isDesktop,
      
      // Screen size flags
      isMobileSize,
      isTabletSize,
      isDesktopSize,
      
      // Touch capabilities
      isTouchDevice,
      isTouchDesktop,
      hasTouch: isTouchDevice,
      
      // Dimensions and orientation
      width,
      height,
      orientation,
      isPortrait: orientation === 'portrait',
      isLandscape: orientation === 'landscape',
      
      // Responsive breakpoints
      breakpoints,
      
      // Convenience flags for common breakpoints
      isXs: breakpoints.xs,
      isSm: breakpoints.sm,
      isMd: breakpoints.md,
      isLg: breakpoints.lg,
      isXl: breakpoints.xl,
      is2Xl: breakpoints['2xl'],
      
      // Performance optimization flags
      optimizations,
      
      // SSR hydration status
      isHydrated,
      
      // Raw user agent data
      userAgent: userAgentData
    };
  }, [dimensions, orientation, userAgentData, isHydrated]);

  return deviceInfo;
};

// Named exports for convenience
export const useIsMobile = () => {
  const { isMobile } = useDeviceDetection();
  return isMobile;
};

export const useIsTablet = () => {
  const { isTablet } = useDeviceDetection();
  return isTablet;
};

export const useIsDesktop = () => {
  const { isDesktop } = useDeviceDetection();
  return isDesktop;
};

export const useIsTouchDevice = () => {
  const { isTouchDevice } = useDeviceDetection();
  return isTouchDevice;
};

export const useBreakpoint = () => {
  const { breakpoints } = useDeviceDetection();
  return breakpoints;
};

export const useOrientation = () => {
  const { orientation, isPortrait, isLandscape } = useDeviceDetection();
  return { orientation, isPortrait, isLandscape };
};

// Default export
export default useDeviceDetection;

// TypeScript type definitions (for JSDoc support)
/**
 * @typedef {Object} DeviceInfo
 * @property {string} deviceType - 'mobile' | 'tablet' | 'desktop'
 * @property {boolean} isMobile - True if mobile device
 * @property {boolean} isTablet - True if tablet device
 * @property {boolean} isDesktop - True if desktop device
 * @property {boolean} isMobileSize - True if screen < 768px
 * @property {boolean} isTabletSize - True if screen 768px-1024px
 * @property {boolean} isDesktopSize - True if screen >= 1024px
 * @property {boolean} isTouchDevice - True if touch capable
 * @property {boolean} isTouchDesktop - True if touch desktop
 * @property {boolean} hasTouch - Alias for isTouchDevice
 * @property {number} width - Viewport width
 * @property {number} height - Viewport height
 * @property {string} orientation - 'portrait' | 'landscape'
 * @property {boolean} isPortrait - True if portrait orientation
 * @property {boolean} isLandscape - True if landscape orientation
 * @property {Object} breakpoints - Tailwind CSS breakpoint flags
 * @property {boolean} isXs - Extra small breakpoint
 * @property {boolean} isSm - Small breakpoint
 * @property {boolean} isMd - Medium breakpoint
 * @property {boolean} isLg - Large breakpoint
 * @property {boolean} isXl - Extra large breakpoint
 * @property {boolean} is2Xl - 2x Extra large breakpoint
 * @property {Object} optimizations - Device-specific optimization flags
 * @property {boolean} isHydrated - SSR hydration status
 * @property {Object} userAgent - Raw user agent analysis
 */

// Usage examples for JSDoc documentation
/**
 * Usage Examples:
 * 
 * Basic usage:
 * ```javascript
 * import { useDeviceDetection } from '@/hooks/useDeviceDetection';
 * 
 * function MyComponent() {
 *   const { isMobile, isTablet, isDesktop, orientation } = useDeviceDetection();
 *   
 *   return (
 *     <div>
 *       {isMobile && <MobileLayout />}
 *       {isTablet && <TabletLayout />}
 *       {isDesktop && <DesktopLayout />}
 *     </div>
 *   );
 * }
 * ```
 * 
 * Responsive design with Tailwind breakpoints:
 * ```javascript
 * function ResponsiveComponent() {
 *   const { breakpoints, optimizations } = useDeviceDetection();
 *   
 *   return (
 *     <div className={`
 *       ${breakpoints.sm ? 'grid-cols-2' : 'grid-cols-1'}
 *       ${breakpoints.lg ? 'grid-cols-3' : ''}
 *     `}>
 *       {optimizations.shouldUseVirtualScrolling && <VirtualList />}
 *     </div>
 *   );
 * }
 * ```
 * 
 * Convenience hooks:
 * ```javascript
 * import { useIsMobile, useIsTablet, useBreakpoint } from '@/hooks/useDeviceDetection';
 * 
 * function SimpleComponent() {
 *   const isMobile = useIsMobile();
 *   const breakpoints = useBreakpoint();
 *   
 *   return isMobile ? <MobileView /> : <DesktopView />;
 * }
 * ```
 */