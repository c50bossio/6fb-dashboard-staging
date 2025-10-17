'use client'

import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

export default function CallbackProcessPage() {
  const router = useRouter()

  useEffect(() => {
    // This page handles the OAuth callback
    // The actual auth processing is done by Supabase client-side
    const handleCallback = async () => {
      // Get the redirect URL from session storage if available
      const redirectTo = sessionStorage.getItem('authRedirectTo') || '/dashboard'
      sessionStorage.removeItem('authRedirectTo')
      
      // Small delay to ensure Supabase has processed the auth
      setTimeout(() => {
        router.push(redirectTo)
      }, 100)
    }

    handleCallback()
  }, [router])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-olive-600 mx-auto"></div>
        <p className="mt-4 text-gray-600">Processing authentication...</p>
      </div>
    </div>
  )
}