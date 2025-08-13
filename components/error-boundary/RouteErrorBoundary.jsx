/**
 * RouteErrorBoundary - Specialized error boundary for route-level errors
 * Handles navigation errors, 404s, and route loading failures
 */

import React from 'react'
import { useRouter } from 'next/router'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Home, ArrowLeft, RefreshCw, AlertCircle } from 'lucide-react'

class RouteErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = {
      hasError: false,
      error: null,
      errorType: null // 'not-found', 'permission', 'network', 'generic'
    }
  }

  static getDerivedStateFromError(error) {
    // Determine error type based on error message or code
    let errorType = 'generic'
    
    if (error.message?.includes('404') || error.message?.includes('not found')) {
      errorType = 'not-found'
    } else if (error.message?.includes('403') || error.message?.includes('unauthorized')) {
      errorType = 'permission'
    } else if (error.message?.includes('network') || error.message?.includes('fetch')) {
      errorType = 'network'
    }

    return {
      hasError: true,
      error,
      errorType
    }
  }

  componentDidCatch(error, errorInfo) {
    console.error('RouteErrorBoundary caught:', error, errorInfo)
    
    // Log navigation errors
    if (typeof window !== 'undefined') {
      const currentPath = window.location.pathname
      console.error(`Route error on path: ${currentPath}`)
    }
  }

  handleGoBack = () => {
    if (typeof window !== 'undefined') {
      window.history.back()
    }
  }

  handleReload = () => {
    if (typeof window !== 'undefined') {
      window.location.reload()
    }
  }

  renderErrorContent() {
    const { errorType, error } = this.state

    switch (errorType) {
      case 'not-found':
        return (
          <>
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 h-12 w-12 text-gray-400">
                <AlertCircle className="h-full w-full" />
              </div>
              <CardTitle className="text-2xl">Page Not Found</CardTitle>
              <CardDescription>
                The page you're looking for doesn't exist or has been moved.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              <Link href="/dashboard" passHref>
                <Button className="w-full">
                  <Home className="mr-2 h-4 w-4" />
                  Go to Dashboard
                </Button>
              </Link>
              <Button variant="outline" onClick={this.handleGoBack}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Go Back
              </Button>
            </CardContent>
          </>
        )

      case 'permission':
        return (
          <>
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 h-12 w-12 text-amber-800">
                <AlertCircle className="h-full w-full" />
              </div>
              <CardTitle className="text-2xl">Access Denied</CardTitle>
              <CardDescription>
                You don't have permission to view this page.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              <Link href="/dashboard" passHref>
                <Button className="w-full">
                  <Home className="mr-2 h-4 w-4" />
                  Go to Dashboard
                </Button>
              </Link>
              <Link href="/login" passHref>
                <Button variant="outline" className="w-full">
                  Sign In Again
                </Button>
              </Link>
            </CardContent>
          </>
        )

      case 'network':
        return (
          <>
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 h-12 w-12 text-red-500">
                <AlertCircle className="h-full w-full" />
              </div>
              <CardTitle className="text-2xl">Connection Error</CardTitle>
              <CardDescription>
                We're having trouble connecting to our servers.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="text-sm text-gray-600 space-y-2">
                <p>Please check your internet connection and try again.</p>
                <p>If the problem persists, our services may be temporarily unavailable.</p>
              </div>
              <div className="flex flex-col gap-3">
                <Button onClick={this.handleReload} className="w-full">
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Try Again
                </Button>
                <Button variant="outline" onClick={this.handleGoBack} className="w-full">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Go Back
                </Button>
              </div>
            </CardContent>
          </>
        )

      default:
        return (
          <>
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 h-12 w-12 text-red-500">
                <AlertCircle className="h-full w-full" />
              </div>
              <CardTitle className="text-2xl">Something Went Wrong</CardTitle>
              <CardDescription>
                An unexpected error occurred while loading this page.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {process.env.NODE_ENV === 'development' && error && (
                <div className="bg-gray-100 rounded p-3 text-xs font-mono overflow-auto max-h-32">
                  {error.toString()}
                </div>
              )}
              <div className="flex flex-col gap-3">
                <Button onClick={this.handleReload} className="w-full">
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Reload Page
                </Button>
                <Link href="/dashboard" passHref>
                  <Button variant="outline" className="w-full">
                    <Home className="mr-2 h-4 w-4" />
                    Go to Dashboard
                  </Button>
                </Link>
              </div>
            </CardContent>
          </>
        )
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50">
          <Card className="max-w-md w-full">
            {this.renderErrorContent()}
          </Card>
        </div>
      )
    }

    return this.props.children
  }
}

// Hook version for functional components
export function useRouteError() {
  const router = useRouter()
  const [error, setError] = React.useState(null)

  React.useEffect(() => {
    const handleRouteError = (err) => {
      console.error('Route error:', err)
      setError(err)
    }

    router.events.on('routeChangeError', handleRouteError)

    return () => {
      router.events.off('routeChangeError', handleRouteError)
    }
  }, [router])

  return error
}

export default RouteErrorBoundary