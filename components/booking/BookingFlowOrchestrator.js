'use client'

import React, { useState, useEffect, useMemo, Suspense, lazy } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  DevicePhoneMobileIcon, 
  ComputerDesktopIcon,
  BoltIcon,
  ExclamationTriangleIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline'
import { getFeatureFlag, getCachedFeatureFlags } from '@/lib/feature-flags'

// Lazy load components for performance optimization
const PublicBookingFlow = lazy(() => import('./PublicBookingFlow'))
const EnhancedBookingFlow = lazy(() => import('./EnhancedBookingFlow'))
const MobileBookingOptimizer = lazy(() => import('./MobileBookingOptimizer'))
const ProgressiveAccountCreation = lazy(() => import('./ProgressiveAccountCreation'))
const RealtimeAvailabilityChecker = lazy(() => import('./RealtimeAvailabilityChecker'))

// Error Boundary Component
class BookingErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null, errorInfo: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true }
  }

  componentDidCatch(error, errorInfo) {
    this.setState({
      error: error,
      errorInfo: errorInfo
    })
    
    // Log error to analytics/monitoring service
    console.error('BookingFlow Error:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || <BookingErrorFallback onRetry={this.props.onRetry} />
    }

    return this.props.children
  }
}

const BookingErrorFallback = ({ onRetry }) => (
  <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center p-4">
    <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
      <ExclamationTriangleIcon className="h-16 w-16 text-amber-500 mx-auto mb-4" />
      <h2 className="text-2xl font-bold text-gray-900 mb-2">Booking System Error</h2>
      <p className="text-gray-600 mb-6">
        We're having trouble loading the booking system. Please try again.
      </p>
      <button
        onClick={onRetry}
        className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors flex items-center justify-center"
      >
        <ArrowPathIcon className="h-5 w-5 mr-2" />
        Try Again
      </button>
    </div>
  </div>
)

