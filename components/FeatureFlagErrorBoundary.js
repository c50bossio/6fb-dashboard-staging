'use client'

import { ExclamationTriangleIcon, ArrowPathIcon } from '@heroicons/react/24/outline'
import React, { Component, createContext, useContext, useState, useEffect } from 'react'

/**
 * Production-ready error boundary system for feature flags
 * Provides multiple layers of protection:
 * - Component-level error boundaries
 * - Global error handling
 * - Fallback UI components  
 * - Error reporting integration
 * - Graceful degradation
 */

// Error Context for tracking feature flag errors
const FeatureFlagErrorContext = createContext({
  errors: {},
  reportError: () => {},
  clearError: () => {},
  isFeatureFlagError: () => false
})

// Global error state provider
export function FeatureFlagErrorProvider({ children }) {
  const [errors, setErrors] = useState({})

  const reportError = (flagName, error, context = {}) => {
    const errorId = `${flagName}-${Date.now()}`
    const errorInfo = {
      id: errorId,
      flagName,
      error: {
        message: error.message,
        stack: error.stack,
        name: error.name
      },
      context,
      timestamp: new Date().toISOString(),
      reported: false
    }

    setErrors(prev => ({
      ...prev,
      [errorId]: errorInfo
    }))

    // Report to external services
    reportToServices(errorInfo)

    return errorId
  }

  const clearError = (errorId) => {
    setErrors(prev => {
      const { [errorId]: removed, ...rest } = prev
      return rest
    })
  }

  const isFeatureFlagError = (flagName) => {
    return Object.values(errors).some(error => 
      error.flagName === flagName && 
      Date.now() - new Date(error.timestamp).getTime() < 300000 // 5 minutes
    )
  }

  return (
    <FeatureFlagErrorContext.Provider 
      value={{ errors, reportError, clearError, isFeatureFlagError }}
    >
      {children}
    </FeatureFlagErrorContext.Provider>
  )
}

// Hook to use error context
export function useFeatureFlagError() {
  return useContext(FeatureFlagErrorContext)
}

// Main Error Boundary Class Component
export class FeatureFlagErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null
    }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, errorInfo) {
    const { flagName, onError, reportToContext = true } = this.props

    this.setState({ 
      errorInfo,
      errorId: `${flagName || 'unknown'}-${Date.now()}`
    })

    // Report to context if available
    if (reportToContext && this.context?.reportError) {
      this.context.reportError(flagName || 'unknown', error, {
        componentStack: errorInfo.componentStack,
        errorBoundary: true,
        ...errorInfo
      })
    }

    // Custom error handler
    if (onError) {
      onError(error, errorInfo)
    }

    // Report to external services
    reportToServices({
      id: this.state.errorId,
      flagName: flagName || 'unknown',
      error: {
        message: error.message,
        stack: error.stack,
        name: error.name
      },
      context: {
        componentStack: errorInfo.componentStack,
        errorBoundary: true,
        props: this.props
      },
      timestamp: new Date().toISOString()
    })
  }

  handleRetry = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null
    })

    // Clear context error if available
    if (this.context?.clearError && this.state.errorId) {
      this.context.clearError(this.state.errorId)
    }

    // Custom retry handler
    if (this.props.onRetry) {
      this.props.onRetry()
    }
  }

  render() {
    if (this.state.hasError) {
      const { fallback: CustomFallback, flagName, showDetails = false } = this.props

      if (CustomFallback) {
        return (
          <CustomFallback
            error={this.state.error}
            errorInfo={this.state.errorInfo}
            onRetry={this.handleRetry}
            flagName={flagName}
          />
        )
      }

      return (
        <FeatureFlagErrorFallback
          error={this.state.error}
          errorInfo={this.state.errorInfo}
          onRetry={this.handleRetry}
          flagName={flagName}
          showDetails={showDetails}
        />
      )
    }

    return this.props.children
  }
}

// Set context type for error boundary
FeatureFlagErrorBoundary.contextType = FeatureFlagErrorContext

