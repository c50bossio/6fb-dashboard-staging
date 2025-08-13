/**
 * ComponentErrorBoundary - Lightweight error boundary for individual components
 * Prevents single component failures from crashing the entire app
 */

import React from 'react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertCircle, RefreshCw } from 'lucide-react'

class ComponentErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = {
      hasError: false,
      error: null
    }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, errorInfo) {
    const componentName = this.props.name || 'Component'
    console.error(`${componentName} Error:`, error, errorInfo)
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null })
  }

  render() {
    const { hasError, error } = this.state
    const { 
      children, 
      fallback, 
      name = 'Component',
      showError = process.env.NODE_ENV === 'development',
      inline = false
    } = this.props

    if (hasError) {
      // Custom fallback if provided
      if (fallback) {
        return typeof fallback === 'function' 
          ? fallback(error, this.handleReset)
          : fallback
      }

      // Inline error for small components
      if (inline) {
        return (
          <span className="inline-flex items-center gap-1 text-red-500 text-sm">
            <AlertCircle className="h-3 w-3" />
            Error loading {name}
            <button
              onClick={this.handleReset}
              className="ml-1 underline hover:no-underline"
              aria-label="Retry"
            >
              retry
            </button>
          </span>
        )
      }

      // Default block-level error
      return (
        <Alert variant="destructive" className="my-2">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="flex items-center justify-between">
            <span>
              {name} failed to load
              {showError && error && (
                <span className="ml-2 text-xs opacity-75">
                  ({error.message || error.toString()})
                </span>
              )}
            </span>
            <button
              onClick={this.handleReset}
              className="ml-4 flex items-center gap-1 text-sm underline hover:no-underline"
            >
              <RefreshCw className="h-3 w-3" />
              Retry
            </button>
          </AlertDescription>
        </Alert>
      )
    }

    return children
  }
}

// HOC for wrapping components with error boundary
export function withErrorBoundary(Component, errorBoundaryProps = {}) {
  const WrappedComponent = React.forwardRef((props, ref) => {
    return (
      <ComponentErrorBoundary {...errorBoundaryProps}>
        <Component {...props} ref={ref} />
      </ComponentErrorBoundary>
    )
  })

  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name || 'Component'})`
  
  return WrappedComponent
}

// Hook for error handling in functional components
export function useErrorHandler(errorHandler) {
  const [error, setError] = React.useState(null)

  React.useEffect(() => {
    if (error) {
      errorHandler?.(error)
    }
  }, [error, errorHandler])

  const resetError = () => setError(null)
  
  const captureError = React.useCallback((error) => {
    setError(error)
  }, [])

  return { error, resetError, captureError }
}

export default ComponentErrorBoundary