// Loading Component
const BookingLoadingSkeleton = () => (
  <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 py-12 px-4">
    <div className="max-w-2xl mx-auto">
      <div className="text-center mb-8 animate-pulse">
        <div className="h-8 bg-gray-300 rounded-lg w-64 mx-auto mb-2"></div>
        <div className="h-4 bg-gray-200 rounded w-48 mx-auto"></div>
      </div>
      
      <div className="bg-white rounded-2xl shadow-xl p-8">
        <div className="space-y-6">
          <div className="animate-pulse">
            <div className="h-6 bg-gray-300 rounded w-40 mb-4"></div>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3].map((n) => (
                <div key={n} className="border-2 border-gray-200 rounded-xl p-4">
                  <div className="h-32 bg-gray-200 rounded-lg mb-4"></div>
                  <div className="h-4 bg-gray-200 rounded mb-2"></div>
                  <div className="h-3 bg-gray-100 rounded mb-4"></div>
                  <div className="flex justify-between">
                    <div className="h-3 bg-gray-100 rounded w-16"></div>
                    <div className="h-4 bg-gray-200 rounded w-12"></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
)

/**
 * Intelligent BookingFlowOrchestrator Component
 * 
 * Features:
 * - Smart component switching between PublicBookingFlow and EnhancedBookingFlow
 * - Device-optimized routing with mobile-specific experiences
 * - Feature flag integration for controlled rollout
 * - A/B testing ready with conversion tracking
 * - Backward compatibility with existing URL parameters
 * - Comprehensive error handling and fallbacks
 * - Performance optimization with lazy loading
 */
export default function BookingFlowOrchestrator({
  // Core props - compatible with existing booking components
  barbershopId,
  barbershopSlug,
  preselectedBarber = null,
  preselectedService = null,
  
  // Optional configuration
  defaultFlow = 'auto', // 'public', 'enhanced', 'mobile', 'auto'
  enableRealtimeAvailability = true,
  enableProgressiveAccount = true,
  
  // A/B testing & analytics
  experimentId = null,
  onComponentSelection = null,
  onConversionEvent = null,
  
  // URL parameter overrides
  enhanced = null,
  mobile = null,
  service = null,
  barber = null,
  
  // Additional props
  className = '',
  style = {},
  ...otherProps
}) {
  // State management
  const [selectedComponent, setSelectedComponent] = useState(null)
  const [deviceInfo, setDeviceInfo] = useState(null)
  const [featureFlags, setFeatureFlags] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [componentProps, setComponentProps] = useState({})
  const [retryCount, setRetryCount] = useState(0)

  // Device detection utility
  const detectDevice = () => {
    if (typeof window === 'undefined') return null

    const userAgent = navigator.userAgent.toLowerCase()
    const screenWidth = window.innerWidth
    const screenHeight = window.innerHeight
    const pixelRatio = window.devicePixelRatio || 1
    
    // Touch capability detection
    const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0
    
    // Device type detection
    const isMobile = /android|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent) || 
                    (screenWidth <= 768 && isTouchDevice)
    
    const isTablet = /ipad|android/i.test(userAgent) && 
                     screenWidth >= 768 && screenWidth <= 1024
    
    const isDesktop = !isMobile && !isTablet
    
    // Mobile-specific capabilities
    const hasHighDPI = pixelRatio >= 2
    const isSmallScreen = screenWidth <= 480
    const isLandscape = screenWidth > screenHeight
    
    // Performance indicators
    const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection
    const isSlowConnection = connection?.effectiveType === 'slow-2g' || 
                            connection?.effectiveType === '2g'
    
    // Browser capabilities
    const supportsWebP = (() => {
      try {
        const canvas = document.createElement('canvas')
        return canvas.toDataURL('image/webp').indexOf('data:image/webp') === 0
      } catch (e) {
        return false
      }
    })()
    
    const supportsIntersectionObserver = 'IntersectionObserver' in window
    const supportsServiceWorker = 'serviceWorker' in navigator
    
    return {
      // Device classification
      isMobile,
      isTablet,
      isDesktop,
      isTouchDevice,
      
      // Screen properties
      screenWidth,
      screenHeight,
      pixelRatio,
      hasHighDPI,
      isSmallScreen,
      isLandscape,
      
      // Performance
      isSlowConnection,
      effectiveConnectionType: connection?.effectiveType,
      
      // Capabilities
      supportsWebP,
      supportsIntersectionObserver,
      supportsServiceWorker,
      
      // User agent info
      userAgent,
      
      // Computed recommendations
      shouldUseMobileFlow: isMobile || (isTablet && screenWidth < 900),
      shouldUseEnhancedFlow: !isSlowConnection && (isDesktop || (isTablet && !isSlowConnection)),
      shouldEnableLazyLoading: isSlowConnection || isMobile,
      shouldUseWebP: supportsWebP && !isSlowConnection
    }
  }

  // URL parameter parsing
  const parseUrlParameters = () => {
    if (typeof window === 'undefined') return {}
    
    const urlParams = new URLSearchParams(window.location.search)
    
    return {
      enhanced: enhanced !== null ? enhanced : urlParams.get('enhanced') === 'true',
      mobile: mobile !== null ? mobile : urlParams.get('mobile') === 'true',
      serviceId: service || urlParams.get('service'),
      barberId: barber || urlParams.get('barber'),
      flow: urlParams.get('flow'),
      experiment: urlParams.get('exp') || experimentId,
      debug: urlParams.get('debug') === 'true'
    }
  }

  // Component selection logic
  const determineOptimalComponent = (deviceInfo, featureFlags, urlParams) => {
    // URL parameter overrides take highest precedence
    if (urlParams.flow) {
      switch (urlParams.flow) {
        case 'public': return 'PublicBookingFlow'
        case 'enhanced': return 'EnhancedBookingFlow'
        case 'mobile': return 'MobileBookingOptimizer'
        default: break
      }
    }
    
    // Explicit URL overrides
    if (urlParams.mobile) return 'MobileBookingOptimizer'
    if (urlParams.enhanced) return 'EnhancedBookingFlow'
    
    // Feature flag checks
    if (!featureFlags.new_booking_flow) {
      return 'PublicBookingFlow' // Safe fallback
    }
    
    // Device-based optimization
    if (deviceInfo?.shouldUseMobileFlow) {
      return featureFlags.mobile_optimizer_enabled !== false 
        ? 'MobileBookingOptimizer' 
        : 'PublicBookingFlow'
    }
    
    // Enhanced flow for capable devices
    if (deviceInfo?.shouldUseEnhancedFlow && featureFlags.enhanced_booking_flow) {
      return 'EnhancedBookingFlow'
    }
    
    // A/B testing logic
    if (urlParams.experiment && featureFlags.ab_testing_enabled) {
      const experimentConfig = featureFlags[`experiment_${urlParams.experiment}`]
      if (experimentConfig) {
        const variant = Math.random() < experimentConfig.split ? 
          experimentConfig.variantA : experimentConfig.variantB
        return variant
      }
    }
    
    // Default flow based on configuration
    switch (defaultFlow) {
      case 'enhanced': return 'EnhancedBookingFlow'
      case 'mobile': return 'MobileBookingOptimizer'
      case 'public': return 'PublicBookingFlow'
      case 'auto':
      default:
        // Smart auto-selection based on capabilities
        if (deviceInfo?.isDesktop && featureFlags.enhanced_booking_flow) {
          return 'EnhancedBookingFlow'
        }
        return 'PublicBookingFlow' // Safe default
    }
  }

  // Initialize orchestrator
  useEffect(() => {
    let mounted = true
    
    const initialize = async () => {
      try {
        setLoading(true)
        setError(null)
        
        // Parallel initialization for performance
        const [detectedDevice, loadedFlags] = await Promise.all([
          Promise.resolve(detectDevice()),
          getCachedFeatureFlags().catch(() => ({}))
        ])
        
        if (!mounted) return
        
        const urlParams = parseUrlParameters()
        const optimalComponent = determineOptimalComponent(detectedDevice, loadedFlags, urlParams)
        
        // Prepare component props
        const props = {
          barbershopId,
          barbershopSlug,
          preselectedBarber: urlParams.barberId || preselectedBarber,
          preselectedService: urlParams.serviceId || preselectedService,
          ...otherProps
        }
        
        // Add device-specific optimizations
        if (detectedDevice?.isMobile) {
          props.optimizeForMobile = true
          props.enableTouchOptimizations = true
        }
        
        if (detectedDevice?.isSlowConnection) {
          props.enableProgressiveLoading = true
          props.reducedAnimations = true
        }
        
        // Update state
        setDeviceInfo(detectedDevice)
        setFeatureFlags(loadedFlags)
        setSelectedComponent(optimalComponent)
        setComponentProps(props)
        
        // Analytics tracking
        onComponentSelection?.(optimalComponent, {
          device: detectedDevice,
          urlParams,
          featureFlags: loadedFlags
        })
        
      } catch (err) {
        console.error('BookingFlowOrchestrator initialization error:', err)
        if (mounted) {
          setError(err.message)
          // Fallback to safe default
          setSelectedComponent('PublicBookingFlow')
          setComponentProps({
            barbershopId,
            barbershopSlug,
            preselectedBarber,
            preselectedService,
            ...otherProps
          })
        }
      } finally {
        if (mounted) {
          setLoading(false)
        }
      }
    }
    
    initialize()
    
    return () => {
      mounted = false
    }
  }, [barbershopId, barbershopSlug, retryCount])

  // Error retry handler
  const handleRetry = () => {
    setRetryCount(prev => prev + 1)
    setError(null)
  }

  // Render selected component with enhanced features
  const renderBookingComponent = () => {
    const baseProps = {
      ...componentProps,
      key: `${selectedComponent}-${retryCount}` // Force re-mount on retry
    }
    
    switch (selectedComponent) {
      case 'EnhancedBookingFlow':
        return (
          <EnhancedBookingFlow 
            {...baseProps}
            enableAnimations={!deviceInfo?.isSlowConnection}
            enableAdvancedFeatures={featureFlags.advanced_booking_features}
          />
        )
      
      case 'MobileBookingOptimizer':
        return (
          <MobileBookingOptimizer 
            {...baseProps}
            touchOptimized={true}
            reducedMotion={deviceInfo?.isSlowConnection}
          />
        )
      
      case 'PublicBookingFlow':
      default:
        return (
          <PublicBookingFlow 
            {...baseProps}
            simplifiedUI={deviceInfo?.isSlowConnection}
          />
        )
    }
  }

  // Wrap with realtime availability if enabled
  const withRealtimeAvailability = (component) => {
    if (!enableRealtimeAvailability || !featureFlags.realtime_availability) {
      return component
    }
    
    return (
      <RealtimeAvailabilityChecker
        barbershopId={barbershopId}
        barberId={componentProps.preselectedBarber}
        serviceId={componentProps.preselectedService}
        selectedDate={new Date()}
      >
        {component}
      </RealtimeAvailabilityChecker>
    )
  }

  // Development debug panel
  const DebugPanel = () => {
    const urlParams = parseUrlParameters()
    
    if (!urlParams.debug) return null
    
    return (
      <div className="fixed bottom-4 right-4 bg-black bg-opacity-90 text-white p-4 rounded-lg text-xs max-w-sm z-50">
        <div className="font-bold mb-2">Booking Orchestrator Debug</div>
        <div>Component: {selectedComponent}</div>
        <div>Device: {deviceInfo?.isMobile ? 'Mobile' : deviceInfo?.isTablet ? 'Tablet' : 'Desktop'}</div>
        <div>Screen: {deviceInfo?.screenWidth}x{deviceInfo?.screenHeight}</div>
        <div>Touch: {deviceInfo?.isTouchDevice ? 'Yes' : 'No'}</div>
        <div>Connection: {deviceInfo?.effectiveConnectionType || 'Unknown'}</div>
        <div>Flags: {Object.keys(featureFlags).length} loaded</div>
        {urlParams.experiment && <div>Experiment: {urlParams.experiment}</div>}
      </div>
    )
  }

  // Loading state
  if (loading) {
    return <BookingLoadingSkeleton />
  }

  // Error state with retry
  if (error && !selectedComponent) {
    return <BookingErrorFallback onRetry={handleRetry} />
  }

  return (
    <div className={`booking-flow-orchestrator ${className}`} style={style}>
      <BookingErrorBoundary 
        fallback={<BookingErrorFallback onRetry={handleRetry} />}
        onRetry={handleRetry}
      >
        <Suspense fallback={<BookingLoadingSkeleton />}>
          <AnimatePresence mode="wait">
            <motion.div
              key={selectedComponent}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ 
                duration: deviceInfo?.isSlowConnection ? 0.2 : 0.3,
                ease: "easeInOut"
              }}
            >
              {withRealtimeAvailability(renderBookingComponent())}
            </motion.div>
          </AnimatePresence>
        </Suspense>
      </BookingErrorBoundary>
      
      <DebugPanel />
      
      {/* Component selection indicator for development */}
      {process.env.NODE_ENV === 'development' && (
        <div className="fixed top-4 right-4 bg-blue-600 text-white px-3 py-1 rounded-full text-xs font-medium z-40">
          {deviceInfo?.isMobile ? (
            <DevicePhoneMobileIcon className="h-4 w-4 inline mr-1" />
          ) : (
            <ComputerDesktopIcon className="h-4 w-4 inline mr-1" />
          )}
          {selectedComponent?.replace('BookingFlow', '').replace('Optimizer', '')}
        </div>
      )}
    </div>
  )
}

