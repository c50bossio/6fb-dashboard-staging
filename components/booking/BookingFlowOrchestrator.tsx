'use client'

import {
  DevicePhoneMobileIcon,
  ComputerDesktopIcon,
  ExclamationTriangleIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline'
import { motion, AnimatePresence } from 'framer-motion'
import React, { useState, useEffect, useMemo, Suspense, lazy, Component, ReactNode } from 'react'
import { getFeatureFlag, getCachedFeatureFlags } from '@/lib/feature-flags'

// Type definitions
interface DeviceInfo {
  isMobile: boolean
  isTablet: boolean
  isDesktop: boolean
  isTouchDevice: boolean
  screenWidth: number
  screenHeight: number
  pixelRatio: number
  hasHighDPI: boolean
  isSmallScreen: boolean
  isLandscape: boolean
  isSlowConnection: boolean
  effectiveConnectionType?: string
  supportsWebP: boolean
  supportsIntersectionObserver: boolean
  supportsServiceWorker: boolean
  userAgent: string
  shouldUseMobileFlow: boolean
  shouldUseEnhancedFlow: boolean
  shouldEnableLazyLoading: boolean
  shouldUseWebP: boolean
}

interface UrlParameters {
  enhanced: boolean
  mobile: boolean
  serviceId?: string
  barberId?: string
  flow?: string
  experiment?: string
  debug: boolean
}

interface FeatureFlags {
  [key: string]: any
  new_booking_flow?: boolean
  enhanced_booking_flow?: boolean
  mobile_optimizer_enabled?: boolean
  realtime_availability?: boolean
  ab_testing_enabled?: boolean
  advanced_booking_features?: boolean
}

interface BookingFlowOrchestratorProps {
  // Core props - compatible with existing booking components
  barbershopId: string
  barbershopSlug?: string
  preselectedBarber?: string | null
  preselectedService?: string | null
  
  // Optional configuration
  defaultFlow?: 'auto' | 'public' | 'enhanced' | 'mobile'
  enableRealtimeAvailability?: boolean
  enableProgressiveAccount?: boolean
  
  // A/B testing & analytics
  experimentId?: string | null
  onComponentSelection?: (component: string, context: any) => void
  onConversionEvent?: (event: string, data: any) => void
  
  // URL parameter overrides
  enhanced?: boolean | null
  mobile?: boolean | null
  service?: string | null
  barber?: string | null
  
  // Additional props
  className?: string
  style?: React.CSSProperties
  [key: string]: any
}

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
  errorInfo: any
}

type BookingComponent = 'PublicBookingFlow' | 'EnhancedBookingFlow' | 'MobileBookingOptimizer'

// Lazy load components for performance optimization
const PublicBookingFlow = lazy(() => import('./PublicBookingFlow'))
const EnhancedBookingFlow = lazy(() => import('./EnhancedBookingFlow'))
const MobileBookingOptimizer = lazy(() => import('./MobileBookingOptimizer'))
const ProgressiveAccountCreation = lazy(() => import('./ProgressiveAccountCreation'))
const RealtimeAvailabilityChecker = lazy(() => import('./RealtimeAvailabilityChecker'))

// Error Boundary Component
class BookingErrorBoundary extends Component<
  { 
    children: ReactNode
    fallback?: ReactNode
    onRetry?: () => void 
  }, 
  ErrorBoundaryState
> {
  constructor(props: any) {
    super(props)
    this.state = { hasError: false, error: null, errorInfo: null }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error, errorInfo: null }
  }

  componentDidCatch(error: Error, errorInfo: any) {
    this.setState({
      error: error,
      errorInfo: errorInfo
    })
    
    // Log error to analytics/monitoring service
    console.error('BookingFlow Error:', error, errorInfo)
    
    // Report to monitoring service (Sentry, etc.)
    if (typeof window !== 'undefined' && (window as any).Sentry) {
      (window as any).Sentry.captureException(error, {
        contexts: {
          react: {
            componentStack: errorInfo.componentStack
          }
        }
      })
    }
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || <BookingErrorFallback onRetry={this.props.onRetry} />
    }

    return this.props.children
  }
}

