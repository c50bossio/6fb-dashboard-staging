'use client'

import { useState } from 'react'
import ServiceSetup from '@/components/onboarding/ServiceSetup'
import { CheckCircleIcon } from '@heroicons/react/24/outline'

export default function TestQuickStartPage() {
  const [services, setServices] = useState(null)
  
  // Mock location for testing market intelligence
  const mockLocation = {
    lat: 40.7128,
    lng: -74.0060,
    city: 'New York',
    state: 'NY',
    zip_code: '10001'
  }
  
  const handleComplete = (data) => {
    setServices(data.services)
  }
  
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="bg-white rounded-xl shadow-lg p-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Quick Start Pack Test
            </h1>
            <p className="text-gray-600">
              Testing the 6-service Quick Start Pack functionality
            </p>
          </div>
          
          {!services ? (
            <ServiceSetup 
              onComplete={handleComplete}
              businessType="barbershop"
              location={mockLocation}
              initialData={{}}
            />
          ) : (
            <div className="space-y-6">
              <div className="bg-green-50 border border-green-200 rounded-lg p-6">
                <div className="flex items-center mb-4">
                  <CheckCircleIcon className="w-8 h-8 text-green-600 mr-3" />
                  <h2 className="text-xl font-semibold text-green-900">
                    Quick Start Pack Successfully Configured!
                  </h2>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                  {services.map((service, index) => (
                    <div key={service.id} className="bg-white rounded-md p-3 border border-green-200">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <span className="text-xl mr-2">{service.icon}</span>
                          <div>
                            <div className="font-medium text-gray-900">
                              {index + 1}. {service.name}
                            </div>
                            <div className="text-sm text-gray-600">
                              {service.duration} min • ${service.price}
                            </div>
                          </div>
                        </div>
                        {index < 6 && (
                          <span className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded-full">
                            Essential
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                
                <div className="mt-6 p-4 bg-blue-50 rounded-md">
                  <h3 className="font-semibold text-blue-900 mb-2">Quick Start Pack Includes:</h3>
                  <ul className="text-sm text-blue-800 space-y-1">
                    <li>✅ 1. Haircut - Classic haircut and style</li>
                    <li>✅ 2. Fade Cut - Precision fade with styling</li>
                    <li>✅ 3. Beard Trim - Beard shaping and trim</li>
                    <li>✅ 4. Kids Cut - Children under 12</li>
                    <li>✅ 5. Hot Towel Shave - Traditional hot towel shave</li>
                    <li>✅ 6. VIP Package - Premium grooming experience</li>
                  </ul>
                </div>
                
                <button
                  onClick={() => setServices(null)}
                  className="mt-4 px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
                >
                  Test Again
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}