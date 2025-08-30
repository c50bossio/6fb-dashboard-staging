'use client'

import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

export default function DashboardBypass() {
  const router = useRouter()
  
  useEffect(() => {
    // Force dev auth and redirect to dashboard
    localStorage.setItem('forceDevAuth', 'true')
    router.push('/dashboard?devauth=true')
  }, [router])
  
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-4 text-gray-600">Setting up development access...</p>
      </div>
    </div>
  )
}