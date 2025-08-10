'use client'

import { Dialog, Transition } from '@headlessui/react'
import { XMarkIcon, CalendarIcon, ClockIcon, UserIcon, CurrencyDollarIcon, TrashIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline'
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
  
  // Form state - Initialize with selectedSlot data
  const getInitialDateTime = () => {
    if (selectedSlot?.start) {
      // Handle both Date objects and ISO strings
      const date = selectedSlot.start instanceof Date ? selectedSlot.start : new Date(selectedSlot.start)
      // Convert to local time string for datetime-local input
      const year = date.getFullYear()
      const month = String(date.getMonth() + 1).padStart(2, '0')
      const day = String(date.getDate()).padStart(2, '0')
      const hours = String(date.getHours()).padStart(2, '0')
      const minutes = String(date.getMinutes()).padStart(2, '0')
      return `${year}-${month}-${day}T${hours}:${minutes}`
    }
    return ''
  }
  
  const [formData, setFormData] = useState({
    barber_id: selectedSlot?.barberId || '',
    service_id: '',
    scheduled_at: getInitialDateTime(),
    duration_minutes: 60,
    service_price: 0,
    tip_amount: 0,
    client_name: '',
    client_phone: '',
    client_email: '',
    client_notes: '',
    is_walk_in: false,
    booking_source: 'online',
    priority: 0,
    // Recurring appointment fields
    is_recurring: false,
    recurrence_pattern: 'weekly', // daily, weekly, monthly
    recurrence_interval: 1, // every N weeks/months
    recurrence_days: [], // for weekly: [1,2,3] = Mon,Tue,Wed
    recurrence_end_type: 'count', // count, date, never
    recurrence_count: 4, // number of occurrences
    recurrence_end_date: ''
  })
  
  const [availability, setAvailability] = useState([])
  const [checkingAvailability, setCheckingAvailability] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [availabilityError, setAvailabilityError] = useState('')
  const [checkingConflicts, setCheckingConflicts] = useState(false)
  const [conflicts, setConflicts] = useState(null)
  const [conflictResolution, setConflictResolution] = useState('skip')
  const [showConversionConfirmation, setShowConversionConfirmation] = useState(false)
  
  // Delete confirmation dialog state
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false)
  const [deleteOption, setDeleteOption] = useState('single') // 'single' or 'all' for recurring
  const [deletingAppointment, setDeletingAppointment] = useState(false)

  // Populate form when modal opens with selectedSlot or when editing
  useEffect(() => {
    if (isEditing && editingAppointment) {
      // Convert appointment time to local time for editing
      let scheduledAt = ''
      if (editingAppointment.scheduled_at) {
        const date = new Date(editingAppointment.scheduled_at)
        const year = date.getFullYear()
        const month = String(date.getMonth() + 1).padStart(2, '0')
        const day = String(date.getDate()).padStart(2, '0')
        const hours = String(date.getHours()).padStart(2, '0')
        const minutes = String(date.getMinutes()).padStart(2, '0')
        scheduledAt = `${year}-${month}-${day}T${hours}:${minutes}`
      }
      
      // Debug logging to see what IDs we're trying to set
      console.log('🔍 Modal - Setting form data for editing:', {
        barber_id: editingAppointment.barber_id,
        service_id: editingAppointment.service_id,
        editingAppointment: editingAppointment
      })
      
      setFormData({
        barber_id: editingAppointment.barber_id || '',
        service_id: editingAppointment.service_id || '',
        scheduled_at: scheduledAt,
        duration_minutes: editingAppointment.duration_minutes || 60,
        service_price: editingAppointment.service_price || 0,
        tip_amount: editingAppointment.tip_amount || 0,
        client_name: editingAppointment.client_name || editingAppointment.client?.name || '',
        client_phone: editingAppointment.client_phone || editingAppointment.client?.phone || '',
        client_email: editingAppointment.client_email || editingAppointment.client?.email || '',
        client_notes: editingAppointment.client_notes || '',
        is_walk_in: editingAppointment.is_walk_in || false,
        booking_source: editingAppointment.booking_source || 'online',
        priority: editingAppointment.priority || 0,
        // Recurring fields - only show for parent recurring events
        is_recurring: !!editingAppointment.recurrence_rule,
        recurrence_pattern: 'weekly',
        recurrence_interval: 1,
        recurrence_days: [],
        recurrence_end_type: 'count',
        recurrence_count: 4,
        recurrence_end_date: ''
      })
    } else if (selectedSlot && !isEditing) {
      // Update form when opening with a new selected slot
      let dateTime
      const slotDate = selectedSlot.start instanceof Date 
        ? selectedSlot.start 
        : new Date(selectedSlot.start)
      
      // Handle different view types
      if (selectedSlot.needsTimePicker) {
        // Month view: Use selected date with suggested time
        const year = slotDate.getFullYear()
        const month = String(slotDate.getMonth() + 1).padStart(2, '0')
        const day = String(slotDate.getDate()).padStart(2, '0')
        const time = selectedSlot.suggestedTime || '09:00'
        dateTime = `${year}-${month}-${day}T${time}`
      } else {
        // Other views: Use exact time from slot - convert to local time
        const year = slotDate.getFullYear()
        const month = String(slotDate.getMonth() + 1).padStart(2, '0')
        const day = String(slotDate.getDate()).padStart(2, '0')
        const hours = String(slotDate.getHours()).padStart(2, '0')
        const minutes = String(slotDate.getMinutes()).padStart(2, '0')
        dateTime = `${year}-${month}-${day}T${hours}:${minutes}`
      }
      
      setFormData(prev => ({
        ...prev,
        barber_id: selectedSlot.barberId || '',
        scheduled_at: dateTime
      }))
    }
  }, [isEditing, editingAppointment, selectedSlot])

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

  const handleInputChange = async (e) => {
    const { name, value, type, checked } = e.target
    
    // Special handling for converting to recurring
    if (name === 'is_recurring' && checked && isEditing && !editingAppointment?.recurrence_rule) {
      // Preserve the original day and time when converting to recurring
      const appointmentDate = new Date(formData.scheduled_at)
      const dayOfWeek = appointmentDate.getDay()
      
      console.log('Converting to recurring - preserving time:', {
        originalTime: formData.scheduled_at,
        dayOfWeek: dayOfWeek,
        appointmentDate: appointmentDate.toString()
      })
      
      setFormData(prev => ({
        ...prev,
        is_recurring: true,
        recurrence_pattern: 'weekly', // Default to weekly
        recurrence_interval: 1,
        recurrence_days: [dayOfWeek], // Set the day to match original appointment
        recurrence_end_type: 'count',
        recurrence_count: 10
        // Note: scheduled_at is NOT changed, preserving the original time
      }))
      
      setShowConversionConfirmation(true)
      
      // Check for conflicts when converting to recurring
      setTimeout(() => checkRecurringConflicts(), 500)
    } else if (name === 'is_recurring' && !checked) {
      setShowConversionConfirmation(false)
      setConflicts(null)
      setFormData(prev => ({
        ...prev,
        [name]: checked
      }))
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: type === 'checkbox' ? checked : value
      }))
    }
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
        scheduled_at: new Date(formData.scheduled_at).toISOString(),
        recurrence_rule: generateRRule()
      }
      
      if (isEditing) {
        // Check if converting to recurring appointment
        if (formData.is_recurring && !editingAppointment.recurrence_rule) {
          // Don't proceed if user selected cancel for conflicts
          if (conflicts && conflicts.has_conflicts && conflictResolution === 'cancel') {
            throw new Error('Conversion cancelled due to conflicts')
          }
          
          // Convert existing appointment to recurring
          const response = await fetch(`/api/calendar/appointments/${editingAppointment.id}/convert-recurring`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              ...appointmentData,
              conflict_resolution: conflictResolution,
              skip_dates: conflicts?.conflict_dates || []
            })
          })
          
          if (!response.ok) {
            const errorData = await response.json()
            throw new Error(errorData.error || 'Failed to convert to recurring appointment')
          }
          
          const data = await response.json()
          console.log('Convert recurring response:', data)
          // Pass the appointment data properly
          if (data && data.appointment) {
            onBookingComplete(data.appointment)
          } else {
            console.error('Invalid response from convert-recurring:', data)
            throw new Error('Invalid response from server')
          }
        } else {
          // Update existing appointment normally
          const response = await fetch(`/api/calendar/appointments/${editingAppointment.id}`, {
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
        }
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
  
  // Handle appointment deletion
  const handleDelete = async () => {
    if (!editingAppointment || !editingAppointment.id) {
      console.error('No appointment to delete', editingAppointment)
      setError('No appointment ID found. This may be demo data that cannot be deleted.')
      return
    }
    
    console.log('Attempting to delete appointment:', {
      id: editingAppointment.id,
      isRecurring: editingAppointment.isRecurring,
      extendedProps: editingAppointment.extendedProps
    })
    
    setDeletingAppointment(true)
    setError('')
    
    try {
      // Build delete URL with appropriate parameters
      let deleteUrl = `/api/calendar/appointments/${editingAppointment.id}`
      const params = new URLSearchParams()
      
      // For recurring appointments, determine delete scope
      if (editingAppointment.isRecurring || editingAppointment.extendedProps?.isRecurring) {
        if (deleteOption === 'all') {
          params.append('deleteAll', 'true')
        } else if (deleteOption === 'single' && editingAppointment.start) {
          // Get the date of this specific occurrence
          const occurrenceDate = new Date(editingAppointment.start)
          params.append('cancelDate', occurrenceDate.toISOString().split('T')[0])
        }
      }
      
      if (params.toString()) {
        deleteUrl += `?${params.toString()}`
      }
      
      console.log('Deleting appointment:', deleteUrl)
      
      const response = await fetch(deleteUrl, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json'
        }
      })
      
      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete appointment')
      }
      
      console.log('Delete successful:', data)
      
      // Close the modal and refresh the calendar
      setShowDeleteConfirmation(false)
      onClose()
      
      // Call the booking complete callback to refresh the calendar
      // Pass a special flag to indicate this was a deletion
      if (onBookingComplete) {
        await onBookingComplete({ isDeleted: true })
      }
      
    } catch (error) {
      console.error('Error deleting appointment:', error)
      setError('Failed to delete appointment: ' + error.message)
    } finally {
      setDeletingAppointment(false)
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

  // Check for conflicts when converting to recurring
  const checkRecurringConflicts = async () => {
    if (!formData.is_recurring || !formData.barber_id) return
    
    setCheckingConflicts(true)
    setConflicts(null)
    
    try {
      const rrule = generateRRule()
      if (!rrule) return
      
      const response = await fetch('/api/calendar/appointments/check-conflicts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          appointment_id: editingAppointment?.id,
          barber_id: formData.barber_id,
          start_time: formData.scheduled_at,
          end_time: new Date(new Date(formData.scheduled_at).getTime() + formData.duration_minutes * 60000).toISOString(),
          rrule: rrule,
          check_count: formData.recurrence_count || 10
        })
      })
      
      if (response.ok) {
        const data = await response.json()
        setConflicts(data)
      }
    } catch (error) {
      console.error('Error checking conflicts:', error)
    } finally {
      setCheckingConflicts(false)
    }
  }
  
  // Helper function to generate RRule string
  const generateRRule = () => {
    if (!formData.is_recurring) return null
    
    const startDate = new Date(formData.scheduled_at)
    let freq = 'WEEKLY'
    let interval = formData.recurrence_interval
    
    switch (formData.recurrence_pattern) {
      case 'daily':
        freq = 'DAILY'
        break
      case 'weekly':
        freq = 'WEEKLY'
        break
      case 'monthly':
        freq = 'MONTHLY'
        break
    }
    
    let rrule = `FREQ=${freq};INTERVAL=${interval}`
    
    // Add end condition
    if (formData.recurrence_end_type === 'count') {
      rrule += `;COUNT=${formData.recurrence_count}`
    } else if (formData.recurrence_end_type === 'date' && formData.recurrence_end_date) {
      const endDate = new Date(formData.recurrence_end_date)
      const until = endDate.toISOString().replace(/[:\-]/g, '').split('.')[0] + 'Z'
      rrule += `;UNTIL=${until}`
    }
    
    // Add days of week for weekly pattern
    if (formData.recurrence_pattern === 'weekly' && formData.recurrence_days.length > 0) {
      const days = formData.recurrence_days.map(day => {
        const weekdays = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA']
        return weekdays[day]
      }).join(',')
      rrule += `;BYDAY=${days}`
    }
    
    return rrule
  }

  const selectedBarber = barbers.find(b => b.id === formData.barber_id)
  const selectedService = services.find(s => s.id === formData.service_id)

  return (
    <>
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
                      {isEditing && editingAppointment?.recurrence_rule && (
                        <div className="mt-2 text-sm text-amber-600 bg-amber-50 border border-amber-200 rounded-md p-3">
                          🔄 This is a recurring appointment. Changes will only apply to this specific occurrence.
                        </div>
                      )}
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
                            {selectedSlot?.needsTimePicker && (
                              <span className="ml-2 text-xs text-blue-600 font-normal">
                                (Please select a time for {selectedSlot.selectedDate})
                              </span>
                            )}
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
                            min="5"
                            max="480"
                            step="5"
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

                      {/* Recurring Appointments */}
                      <div className="space-y-4">
                        <h4 className="text-sm font-semibold text-gray-900">Recurring Schedule</h4>
                        
                        {isEditing && editingAppointment?.recurrence_rule && (
                          <div className="mb-4 text-sm text-blue-600 bg-blue-50 border border-blue-200 rounded-md p-3">
                            ℹ️ This appointment is already part of a recurring series. Converting will create a new series starting from this appointment.
                          </div>
                        )}
                        
                        {/* Conversion Confirmation */}
                        {showConversionConfirmation && formData.is_recurring && isEditing && (
                          <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                            <div className="flex items-start">
                              <div className="flex-shrink-0">
                                <svg className="h-5 w-5 text-green-400 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                </svg>
                              </div>
                              <div className="ml-3">
                                <h3 className="text-sm font-medium text-green-800">
                                  Converting to Recurring Appointment
                                </h3>
                                <div className="mt-2 text-sm text-green-700">
                                  <p>This will create appointments:</p>
                                  <ul className="list-disc list-inside mt-1">
                                    <li>Every {formData.recurrence_interval} {formData.recurrence_pattern === 'daily' ? 'day(s)' : formData.recurrence_pattern === 'weekly' ? 'week(s)' : 'month(s)'}</li>
                                    <li>On {new Date(formData.scheduled_at).toLocaleDateString('en-US', { weekday: 'long' })} at {new Date(formData.scheduled_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</li>
                                    <li>For {formData.recurrence_count} occurrences</li>
                                  </ul>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                        
                        {/* Conflict Detection Results */}
                        {conflicts && conflicts.has_conflicts && (
                          <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                            <div className="flex items-start">
                              <div className="flex-shrink-0">
                                <svg className="h-5 w-5 text-amber-400 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                </svg>
                              </div>
                              <div className="ml-3 flex-1">
                                <h3 className="text-sm font-medium text-amber-800">
                                  {conflicts.conflicts_found} Scheduling Conflict{conflicts.conflicts_found !== 1 ? 's' : ''} Found
                                </h3>
                                <div className="mt-2 text-sm text-amber-700">
                                  <p className="mb-2">The following dates have conflicts:</p>
                                  <div className="max-h-32 overflow-y-auto space-y-1">
                                    {conflicts.conflicts.slice(0, 5).map((conflict, index) => (
                                      <div key={index} className="text-xs bg-amber-100 rounded px-2 py-1">
                                        {new Date(conflict.date).toLocaleDateString('en-US', { 
                                          month: 'short', 
                                          day: 'numeric',
                                          hour: '2-digit',
                                          minute: '2-digit'
                                        })}
                                        {conflict.conflicting_appointments[0] && (
                                          <span className="text-amber-600"> - {conflict.conflicting_appointments[0].customer_name}</span>
                                        )}
                                      </div>
                                    ))}
                                    {conflicts.conflicts.length > 5 && (
                                      <div className="text-xs text-amber-600 italic">
                                        ... and {conflicts.conflicts.length - 5} more
                                      </div>
                                    )}
                                  </div>
                                </div>
                                
                                <div className="mt-3">
                                  <label className="block text-sm font-medium text-amber-800 mb-2">
                                    How would you like to handle conflicts?
                                  </label>
                                  <select
                                    value={conflictResolution}
                                    onChange={(e) => setConflictResolution(e.target.value)}
                                    className="block w-full text-sm rounded-md border-amber-300 shadow-sm focus:border-amber-500 focus:ring-amber-500"
                                  >
                                    <option value="skip">Skip conflicting dates ({conflicts.available_slots} appointments will be created)</option>
                                    <option value="overwrite">Replace existing appointments (requires confirmation)</option>
                                    <option value="cancel">Don't convert to recurring</option>
                                  </select>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                        
                        <div className="flex items-center">
                          <input
                            id="is_recurring"
                            name="is_recurring"
                            type="checkbox"
                            checked={formData.is_recurring}
                            onChange={handleInputChange}
                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                          />
                          <label htmlFor="is_recurring" className="ml-2 block text-sm text-gray-900">
                            {isEditing ? 'Convert to recurring appointment' : 'Make this a recurring appointment'}
                          </label>
                        </div>
                        
                        {formData.is_recurring && (
                          <div className="space-y-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                              {/* Recurrence Pattern */}
                              <div>
                                <label htmlFor="recurrence_pattern" className="block text-sm font-medium text-gray-700">
                                  Repeat
                                </label>
                                <select
                                  id="recurrence_pattern"
                                  name="recurrence_pattern"
                                  value={formData.recurrence_pattern}
                                  onChange={handleInputChange}
                                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                                >
                                  <option value="daily">Daily</option>
                                  <option value="weekly">Weekly</option>
                                  <option value="monthly">Monthly</option>
                                </select>
                              </div>
                              
                              {/* Recurrence Interval */}
                              <div>
                                <label htmlFor="recurrence_interval" className="block text-sm font-medium text-gray-700">
                                  Every
                                </label>
                                <div className="mt-1 flex items-center space-x-2">
                                  <input
                                    type="number"
                                    id="recurrence_interval"
                                    name="recurrence_interval"
                                    value={formData.recurrence_interval}
                                    onChange={handleInputChange}
                                    min="1"
                                    max="12"
                                    className="block w-20 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                                  />
                                  <span className="text-sm text-gray-600">
                                    {formData.recurrence_pattern === 'daily' ? 'day(s)' :
                                     formData.recurrence_pattern === 'weekly' ? 'week(s)' : 'month(s)'}
                                  </span>
                                </div>
                              </div>
                            </div>
                            
                            {/* Days of week for weekly pattern */}
                            {formData.recurrence_pattern === 'weekly' && (
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                  Repeat on
                                </label>
                                <div className="flex space-x-2">
                                  {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, index) => (
                                    <button
                                      key={day}
                                      type="button"
                                      onClick={() => {
                                        const newDays = formData.recurrence_days.includes(index)
                                          ? formData.recurrence_days.filter(d => d !== index)
                                          : [...formData.recurrence_days, index]
                                        setFormData(prev => ({ ...prev, recurrence_days: newDays }))
                                      }}
                                      className={`w-10 h-10 rounded-full text-xs font-medium transition-colors ${
                                        formData.recurrence_days.includes(index)
                                          ? 'bg-blue-600 text-white'
                                          : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                                      }`}
                                    >
                                      {day.charAt(0)}
                                    </button>
                                  ))}
                                </div>
                              </div>
                            )}
                            
                            {/* End condition */}
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                End
                              </label>
                              <div className="space-y-2">
                                <div className="flex items-center">
                                  <input
                                    type="radio"
                                    id="recurrence_end_count"
                                    name="recurrence_end_type"
                                    value="count"
                                    checked={formData.recurrence_end_type === 'count'}
                                    onChange={handleInputChange}
                                    className="h-4 w-4 text-blue-600 focus:ring-blue-500"
                                  />
                                  <label htmlFor="recurrence_end_count" className="ml-2 text-sm text-gray-900">
                                    After
                                  </label>
                                  <input
                                    type="number"
                                    name="recurrence_count"
                                    value={formData.recurrence_count}
                                    onChange={handleInputChange}
                                    min="1"
                                    max="52"
                                    disabled={formData.recurrence_end_type !== 'count'}
                                    className="ml-2 w-16 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 disabled:bg-gray-100"
                                  />
                                  <span className="ml-1 text-sm text-gray-600">appointments</span>
                                </div>
                                
                                <div className="flex items-center">
                                  <input
                                    type="radio"
                                    id="recurrence_end_date"
                                    name="recurrence_end_type"
                                    value="date"
                                    checked={formData.recurrence_end_type === 'date'}
                                    onChange={handleInputChange}
                                    className="h-4 w-4 text-blue-600 focus:ring-blue-500"
                                  />
                                  <label htmlFor="recurrence_end_date" className="ml-2 text-sm text-gray-900">
                                    On
                                  </label>
                                  <input
                                    type="date"
                                    name="recurrence_end_date"
                                    value={formData.recurrence_end_date}
                                    onChange={handleInputChange}
                                    disabled={formData.recurrence_end_type !== 'date'}
                                    className="ml-2 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 disabled:bg-gray-100"
                                  />
                                </div>
                                
                                <div className="flex items-center">
                                  <input
                                    type="radio"
                                    id="recurrence_end_never"
                                    name="recurrence_end_type"
                                    value="never"
                                    checked={formData.recurrence_end_type === 'never'}
                                    onChange={handleInputChange}
                                    className="h-4 w-4 text-blue-600 focus:ring-blue-500"
                                  />
                                  <label htmlFor="recurrence_end_never" className="ml-2 text-sm text-gray-900">
                                    Never
                                  </label>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
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
                      <div className="mt-6 flex flex-col-reverse sm:flex-row sm:justify-between">
                        {/* Delete button (left side) - only show when editing */}
                        {isEditing && (
                          <button
                            type="button"
                            onClick={() => setShowDeleteConfirmation(true)}
                            className="inline-flex items-center rounded-md bg-red-600 px-4 py-3 text-sm font-semibold text-white shadow-sm hover:bg-red-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600 sm:w-auto min-h-[44px] mt-3 sm:mt-0"
                          >
                            <TrashIcon className="h-4 w-4 mr-2" />
                            Delete Appointment
                          </button>
                        )}
                        
                        {/* Right side buttons */}
                        <div className="flex flex-col-reverse sm:flex-row sm:space-x-3 sm:ml-auto">
                          <button
                            type="button"
                            onClick={onClose}
                            className="mt-3 inline-flex w-full justify-center rounded-md bg-white px-4 py-3 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 sm:mt-0 sm:w-auto min-h-[44px]"
                          >
                            Cancel
                          </button>
                          <button
                            type="submit"
                          disabled={loading || checkingAvailability || (conflicts && conflicts.has_conflicts && conflictResolution === 'cancel')}
                          className="inline-flex w-full justify-center items-center rounded-md bg-blue-600 px-4 py-3 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 sm:w-auto disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px]"
                        >
                          {loading ? (
                            <>
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                              {isEditing ? 'Updating...' : 'Booking...'}
                            </>
                          ) : (
                            <>
                              {showConversionConfirmation && formData.is_recurring && isEditing && (
                                <svg className="h-4 w-4 mr-1.5" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                </svg>
                              )}
                              {isEditing ? (
                                showConversionConfirmation && formData.is_recurring ? 'Convert to Recurring' : 'Update Appointment'
                              ) : 'Book Appointment'}
                            </>
                          )}
                          </button>
                        </div>
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
    
    {/* Delete Confirmation Dialog */}
    {showDeleteConfirmation && (
      <Transition.Root show={showDeleteConfirmation} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={() => setShowDeleteConfirmation(false)}>
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
              <Dialog.Panel className="relative transform overflow-hidden rounded-lg bg-white px-4 pb-4 pt-5 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg sm:p-6">
                <div className="sm:flex sm:items-start">
                  <div className="mx-auto flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-red-100 sm:mx-0 sm:h-10 sm:w-10">
                    <ExclamationTriangleIcon className="h-6 w-6 text-red-600" aria-hidden="true" />
                  </div>
                  <div className="mt-3 text-center sm:ml-4 sm:mt-0 sm:text-left">
                    <Dialog.Title as="h3" className="text-base font-semibold leading-6 text-gray-900">
                      Delete Appointment
                    </Dialog.Title>
                    <div className="mt-2">
                      {editingAppointment?.isRecurring || editingAppointment?.extendedProps?.isRecurring ? (
                        <div className="space-y-3">
                          <p className="text-sm text-gray-500">
                            This is a recurring appointment. How would you like to delete it?
                          </p>
                          <div className="space-y-2">
                            <div className="flex items-center">
                              <input
                                id="delete-single"
                                type="radio"
                                value="single"
                                checked={deleteOption === 'single'}
                                onChange={(e) => setDeleteOption(e.target.value)}
                                className="h-4 w-4 text-red-600 focus:ring-red-500 border-gray-300"
                              />
                              <label htmlFor="delete-single" className="ml-2 block text-sm text-gray-700">
                                Delete only this occurrence
                              </label>
                            </div>
                            <div className="flex items-center">
                              <input
                                id="delete-all"
                                type="radio"
                                value="all"
                                checked={deleteOption === 'all'}
                                onChange={(e) => setDeleteOption(e.target.value)}
                                className="h-4 w-4 text-red-600 focus:ring-red-500 border-gray-300"
                              />
                              <label htmlFor="delete-all" className="ml-2 block text-sm text-gray-700">
                                Delete all occurrences (entire series)
                              </label>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <p className="text-sm text-gray-500">
                          Are you sure you want to delete this appointment? This action cannot be undone.
                        </p>
                      )}
                    </div>
                  </div>
                </div>
                <div className="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse">
                  <button
                    type="button"
                    disabled={deletingAppointment}
                    onClick={handleDelete}
                    className="inline-flex w-full justify-center rounded-md bg-red-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-red-500 sm:ml-3 sm:w-auto disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {deletingAppointment ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Deleting...
                      </>
                    ) : (
                      'Delete'
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowDeleteConfirmation(false)}
                    className="mt-3 inline-flex w-full justify-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 sm:mt-0 sm:w-auto"
                  >
                    Cancel
                  </button>
                </div>
                {error && (
                  <div className="mt-4 rounded-md bg-red-50 p-3">
                    <p className="text-sm text-red-800">{error}</p>
                  </div>
                )}
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition.Root>
    )}
    </>
  )
}