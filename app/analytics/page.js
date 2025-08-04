'use client'

import { useState } from 'react'
import ProtectedRoute from '@/components/ProtectedRoute'
import TenantAnalyticsDashboard from '@/components/analytics/TenantAnalyticsDashboard'
import { useTenant } from '@/contexts/TenantContext'
import { ArrowLeftIcon } from '@heroicons/react/24/outline'
import { useRouter } from 'next/navigation'

export default function AnalyticsPage() {
  const router = useRouter()
  const { tenant, tenantName, businessName } = useTenant()

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50">
        {/* Header Navigation */}
        <div className="bg-white border-b border-gray-200 px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => router.push('/dashboard')}
                className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition-colors"
              >
                <ArrowLeftIcon className="h-5 w-5" />
                <span className="text-sm font-medium">Back to Dashboard</span>
              </button>
              
              <div className="h-6 w-px bg-gray-300"></div>
              
              <div>
                <h1 className="text-xl font-semibold text-gray-900">
                  Full Analytics Dashboard
                </h1>
                <p className="text-sm text-gray-600">
                  {businessName || tenantName || 'Your Business'}
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <div className="text-sm text-gray-500">
                Last updated: {new Date().toLocaleTimeString()}
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <TenantAnalyticsDashboard />
        </div>
      </div>
    </ProtectedRoute>
  )
}