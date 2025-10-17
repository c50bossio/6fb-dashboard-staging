'use client'

import { Component } from 'react'
import { ExclamationTriangleIcon, ArrowPathIcon, ChartBarIcon } from '@heroicons/react/24/outline'

class AnalyticsErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null, errorInfo: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true }
  }

  componentDidCatch(error, errorInfo) {
    console.error('Analytics Error Boundary caught an error:', error, errorInfo)
    this.setState({ error, errorInfo })

    // Send to Sentry if configured
    if (typeof window !== 'undefined' && process.env.NEXT_PUBLIC_SENTRY_DSN) {
      import('@sentry/nextjs').then((Sentry) => {
        Sentry.captureException(error, {
          contexts: { react: { componentStack: errorInfo.componentStack } },
          tags: { errorBoundary: 'Analytics' },
        })
      }).catch((err) => console.warn('Failed to report analytics error:', err))
    }
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null })
    if (this.props.onReset) this.props.onReset()
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-amber-200 dark:border-amber-800 p-6">
          <div className="flex items-start space-x-4">
            <div className="flex-shrink-0">
              <div className="w-12 h-12 bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center">
                <ExclamationTriangleIcon className="h-6 w-6 text-amber-600" />
              </div>
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-1">
                Analytics Loading Error
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                Unable to load analytics data. Your data is safe.
              </p>
              {process.env.NODE_ENV === 'development' && this.state.error && (
                <div className="mb-4 p-3 bg-gray-100 dark:bg-gray-700 rounded text-xs font-mono text-red-600">
                  {this.state.error.toString()}
                </div>
              )}
              <div className="flex items-center space-x-3">
                <button
                  onClick={this.handleReset}
                  className="inline-flex items-center px-4 py-2 bg-amber-600 text-white rounded-md hover:bg-amber-700 text-sm font-medium"
                >
                  <ArrowPathIcon className="h-4 w-4 mr-2" />
                  Retry
                </button>
                <button
                  onClick={() => window.location.href = '/dashboard'}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 text-sm"
                >
                  <ChartBarIcon className="h-4 w-4 mr-2" />
                  Dashboard
                </button>
              </div>
            </div>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}

export default AnalyticsErrorBoundary
