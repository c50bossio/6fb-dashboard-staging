'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

// Redirect to the unified dashboard with inventory mode
export default function InventoryPageRedirect() {
  const router = useRouter()

  useEffect(() => {
    // Redirect to the unified dashboard with inventory mode
    router.replace('/dashboard?mode=inventory')
  }, [router])

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-olive-600 mx-auto"></div>
        <p className="mt-2 text-sm text-gray-600">Redirecting to Inventory & POS Dashboard...</p>
      </div>
    </div>
  )
}