const BookingErrorFallback: React.FC<{ onRetry?: () => void }> = ({ onRetry }) => (
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
const BookingLoadingSkeleton: React.FC = () => (
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
 * - Full TypeScript support
 */
const BookingFlowOrchestrator: React.FC<BookingFlowOrchestratorProps> = ({
  // Core props
  barbershopId,
  barbershopSlug,
  preselectedBarber = null,
  preselectedService = null,
  
  // Optional configuration
  defaultFlow = 'auto',
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
}) => {
  // State management with proper typing
  const [selectedComponent, setSelectedComponent] = useState<BookingComponent | null>(null)
  const [deviceInfo, setDeviceInfo] = useState<DeviceInfo | null>(null)
  const [featureFlags, setFeatureFlags] = useState<FeatureFlags>({})
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)
  const [componentProps, setComponentProps] = useState<any>({})
  const [retryCount, setRetryCount] = useState<number>(0)

  // Device detection utility with comprehensive capabilities
  const detectDevice = (): DeviceInfo | null => {
    if (typeof window === 'undefined') return null

    const userAgent = navigator.userAgent.toLowerCase()
    const screenWidth = window.innerWidth
    const screenHeight = window.innerHeight
    const pixelRatio = window.devicePixelRatio || 1
    
    // Touch capability detection
    const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0
    
    // Device type detection with improved accuracy
    const isMobile = /android|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent) || 
                    (screenWidth <= 768 && isTouchDevice)
    
    const isTablet = (/ipad|android/i.test(userAgent) && screenWidth >= 768 && screenWidth <= 1024) ||
                     (isTouchDevice && screenWidth >= 768 && screenWidth <= 1024)
    
    const isDesktop = !isMobile && !isTablet
    
    // Mobile-specific capabilities
    const hasHighDPI = pixelRatio >= 2
    const isSmallScreen = screenWidth <= 480
    const isLandscape = screenWidth > screenHeight
    
    // Performance indicators
    const connection = (navigator as any).connection || 
                      (navigator as any).mozConnection || 
                      (navigator as any).webkitConnection
    const isSlowConnection = connection?.effectiveType === 'slow-2g' || 
                            connection?.effectiveType === '2g' ||
                            connection?.downlink < 1.5
    
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

  // URL parameter parsing with type safety
  const parseUrlParameters = (): UrlParameters => {
    if (typeof window === 'undefined') {
      return {
        enhanced: enhanced !== null ? enhanced : false,
        mobile: mobile !== null ? mobile : false,
        serviceId: service,
        barberId: barber,
        debug: false
      }
    }
    
    const urlParams = new URLSearchParams(window.location.search)
    
    return {
      enhanced: enhanced !== null ? enhanced : urlParams.get('enhanced') === 'true',
      mobile: mobile !== null ? mobile : urlParams.get('mobile') === 'true',
      serviceId: service || urlParams.get('service') || undefined,
      barberId: barber || urlParams.get('barber') || undefined,
      flow: urlParams.get('flow') || undefined,
      experiment: urlParams.get('exp') || experimentId || undefined,
      debug: urlParams.get('debug') === 'true'
    }
  }

  // Component selection logic with enhanced decision tree
  const determineOptimalComponent = (
    deviceInfo: DeviceInfo, 
    featureFlags: FeatureFlags, 
    urlParams: UrlParameters
  ): BookingComponent => {
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
    
    // Feature flag checks with graceful degradation
    if (!featureFlags.new_booking_flow) {
      return 'PublicBookingFlow' // Safe fallback
    }
    
    // Device-based optimization with performance considerations
    if (deviceInfo.shouldUseMobileFlow) {
      return featureFlags.mobile_optimizer_enabled !== false 
        ? 'MobileBookingOptimizer' 
        : 'PublicBookingFlow'
    }
    
    // Enhanced flow for capable devices
    if (deviceInfo.shouldUseEnhancedFlow && featureFlags.enhanced_booking_flow) {
      return 'EnhancedBookingFlow'
    }
    
    // A/B testing logic with statistical distribution
    if (urlParams.experiment && featureFlags.ab_testing_enabled) {
      const experimentConfig = featureFlags[`experiment_${urlParams.experiment}`]
      if (experimentConfig) {
        // Use a more sophisticated hash-based approach for consistent user experience
        const userId = localStorage.getItem('user_id') || 'anonymous'
        const hash = simpleHash(userId + urlParams.experiment) % 100
        const variant = hash < (experimentConfig.split * 100) ? 
          experimentConfig.variantA : experimentConfig.variantB
        return variant as BookingComponent
      }
    }
    
    // Default flow based on configuration
    switch (defaultFlow) {
      case 'enhanced': 
        return featureFlags.enhanced_booking_flow ? 'EnhancedBookingFlow' : 'PublicBookingFlow'
      case 'mobile': 
        return featureFlags.mobile_optimizer_enabled ? 'MobileBookingOptimizer' : 'PublicBookingFlow'
      case 'public': 
        return 'PublicBookingFlow'
      case 'auto':
      default:
        // Smart auto-selection based on capabilities and performance
        if (deviceInfo.isDesktop && featureFlags.enhanced_booking_flow && !deviceInfo.isSlowConnection) {
          return 'EnhancedBookingFlow'
        }
        if (deviceInfo.isMobile && featureFlags.mobile_optimizer_enabled) {
          return 'MobileBookingOptimizer'
        }
        return 'PublicBookingFlow' // Safe default
    }
  }

  // Simple hash function for A/B testing consistency
  const simpleHash = (str: string): number => {
    let hash = 0
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash // Convert to 32-bit integer
    }
    return Math.abs(hash)
  }

  // Initialize orchestrator with comprehensive error handling
  useEffect(() => {
    let mounted = true
    let timeoutId: NodeJS.Timeout
    
    const initialize = async () => {
      try {
        setLoading(true)
        setError(null)
        
        // Set a reasonable timeout for initialization
        const timeoutPromise = new Promise((_, reject) => {
          timeoutId = setTimeout(() => reject(new Error('Initialization timeout')), 5000)
        })
        
        // Parallel initialization for optimal performance
        const initPromise = Promise.all([
          Promise.resolve(detectDevice()),
          getCachedFeatureFlags().catch(() => ({}))
        ])
        
        const [detectedDevice, loadedFlags] = await Promise.race([initPromise, timeoutPromise]) as [DeviceInfo, FeatureFlags]
        
        if (!mounted) return
        
        // Clear timeout on successful completion
        clearTimeout(timeoutId)
        
        const urlParams = parseUrlParameters()
        const optimalComponent = determineOptimalComponent(detectedDevice, loadedFlags, urlParams)
        
        // Prepare component props with intelligent defaults
        const props: any = {
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
          props.reducedAnimations = detectedDevice.isSlowConnection
        }
        
        if (detectedDevice?.isSlowConnection) {
          props.enableProgressiveLoading = true
          props.reducedAnimations = true
          props.prioritizeCore = true
        }
        
        if (detectedDevice?.hasHighDPI && detectedDevice?.supportsWebP) {
          props.enableHighResImages = true
          props.preferWebP = true
        }
        
        // Update state atomically
        setDeviceInfo(detectedDevice)
        setFeatureFlags(loadedFlags)
        setSelectedComponent(optimalComponent)
        setComponentProps(props)
        
        // Analytics tracking with structured data
        onComponentSelection?.(optimalComponent, {
          device: detectedDevice,
          urlParams,
          featureFlags: loadedFlags,
          timestamp: Date.now(),
          sessionId: sessionStorage.getItem('session_id') || 'anonymous'
        })
        
      } catch (err) {
        const error = err as Error
        console.error('BookingFlowOrchestrator initialization error:', error)
        
        if (mounted) {
          setError(error.message)
          // Fallback to safe default with minimal props
          setSelectedComponent('PublicBookingFlow')
          setComponentProps({
            barbershopId,
            barbershopSlug,
            preselectedBarber,
            preselectedService,
            fallbackMode: true,
            ...otherProps
          })
        }
      } finally {
        if (mounted) {
          setLoading(false)
        }
        clearTimeout(timeoutId)
      }
    }
    
    initialize()
    
    return () => {
      mounted = false
      clearTimeout(timeoutId)
    }
  }, [barbershopId, barbershopSlug, retryCount])

  // Error retry handler with exponential backoff
  const handleRetry = () => {
    setRetryCount(prev => {
      const newCount = prev + 1
      // Add delay for subsequent retries
      if (newCount > 1) {
        setTimeout(() => {
          setError(null)
        }, Math.min(1000 * Math.pow(2, newCount - 2), 5000))
      } else {
        setError(null)
      }
      return newCount
    })
  }

  // Render selected component with enhanced features and proper typing
  const renderBookingComponent = (): React.ReactElement => {
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
  const withRealtimeAvailability = (component: React.ReactElement): React.ReactElement => {
    if (!enableRealtimeAvailability || !featureFlags.realtime_availability) {
      return component
    }
    
    return (
      <RealtimeAvailabilityChecker
        barbershopId={barbershopId}
        barberId={componentProps.preselectedBarber}
        serviceId={componentProps.preselectedService}
        selectedDate={new Date()}
        onSlotsUpdate={() => {}}
      >
        {component}
      </RealtimeAvailabilityChecker>
    )
  }

  // Development debug panel with comprehensive information
  const DebugPanel: React.FC = () => {
    const urlParams = parseUrlParameters()
    
    if (!urlParams.debug) return null
    
    return (
      <div className="fixed bottom-4 right-4 bg-black bg-opacity-90 text-white p-4 rounded-lg text-xs max-w-sm z-50 font-mono">
        <div className="font-bold mb-2 text-green-400">🔧 Booking Orchestrator Debug</div>
        <div className="space-y-1">
          <div><span className="text-blue-300">Component:</span> {selectedComponent}</div>
          <div><span className="text-blue-300">Device:</span> {deviceInfo?.isMobile ? '📱 Mobile' : deviceInfo?.isTablet ? '📟 Tablet' : '🖥️ Desktop'}</div>
          <div><span className="text-blue-300">Screen:</span> {deviceInfo?.screenWidth}×{deviceInfo?.screenHeight}@{deviceInfo?.pixelRatio}x</div>
          <div><span className="text-blue-300">Touch:</span> {deviceInfo?.isTouchDevice ? '✅' : '❌'}</div>
          <div><span className="text-blue-300">Connection:</span> {deviceInfo?.effectiveConnectionType || 'Unknown'} {deviceInfo?.isSlowConnection ? '🐌' : '🚀'}</div>
          <div><span className="text-blue-300">Flags:</span> {Object.keys(featureFlags).length} loaded</div>
          <div><span className="text-blue-300">Retries:</span> {retryCount}</div>
          {urlParams.experiment && <div><span className="text-blue-300">Experiment:</span> {urlParams.experiment}</div>}
          {error && <div className="text-red-400">❌ Error: {error}</div>}
        </div>
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
        <div className="fixed top-4 right-4 bg-blue-600 text-white px-3 py-1 rounded-full text-xs font-medium z-40 flex items-center">
          {deviceInfo?.isMobile ? (
            <DevicePhoneMobileIcon className="h-4 w-4 mr-1" />
          ) : (
            <ComputerDesktopIcon className="h-4 w-4 mr-1" />
          )}
          {selectedComponent?.replace('BookingFlow', '').replace('Optimizer', '')}
          {deviceInfo?.isSlowConnection && <span className="ml-1">🐌</span>}
        </div>
      )}
    </div>
  )
}

