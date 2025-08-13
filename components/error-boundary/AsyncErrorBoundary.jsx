/**
 * AsyncErrorBoundary - Handles errors in async operations and Suspense boundaries
 * Provides loading states and error recovery for async components
 */

import React, { Suspense } from 'react'
import ErrorBoundary from './ErrorBoundary'
import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent } from '@/components/ui/card'
import { Loader2 } from 'lucide-react'

// Loading fallback component
const LoadingFallback = ({ message = 'Loading...', showSkeleton = true }) => {
  if (showSkeleton) {
    return (
      <div className="space-y-4 p-4">
        <Skeleton className="h-12 w-3/4" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
        <Skeleton className="h-4 w-4/6" />
      </div>
    )
  }

  return (
    <div className="flex items-center justify-center min-h-[200px] p-4">
      <Card className="border-none shadow-none">
        <CardContent className="flex items-center gap-3 pt-6">
          <Loader2 className="h-5 w-5 animate-spin text-gray-500" />
          <span className="text-gray-600">{message}</span>
        </CardContent>
      </Card>
    </div>
  )
}

// Enhanced error boundary for async operations
class AsyncErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = {
      hasError: false,
      error: null,
      isRetrying: false,
      retryCount: 0,
      maxRetries: props.maxRetries || 3
    }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, errorInfo) {
    console.error('AsyncErrorBoundary caught:', error, errorInfo)
    
    // Auto-retry for network errors
    if (this.shouldAutoRetry(error)) {
      this.handleAutoRetry()
    }
  }

  shouldAutoRetry(error) {
    // Check if error is retryable (network issues, timeouts, etc.)
    const retryableErrors = [
      'NetworkError',
      'TimeoutError',
      'ChunkLoadError', // Common in code-splitting
      'Loading chunk', // Webpack chunk loading errors
    ]
    
    const errorString = error?.toString() || ''
    const isRetryable = retryableErrors.some(e => errorString.includes(e))
    
    return isRetryable && this.state.retryCount < this.state.maxRetries
  }

  handleAutoRetry = () => {
    const { retryCount, maxRetries } = this.state
    
    if (retryCount < maxRetries) {
      this.setState({ isRetrying: true })
      
      // Exponential backoff
      const delay = Math.min(1000 * Math.pow(2, retryCount), 10000)
      
      setTimeout(() => {
        this.setState({
          hasError: false,
          error: null,
          isRetrying: false,
          retryCount: retryCount + 1
        })
      }, delay)
    }
  }

  handleManualRetry = () => {
    this.setState({
      hasError: false,
      error: null,
      retryCount: 0
    })
  }

  render() {
    const { hasError, error, isRetrying } = this.state
    const { children, fallback, loadingFallback, showSkeleton } = this.props

    if (hasError) {
      // Show retrying state
      if (isRetrying) {
        return (
          <LoadingFallback 
            message="Retrying..." 
            showSkeleton={false}
          />
        )
      }

      // Use custom fallback if provided
      if (fallback) {
        return fallback(error, this.handleManualRetry)
      }

      // Default error UI
      return (
        <ErrorBoundary>
          <div className="p-4">
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <h3 className="text-red-800 font-medium mb-2">
                Failed to load this section
              </h3>
              <p className="text-red-600 text-sm mb-3">
                {error?.message || 'An unexpected error occurred'}
              </p>
              <button
                onClick={this.handleManualRetry}
                className="text-sm text-red-700 underline hover:no-underline"
              >
                Try again
              </button>
            </div>
          </div>
        </ErrorBoundary>
      )
    }

    // Wrap children in Suspense for async components
    return (
      <ErrorBoundary>
        <Suspense 
          fallback={
            loadingFallback || 
            <LoadingFallback 
              message={this.props.loadingMessage} 
              showSkeleton={showSkeleton}
            />
          }
        >
          {children}
        </Suspense>
      </ErrorBoundary>
    )
  }
}

export default AsyncErrorBoundary
export { LoadingFallback }