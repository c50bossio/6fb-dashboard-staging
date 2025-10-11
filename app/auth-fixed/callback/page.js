'use client'

export const dynamic = 'force-dynamic'

import { createBrowserClient } from '@supabase/ssr'
import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'

export default function AuthCallback() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [status, setStatus] = useState('Processing authentication...')

  useEffect(() => {
    const handleCallback = async () => {
      try {
        const code = searchParams.get('code')
        const error = searchParams.get('error')
        const error_description = searchParams.get('error_description')

        if (error) {
          setStatus(`Error: ${error_description || error}`)
          setTimeout(() => router.push('/auth-fixed'), 3000)
          return
        }

        if (!code) {
          setStatus('No authorization code received')
          setTimeout(() => router.push('/auth-fixed'), 3000)
          return
        }

        const supabase = createBrowserClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
        )

        // Exchange code for session
        const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)

        if (exchangeError) {
          setStatus(`Exchange error: ${exchangeError.message}`)
          setTimeout(() => router.push('/auth-fixed'), 3000)
          return
        }

        if (data?.session) {
          setStatus('✅ Authentication successful! Redirecting...')
          setTimeout(() => router.push('/test-dashboard'), 2000)
        } else {
          setStatus('No session received')
          setTimeout(() => router.push('/auth-fixed'), 3000)
        }
      } catch (err) {
        setStatus(`Error: ${err.message}`)
        setTimeout(() => router.push('/auth-fixed'), 3000)
      }
    }

    handleCallback()
  }, [searchParams, router])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded-lg shadow-lg text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4"></div>
        <p className="text-lg">{status}</p>
      </div>
    </div>
  )
}