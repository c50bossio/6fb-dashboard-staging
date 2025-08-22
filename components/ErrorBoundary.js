/**
 * Production-Ready Error Boundary System
 * Catches JavaScript errors anywhere in the component tree
 * Provides fallback UI and error recovery mechanisms
 */

import React from 'react'
import { logger } from '@/lib/logger'
import * as Sentry from '@sentry/nextjs'

const errorLogger = logger.child('error-boundary')

/**
 * Error Fallback Component
 */
function ErrorFallback({ error, resetError, componentStack }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full bg-white shadow-lg rounded-lg p-6">
        <div className="flex items-center justify-center w-12 h-12 mx-auto bg-red-100 rounded-full">
          <svg className="w-6 h-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" 
            />
          </svg>
        </div>
        
        <h1 className="mt-4 text-xl font-semibold text-center text-gray-900">
          Something went wrong
        </h1>
        
        <p className="mt-2 text-sm text-center text-gray-600">
          We're sorry for the inconvenience. The error has been reported and we're working on fixing it.
        </p>
        
        {process.env.NODE_ENV === 'development' && (
          <details className="mt-4 p-3 bg-gray-100 rounded text-xs">
            <summary className="cursor-pointer font-semibold">Error Details (Dev Only)</summary>
            <pre className="mt-2 whitespace-pre-wrap break-words">
              {error?.toString()}
              {componentStack && `\n\nComponent Stack:${componentStack}`}
            </pre>
          </details>
        )}
        
        <div className="mt-6 flex flex-col gap-3">
          <button
            onClick={resetError}
            className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Try Again
          </button>
          
          <button
            onClick={() => window.location.href = '/'}
            className="w-full px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors"
          >
            Go to Homepage
          </button>
        </div>
      </div>
    </div>
  )
}

/**
 * Main Error Boundary Class
 */
export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorCount: 0,
      lastErrorTime: null
    }
    
    this.resetError = this.resetError.bind(this)
    this.logError = this.logError.bind(this)
  }
  
  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI
    return {
      hasError: true,
      error,
      lastErrorTime: Date.now()
    }
  }
  
  componentDidCatch(error, errorInfo) {
    const { errorCount } = this.state
    const newErrorCount = errorCount + 1
    
    // Log error details
    this.logError(error, errorInfo, newErrorCount)
    
    // Update state with error info
    this.setState({
      errorInfo,
      errorCount: newErrorCount
    })
    
    // Report to Sentry
    Sentry.withScope((scope) => {
      scope.setLevel('error')
      scope.setContext('errorBoundary', {
        componentStack: errorInfo.componentStack,
        errorCount: newErrorCount,
        props: this.props
      })
      Sentry.captureException(error)
    })
    
    // Call custom error handler if provided
    this.props.onError?.(error, errorInfo, newErrorCount)
    
    // Auto-recover after delay if configured
    if (this.props.autoRecover && newErrorCount < 3) {
      setTimeout(() => {
        this.resetError()
      }, this.props.autoRecoverDelay || 5000)
    }
  }
  
  logError(error, errorInfo, errorCount) {
    const errorData = {
      message: error?.message || 'Unknown error',
      stack: error?.stack,
      componentStack: errorInfo?.componentStack,
      errorCount,
      props: this.props.name || 'Unknown',
      timestamp: new Date().toISOString()
    }
    
    errorLogger.error('Component error caught', error, errorData)
    
    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.group('🚨 Error Boundary Caught Error')
      console.error('Error:', error)
      console.error('Component Stack:', errorInfo?.componentStack)
      console.error('Props:', this.props)
      console.groupEnd()
    }
  }
  
  resetError() {
    // Check if we're in a rapid error loop
    const { lastErrorTime, errorCount } = this.state
    const timeSinceLastError = Date.now() - lastErrorTime
    
    if (errorCount >= 5 && timeSinceLastError < 10000) {
      errorLogger.warn('Rapid error loop detected, refusing to reset', {
        errorCount,
        timeSinceLastError
      })
      
      // Force navigation to home
      window.location.href = '/'
      return
    }
    
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null
    })
    
    // Call custom reset handler if provided
    this.props.onReset?.()
  }
  
  componentDidUpdate(prevProps) {
    // Reset error boundary when route changes
    if (this.props.resetKeys) {
      const hasResetKeyChanged = this.props.resetKeys.some(
        (key, idx) => key !== prevProps.resetKeys?.[idx]
      )
      
      if (hasResetKeyChanged && this.state.hasError) {
        this.resetError()
      }
    }
  }
  
  render() {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback(
          this.state.error,
          this.resetError,
          this.state.errorInfo?.componentStack
        )
      }
      
      // Use custom fallback component if provided
      const FallbackComponent = this.props.FallbackComponent || ErrorFallback
      
      return (
        <FallbackComponent
          error={this.state.error}
          resetError={this.resetError}
          componentStack={this.state.errorInfo?.componentStack}
          errorCount={this.state.errorCount}
        />
      )
    }
    
    return this.props.children
  }
}

