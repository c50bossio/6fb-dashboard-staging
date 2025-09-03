'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function StaffSettingsRedirect() {
  const router = useRouter()

  useEffect(() => {
    // Redirect to the main staff management page
    router.replace('/shop/barbers')
  }, [router])

  // Show a brief loading state while redirecting
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
        <p className="mt-4 text-gray-600">Redirecting to Staff Management...</p>
        <p className="text-sm text-gray-500 mt-2">
          Staff management has moved to the Barber Management page
        </p>
      </div>
    </div>
  )
}