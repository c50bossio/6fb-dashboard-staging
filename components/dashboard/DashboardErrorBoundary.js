'use client'

import React from 'react'
import { ExclamationTriangleIcon, ArrowPathIcon } from '@heroicons/react/24/outline'

class DashboardErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null, errorInfo: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true }
  }

  componentDidCatch(error, errorInfo) {
    console.error('Dashboard Error Boundary caught an error:', error, errorInfo)
    this.setState({
      error: error,
      errorInfo: errorInfo
    })
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null })
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-gray-50 dark:bg-dark-bg">
          <div className="flex items-center justify-center min-h-screen p-4">
            <div className="bg-white dark:bg-dark-bg-elevated-1 rounded-xl shadow-lg border border-gray-200 dark:border-dark-bg-elevated-6 p-8 max-w-md w-full text-center">
              <div className="flex justify-center mb-4">
                <ExclamationTriangleIcon className="h-12 w-12 text-amber-500" />
              </div>
              
              <h2 className="text-xl font-semibold text-gray-900 dark:text-dark-text-primary mb-2">
                Dashboard Error
              </h2>
              
              <p className="text-gray-600 dark:text-dark-text-secondary mb-6">
                Something went wrong while loading your dashboard. This is likely a temporary issue.
              </p>

              {process.env.NODE_ENV === 'development' && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-6 text-left">
                  <h3 className="text-sm font-medium text-red-800 dark:text-red-200 mb-2">
                    Development Error Details:
                  </h3>
                  <pre className="text-xs text-red-700 dark:text-red-300 overflow-auto max-h-32">
                    {this.state.error && this.state.error.toString()}
                    {this.state.errorInfo.componentStack}
                  </pre>
                </div>
              )}
              
              <div className="space-y-3">
                <button
                  onClick={this.handleReset}
                  className="w-full inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-amber-600 hover:bg-amber-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-500"
                >
                  <ArrowPathIcon className="h-4 w-4 mr-2" />
                  Try Again
                </button>
                
                <button
                  onClick={() => window.location.reload()}
                  className="w-full inline-flex items-center justify-center px-4 py-2 border border-gray-300 dark:border-dark-bg-elevated-6 text-sm font-medium rounded-md text-gray-700 dark:text-dark-text-secondary bg-white dark:bg-dark-bg-elevated-2 hover:bg-gray-50 dark:hover:bg-dark-bg-elevated-3 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-500"
                >
                  Refresh Page
                </button>
              </div>

              <p className="text-xs text-gray-500 dark:text-dark-text-muted mt-4">
                If this problem persists, please contact support with the error details above.
              </p>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

export default DashboardErrorBoundary