/**
 * Hook to trigger error boundary
 */
export function useErrorHandler() {
  return (error, errorInfo) => {
    errorLogger.error('Manual error trigger', error, errorInfo)
    throw error
  }
}

/**
 * Async Error Boundary Wrapper
 * Catches errors in async operations
 */
export function AsyncErrorBoundary({ children, ...props }) {
  const [asyncError, setAsyncError] = React.useState(null)
  
  React.useEffect(() => {
    const handleUnhandledRejection = (event) => {
      errorLogger.error('Unhandled promise rejection', event.reason)
      setAsyncError(event.reason)
      
      // Prevent default browser handling
      event.preventDefault()
    }
    
    window.addEventListener('unhandledrejection', handleUnhandledRejection)
    
    return () => {
      window.removeEventListener('unhandledrejection', handleUnhandledRejection)
    }
  }, [])
  
  if (asyncError) {
    throw asyncError
  }
  
  return <ErrorBoundary {...props}>{children}</ErrorBoundary>
}

/**
 * Route Error Boundary
 * Specifically for Next.js route components
 */
export function RouteErrorBoundary({ children, ...props }) {
  const [pathname, setPathname] = React.useState(
    typeof window !== 'undefined' ? window.location.pathname : ''
  )
  
  React.useEffect(() => {
    const handleRouteChange = () => {
      setPathname(window.location.pathname)
    }
    
    // Listen for route changes
    window.addEventListener('popstate', handleRouteChange)
    
    return () => {
      window.removeEventListener('popstate', handleRouteChange)
    }
  }, [])
  
  return (
    <ErrorBoundary
      {...props}
      resetKeys={[pathname]}
      name={`Route: ${pathname}`}
    >
      {children}
    </ErrorBoundary>
  )
}

/**
 * Component Error Boundary
 * For wrapping individual components
 */
export function ComponentErrorBoundary({ 
  children, 
  fallback,
  componentName,
  ...props 
}) {
  return (
    <ErrorBoundary
      {...props}
      name={componentName}
      fallback={fallback || ((error, reset) => (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-600">
            Component failed to load. 
            <button 
              onClick={reset}
              className="ml-2 underline hover:no-underline"
            >
              Try again
            </button>
          </p>
        </div>
      ))}
    >
      {children}
    </ErrorBoundary>
  )
}

/**
 * HOC for adding error boundary to components
 */
export function withErrorBoundary(Component, errorBoundaryProps = {}) {
  const WrappedComponent = React.forwardRef((props, ref) => (
    <ComponentErrorBoundary 
      componentName={Component.displayName || Component.name || 'Unknown'}
      {...errorBoundaryProps}
    >
      <Component ref={ref} {...props} />
    </ComponentErrorBoundary>
  ))
  
  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name || 'Unknown'})`
  
  return WrappedComponent
}

export default ErrorBoundary