'use client'

import React, { useState } from 'react'
import ClientHistoryTracker from '@/components/booking/ClientHistoryTracker'

export default function TestBookingFixesPage() {
  const [showTracker, setShowTracker] = useState(false)
  const [savingState, setSavingState] = useState(false)
  
  // Test the saving state issue
  React.useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && savingState) {
        console.log('Page became visible - resetting saving state')
        setSavingState(false)
      }
    }
    
    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [savingState])
  
  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Testing Booking Fixes</h1>
        
        {/* Test 1: Reach out with care button */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Test 1: "Reach out with care" Button</h2>
          <p className="text-gray-600 mb-4">
            This tests the improved empty state messaging when no customers exist in the database.
          </p>
          <button
            onClick={() => setShowTracker(!showTracker)}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            {showTracker ? 'Hide' : 'Show'} Client History Tracker
          </button>
          
          {showTracker && (
            <div className="mt-4 border-t pt-4">
              <ClientHistoryTracker 
                barbershopId="test-barbershop-123"
                onClientSelect={(client) => {
                  console.log('Selected client:', client)
                  alert(`Selected client: ${client.name}`)
                }}
                isDev={true}
              />
            </div>
          )}
        </div>
        
        {/* Test 2: Saving state persistence */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Test 2: Saving State Persistence</h2>
          <p className="text-gray-600 mb-4">
            Test that the saving state doesn't persist when switching tabs or refreshing.
          </p>
          
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setSavingState(true)}
                className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
              >
                Trigger Saving State
              </button>
              
              <button
                onClick={() => setSavingState(false)}
                className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
              >
                Clear Saving State
              </button>
            </div>
            
            <div className="p-4 bg-gray-100 rounded">
              <p className="font-medium">Current State:</p>
              <p className={`text-lg ${savingState ? 'text-yellow-600' : 'text-green-600'}`}>
                {savingState ? '⏳ Saving...' : '✓ Not Saving'}
              </p>
              <p className="text-sm text-gray-600 mt-2">
                Try switching browser tabs or minimizing the window while in "Saving" state.
                The state should automatically reset when you return.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}