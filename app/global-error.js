'use client'

import { useEffect } from 'react'

export default function GlobalError({ error, reset }) {
  useEffect(() => {
    // Log error for debugging
    console.error('Global error caught:', error)
    
    // Try to send to Sentry if available
    try {
      if (typeof window !== 'undefined' && window.Sentry) {
        window.Sentry.captureException(error)
      }
    } catch (sentryError) {
      console.warn('Sentry not available for error reporting')
    }
  }, [error])

  return (
    <html>
      <body>
        <div className="min-h-screen flex items-center justify-center bg-gray-100">
          <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full">
            <h1 className="text-2xl font-bold text-red-600 mb-4">Something went wrong!</h1>
            <p className="text-gray-600 mb-6">
              We apologize for the inconvenience. Our team has been notified and is working on fixing this issue.
            </p>
            <button
              onClick={() => reset()}
              className="w-full bg-olive-600 text-white py-2 px-4 rounded-md hover:bg-olive-700 transition-colors"
            >
              Try again
            </button>
          </div>
        </div>
      </body>
    </html>
  )
}