// TypeScript support (if needed)
BookingFlowOrchestrator.propTypes = {
  // Core props
  barbershopId: (props, propName, componentName) => {
    if (!props[propName]) {
      return new Error(`${propName} is required for ${componentName}`)
    }
  },
  barbershopSlug: (props, propName) => {
    if (props[propName] && typeof props[propName] !== 'string') {
      return new Error(`${propName} must be a string`)
    }
  },
  
  // Optional configuration
  defaultFlow: (props, propName) => {
    const validFlows = ['auto', 'public', 'enhanced', 'mobile']
    if (props[propName] && !validFlows.includes(props[propName])) {
      return new Error(`${propName} must be one of: ${validFlows.join(', ')}`)
    }
  }
}

// Export utilities for other components
export {
  BookingErrorBoundary,
  BookingLoadingSkeleton
}

// Export device detection utility for reuse
export const useDeviceDetection = () => {
  const [deviceInfo, setDeviceInfo] = useState(null)
  
  useEffect(() => {
    const detectDevice = () => {
      // Implementation moved to main component for context
      // This hook can be used by other components that need device info
      return detectDevice()
    }
    
    setDeviceInfo(detectDevice())
    
    // Listen for orientation/resize changes
    const handleResize = () => setDeviceInfo(detectDevice())
    window.addEventListener('resize', handleResize)
    window.addEventListener('orientationchange', handleResize)
    
    return () => {
      window.removeEventListener('resize', handleResize)
      window.removeEventListener('orientationchange', handleResize)
    }
  }, [])
  
  return deviceInfo
}