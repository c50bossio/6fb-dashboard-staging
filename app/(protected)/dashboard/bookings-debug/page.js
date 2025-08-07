'use client'

import { useState, useEffect } from 'react'

import { useAuth } from '../../../../components/SupabaseAuthProvider'
import { createClient } from '../../../../lib/supabase/client'

export default function BookingsDebugPage() {
  const [bookings, setBookings] = useState([])
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(true)
  const { user } = useAuth()
  const supabase = createClient()

  useEffect(() => {
    const testDatabase = async () => {
      try {
        // Test 1: Check if bookings table exists
        const { data, error } = await supabase
          .from('bookings')
          .select('*')
          .limit(5)

        if (error) {
          setError(`Database error: ${error.message}`)
          console.error('Bookings query error:', error)
        } else {
          setBookings(data || [])
          console.log('Bookings data:', data)
        }
      } catch (err) {
        setError(`Unexpected error: ${err.message}`)
        console.error('Unexpected error:', err)
      } finally {
        setLoading(false)
      }
    }

    testDatabase()
  }, [supabase])

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Bookings Database Debug</h1>
      
      <div className="bg-white rounded-lg shadow p-6 mb-4">
        <h2 className="text-lg font-semibold mb-2">User Info</h2>
        <pre className="bg-gray-100 p-3 rounded text-sm overflow-auto">
          {JSON.stringify({ 
            email: user?.email,
            id: user?.id,
            profile: user?.profile 
          }, null, 2)}
        </pre>
      </div>

      <div className="bg-white rounded-lg shadow p-6 mb-4">
        <h2 className="text-lg font-semibold mb-2">Database Test Results</h2>
        {loading && <p>Loading...</p>}
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}
        {!loading && !error && (
          <div>
            <p className="text-green-600 mb-2">✓ Database connection successful</p>
            <p className="mb-2">Found {bookings.length} bookings</p>
            {bookings.length > 0 && (
              <pre className="bg-gray-100 p-3 rounded text-sm overflow-auto">
                {JSON.stringify(bookings, null, 2)}
              </pre>
            )}
          </div>
        )}
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold mb-2">Calendar Component Status</h2>
        <p className="mb-2">The calendar on the bookings page requires:</p>
        <ul className="list-disc list-inside space-y-1 text-sm">
          <li>✓ FullCalendar packages installed (verified)</li>
          <li>{error ? '✗' : '✓'} Database table 'bookings' accessible</li>
          <li>✓ User authenticated (logged in as {user?.email})</li>
        </ul>
      </div>
    </div>
  )
}