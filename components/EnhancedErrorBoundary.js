'use client'

import React from 'react'
import { ExclamationTriangleIcon, ArrowPathIcon } from '@heroicons/react/24/outline'

class EnhancedErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: 0,
      errorId: null
    }
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI
    return {
      hasError: true,
      error,
      errorId: `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    }
  }

  componentDidCatch(error, errorInfo) {
    // Log error details
    console.error('ErrorBoundary caught an error:', error, errorInfo)
    
    this.setState({
      error,
      errorInfo,
      errorId: `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    })

    // Report error to monitoring service
    this.reportError(error, errorInfo)
  }

  reportError = async (error, errorInfo) => {
    try {
      // Send error report to backend
      await fetch('/api/errors/report', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          error: {
            message: error.message,
            stack: error.stack,
            name: error.name
          },
          errorInfo: {
            componentStack: errorInfo.componentStack
          },
          context: {
            url: typeof window !== 'undefined' ? window.location.href : '',
            userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
            timestamp: new Date().toISOString(),
            errorId: this.state.errorId,
            component: this.props.componentName || 'Unknown'
          }
        })
      })
    } catch (reportError) {
      console.error('Failed to report error:', reportError)
    }
  }

  handleRetry = () => {
    this.setState(prevState => ({
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: prevState.retryCount + 1,
      errorId: null
    }))

    // Call onRetry callback if provided
    if (this.props.onRetry) {
      this.props.onRetry()
    }
  }

  handleReload = () => {
    if (typeof window !== 'undefined') {
      window.location.reload()
    }
  }

  render() {
    if (this.state.hasError) {
      // Custom fallback UI based on error severity
      const errorType = this.getErrorType(this.state.error)
      
      return (
        <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
          <div className="sm:mx-auto sm:w-full sm:max-w-md">
            <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
              <div className="text-center">
                <ExclamationTriangleIcon className="mx-auto h-16 w-16 text-red-500" />
                
                <h2 className="mt-4 text-2xl font-bold text-gray-900">
                  {this.getErrorTitle(errorType)}
                </h2>
                
                <p className="mt-2 text-sm text-gray-600">
                  {this.getErrorMessage(errorType)}
                </p>

                {/* Error ID for support */}
                <div className="mt-4 p-3 bg-gray-100 rounded-md">
                  <p className="text-xs text-gray-500">
                    Error ID: <code className="font-mono">{this.state.errorId}</code>
                  </p>
                </div>

                {/* Action buttons */}
                <div className="mt-6 space-y-3">
                  {this.state.retryCount < 3 && (
                    <button
                      onClick={this.handleRetry}
                      className="w-full flex justify-center items-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-amber-600 hover:bg-amber-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-500"
                    >
                      <ArrowPathIcon className="mr-2 h-4 w-4" />
                      Try Again {this.state.retryCount > 0 && `(${this.state.retryCount}/3)`}
                    </button>
                  )}
                  
                  <button
                    onClick={this.handleReload}
                    className="w-full flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-500"
                  >
                    Reload Page
                  </button>

                  {/* Fallback navigation */}
                  <div className="mt-6 border-t border-gray-200 pt-4">
                    <p className="text-xs text-gray-500 mb-2">Quick Navigation:</p>
                    <div className="grid grid-cols-2 gap-2">
                      <a
                        href="/dashboard"
                        className="text-xs text-amber-700 hover:text-amber-700 text-center py-2 px-3 border border-amber-200 rounded hover:bg-amber-50"
                      >
                        Dashboard
                      </a>
                      <a
                        href="/ai-agents"
                        className="text-xs text-amber-700 hover:text-amber-700 text-center py-2 px-3 border border-amber-200 rounded hover:bg-amber-50"
                      >
                        AI Agents
                      </a>
                    </div>
                  </div>
                </div>

                {/* Debug info in development */}
                {process.env.NODE_ENV === 'development' && this.state.error && (
                  <details className="mt-6 text-left">
                    <summary className="cursor-pointer text-sm text-gray-500 hover:text-gray-700">
                      Debug Information
                    </summary>
                    <div className="mt-2 p-3 bg-red-50 rounded-md">
                      <pre className="text-xs text-red-800 overflow-auto">
                        {this.state.error.stack}
                      </pre>
                      {this.state.errorInfo && (
                        <pre className="mt-2 text-xs text-red-700 overflow-auto">
                          {this.state.errorInfo.componentStack}
                        </pre>
                      )}
                    </div>
                  </details>
                )}
              </div>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }

  getErrorType(error) {
    if (!error) return 'unknown'
    
    const errorMessage = error.message?.toLowerCase() || ''
    const errorName = error.name?.toLowerCase() || ''

    // Network/API errors
    if (errorMessage.includes('fetch') || errorMessage.includes('network') || 
        errorMessage.includes('connection') || errorName.includes('typeerror')) {
      return 'network'
    }
    
    // Authentication errors
    if (errorMessage.includes('unauthorized') || errorMessage.includes('auth')) {
      return 'auth'
    }
    
    // Chunk loading errors (common in React apps)
    if (errorMessage.includes('chunk') || errorMessage.includes('loading')) {
      return 'chunk'
    }
    
    // Memory errors
    if (errorMessage.includes('memory') || errorMessage.includes('allocation')) {
      return 'memory'
    }

    return 'generic'
  }

  getErrorTitle(errorType) {
    const titles = {
      network: 'Connection Problem',
      auth: 'Authentication Error',
      chunk: 'Loading Error',
      memory: 'Memory Error',
      generic: 'Something went wrong',
      unknown: 'Unexpected Error'
    }
    return titles[errorType] || titles.generic
  }

  getErrorMessage(errorType) {
    const messages = {
      network: 'We\'re having trouble connecting to our services. Please check your internet connection and try again.',
      auth: 'There was an issue with your authentication. Please try logging in again.',
      chunk: 'Failed to load part of the application. This is usually fixed by refreshing the page.',
      memory: 'The application is using too much memory. Refreshing the page should resolve this.',
      generic: 'An unexpected error occurred. Our team has been notified and is working to fix it.',
      unknown: 'An unexpected error occurred. Please try refreshing the page.'
    }
    return messages[errorType] || messages.generic
  }
}

// HOC for easy wrapping of components
export const withErrorBoundary = (WrappedComponent, componentName) => {
  return function ErrorBoundaryWrapped(props) {
    return (
      <EnhancedErrorBoundary componentName={componentName}>
        <WrappedComponent {...props} />
      </EnhancedErrorBoundary>
    )
  }
}

// Hook for error reporting
export const useErrorReporting = () => {
  const reportError = async (error, context = {}) => {
    try {
      await fetch('/api/errors/report', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          error: {
            message: error.message,
            stack: error.stack,
            name: error.name
          },
          context: {
            ...context,
            url: typeof window !== 'undefined' ? window.location.href : '',
            userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
            timestamp: new Date().toISOString()
          }
        })
      })
    } catch (reportError) {
      console.error('Failed to report error:', reportError)
    }
  }

  return { reportError }
}

export default EnhancedErrorBoundary