// Default Error Fallback Component
export function FeatureFlagErrorFallback({ 
  error, 
  errorInfo, 
  onRetry, 
  flagName,
  showDetails = false,
  className = ""
}) {
  return (
    <div className={`bg-red-50 border border-red-200 rounded-md p-4 ${className}`}>
      <div className="flex">
        <div className="flex-shrink-0">
          <ExclamationTriangleIcon className="h-5 w-5 text-red-400" />
        </div>
        <div className="ml-3">
          <h3 className="text-sm font-medium text-red-800">
            Feature Flag Error
          </h3>
          <div className="mt-2 text-sm text-red-700">
            <p>
              {flagName 
                ? `There was an error with the "${flagName}" feature flag.` 
                : 'A feature flag encountered an error.'
              }
            </p>
            {showDetails && error && (
              <details className="mt-2">
                <summary className="cursor-pointer text-red-600 hover:text-red-800">
                  Show Error Details
                </summary>
                <div className="mt-2 p-2 bg-red-100 rounded text-xs font-mono">
                  <p><strong>Error:</strong> {error.message}</p>
                  {error.stack && (
                    <pre className="mt-1 whitespace-pre-wrap">{error.stack}</pre>
                  )}
                </div>
              </details>
            )}
          </div>
          {onRetry && (
            <div className="mt-4">
              <button
                type="button"
                onClick={onRetry}
                className="inline-flex items-center px-3 py-2 text-sm font-medium text-red-800 bg-red-100 border border-red-300 rounded-md hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
              >
                <ArrowPathIcon className="-ml-1 mr-2 h-4 w-4" />
                Try Again
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// Minimal Error Fallback (for critical UI elements)
export function MinimalFeatureFlagErrorFallback({ onRetry, className = "" }) {
  return (
    <div className={`inline-flex items-center text-sm text-red-600 ${className}`}>
      <ExclamationTriangleIcon className="h-4 w-4 mr-1" />
      <span className="mr-2">Feature temporarily unavailable</span>
      {onRetry && (
        <button
          onClick={onRetry}
          className="text-red-700 hover:text-red-800 underline"
        >
          retry
        </button>
      )}
    </div>
  )
}

// High-Order Component wrapper for feature flag error boundary
export function withFeatureFlagErrorBoundary(WrappedComponent, options = {}) {
  const {
    fallback,
    flagName,
    showDetails = false,
    onError,
    onRetry
  } = options

  return function WithErrorBoundary(props) {
    return (
      <FeatureFlagErrorBoundary
        fallback={fallback}
        flagName={flagName}
        showDetails={showDetails}
        onError={onError}
        onRetry={onRetry}
      >
        <WrappedComponent {...props} />
      </FeatureFlagErrorBoundary>
    )
  }
}

// Hook for safely using feature flags with error handling
export function useSafeFeatureFlag(flagName, options = {}) {
  const [error, setError] = useState(null)
  const [retryCount, setRetryCount] = useState(0)
  const { reportError } = useFeatureFlagError()

  const {
    maxRetries = 3,
    retryDelay = 1000,
    onError,
    fallbackEnabled = false,
    ...flagOptions
  } = options

  // This would integrate with your main useFeatureFlag hook
  const handleError = (err) => {
    setError(err)
    
    if (reportError) {
      reportError(flagName, err, { 
        retryCount,
        maxRetries,
        usedInHook: true 
      })
    }

    if (onError) {
      onError(err)
    }
  }

  const retry = () => {
    if (retryCount < maxRetries) {
      setRetryCount(prev => prev + 1)
      setError(null)
      
      // Add delay before retry
      setTimeout(() => {
        // This would trigger a re-evaluation of the feature flag
      }, retryDelay * Math.pow(2, retryCount)) // Exponential backoff
    }
  }

  const resetError = () => {
    setError(null)
    setRetryCount(0)
  }

  return {
    error,
    retry,
    resetError,
    canRetry: retryCount < maxRetries,
    retryCount,
    maxRetries,
    // This would return the actual feature flag result
    isEnabled: error ? fallbackEnabled : false, // Fallback when error
    loading: false,
    variant: 'control',
    metadata: error ? { error: true, fallback: true } : {}
  }
}

// Global error handler setup
export function setupFeatureFlagErrorReporting() {
  // Global error handler for unhandled feature flag errors
  const originalConsoleError = console.error
  console.error = (...args) => {
    // Check if this is a feature flag related error
    const errorMessage = args.join(' ')
    if (errorMessage.includes('[FeatureFlag') || errorMessage.includes('feature-flag')) {
      reportToServices({
        type: 'unhandled_feature_flag_error',
        message: errorMessage,
        args,
        timestamp: new Date().toISOString(),
        source: 'console.error'
      })
    }
    originalConsoleError.apply(console, args)
  }

  // Handle unhandled promise rejections related to feature flags
  window.addEventListener('unhandledrejection', (event) => {
    const error = event.reason
    if (error && (
      error.message?.includes('feature-flag') ||
      error.stack?.includes('useFeatureFlag') ||
      error.stack?.includes('FeatureFlag')
    )) {
      reportToServices({
        type: 'unhandled_feature_flag_rejection',
        error: {
          message: error.message,
          stack: error.stack,
          name: error.name
        },
        timestamp: new Date().toISOString(),
        source: 'unhandledrejection'
      })
    }
  })
}

// Error reporting to external services
function reportToServices(errorInfo) {
  try {
    // Report to Sentry if available
    if (typeof window !== 'undefined' && window.Sentry) {
      window.Sentry.captureException(new Error(errorInfo.error?.message || 'Feature flag error'), {
        tags: {
          component: 'feature-flag',
          flag_name: errorInfo.flagName,
          error_type: errorInfo.type || 'feature_flag_error'
        },
        extra: {
          ...errorInfo,
          timestamp: errorInfo.timestamp,
          context: errorInfo.context
        },
        level: 'error'
      })
    }

    // Report to custom analytics if available
    if (typeof window !== 'undefined' && window.posthog) {
      window.posthog.capture('feature_flag_error', {
        flag_name: errorInfo.flagName,
        error_message: errorInfo.error?.message,
        error_type: errorInfo.type || 'feature_flag_error',
        context: errorInfo.context,
        timestamp: errorInfo.timestamp
      })
    }

    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.group('🚨 Feature Flag Error Report')
      console.error('Flag:', errorInfo.flagName)
      console.error('Error:', errorInfo.error)
      console.error('Context:', errorInfo.context)
      console.error('Timestamp:', errorInfo.timestamp)
      console.groupEnd()
    }

  } catch (reportingError) {
    console.error('Failed to report feature flag error:', reportingError)
  }
}

// Circuit breaker pattern for feature flags
export class FeatureFlagCircuitBreaker {
  constructor(flagName, options = {}) {
    this.flagName = flagName
    this.failureThreshold = options.failureThreshold || 5
    this.recoveryTimeout = options.recoveryTimeout || 60000 // 1 minute
    this.monitorWindow = options.monitorWindow || 300000 // 5 minutes
    
    this.failures = []
    this.state = 'CLOSED' // CLOSED, OPEN, HALF_OPEN
    this.lastFailureTime = null
  }

  recordFailure() {
    const now = Date.now()
    this.failures.push(now)
    this.lastFailureTime = now

    // Remove old failures outside monitor window
    this.failures = this.failures.filter(time => 
      now - time < this.monitorWindow
    )

    // Check if we should open the circuit
    if (this.failures.length >= this.failureThreshold) {
      this.state = 'OPEN'
    }
  }

  recordSuccess() {
    this.failures = []
    this.state = 'CLOSED'
    this.lastFailureTime = null
  }

  canExecute() {
    const now = Date.now()

    switch (this.state) {
      case 'CLOSED':
        return true
      
      case 'OPEN':
        if (this.lastFailureTime && 
            now - this.lastFailureTime > this.recoveryTimeout) {
          this.state = 'HALF_OPEN'
          return true
        }
        return false
      
      case 'HALF_OPEN':
        return true
      
      default:
        return false
    }
  }

  getState() {
    return {
      state: this.state,
      failures: this.failures.length,
      canExecute: this.canExecute(),
      lastFailure: this.lastFailureTime
    }
  }
}

// Global circuit breaker registry
const circuitBreakers = new Map()

export function getFeatureFlagCircuitBreaker(flagName, options) {
  if (!circuitBreakers.has(flagName)) {
    circuitBreakers.set(flagName, new FeatureFlagCircuitBreaker(flagName, options))
  }
  return circuitBreakers.get(flagName)
}