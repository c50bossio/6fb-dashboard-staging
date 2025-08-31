'use client'

import React, { useState } from 'react'
// import BookingFlowOrchestrator from '@/components/booking/BookingFlowOrchestrator'

export default function TestEnhancedBookingPage() {
  const [selectedTest, setSelectedTest] = useState('auto')
  
  // Test data - using demo IDs for testing
  const testbarbershopId = 'demo-barbershop-123'
  const testBarberId = 'demo-barber-456'
  const testServiceId = 'demo-service-789'
  
  const testScenarios = {
    auto: {
      title: 'Auto Selection (Smart Device Detection)',
      props: { barbershopId: testbarbershopId },
      description: 'Automatically selects optimal flow based on your device'
    },
    enhanced: {
      title: 'Enhanced Flow (Force Enhanced)',
      props: { barbershopId: testbarbershopId, enhanced: true },
      description: 'Forces enhanced booking flow with animations and advanced features'
    },
    mobile: {
      title: 'Mobile Optimized (Force Mobile)',
      props: { barbershopId: testbarbershopId, mobile: true },
      description: 'Forces mobile-optimized flow with touch gestures'
    },
    preselected: {
      title: 'Pre-selected Service & Barber',
      props: { 
        barbershopId: testbarbershopId, 
        preselectedBarber: testBarberId,
        preselectedService: testServiceId,
        enhanced: true 
      },
      description: 'Skips service selection, goes directly to time booking'
    },
    debug: {
      title: 'Debug Mode (Developer View)',
      props: { barbershopId: testbarbershopId, debug: true, enhanced: true },
      description: 'Shows component selection logic and debug information'
    },
    realtime: {
      title: 'Real-time Availability',
      props: { barbershopId: testbarbershopId, enableRealtime: true, enhanced: true },
      description: 'Demonstrates real-time slot updates and conflict prevention'
    }
  }
  
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                🚀 Enhanced Booking Flow Test Center
              </h1>
              <p className="mt-2 text-gray-600">
                Test all enhanced booking scenarios and features
              </p>
            </div>
            <div className="text-sm text-gray-500">
              6FB AI Agent System • Enhanced Booking v2.0
            </div>
          </div>
        </div>
      </div>
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Test Scenario Selector */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                📋 Test Scenarios
              </h2>
              <div className="space-y-3">
                {Object.entries(testScenarios).map(([key, scenario]) => (
                  <button
                    key={key}
                    onClick={() => setSelectedTest(key)}
                    className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                      selectedTest === key
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    <div className="font-medium text-gray-900">
                      {scenario.title}
                    </div>
                    <div className="text-sm text-gray-600 mt-1">
                      {scenario.description}
                    </div>
                  </button>
                ))}
              </div>
              
              {/* Device Info */}
              <div className="mt-6 pt-6 border-t">
                <h3 className="font-medium text-gray-900 mb-3">🔍 Your Device</h3>
                <div className="text-sm space-y-1">
                  <div>Screen: {typeof window !== 'undefined' ? `${window.innerWidth}x${window.innerHeight}` : 'Loading...'}</div>
                  <div>User Agent: {typeof navigator !== 'undefined' ? (navigator.userAgent.includes('Mobile') ? 'Mobile' : 'Desktop') : 'Loading...'}</div>
                  <div>Touch: {typeof window !== 'undefined' ? (window.ontouchstart !== undefined ? 'Yes' : 'No') : 'Loading...'}</div>
                </div>
              </div>
            </div>
            
            {/* URL Examples */}
            <div className="bg-white rounded-lg shadow-sm border p-6 mt-6">
              <h3 className="font-medium text-gray-900 mb-3">🔗 Direct URL Testing</h3>
              <div className="text-xs space-y-2">
                <div className="bg-gray-100 p-2 rounded font-mono break-all">
                  /book/{testBarberId}?enhanced=true
                </div>
                <div className="bg-gray-100 p-2 rounded font-mono break-all">
                  /book/public/{testbarbershopId}?mobile=true
                </div>
                <div className="bg-gray-100 p-2 rounded font-mono break-all">
                  /test-enhanced-booking
                </div>
              </div>
            </div>
          </div>
          
          {/* Booking Flow Demo */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-sm border">
              {/* Demo Header */}
              <div className="px-6 py-4 border-b bg-gradient-to-r from-blue-50 to-purple-50">
                <h2 className="text-lg font-semibold text-gray-900">
                  🎯 {testScenarios[selectedTest].title}
                </h2>
                <p className="text-sm text-gray-600 mt-1">
                  {testScenarios[selectedTest].description}
                </p>
                
                {/* Component Props Display */}
                <div className="mt-3 text-xs bg-white/80 rounded p-2 font-mono">
                  <strong>Props:</strong> {JSON.stringify(testScenarios[selectedTest].props, null, 2)}
                </div>
              </div>
              
              {/* Booking Component */}
              <div className="p-6">
                <div className="border-2 border-dashed border-gray-300 rounded-lg min-h-[600px] flex items-center justify-center bg-gray-50">
                  <div className="text-center">
                    <div className="text-4xl mb-4">🚧</div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      Enhanced Booking Flow Demo
                    </h3>
                    <p className="text-gray-600 mb-4">
                      This would render the actual BookingFlowOrchestrator component
                    </p>
                    <div className="bg-blue-100 rounded-lg p-4 text-left max-w-md">
                      <h4 className="font-medium text-blue-900 mb-2">Component Props:</h4>
                      <pre className="text-xs text-blue-800 overflow-x-auto">
                        {JSON.stringify(testScenarios[selectedTest].props, null, 2)}
                      </pre>
                    </div>
                    
                    <div className="mt-4">
                      <button 
                        className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                        onClick={() => alert('BookingFlowOrchestrator integration ready! \nUncomment the component in the code to test with real data.')}
                      >
                        📱 Test Enhanced Booking Flow
                      </button>
                    </div>
                    
                    {/* Uncomment when ready to test with real Supabase data */}
                    {/*
                    <BookingFlowOrchestrator 
                      {...testScenarios[selectedTest].props}
                      onComponentSelection={(component, context) => {
                        console.log('Component selected:', component, context)
                      }}
                    />
                    */}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Instructions */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-blue-900 mb-3">
            📚 Testing Instructions
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium text-blue-900 mb-2">🔧 Setup Steps:</h4>
              <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
                <li>Ensure your Next.js dev server is running on port 9999</li>
                <li>Check that Supabase connection is working</li>
                <li>Verify feature flags are configured</li>
                <li>Test on different devices/screen sizes</li>
              </ol>
            </div>
            <div>
              <h4 className="font-medium text-blue-900 mb-2">✅ What to Test:</h4>
              <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
                <li>Component selection logic</li>
                <li>Device detection accuracy</li>
                <li>URL parameter handling</li>
                <li>Feature flag behavior</li>
                <li>Mobile vs desktop experience</li>
                <li>Error handling and fallbacks</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}