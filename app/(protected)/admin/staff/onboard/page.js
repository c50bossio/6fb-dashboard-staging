'use client'

import { useRouter } from 'next/navigation'
import StaffOnboardingWizard from '@/components/staff/StaffOnboardingWizard'

/**
 * Staff Onboarding Page
 * Admin page for adding new team members
 */
export default function StaffOnboardingPage() {
  const router = useRouter()

  const handleComplete = (staff) => {
    // Navigate back to staff list with success message
    router.push(`/admin/staff?success=true&name=${staff.first_name}`)
  }

  return (
    <div className="min-h-screen bg-background py-8">
      <StaffOnboardingWizard onComplete={handleComplete} />
    </div>
  )
}
