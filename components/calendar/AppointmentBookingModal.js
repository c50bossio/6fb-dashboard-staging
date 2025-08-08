'use client'

import { Dialog, Transition } from '@headlessui/react'
import { XMarkIcon, CalendarIcon, ClockIcon, UserIcon, CurrencyDollarIcon } from '@heroicons/react/24/outline'
import { useState, useEffect, useCallback } from 'react'
import { Fragment } from 'react'

import { useAuth } from '@/components/SupabaseAuthProvider'

export default function AppointmentBookingModal({
  isOpen,
  onClose,
  selectedSlot,
  barbers,
  services,
  onBookingComplete,
  barbershopId,
  editingAppointment = null
}) {
  const { user } = useAuth()
  const isEditing = !!editingAppointment
  
  // Form state
  const [formData, setFormData] = useState({
    barber_id: selectedSlot?.barberId || '',
    service_id: '',
    scheduled_at: selectedSlot?.start?.toISOString().slice(0, 16) || '',
    duration_minutes: 60,
    service_price: 0,
    tip_amount: 0,
    client_name: '',
    client_phone: '',
    client_email: '',
    client_notes: '',
    is_walk_in: false,
    booking_source: 'online',
    priority: 0
  })
  
  const [availability, setAvailability] = useState([])
  const [checkingAvailability, setCheckingAvailability] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [availabilityError, setAvailabilityError] = useState('')

  // Populate form if editing
  useEffect(() => {
    if (isEditing && editingAppointment) {
      setFormData({
        barber_id: editingAppointment.barber_id || '',
        service_id: editingAppointment.service_id || '',
        scheduled_at: editingAppointment.scheduled_at ? new Date(editingAppointment.scheduled_at).toISOString().slice(0, 16) : '',
        duration_minutes: editingAppointment.duration_minutes || 60,
        service_price: editingAppointment.service_price || 0,
        tip_amount: editingAppointment.tip_amount || 0,
        client_name: editingAppointment.client_name || editingAppointment.client?.name || '',
        client_phone: editingAppointment.client_phone || editingAppointment.client?.phone || '',
        client_email: editingAppointment.client_email || editingAppointment.client?.email || '',
        client_notes: editingAppointment.client_notes || '',
        is_walk_in: editingAppointment.is_walk_in || false,
        booking_source: editingAppointment.booking_source || 'online',
        priority: editingAppointment.priority || 0
      })
    }
  }, [isEditing, editingAppointment])

  // Update service details when service is selected
  useEffect(() => {
    if (formData.service_id) {
      const selectedService = services.find(s => s.id === formData.service_id)
      if (selectedService) {
        setFormData(prev => ({
          ...prev,
          duration_minutes: selectedService.duration_minutes,
          service_price: parseFloat(selectedService.price)
        }))
      }
    }
  }, [formData.service_id, services])

  // Check availability when barber, date, or duration changes
  const checkAvailability = useCallback(async () => {
    if (!formData.barber_id || !formData.scheduled_at || !formData.duration_minutes) return
    
    setCheckingAvailability(true)
    setAvailabilityError('')
    
    try {
      const appointmentDate = new Date(formData.scheduled_at)
      const dateStr = appointmentDate.toISOString().split('T')[0]
      
      const params = new URLSearchParams({
        barber_id: formData.barber_id,
        date: dateStr,
        duration_minutes: formData.duration_minutes.toString()
      })
      
      if (isEditing && editingAppointment?.id) {
        params.append('exclude_appointment_id', editingAppointment.id)
      }
      
      const response = await fetch(`/api/appointments/availability?${params}`)
      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to check availability')
      }
      
      setAvailability(data.available_slots || [])
      
      // Check if selected time is available
      const selectedTime = appointmentDate.toTimeString().slice(0, 5)
      const isAvailable = data.available_slots?.some(slot => 
        slot.start_time === selectedTime && slot.available
      )
      
      if (!isAvailable && data.available_slots?.length > 0) {
        setAvailabilityError('Selected time slot is not available. Please choose from available times below.')
      }
      
    } catch (error) {
      console.error('Error checking availability:', error)
      setAvailabilityError('Failed to check availability: ' + error.message)
    } finally {
      setCheckingAvailability(false)
    }
  }, [formData.barber_id, formData.scheduled_at, formData.duration_minutes, isEditing, editingAppointment?.id])

  useEffect(() => {
    const timeoutId = setTimeout(checkAvailability, 500)
    return () => clearTimeout(timeoutId)
  }, [checkAvailability])

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }))
    setError('')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    
    try {
      // Validate required fields
      if (!formData.barber_id || !formData.service_id || !formData.scheduled_at) {
        throw new Error('Please fill in all required fields')
      }
      
      if (!formData.client_name && !user) {
        throw new Error('Customer name is required')
      }
      
      // Prepare appointment data
      const appointmentData = {
        ...formData,
        barbershop_id: barbershopId,
        client_id: user?.id || null,
        total_amount: formData.service_price + (formData.tip_amount || 0),
        scheduled_at: new Date(formData.scheduled_at).toISOString()
      }
      
      if (isEditing) {
        // Update existing appointment
        const response = await fetch(`/api/appointments/${editingAppointment.id}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(appointmentData)
        })
        
        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || 'Failed to update appointment')
        }
        
        const data = await response.json()
        onBookingComplete(data.appointment)
      } else {
        // Create new appointment
        onBookingComplete(appointmentData)
      }
      
    } catch (error) {
      console.error('Error submitting appointment:', error)
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleTimeSlotSelect = (slot) => {
    if (!slot.available) return
    
    const appointmentDate = new Date(formData.scheduled_at)
    const [hours, minutes] = slot.start_time.split(':')
    
    appointmentDate.setHours(parseInt(hours), parseInt(minutes), 0, 0)
    
    setFormData(prev => ({
      ...prev,
      scheduled_at: appointmentDate.toISOString().slice(0, 16)
    }))
    setAvailabilityError('')
  }

  const selectedBarber = barbers.find(b => b.id === formData.barber_id)
  const selectedService = services.find(s => s.id === formData.service_id)

  return (
    <Transition.Root show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" />
        </Transition.Child>

        <div className="fixed inset-0 z-10 overflow-y-auto">
          <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
              enterTo="opacity-100 translate-y-0 sm:scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 translate-y-0 sm:scale-100"
              leaveTo="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
            >
              <Dialog.Panel className="relative transform overflow-hidden rounded-lg bg-white px-4 pb-4 pt-5 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-2xl sm:p-6">
                <div className="absolute right-0 top-0 hidden pr-4 pt-4 sm:block">
                  <button
                    type="button"
                    className="min-h-[44px] min-w-[44px] p-3 rounded-md bg-white text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 flex items-center justify-center"
                    onClick={onClose}
                  >
                    <span className="sr-only">Close</span>
                    <XMarkIcon className="h-6 w-6" aria-hidden="true" />
                  </button>
                </div>
                
                <div className="sm:flex sm:items-start">
                  <div className="mt-3 text-center sm:ml-4 sm:mt-0 sm:text-left w-full">
                    <Dialog.Title as="h3" className="text-lg font-semibold leading-6 text-gray-900 mb-6">
                      {isEditing ? 'Edit Appointment' : 'Book New Appointment'}
                    </Dialog.Title>
                    
                    <form onSubmit={handleSubmit} className="space-y-6">
                      {/* Error Display */}
                      {error && (
                        <div className="rounded-md bg-red-50 p-4">
                          <div className="text-sm text-red-700">{error}</div>
                        </div>
                      )}
                      
                      {/* Barber Selection */}
                      <div>
                        <label htmlFor="barber_id" className="block text-sm font-medium text-gray-700">
                          Barber <span className="text-red-500">*</span>
                        </label>
                        <select
                          id="barber_id"
                          name="barber_id"
                          value={formData.barber_id}
                          onChange={handleInputChange}
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                          required
                        >
                          <option value="">Select a barber</option>
                          {barbers.map(barber => (
                            <option key={barber.id} value={barber.id}>
                              {barber.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Service Selection */}
                      <div>
                        <label htmlFor="service_id" className="block text-sm font-medium text-gray-700">
                          Service <span className="text-red-500">*</span>
                        </label>
                        <select
                          id="service_id"
                          name="service_id"
                          value={formData.service_id}
                          onChange={handleInputChange}
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                          required
                        >
                          <option value="">Select a service</option>
                          {services.map(service => (
                            <option key={service.id} value={service.id}>
                              {service.name} - ${service.price} ({service.duration_minutes}min)
                            </option>
                          ))}
                        </select>
                        {selectedService && (
                          <p className="mt-1 text-sm text-gray-500">
                            {selectedService.description}
                          </p>
                        )}
                      </div>

                      {/* Date and Time */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label htmlFor="scheduled_at" className="block text-sm font-medium text-gray-700">
                            Date & Time <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="datetime-local"
                            id="scheduled_at"
                            name="scheduled_at"
                            value={formData.scheduled_at}
                            onChange={handleInputChange}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                            required
                          />
                        </div>
                        
                        <div>
                          <label htmlFor="duration_minutes" className="block text-sm font-medium text-gray-700">
                            Duration (minutes)
                          </label>
                          <input
                            type="number"
                            id="duration_minutes"
                            name="duration_minutes"
                            value={formData.duration_minutes}
                            onChange={handleInputChange}
                            min="15"
                            max="480"
                            step="15"
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                          />
                        </div>
                      </div>

                      {/* Available Time Slots */}
                      {availability.length > 0 && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-3">
                            Available Time Slots
                          </label>
                          {checkingAvailability ? (
                            <div className="flex items-center justify-center py-4">
                              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                              <span className="ml-2 text-sm text-gray-600">Checking availability...</span>
                            </div>
                          ) : (
                            <div className="grid grid-cols-4 sm:grid-cols-6 gap-2 max-h-32 overflow-y-auto">
                              {availability.map((slot, index) => (
                                <button
                                  key={index}
                                  type="button"
                                  onClick={() => handleTimeSlotSelect(slot)}
                                  disabled={!slot.available}
                                  className={`min-h-[44px] px-3 py-2 text-xs rounded-md border transition-colors ${
                                    slot.available
                                      ? 'border-green-200 bg-green-50 text-green-700 hover:bg-green-100'
                                      : 'border-gray-200 bg-gray-50 text-gray-400 cursor-not-allowed'
                                  }`}
                                >
                                  {slot.start_time}
                                </button>
                              ))}
                            </div>
                          )}
                          {availabilityError && (
                            <p className="mt-2 text-sm text-red-600">{availabilityError}</p>
                          )}
                        </div>
                      )}

                      {/* Customer Information */}
                      <div className="space-y-4">
                        <h4 className="text-sm font-semibold text-gray-900">Customer Information</h4>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <label htmlFor="client_name" className="block text-sm font-medium text-gray-700">
                              Name <span className="text-red-500">*</span>
                            </label>
                            <input
                              type="text"
                              id="client_name"
                              name="client_name"
                              value={formData.client_name}
                              onChange={handleInputChange}
                              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                              required
                            />
                          </div>
                          
                          <div>
                            <label htmlFor="client_phone" className="block text-sm font-medium text-gray-700">
                              Phone
                            </label>
                            <input
                              type="tel"
                              id="client_phone"
                              name="client_phone"
                              value={formData.client_phone}
                              onChange={handleInputChange}
                              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                            />
                          </div>
                        </div>
                        
                        <div>
                          <label htmlFor="client_email" className="block text-sm font-medium text-gray-700">
                            Email
                          </label>
                          <input
                            type="email"
                            id="client_email"
                            name="client_email"
                            value={formData.client_email}
                            onChange={handleInputChange}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                          />
                        </div>
                        
                        <div>
                          <label htmlFor="client_notes" className="block text-sm font-medium text-gray-700">
                            Notes
                          </label>
                          <textarea
                            id="client_notes"
                            name="client_notes"
                            value={formData.client_notes}
                            onChange={handleInputChange}
                            rows={3}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                            placeholder="Any special requests or preferences..."
                          />
                        </div>
                      </div>

                      {/* Pricing */}
                      <div className="space-y-4">
                        <h4 className="text-sm font-semibold text-gray-900">Pricing</h4>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                          <div>
                            <label htmlFor="service_price" className="block text-sm font-medium text-gray-700">
                              Service Price
                            </label>
                            <input
                              type="number"
                              id="service_price"
                              name="service_price"
                              value={formData.service_price}
                              onChange={handleInputChange}
                              min="0"
                              step="0.01"
                              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                            />
                          </div>
                          
                          <div>
                            <label htmlFor="tip_amount" className="block text-sm font-medium text-gray-700">
                              Tip Amount
                            </label>
                            <input
                              type="number"
                              id="tip_amount"
                              name="tip_amount"
                              value={formData.tip_amount}
                              onChange={handleInputChange}
                              min="0"
                              step="0.01"
                              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                            />
                          </div>
                          
                          <div>
                            <label className="block text-sm font-medium text-gray-700">
                              Total Amount
                            </label>
                            <div className="mt-1 block w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-md text-gray-900 font-medium">
                              ${(formData.service_price + (formData.tip_amount || 0)).toFixed(2)}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Options */}
                      <div className="space-y-3">
                        <div className="flex items-center">
                          <input
                            id="is_walk_in"
                            name="is_walk_in"
                            type="checkbox"
                            checked={formData.is_walk_in}
                            onChange={handleInputChange}
                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                          />
                          <label htmlFor="is_walk_in" className="ml-2 block text-sm text-gray-900">
                            This is a walk-in appointment
                          </label>
                        </div>
                        
                        <div>
                          <label htmlFor="priority" className="block text-sm font-medium text-gray-700">
                            Priority
                          </label>
                          <select
                            id="priority"
                            name="priority"
                            value={formData.priority}
                            onChange={handleInputChange}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                          >
                            <option value={0}>Normal</option>
                            <option value={1}>High</option>
                            <option value={2}>Urgent</option>
                          </select>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="mt-6 flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-3">
                        <button
                          type="button"
                          onClick={onClose}
                          className="mt-3 inline-flex w-full justify-center rounded-md bg-white px-4 py-3 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 sm:mt-0 sm:w-auto min-h-[44px]"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          disabled={loading || checkingAvailability}
                          className="inline-flex w-full justify-center rounded-md bg-blue-600 px-4 py-3 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 sm:w-auto disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px]"
                        >
                          {loading ? (
                            <>
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                              {isEditing ? 'Updating...' : 'Booking...'}
                            </>
                          ) : (
                            isEditing ? 'Update Appointment' : 'Book Appointment'
                          )}
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition.Root>
  )
}