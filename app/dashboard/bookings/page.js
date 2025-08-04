'use client'

export default function BookingsPage() {
  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Bookings</h1>
        <div className="bg-white rounded-lg shadow-md p-6">
          <p className="text-gray-600">
            Booking calendar functionality will be available after completing the core setup.
          </p>
          <div className="mt-4 space-y-2">
            <p className="text-sm text-gray-500">Features in development:</p>
            <ul className="list-disc list-inside text-sm text-gray-500 space-y-1">
              <li>Full calendar integration</li>
              <li>Real-time booking management</li>
              <li>Customer notifications</li>
              <li>Staff scheduling</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}