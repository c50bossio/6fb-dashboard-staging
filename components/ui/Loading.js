'use client'

/**
 * Standardized Loading components for consistent loading states across the dashboard
 * Replaces scattered loading implementations with reusable components
 */

export function Loading({ size = 'medium', text = 'Loading...', className = '' }) {
  const sizes = {
    small: 'h-6 w-6',
    medium: 'h-12 w-12', 
    large: 'h-16 w-16'
  }
  
  const textSizes = {
    small: 'text-sm',
    medium: 'text-base',
    large: 'text-lg'
  }
  
  return (
    <div className={`flex items-center justify-center ${className}`}>
      <div className="text-center">
        <div className={`animate-spin rounded-full border-b-2 border-olive-600 mx-auto ${sizes[size]}`}></div>
        <p className={`mt-4 text-gray-600 ${textSizes[size]}`}>{text}</p>
      </div>
    </div>
  )
}

/**
 * Full page loading screen
 */
export function FullPageLoading({ text = 'Loading...' }) {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <Loading size="large" text={text} />
    </div>
  )
}

/**
 * Inline loading spinner (no text)
 */
export function LoadingSpinner({ size = 'medium', color = 'olive' }) {
  const sizes = {
    small: 'h-4 w-4',
    medium: 'h-6 w-6',
    large: 'h-8 w-8'
  }
  
  const colors = {
    olive: 'border-olive-600',
    white: 'border-white',
    gray: 'border-gray-600',
    green: 'border-green-600'
  }
  
  return (
    <div className={`animate-spin rounded-full border-b-2 ${colors[color]} ${sizes[size]}`}></div>
  )
}

/**
 * Loading overlay for existing content
 */
export function LoadingOverlay({ isLoading, children, text = 'Loading...' }) {
  if (!isLoading) {
    return children
  }
  
  return (
    <div className="relative">
      <div className="opacity-50 pointer-events-none">
        {children}
      </div>
      <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-75">
        <Loading text={text} />
      </div>
    </div>
  )
}

/**
 * Loading state for lists/tables
 */
export function LoadingList({ items = 3, height = 'h-16' }) {
  return (
    <div className="space-y-4">
      {Array.from({ length: items }).map((_, index) => (
        <div key={index} className={`animate-pulse bg-gray-200 rounded-lg ${height}`}></div>
      ))}
    </div>
  )
}