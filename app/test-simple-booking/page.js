'use client'

import React, { useState, useEffect } from 'react'

export default function SimpleBookingTestPage() {
  const [deviceInfo, setDeviceInfo] = useState({
    width: 0,
    height: 0,
    isMobile: false,
    isTouch: false
  })
  
  useEffect(() => {
    const updateDeviceInfo = () => {
      setDeviceInfo({
        width: window.innerWidth,
        height: window.innerHeight,
        isMobile: window.innerWidth < 768,
        isTouch: 'ontouchstart' in window
      })
    }
    
    updateDeviceInfo()
    window.addEventListener('resize', updateDeviceInfo)
    return () => window.removeEventListener('resize', updateDeviceInfo)
  }, [])
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">
              🚀 Enhanced Booking System Status
            </h1>
            <p className="text-xl text-gray-600">
              Your enhanced booking components are ready!
            </p>
          </div>
          
          {/* Status Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div className="bg-green-50 border border-green-200 rounded-lg p-6">
              <div className="flex items-center mb-3">
                <div className="w-3 h-3 bg-green-500 rounded-full mr-3"></div>
                <h3 className="font-semibold text-green-900">✅ Components Created</h3>
              </div>
              <ul className="text-sm text-green-800 space-y-1">
                <li>• BookingFlowOrchestrator</li>
                <li>• Device Detection Hooks</li>
                <li>• Feature Flag System</li>
                <li>• Realtime Booking Wrapper</li>
                <li>• Enhanced Booking Pages</li>
              </ul>
            </div>
            
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
              <div className="flex items-center mb-3">
                <div className="w-3 h-3 bg-blue-500 rounded-full mr-3"></div>
                <h3 className="font-semibold text-blue-900">📱 Your Device</h3>
              </div>
              <div className="text-sm text-blue-800 space-y-1">
                <div>Screen: {deviceInfo.width}x{deviceInfo.height}</div>
                <div>Type: {deviceInfo.isMobile ? 'Mobile' : 'Desktop'}</div>
                <div>Touch: {deviceInfo.isTouch ? 'Supported' : 'Not Available'}</div>
                <div>Optimal Flow: {deviceInfo.isMobile ? 'Mobile Optimized' : 'Enhanced Desktop'}</div>
              </div>
            </div>
          </div>
          
          {/* Next Steps */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 mb-6">
            <h3 className="font-semibold text-yellow-900 mb-3">🔧 Next Steps to Test</h3>
            <ol className="text-sm text-yellow-800 space-y-2 list-decimal list-inside">
              <li><strong>Get your barbershop/barber IDs</strong> from Supabase database</li>
              <li><strong>Replace demo IDs</strong> in the test URLs with real ones</li>
              <li><strong>Enable feature flags</strong> in your environment</li>
              <li><strong>Test the booking flow</strong> on different devices</li>
            </ol>
          </div>
          
          {/* Test URLs */}
          <div className="bg-gray-50 rounded-lg p-6">
            <h3 className="font-semibold text-gray-900 mb-4">🔗 Ready to Test URLs</h3>
            <div className="space-y-3">
              <div>
                <div className="font-medium text-gray-700 mb-1">Enhanced Booking Test Center:</div>
                <div className="bg-white p-3 rounded border font-mono text-sm text-blue-600">
                  http://localhost:9999/test-enhanced-booking
                </div>
              </div>
              
              <div>
                <div className="font-medium text-gray-700 mb-1">Individual Barber Booking:</div>
                <div className="bg-white p-3 rounded border font-mono text-sm text-blue-600">
                  http://localhost:9999/book/[YOUR_BARBER_ID]?enhanced=true
                </div>
              </div>
              
              <div>
                <div className="font-medium text-gray-700 mb-1">Public Barbershop Booking:</div>
                <div className="bg-white p-3 rounded border font-mono text-sm text-blue-600">
                  http://localhost:9999/book/public/[YOUR_BARBERSHOP_ID]?mobile=true
                </div>
              </div>
            </div>
          </div>
          
          {/* Component Status */}
          <div className="mt-8 p-6 bg-gradient-to-r from-green-50 to-blue-50 rounded-lg">
            <h3 className="font-semibold text-gray-900 mb-3">📊 System Status</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl mb-1">✅</div>
                <div className="text-xs font-medium">React Import Fixed</div>
              </div>
              <div className="text-center">
                <div className="text-2xl mb-1">🎯</div>
                <div className="text-xs font-medium">Smart Orchestrator</div>
              </div>
              <div className="text-center">
                <div className="text-2xl mb-1">📱</div>
                <div className="text-xs font-medium">Mobile Optimized</div>
              </div>
              <div className="text-center">
                <div className="text-2xl mb-1">⚡</div>
                <div className="text-xs font-medium">Real-time Ready</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}