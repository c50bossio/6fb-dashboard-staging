'use client'

import { useParams } from 'next/navigation'

export default function BarberSettings() {
  // Simplified component for build compatibility - will be restored later
  const params = useParams()
  const barbershopId = params.barbershopId

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Settings</h1>
      <p>Settings page for barbershop: {barbershopId}</p>
      <p className="text-sm text-gray-600 mt-4">
        This page is temporarily simplified to resolve build issues. Full functionality will be restored.
      </p>
    </div>
  )
}