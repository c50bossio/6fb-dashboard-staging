'use client'

import { useAuth } from '../../../../components/SupabaseAuthProvider'
import { useBusinessContext } from '../../../../hooks/useBusinessContext'
import CheckInInterface from '../../../../components/customer/CheckInInterface'
import QueueManagerInterface from '../../../../components/customer/QueueManagerInterface'
import DashboardErrorBoundary from '../../../../components/dashboard/DashboardErrorBoundary'
import { ArrowLeftIcon, ChevronDownIcon, ChevronUpIcon } from '@heroicons/react/24/outline'
import Link from 'next/link'
import { useState } from 'react'

export default function CheckInPage() {
  const { user, profile } = useAuth()
  const { businessContext } = useBusinessContext()
  const [queueData, setQueueData] = useState([])
  const [isGuideOpen, setIsGuideOpen] = useState(false)
  
  const barbershopId = profile?.barbershop_id || businessContext?.barbershopId

  const handleQueueUpdate = (updatedQueue) => {
    setQueueData(updatedQueue)
  }

  if (!barbershopId) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-xl shadow-sm border border-gray-200 p-6 text-center">
          <h1 className="text-xl font-bold text-gray-900 mb-2">Check-In System</h1>
          <p className="text-gray-600 mb-4">Barbershop not found. Please contact support.</p>
          <Link
            href="/dashboard"
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <ArrowLeftIcon className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Link>
        </div>
      </div>
    )
  }

  return (
    <DashboardErrorBoundary>
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="mb-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Customer Check-In</h1>
                <p className="text-gray-600 mt-1">
                  Help customers check in for their appointments
                </p>
              </div>
              <Link
                href="/dashboard"
                className="flex items-center px-4 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ArrowLeftIcon className="h-4 w-4 mr-2" />
                Dashboard
              </Link>
            </div>
          </div>

          {/* Check-In Interface and Queue Management */}
          <div className="space-y-6">
            {/* Check-In Form - Full Width */}
            <div>
              <CheckInInterface barbershopId={barbershopId} mode="embedded" />
            </div>

            {/* Queue Management Interface */}
            <div>
              <QueueManagerInterface 
                barbershopId={barbershopId} 
                onQueueUpdate={handleQueueUpdate}
              />
            </div>

            {/* Collapsible Quick Start Guide */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              {/* Clickable Header */}
              <button
                onClick={() => setIsGuideOpen(!isGuideOpen)}
                className="w-full flex items-center justify-between px-6 py-4 bg-blue-50 hover:bg-blue-100 transition-colors border-none text-left"
              >
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center">
                    <span className="text-xs font-bold text-white">?</span>
                  </div>
                  <h3 className="font-semibold text-blue-900">Quick Start Guide</h3>
                  <span className="text-sm text-blue-700">Click to {isGuideOpen ? 'hide' : 'show'} help</span>
                </div>
                {isGuideOpen ? (
                  <ChevronUpIcon className="h-5 w-5 text-blue-700" />
                ) : (
                  <ChevronDownIcon className="h-5 w-5 text-blue-700" />
                )}
              </button>
              
              {/* Collapsible Content */}
              <div className={`overflow-hidden transition-all duration-300 ease-in-out ${isGuideOpen ? 'max-h-[500px]' : 'max-h-0'}`}>
                <div className="p-6 space-y-6">
                  {/* Steps */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                      <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
                        <span className="text-sm font-bold text-white">1</span>
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">Enter Phone Number</p>
                        <p className="text-sm text-gray-600">Any format works (555-123-4567, 5551234567, etc.)</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                      <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
                        <span className="text-sm font-bold text-white">2</span>
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">Select Appointment</p>
                        <p className="text-sm text-gray-600">Click "Check In" for today's appointment</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg border border-green-200">
                      <div className="w-8 h-8 bg-green-600 rounded-full flex items-center justify-center flex-shrink-0">
                        <span className="text-sm font-bold text-white">✓</span>
                      </div>
                      <div>
                        <p className="font-medium text-green-900">Auto-Notification</p>
                        <p className="text-sm text-green-700">Barber gets SMS, customer is checked in</p>
                      </div>
                    </div>
                  </div>
                  
                  {/* Features */}
                  <div className="border-t pt-4">
                    <h4 className="font-medium text-gray-900 mb-3">Key Features</h4>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div className="flex items-center gap-2 text-gray-600">
                        <span className="w-1.5 h-1.5 bg-blue-600 rounded-full"></span>
                        Automatic SMS alerts
                      </div>
                      <div className="flex items-center gap-2 text-gray-600">
                        <span className="w-1.5 h-1.5 bg-blue-600 rounded-full"></span>
                        Real-time queue updates
                      </div>
                      <div className="flex items-center gap-2 text-gray-600">
                        <span className="w-1.5 h-1.5 bg-blue-600 rounded-full"></span>
                        Direct customer calling
                      </div>
                      <div className="flex items-center gap-2 text-gray-600">
                        <span className="w-1.5 h-1.5 bg-blue-600 rounded-full"></span>
                        Today's schedule sync
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardErrorBoundary>
  )
}