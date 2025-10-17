'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function BillingRedirect() {
  const router = useRouter()

  useEffect(() => {
    // Redirect to the new unified finance page
    router.replace('/finance')
  }, [router])

  // Show a brief loading state while redirecting
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500 mx-auto"></div>
        <p className="mt-4 text-gray-600">Redirecting to Finance Center...</p>
        <p className="text-sm text-gray-500 mt-2">
          Billing and subscription management has moved to our unified Finance Center
        </p>
      </div>
    </div>
  )
}