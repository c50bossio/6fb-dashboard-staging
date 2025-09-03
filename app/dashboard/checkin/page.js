'use client'

import { useAuth } from '../../../components/SupabaseAuthProvider'
import CheckInInterface from '../../../components/customer/CheckInInterface'
import { useEffect, useState } from 'react'

export default function CheckInPage() {
  const { user, profile, loading } = useAuth()
  const [barbershopId, setBarbershopId] = useState(null)

  // Get barbershop ID from user profile
  useEffect(() => {
    if (profile) {
      const shopId = profile.shop_id || profile.barbershop_id
      setBarbershopId(shopId)
    }
  }, [profile])

  // Show loading state while authentication loads
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-dark-bg">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
          <p className="mt-4 text-gray-600 dark:text-dark-text-secondary">Loading check-in system...</p>
        </div>
      </div>
    )
  }

  // Redirect to login if not authenticated
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-dark-bg">
        <div className="text-center">
          <h1 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Access Required</h1>
          <p className="text-gray-600 dark:text-dark-text-secondary mb-6">Please log in to access the check-in system.</p>
          <a href="/login" className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
            Go to Login
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-dark-bg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Customer Check-In</h1>
              <p className="mt-2 text-gray-600 dark:text-dark-text-secondary">
                Search for customers and check them in for their appointments
              </p>
            </div>
            <div className="flex space-x-3">
              <a
                href="/dashboard"
                className="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-600 dark:text-dark-text-secondary bg-white dark:bg-dark-card border border-gray-300 dark:border-dark-border rounded-lg hover:bg-gray-50 dark:hover:bg-dark-hover transition-colors"
              >
                ← Back to Dashboard
              </a>
            </div>
          </div>
        </div>

        {/* Check-In Interface */}
        <div className="bg-white dark:bg-dark-card rounded-lg shadow-sm border border-gray-200 dark:border-dark-border">
          {barbershopId ? (
            <CheckInInterface barbershopId={barbershopId} mode="fullscreen" />
          ) : (
            <div className="p-8 text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mb-4"></div>
              <p className="text-gray-600 dark:text-dark-text-secondary">Loading barbershop information...</p>
            </div>
          )}
        </div>

        {/* Help Section */}
        <div className="mt-8 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6">
          <h2 className="text-lg font-medium text-blue-900 dark:text-blue-100 mb-2">How to Check In Customers</h2>
          <div className="text-sm text-blue-700 dark:text-blue-200 space-y-2">
            <p>1. <strong>Search by Phone:</strong> Enter the customer's phone number to find their appointments</p>
            <p>2. <strong>Select Appointment:</strong> Choose the correct appointment from today's schedule</p>
            <p>3. <strong>Confirm Check-In:</strong> Click the check-in button to mark them as arrived</p>
            <p>4. <strong>Real-Time Updates:</strong> The dashboard will automatically update with the customer's status</p>
          </div>
        </div>
      </div>
    </div>
  )
}