'use client'

import { useState } from 'react'
import BookingRulesSetup from '@/components/onboarding/BookingRulesSetup'
import OnboardingProgressIndicator from '@/components/onboarding/OnboardingProgressIndicator'
import StaffSetup from '@/components/onboarding/StaffSetup'
import { OnboardingProvider } from '@/contexts/OnboardingContext'

export default function TestOnboardingPersistencePage() {
  const [activeTab, setActiveTab] = useState('staff')
  const [staffData, setStaffData] = useState({})
  const [bookingData, setBookingData] = useState({})

  return (
    <OnboardingProvider>
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-2xl font-bold mb-8">Test Onboarding Cross-Tab Persistence</h1>
          
          <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-800">
              <strong>Test Instructions:</strong>
              <br />1. Open this page in two different browser tabs
              <br />2. Make changes in the Staff Setup in Tab 1
              <br />3. Switch to Tab 2 and see if changes appear automatically
              <br />4. Make changes in Booking Rules in Tab 2
              <br />5. Switch back to Tab 1 and verify data persists
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            {/* Progress Sidebar */}
            <div className="lg:col-span-1">
              <OnboardingProgressIndicator 
                currentSession={activeTab === 'staff' ? 'staff_setup' : 'booking_rules'}
                className="shadow-sm sticky top-8"
              />
            </div>

            {/* Main Content */}
            <div className="lg:col-span-3">
              {/* Tab Navigation */}
              <div className="bg-white border border-gray-200 rounded-lg shadow-sm mb-6">
                <div className="border-b border-gray-200">
                  <nav className="-mb-px flex">
                    <button
                      onClick={() => setActiveTab('staff')}
                      className={`py-2 px-6 text-sm font-medium border-b-2 ${
                        activeTab === 'staff'
                          ? 'border-brand-600 text-brand-600'
                          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      }`}
                    >
                      Staff Setup
                    </button>
                    <button
                      onClick={() => setActiveTab('booking')}
                      className={`py-2 px-6 text-sm font-medium border-b-2 ${
                        activeTab === 'booking'
                          ? 'border-brand-600 text-brand-600'
                          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      }`}
                    >
                      Booking Rules
                    </button>
                  </nav>
                </div>
              </div>

              {/* Tab Content */}
              <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-6">
                {activeTab === 'staff' ? (
                  <div>
                    <h2 className="text-lg font-semibold mb-4">Staff Setup</h2>
                    <StaffSetup 
                      data={staffData}
                      updateData={(data) => {
                        console.log('Staff data updated:', data)
                        setStaffData(data)
                      }}
                      onComplete={() => {
                        console.log('Staff setup completed')
                        setActiveTab('booking')
                      }}
                    />
                  </div>
                ) : (
                  <div>
                    <h2 className="text-lg font-semibold mb-4">Booking Rules</h2>
                    <BookingRulesSetup 
                      data={bookingData}
                      updateData={(data) => {
                        console.log('Booking data updated:', data)
                        setBookingData(data)
                      }}
                      onComplete={() => {
                        console.log('Booking rules completed')
                        alert('Onboarding completed!')
                      }}
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </OnboardingProvider>
  )
}