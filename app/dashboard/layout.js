'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import DashboardNavigation from '../../components/DashboardNavigation'

export default function DashboardLayout({ children }) {
  const router = useRouter()

  useEffect(() => {
    // Check if user is authenticated (replace with real auth check)
    const authToken = localStorage.getItem('auth_token')
    if (!authToken) {
      router.push('/login')
      return
    }
  }, [router])

  return (
    <div className="flex min-h-screen bg-gray-50">
      <DashboardNavigation />
      <main className="flex-1 ml-64">
        {children}
      </main>
    </div>
  )
}