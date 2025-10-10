/**
 * AppErrorBoundary - Root-level error boundary that combines all error handling strategies
 * Should be used at the top level of the application
 */

import React, { useEffect } from 'react'
import ErrorBoundary from './ErrorBoundary'
import RouteErrorBoundary from './RouteErrorBoundary'

// Global error handler component with proper cleanup
const GlobalErrorHandler = ({ children }) => {
  useEffect(() => {
    // Define the error handler function
    const handleUnhandledRejection = (event) => {
      console.error('Unhandled promise rejection:', event.reason)
      
      // Prevent the default browser behavior
      event.preventDefault()
      
      // Report to error tracking service
      if (window.Sentry) {
        window.Sentry.captureException(event.reason)
      }
    }

    // Add event listener only on mount
    if (typeof window !== 'undefined') {
      window.addEventListener('unhandledrejection', handleUnhandledRejection)
    }

    // Cleanup on unmount
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('unhandledrejection', handleUnhandledRejection)
      }
    }
  }, []) // Empty dependency array ensures this runs once

  return children
}

class AppErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null
    }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true }
  }

  componentDidCatch(error, errorInfo) {
    // Log to console
    console.error('App Error Boundary:', error, errorInfo)
    
    // Store error details
    this.setState({
      error,
      errorInfo
    })

    // Report to error tracking services
    this.reportError(error, errorInfo)
  }

  reportError(error, errorInfo) {
    // Report to Sentry if available
    if (typeof window !== 'undefined' && window.Sentry) {
      window.Sentry.withScope((scope) => {
        scope.setTag('error_boundary', 'app')
        scope.setContext('error_info', {
          componentStack: errorInfo?.componentStack
        })
        window.Sentry.captureException(error)
      })
    }

    // Report to custom error tracking
    if (typeof window !== 'undefined' && process.env.NEXT_PUBLIC_API_URL) {
      fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/errors`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          error: error?.toString(),
          stack: error?.stack,
          componentStack: errorInfo?.componentStack,
          url: window.location.href,
          userAgent: navigator.userAgent,
          timestamp: new Date().toISOString()
        })
      }).catch(err => {
        console.error('Failed to report error:', err)
      })
    }
  }

  render() {
    // Delegate to specific error boundaries with global error handler
    return (
      <GlobalErrorHandler>
        <ErrorBoundary>
          <RouteErrorBoundary>
            {this.props.children}
          </RouteErrorBoundary>
        </ErrorBoundary>
      </GlobalErrorHandler>
    )
  }
}

export default AppErrorBoundary