'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/browser-client-simple'

export default function MinimalAuthCallback() {
  const router = useRouter()
  const [status, setStatus] = useState('processing')
  const [message, setMessage] = useState('Initializing...')
  
  useEffect(() => {
    const handleCallback = async () => {
      try {
        setMessage('Creating Supabase client...')
        const supabase = createClient()
        
        // Try to get session with a timeout
        setMessage('Checking session...')
        const sessionPromise = supabase.auth.getSession()
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Timeout')), 3000)
        )
        
        try {
          const result = await Promise.race([
            sessionPromise,
            timeoutPromise
          ])
          
          if (result?.data?.session) {
            setStatus('success')
            setMessage('Success! Redirecting...')
            setTimeout(() => router.push('/dashboard'), 1000)
          } else {
            setStatus('error')
            setMessage('No session found')
          }
        } catch (timeoutError) {
          setStatus('error')
          setMessage('Session check timed out - Supabase client may be misconfigured')
        }
      } catch (error) {
        setStatus('error')
        setMessage(`Error: ${error.message}`)
      }
    }
    
    handleCallback()
  }, [router])
  
  return (
    <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-2xl font-bold mb-4">Processing OAuth...</h1>
        <div className={`text-lg ${status === 'error' ? 'text-red-500' : status === 'success' ? 'text-green-500' : 'text-gray-300'}`}>
          {message}
        </div>
        {status === 'processing' && (
          <div className="mt-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto"></div>
          </div>
        )}
        {status === 'error' && (
          <button 
            onClick={() => router.push('/login')}
            className="mt-4 px-4 py-2 bg-gray-700 rounded hover:bg-gray-600"
          >
            Back to Login
          </button>
        )}
      </div>
    </div>
  )
}