'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function SubscribeRedirect() {
  const router = useRouter()
  
  useEffect(() => {
    router.replace('/pricing')
  }, [router])
  
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4"></div>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">
          Redirecting to New Signup Flow...
        </h2>
        <p className="text-gray-600">
          Taking you to our clean, modern pricing page.
        </p>
      </div>
    </div>
  )
}