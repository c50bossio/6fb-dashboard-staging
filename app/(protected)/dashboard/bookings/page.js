'use client'

import { CalendarIcon, UserGroupIcon, ClockIcon } from '@heroicons/react/24/outline'
import { useState } from 'react'

import EnhancedBookingCalendar from '../../../../components/calendar/EnhancedBookingCalendar'
import { useAuth } from '../../../../components/SupabaseAuthProvider'
import { createClient } from '../../../../lib/supabase/client'

export default function BookingsPage() {
  const [showResources, setShowResources] = useState(true)
  const [selectedBarber, setSelectedBarber] = useState(null)
  const { user } = useAuth()
  const supabase = createClient()

  const handleBookingCreate = async (bookingData) => {
    try {
      console.log('Create booking:', bookingData)
      
      const { data, error } = await supabase
        .from('bookings')
        .insert({
          shop_id: user?.profile?.shop_id,
          barber_id: bookingData.resourceId,
          start_time: bookingData.start.toISOString(),
          end_time: bookingData.end.toISOString(),
          status: 'confirmed',
          title: bookingData.title || 'New Booking',
          customer_name: bookingData.customerName || 'Walk-in',
          service_type: bookingData.serviceType || 'Haircut',
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

      alert('Booking updated successfully!')
    } catch (error) {
      console.error('BookingsPage.handleBookingUpdate error:', error)
      alert('Failed to update booking')
    }
  }

  const handleBookingDelete = async (bookingId) => {
    try {
      const { error } = await supabase
        .from('bookings')
        .delete()
        .eq('id', bookingId)

      if (error) throw error

      alert('Booking cancelled successfully!')
    } catch (error) {
      console.error('BookingsPage.handleBookingDelete error:', error)
      alert('Failed to cancel booking')
    }
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex-shrink-0 border-b border-gray-200 bg-white px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <CalendarIcon className="h-8 w-8 text-blue-600" />
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Appointment Calendar</h1>
              <p className="text-sm text-gray-600">Manage bookings and appointments</p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setShowResources(!showResources)}
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <UserGroupIcon className="h-4 w-4 mr-2" />
              {showResources ? 'Hide' : 'Show'} Barbers
            </button>
            <div className="flex items-center text-sm text-gray-600">
              <ClockIcon className="h-4 w-4 mr-1" />
              <span>Hours: 9:00 AM - 6:00 PM</span>
            </div>
          </div>
        </div>
      </div>

      {/* Calendar */}
      <div className="flex-1 bg-gray-50 p-6">
        <div className="h-full bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <EnhancedBookingCalendar
            barbershop_id={user?.profile?.shop_id}
            view="resourceTimeGridDay"
            onAppointmentCreated={handleBookingCreate}
            onAppointmentUpdated={handleBookingUpdate}
            onAppointmentDeleted={handleBookingDelete}
          />
        </div>
      </div>
    </div>
  )
}