export default BookingFlowOrchestrator

// Export additional components and utilities
export {
  BookingErrorBoundary,
  BookingLoadingSkeleton,
  type DeviceInfo,
  type UrlParameters,
  type FeatureFlags,
  type BookingFlowOrchestratorProps
}

// Custom hook for device detection (can be used by other components)
export const useDeviceDetection = (): DeviceInfo | null => {
  const [deviceInfo, setDeviceInfo] = useState<DeviceInfo | null>(null)
  
  useEffect(() => {
    if (typeof window === 'undefined') return
    
    // Implementation details moved to main component to avoid duplication
    // This hook provides the same detection logic for reuse
    const detectDevice = (): DeviceInfo | null => {
      // Simplified version for hook usage
      const userAgent = navigator.userAgent.toLowerCase()
      const screenWidth = window.innerWidth
      const isMobile = /android|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent) || 
                      screenWidth <= 768
      
      return {
        isMobile,
        isTablet: screenWidth >= 768 && screenWidth <= 1024,
        isDesktop: screenWidth > 1024,
        isTouchDevice: 'ontouchstart' in window,
        screenWidth,
        screenHeight: window.innerHeight,
        pixelRatio: window.devicePixelRatio || 1,
        hasHighDPI: (window.devicePixelRatio || 1) >= 2,
        isSmallScreen: screenWidth <= 480,
        isLandscape: screenWidth > window.innerHeight,
        isSlowConnection: false, // Simplified for hook
        supportsWebP: true, // Simplified for hook
        supportsIntersectionObserver: 'IntersectionObserver' in window,
        supportsServiceWorker: 'serviceWorker' in navigator,
        userAgent,
        shouldUseMobileFlow: isMobile,
        shouldUseEnhancedFlow: !isMobile && screenWidth > 1024,
        shouldEnableLazyLoading: isMobile,
        shouldUseWebP: true
      } as DeviceInfo
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

// Performance monitoring hook
export const useBookingPerformance = () => {
  const [metrics, setMetrics] = useState({
    loadTime: 0,
    renderTime: 0,
    interactionTime: 0
  })
  
  useEffect(() => {
    if (typeof window === 'undefined') return
    
    const startTime = performance.now()
    
    // Measure load time
    const measureLoadTime = () => {
      setMetrics(prev => ({
        ...prev,
        loadTime: performance.now() - startTime
      }))
    }
    
    // Use requestIdleCallback if available
    if ('requestIdleCallback' in window) {
      (window as any).requestIdleCallback(measureLoadTime)
    } else {
      setTimeout(measureLoadTime, 0)
    }
    
  }, [])
  
  return metrics
}