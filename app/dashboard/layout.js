'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import DashboardNavigation from '../../components/DashboardNavigation'

export default function DashboardLayout({ children }) {
  const router = useRouter()

  useEffect(() => {
    // Temporarily disabled authentication check for testing
    // const authToken = localStorage.getItem('access_token')
    // if (!authToken) {
    //   router.push('/login')
    //   return
    // }
    console.log('Dashboard loaded - auth check disabled for testing')
  }, [router])

  return (
    <div className="flex min-h-screen bg-gray-50">
      <DashboardNavigation />
      <main className="flex-1 ml-72">
        {children}
      </main>
    </div>
  )
}