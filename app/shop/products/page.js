'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

// Redirect to the consolidated inventory page
export default function ShopProductsRedirect() {
  const router = useRouter()

  useEffect(() => {
    // Redirect to the main inventory page
    router.push('/dashboard/inventory')
  }, [router])

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-olive-600 mx-auto"></div>
        <p className="mt-2 text-sm text-gray-600">Redirecting to Inventory & POS...</p>
      </div>
    </div>
  )
}