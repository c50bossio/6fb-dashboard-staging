'use client'

import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

export default function StaffPage() {
  const router = useRouter()

  useEffect(() => {
    // Redirect to the enhanced staff management page
    router.replace('/shop/settings/staff')
  }, [router])

  // Show a brief loading state during redirect
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-olive-600 mx-auto"></div>
        <p className="mt-2 text-sm text-gray-600">Redirecting to Staff Management...</p>
      </div>
    </div>
  )
}