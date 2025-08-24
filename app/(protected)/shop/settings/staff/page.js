'use client'

import dynamic from 'next/dynamic'

// Dynamically import the enhanced dashboard to avoid SSR issues
const StaffManagementDashboard = dynamic(
  () => import('@/components/staff/StaffManagementDashboard'),
  { 
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-olive-600"></div>
      </div>
    )
  }
)

export default function StaffSettingsPage() {
  return <StaffManagementDashboard />
}