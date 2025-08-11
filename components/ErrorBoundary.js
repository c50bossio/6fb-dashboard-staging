'use client'

import React from 'react'

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null, errorInfo: null }
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI
    return { hasError: true }
  }

  componentDidCatch(error, errorInfo) {
    // Safely log error to console with multiple safety layers
    try {
      // Try to safely stringify the error first
      const safeError = {
        message: error?.message || 'Unknown error',
        stack: error?.stack || 'No stack trace',
        name: error?.name || 'Error'
      }
      
      // Use a safer logging approach
      console.group('🚨 ErrorBoundary caught an error')
      console.log('Error message:', safeError.message)
      console.log('Error name:', safeError.name)
      if (errorInfo?.componentStack) {
        console.log('Component stack:', errorInfo.componentStack)
      }
      console.groupEnd()
    } catch (logError) {
      // Even safer fallback - just log a simple string
      try {
        console.log('ErrorBoundary: An error occurred but could not be logged safely')
      } catch (e) {
        // Last resort - do nothing, avoid any potential infinite loops
      }
    }
    
    this.setState({
      error,
      errorInfo
    })

    // You can also log the error to an error reporting service here
    if (typeof window !== 'undefined' && process.env.NODE_ENV === 'production') {
      // Example: Send to error tracking service
      // errorTrackingService.captureException(error, { extra: errorInfo })
    }
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null })
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
          <div className="sm:mx-auto sm:w-full sm:max-w-md">
            <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
              <div className="text-center">
                <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
                  <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                </div>
                <h3 className="mt-2 text-lg font-medium text-gray-900">Something went wrong</h3>
                <p className="mt-1 text-sm text-gray-500">
                  We're sorry, but something unexpected happened. Please try again.
                </p>
                
                {process.env.NODE_ENV === 'development' && this.state.error && (
                  <details className="mt-4 text-left">
                    <summary className="text-sm font-medium text-gray-700 cursor-pointer">
                      Error Details (Development Only)
                    </summary>
                    <div className="mt-2 p-3 bg-red-50 rounded-md">
                      <p className="text-xs text-red-700 font-mono whitespace-pre-wrap">
                        {(() => {
                          try {
                            // Safely convert error to string
                            if (typeof this.state.error === 'string') {
                              return this.state.error
                            }
                            return this.state.error?.message || this.state.error?.toString() || 'Unknown error'
                          } catch (e) {
                            return 'Error details could not be displayed'
                          }
                        })()}
                      </p>
                      {this.state.errorInfo?.componentStack && (
                        <div className="mt-2">
                          <p className="text-xs text-red-600 font-mono whitespace-pre-wrap">
                            {this.state.errorInfo.componentStack}
                          </p>
                        </div>
                      )}
                    </div>
                  </details>
                )}
                
                <div className="mt-5 flex flex-col sm:flex-row gap-3">
                  <button
                    onClick={this.handleReset}
                    className="inline-flex justify-center rounded-md border border-transparent bg-blue-600 py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
                  >
                    Try Again
                  </button>
                  <button
                    onClick={() => window.location.href = '/dashboard'}
                    className="inline-flex justify-center rounded-md border border-gray-300 bg-white py-2 px-4 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
                  >
                    Go to Dashboard
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

export default ErrorBoundary