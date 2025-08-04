'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import DashboardLayout from '../../components/layout/DashboardLayout'

export default function DashboardLayoutWrapper({ children }) {
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
    <DashboardLayout>
      {children}
    </DashboardLayout>
  )
}