'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

// Simple redirect component from /sign-in to /login
export default function SignInRedirectPage() {
  const router = useRouter()

  useEffect(() => {
    // Preserve any query parameters when redirecting
    const params = new URLSearchParams(window.location.search)
    const queryString = params.toString()
    const redirectUrl = queryString ? `/login?${queryString}` : '/login'
    
    router.replace(redirectUrl)
  }, [router])

  // Show loading state while redirecting
  return (
    <div className="min-h-screen bg-gradient-to-br from-sand-200 via-white to-sand-100 flex items-center justify-center p-4">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-brand-600 border-t-transparent mx-auto mb-4"></div>
        <p className="text-olive-600">Redirecting to login...</p>
      </div>
    </div>
  )
}