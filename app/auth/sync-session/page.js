'use client'

export const dynamic = 'force-dynamic'

import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import { syncSessionFromServer } from '../../../lib/supabase/session-sync.js'

/**
 * Session Sync Page
 * 
 * This page is called after OAuth callback to ensure session data is properly
 * synchronized between server-side cookies and client-side localStorage.
 * 
 * This fixes the "session from storage null" issue.
 */
export default function SessionSync() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [status, setStatus] = useState('syncing')
  const [error, setError] = useState(null)
  const [debug, setDebug] = useState([])

  const addDebug = (message) => {
    setDebug(prev => [...prev, `${new Date().toISOString()}: ${message}`])
    console.log(`[Session Sync Page] ${message}`)
  }

  useEffect(() => {
    async function performSync() {
      try {
        addDebug('Starting session synchronization...')
        
        // Perform the session sync
        const result = await syncSessionFromServer()
        
        if (result.success) {
          addDebug(`✅ Session sync successful - User ID: ${result.session?.user?.id}`)
          setStatus('success')
          
          // Get redirect destination
          const redirectTo = searchParams.get('redirect') || 
                           searchParams.get('return_url') || 
                           searchParams.get('next') || 
                           '/dashboard'
          
          addDebug(`🔄 Redirecting to: ${redirectTo}`)
          
          // Small delay to ensure localStorage is updated
          setTimeout(() => {
            router.push(redirectTo)
          }, 1000)
          
        } else {
          addDebug(`❌ Session sync failed: ${result.error}`)
          setError(result.error)
          setStatus('error')
          
          // Redirect to login after delay
          setTimeout(() => {
            router.push('/login?error=session_sync_failed')
          }, 3000)
        }
        
      } catch (err) {
        const errorMsg = err.message || 'Unknown error'
        addDebug(`💥 Session sync error: ${errorMsg}`)
        setError(errorMsg)
        setStatus('error')
        
        // Redirect to login after delay
        setTimeout(() => {
          router.push('/login?error=session_sync_error')
        }, 3000)
      }
    }

    performSync()
  }, [router, searchParams])

  if (status === 'syncing') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Finalizing Sign In
            </h2>
            <p className="text-gray-600 mb-4">
              Setting up your session...
            </p>
            
            {debug.length > 0 && (
              <details className="text-left mt-6">
                <summary className="text-sm text-gray-500 cursor-pointer hover:text-gray-700">
                  Debug Info
                </summary>
                <div className="mt-2 text-xs text-gray-400 bg-gray-50 p-3 rounded max-h-32 overflow-y-auto">
                  {debug.map((msg, idx) => (
                    <div key={idx} className="mb-1">{msg}</div>
                  ))}
                </div>
              </details>
            )}
          </div>
        </div>
      </div>
    )
  }

  if (status === 'success') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
          <div className="text-center">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 mb-4">
              <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Sign In Complete!
            </h2>
            <p className="text-gray-600">
              Redirecting you to your dashboard...
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
        <div className="text-center">
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
            <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Sign In Error
          </h2>
          <p className="text-gray-600 mb-4">
            There was a problem setting up your session.
          </p>
          {error && (
            <div className="text-sm text-red-600 bg-red-50 p-3 rounded mb-4">
              {error}
            </div>
          )}
          <p className="text-sm text-gray-500">
            Redirecting to login page...
          </p>
          
          {debug.length > 0 && (
            <details className="text-left mt-6">
              <summary className="text-sm text-gray-500 cursor-pointer hover:text-gray-700">
                Debug Info
              </summary>
              <div className="mt-2 text-xs text-gray-400 bg-gray-50 p-3 rounded max-h-32 overflow-y-auto">
                {debug.map((msg, idx) => (
                  <div key={idx} className="mb-1">{msg}</div>
                ))}
              </div>
            </details>
          )}
        </div>
      </div>
    </div>
  )
}