'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

/**
 * Legacy Import Route Redirect
 * This route is deprecated in favor of consolidating import/export in Customer Management
 * Follows simplified UX pattern - all data operations in one predictable location
 */
export default function DataImportRedirect() {
  const router = useRouter()
  
  useEffect(() => {
    // Redirect to Customer Management with import action
    router.replace('/barber/clients?action=import')
  }, [router])

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
        <p className="text-gray-600">Redirecting to Customer Management...</p>
        <p className="text-sm text-gray-500 mt-2">
          Import/export now lives in one convenient location
        </p>
      </div>
    </div>
  )
}