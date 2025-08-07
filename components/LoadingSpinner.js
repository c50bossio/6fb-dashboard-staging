'use client'

import { SparklesIcon } from '@heroicons/react/24/outline'

export default function LoadingSpinner({ size = 'medium', className = '', fullScreen = false, text = '' }) {
  const sizeClasses = {
    small: 'h-4 w-4',
    medium: 'h-8 w-8',
    large: 'h-12 w-12'
  }

  const spinner = (
    <div className={`inline-flex items-center justify-center ${className}`}>
      <div
        className={`${sizeClasses[size]} animate-spin rounded-full border-2 border-gray-300 border-t-blue-600`}
        role="status"
        aria-label="Loading"
      >
        <span className="sr-only">Loading...</span>
      </div>
    </div>
  )

  if (fullScreen) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex flex-col justify-center items-center py-12 sm:px-6 lg:px-8">
        <div className="text-center">
          <div className="mb-8">
            <div className="h-16 w-16 bg-gradient-to-br from-blue-600 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg mx-auto animate-pulse">
              <span className="text-white font-bold text-xl">6FB</span>
            </div>
          </div>
          {spinner}
          <p className="mt-6 text-lg text-gray-700 font-medium">
            {text || 'Loading your AI-powered dashboard...'}
          </p>
          <div className="mt-4 flex items-center justify-center text-blue-600">
            <SparklesIcon className="w-5 h-5 mr-2 animate-bounce" />
            <span className="text-sm">Preparing your AI agents</span>
          </div>
        </div>
      </div>
    )
  }

  return spinner
}

export function CardLoadingSkeleton() {
  return (
    <div className="card animate-pulse">
      <div className="flex items-center space-x-4">
        <div className="h-10 w-10 bg-gray-200 rounded-lg"></div>
        <div className="flex-1 space-y-2">
          <div className="h-4 bg-gray-200 rounded w-3/4"></div>
          <div className="h-3 bg-gray-200 rounded w-1/2"></div>
        </div>
      </div>
    </div>
  )
}

export function TableLoadingSkeleton({ rows = 5 }) {
  return (
    <div className="card">
      <div className="animate-pulse">
        <div className="h-4 bg-gray-200 rounded w-1/4 mb-6"></div>
        <div className="divide-y divide-gray-200">
          {Array.from({ length: rows }).map((_, i) => (
            <div key={i} className="py-4 flex items-center space-x-4">
              <div className="h-8 w-8 bg-gray-200 rounded-full"></div>
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              </div>
              <div className="h-4 bg-gray-200 rounded w-16"></div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}