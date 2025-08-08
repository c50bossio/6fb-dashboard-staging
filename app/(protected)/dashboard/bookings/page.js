'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function BookingsPage() {
  const router = useRouter()
  
  useEffect(() => {
    // Redirect to the stable calendar implementation
    router.push('/dashboard/calendar')
  }, [router])
  
  return (
    <div className="flex items-center justify-center h-screen">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-4 text-gray-600">Redirecting to calendar...</p>
      </div>
    </div>
  )
}