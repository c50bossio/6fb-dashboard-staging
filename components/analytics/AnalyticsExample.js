'use client'

import { useState, useEffect } from 'react'

import { useAnalytics } from '@/hooks/useAnalytics'

export default function AnalyticsExample() {
  const { trackFeature, trackBooking, trackPayment, checkFeatureFlag } = useAnalytics()
  const [showNewFeature, setShowNewFeature] = useState(false)

  useEffect(() => {
    const isEnabled = checkFeatureFlag('new_booking_flow')
    setShowNewFeature(isEnabled)
  }, [checkFeatureFlag])

  const handleBookingCreated = () => {
    trackBooking('created', {
      id: 'booking-123',
      serviceName: 'Premium Haircut',
      price: 50,
      barberId: 'barber-456',
      date: '2024-01-15',
      time: '10:00 AM',
    })
  }

  const handlePaymentCompleted = () => {
    trackPayment('completed', {
      id: 'payment-789',
      amount: 50,
      currency: 'USD',
      method: 'stripe',
    })
  }

  const handleFeatureClick = (featureName) => {
    trackFeature(featureName, {
      context: 'analytics_example',
      timestamp: new Date().toISOString(),
    })
  }

  return (
    <div className="p-6 bg-white rounded-lg shadow">
      <h3 className="text-lg font-semibold mb-4">Analytics Integration Examples</h3>
      
      <div className="space-y-4">
        {/* Booking Example */}
        <div>
          <button
            onClick={handleBookingCreated}
            className="px-4 py-2 bg-olive-600 text-white rounded hover:bg-olive-700"
          >
            Simulate Booking Created
          </button>
          <p className="text-sm text-gray-600 mt-1">
            Tracks: booking_created event with service details
          </p>
        </div>

        {/* Payment Example */}
        <div>
          <button
            onClick={handlePaymentCompleted}
            className="px-4 py-2 bg-moss-600 text-white rounded hover:bg-green-700"
          >
            Simulate Payment Completed
          </button>
          <p className="text-sm text-gray-600 mt-1">
            Tracks: payment_completed event + revenue
          </p>
        </div>

        {/* Feature Usage Examples */}
        <div>
          <p className="font-medium mb-2">Feature Usage Tracking:</p>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => handleFeatureClick('calendar_view')}
              className="px-3 py-1 bg-gray-200 rounded hover:bg-gray-300"
            >
              Calendar View
            </button>
            <button
              onClick={() => handleFeatureClick('export_data')}
              className="px-3 py-1 bg-gray-200 rounded hover:bg-gray-300"
            >
              Export Data
            </button>
            <button
              onClick={() => handleFeatureClick('settings_updated')}
              className="px-3 py-1 bg-gray-200 rounded hover:bg-gray-300"
            >
              Update Settings
            </button>
          </div>
        </div>

        {/* Feature Flag Example */}
        {showNewFeature && (
          <div className="p-4 bg-gold-50 rounded">
            <p className="text-gold-800">
              🎉 New Booking Flow Enabled (via Feature Flag)
            </p>
          </div>
        )}

        {/* PostHog Features */}
        <div className="mt-6 p-4 bg-gray-50 rounded">
          <h4 className="font-medium mb-2">PostHog Features Active:</h4>
          <ul className="text-sm text-gray-600 space-y-1">
            <li>✓ Session Recording</li>
            <li>✓ Heatmaps</li>
            <li>✓ User Paths</li>
            <li>✓ Feature Flags</li>
            <li>✓ A/B Testing</li>
            <li>✓ Cohort Analysis</li>
          </ul>
        </div>
      </div>
    </div>
  )
}