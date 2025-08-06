'use client'

import { useState } from 'react'
import BookingCalendar from '../../../../components/calendar/BookingCalendar'
import { createClient } from '../../../../lib/supabase/client'
import { useAuth } from '../../../../components/SupabaseAuthProvider'

export default function BookingsPage() {
  const [showResources, setShowResources] = useState(true)
  const [selectedBarber, setSelectedBarber] = useState(null)
  const { user } = useAuth()
  const supabase = createClient()

  const handleBookingCreate = async (bookingData) => {
    try {
      // This would open a modal to collect booking details
      console.log('Create booking:', bookingData)
      
      // Example implementation:
      const { data, error } = await supabase
        .from('bookings')
        .insert({
          shop_id: user.profile.shop_id,
          barber_id: bookingData.resourceId,
          start_time: bookingData.start.toISOString(),
          end_time: bookingData.end.toISOString(),
          status: 'confirmed',
        })
        .select()
        .single()

      if (error) throw error

      // Show success message
      alert('Booking created successfully!')
      
      return data
    } catch (error) {
      console.error('BookingsPage.handleBookingCreate error:', error)
      alert('Failed to create booking')
    }
  }

  const handleBookingUpdate = async (bookingId, updates) => {
    try {
      const { error } = await supabase
        .from('bookings')
        .update(updates)
        .eq('id', bookingId)

      if (error) throw error

      // Show success message
      console.log('Booking updated successfully')
    } catch (error) {
      console.error('BookingsPage.handleBookingUpdate error:', error)
      alert('Failed to update booking')
      throw error // Re-throw to revert the change
    }
  }

  const handleBookingDelete = async (bookingId) => {
    try {
      const { error } = await supabase
        .from('bookings')
        .update({ status: 'cancelled', cancelled_at: new Date().toISOString() })
        .eq('id', bookingId)

      if (error) throw error

      alert('Booking cancelled successfully')
    } catch (error) {
      console.error('BookingsPage.handleBookingDelete error:', error)
      alert('Failed to cancel booking')
    }
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="bg-white border-b px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Bookings</h1>
            <p className="text-sm text-gray-600 mt-1">
              Manage appointments and schedules
            </p>
          </div>
          
          <div className="flex items-center gap-4">
            {/* View toggle */}
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-gray-700">
                Show Resources:
              </label>
              <button
                onClick={() => setShowResources(!showResources)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  showResources ? 'bg-blue-600' : 'bg-gray-200'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    showResources ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
            
            {/* Add booking button */}
            <button className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors">
              + New Booking
            </button>
          </div>
        </div>
      </div>

      {/* Calendar */}
      <div className="flex-1 p-6 bg-gray-50">
        <BookingCalendar
          barberId={selectedBarber}
          showResources={showResources}
          onBookingCreate={handleBookingCreate}
          onBookingUpdate={handleBookingUpdate}
          onBookingDelete={handleBookingDelete}
        />
      </div>

      {/* License notice for development */}
      {process.env.NODE_ENV === 'development' && (
        <div className="bg-yellow-50 border-t border-yellow-200 px-6 py-3">
          <p className="text-sm text-yellow-800">
            <strong>Development Mode:</strong> Using FullCalendar with attribution license. 
            Premium features (resource timeline, drag between resources) require a commercial license for production.
          </p>
        </div>
      )}
    </div>
  )
}