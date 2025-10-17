'use client'

/**
 * Authentication Error Boundary
 * Provides additional protection around authentication components
 * Catches and handles auth-related errors gracefully
 */

import React from 'react'

class AuthErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { 
      hasError: false, 
      error: null,
      errorInfo: null,
      retryCount: 0
    }
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI
    return { hasError: true, error }
  }

  componentDidCatch(error, errorInfo) {
    // Log the error with auth context
    console.error('🔐 AuthErrorBoundary caught an error:', error, errorInfo)
    
    // Simple error logging without circular dependencies
    console.error('🔐 Auth Error Details:', {
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      errorBoundary: true,
      retryCount: this.state.retryCount,
      context: 'auth_boundary'
    })

    this.setState({
      error,
      errorInfo,
      hasError: true
    })
  }

  handleRetry = () => {
    this.setState(prevState => ({
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: prevState.retryCount + 1
    }))
  }

  handleClearAuth = () => {
    // Clear any auth state and redirect to login
    if (typeof window !== 'undefined') {
      // Clear localStorage auth items
      const authKeys = ['supabase.auth.token', 'sb-auth-token']
      authKeys.forEach(key => {
        try {
          localStorage.removeItem(key)
        } catch (e) {
          // Ignore localStorage errors
        }
      })
      
      // Redirect to login
      window.location.href = '/login'
    }
  }

  render() {
    if (this.state.hasError) {
      const { error, retryCount } = this.state
      const isDevelopment = process.env.NODE_ENV === 'development'
      
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
          <div className="max-w-md w-full space-y-8">
            <div className="text-center">
              <div className="mx-auto h-12 w-12 text-red-600 mb-4">
                🔐
              </div>
              <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
                Authentication Error
              </h2>
              <p className="mt-2 text-sm text-gray-600">
                {isDevelopment 
                  ? 'There was an issue with the authentication system in development mode.'
                  : 'Please try signing in again.'
                }
              </p>
              
              {isDevelopment && error && (
                <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg text-left">
                  <h3 className="text-sm font-medium text-red-800 mb-2">
                    Development Error Details:
                  </h3>
                  <p className="text-sm text-red-700 font-mono">
                    {error.message}
                  </p>
                </div>
              )}
            </div>

            <div className="space-y-3">
              {retryCount < 3 && (
                <button
                  onClick={this.handleRetry}
                  className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  Try Again {retryCount > 0 && `(${retryCount + 1}/3)`}
                </button>
              )}
              
              <button
                onClick={this.handleClearAuth}
                className="group relative w-full flex justify-center py-2 px-4 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                Clear Session & Sign In
              </button>
              
              {isDevelopment && (
                <a
                  href="/test-dev-auth"
                  className="group relative w-full flex justify-center py-2 px-4 border border-green-300 text-sm font-medium rounded-md text-green-700 bg-green-50 hover:bg-green-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                >
                  Development Auth Bypass
                </a>
              )}
            </div>

            <div className="text-center">
              <p className="text-xs text-gray-500">
                {isDevelopment 
                  ? 'This error boundary prevents auth crashes in development'
                  : 'If the problem persists, please contact support'
                }
              </p>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

export default AuthErrorBoundary