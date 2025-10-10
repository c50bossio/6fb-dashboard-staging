'use client'

import { Dialog, Transition } from '@headlessui/react'
import {
  XMarkIcon,
  CalendarIcon,
  ClockIcon,
  CurrencyDollarIcon
} from '@heroicons/react/24/outline'
import { useState, useEffect, Fragment } from 'react'
import { toast } from '@/hooks/use-toast'

export default function AppointmentModal({ 
  isOpen, 
  onClose, 
  onSave, 
  selectedSlot,
  existingAppointment = null 
}) {
  const [formData, setFormData] = useState({
    customerName: '',
    customerPhone: '',
    customerEmail: '',
    service: '',
    barberId: '',
    notes: '',
    status: 'pending'
  })

  const [services, setServices] = useState([])
  const [barbers, setBarbers] = useState([])
  const [selectedService, setSelectedService] = useState(null)
  const [calculatedEndTime, setCalculatedEndTime] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [loadingError, setLoadingError] = useState(null)
  const [validationErrors, setValidationErrors] = useState({})
  const [isDeleting, setIsDeleting] = useState(false)

  // Load services and barbers when modal opens
  useEffect(() => {
    if (isOpen) {
      loadInitialData()
    }
  }, [isOpen])

  const loadInitialData = async () => {
    setIsLoading(true)
    setLoadingError(null)
    
    try {
      // Load services and barbers in parallel
      const [servicesResponse, barbersResponse] = await Promise.all([
        fetch('/api/calendar/services'),
        fetch('/api/calendar/barbers')
      ])
      
      if (!servicesResponse.ok || !barbersResponse.ok) {
        throw new Error('Failed to load data')
      }
      
      const servicesData = await servicesResponse.json()
      const barbersData = await barbersResponse.json()
      
      setServices(servicesData.services || [])
      setBarbers(barbersData.barbers || [])
      
      // Set default service if available
      if (servicesData.services && servicesData.services.length > 0) {
        const defaultService = servicesData.services[0]
        setSelectedService(defaultService)
        setFormData(prev => ({
          ...prev,
          service: defaultService.id
        }))
      }
      
    } catch (error) {
      console.error('Error loading initial data:', error)
      setLoadingError('Failed to load services and barbers')
      toast({
        title: 'Error',
        description: 'Failed to load appointment data',
        variant: 'destructive'
      })
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (isOpen) {
      if (existingAppointment) {
        const appointment = existingAppointment.extendedProps
        setFormData({
          customerName: appointment.customer || '',
          customerPhone: appointment.phone || '',
          customerEmail: appointment.email || '',
          service: appointment.serviceId || '',
          barberId: existingAppointment.getResources()[0]?.id || '',
          notes: appointment.notes || '',
          status: appointment.status || 'pending'
        })
      } else if (selectedSlot) {
        setFormData(prev => ({
          ...prev,
          barberId: selectedSlot.resourceId || '',
          service: services.length > 0 ? services[0].id : ''
        }))
      }
    } else {
      setFormData({
        customerName: '',
        customerPhone: '',
        customerEmail: '',
        service: '',
        barberId: '',
        notes: '',
        status: 'pending'
      })
      setServices([])
      setBarbers([])
      setSelectedService(null)
      setLoadingError(null)
      setValidationErrors({})
      setIsDeleting(false)
    }
  }, [isOpen, existingAppointment, selectedSlot, services])

  useEffect(() => {
    const service = services.find(s => s.id === formData.service)
    setSelectedService(service)
    
    if (selectedSlot?.start && service) {
      const startTime = new Date(selectedSlot.start)
      const duration = service.duration_minutes || service.duration || 30
      const endTime = new Date(startTime.getTime() + (duration * 60000))
      setCalculatedEndTime(endTime.toISOString())
    }
  }, [formData.service, selectedSlot, services])

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const validateForm = () => {
    const errors = {}
    
    // Required fields validation
    if (!formData.customerName || formData.customerName.trim().length < 1) {
      errors.customerName = 'Customer name is required'
    } else if (formData.customerName.length > 255) {
      errors.customerName = 'Customer name must be less than 255 characters'
    }
    
    if (!formData.customerPhone || formData.customerPhone.trim().length < 1) {
      errors.customerPhone = 'Phone number is required'
    } else if (formData.customerPhone.length > 20) {
      errors.customerPhone = 'Phone number must be less than 20 characters'
    }
    
    // Email validation (optional but must be valid if provided)
    if (formData.customerEmail && formData.customerEmail.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(formData.customerEmail)) {
        errors.customerEmail = 'Please enter a valid email address'
      }
    }
    
    if (!formData.barberId) {
      errors.barberId = 'Please select a barber'
    }
    
    if (!formData.service) {
      errors.service = 'Please select a service'
    }
    
    // Notes validation (optional but limited)
    if (formData.notes && formData.notes.length > 500) {
      errors.notes = 'Notes must be less than 500 characters'
    }
    
    setValidationErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    // Clear previous validation errors
    setValidationErrors({})
    
    if (!validateForm()) {
      toast({
        title: 'Validation Error',
        description: 'Please fix the highlighted errors',
        variant: 'destructive'
      })
      return
    }

    if (!selectedService) {
      toast({
        title: 'Error',
        description: 'Selected service not found',
        variant: 'destructive'
      })
      return
    }

    setIsSubmitting(true)
    
    try {
      const appointmentData = {
        client_name: formData.customerName,
        client_phone: formData.customerPhone,
        client_email: formData.customerEmail || null,
        client_notes: formData.notes || null,
        barber_id: formData.barberId,
        service_id: formData.service,
        scheduled_at: selectedSlot?.start || existingAppointment?.start,
        duration_minutes: selectedService.duration_minutes || selectedService.duration || 30,
        service_price: selectedService.price || 0,
        tip_amount: 0,
        barbershop_id: process.env.NEXT_PUBLIC_DEFAULT_BARBERSHOP_ID || '00000000-0000-0000-0000-000000000000',
        is_walk_in: false
      }

      let response
      if (existingAppointment) {
        // Update existing appointment
        response = await fetch('/api/appointments', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            id: existingAppointment.id,
            ...appointmentData
          })
        })
      } else {
        // Create new appointment
        response = await fetch('/api/appointments', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(appointmentData)
        })
      }

      if (!response.ok) {
        const errorData = await response.json()
        
        // Handle validation errors from the server
        if (response.status === 400 && errorData.details) {
          console.error('Server validation errors:', errorData.details)
          
          // If it's a Zod validation error, show specific field errors
          if (Array.isArray(errorData.details)) {
            const serverErrors = {}
            errorData.details.forEach(error => {
              const field = error.path?.[0]
              if (field) {
                serverErrors[field] = error.message
              }
            })
            setValidationErrors(serverErrors)
          }
          
          throw new Error('Please fix the validation errors')
        }
        
        if (response.status === 409) {
          throw new Error('This time slot conflicts with an existing appointment')
        }
        
        throw new Error(errorData.error || 'Failed to save appointment')
      }

      const result = await response.json()
      
      toast({
        title: 'Success',
        description: existingAppointment 
          ? 'Appointment updated successfully' 
          : 'Appointment created successfully',
        variant: 'default'
      })

      // Call the original onSave callback with the result
      if (onSave) {
        onSave(result.data, existingAppointment?.id)
      }
      
      onClose()
      
    } catch (error) {
      console.error('Error saving appointment:', error)
      
      toast({
        title: 'Error',
        description: error.message || 'Failed to save appointment',
        variant: 'destructive'
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (!existingAppointment) return
    
    const confirmed = window.confirm(
      'Are you sure you want to cancel this appointment? This action cannot be undone.'
    )
    
    if (!confirmed) return
    
    setIsDeleting(true)
    
    try {
      const response = await fetch(`/api/appointments?id=${existingAppointment.id}`, {
        method: 'DELETE'
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to cancel appointment')
      }
      
      toast({
        title: 'Success',
        description: 'Appointment cancelled successfully',
        variant: 'default'
      })
      
      // Call the original onSave callback to refresh the calendar
      if (onSave) {
        onSave(null, existingAppointment.id, 'delete')
      }
      
      onClose()
      
    } catch (error) {
      console.error('Error cancelling appointment:', error)
      
      toast({
        title: 'Error',
        description: error.message || 'Failed to cancel appointment',
        variant: 'destructive'
      })
    } finally {
      setIsDeleting(false)
    }
  }

  const formatDateTime = (dateTime) => {
    if (!dateTime) return ''
    return new Date(dateTime).toLocaleString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    })
  }

  return (
    <Transition appear show={isOpen} as={Fragment}>
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
          <div className="fixed inset-0 bg-black bg-opacity-25" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4 text-center">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">
                <div className="flex items-center justify-between mb-4">
                  <Dialog.Title as="h3" className="text-lg font-medium leading-6 text-gray-900">
                    {existingAppointment ? 'Edit Appointment' : 'New Appointment'}
                  </Dialog.Title>
                  <button
                    onClick={onClose}
                    className="rounded-md bg-white text-gray-400 hover:text-gray-500 focus:outline-none"
                  >
                    <XMarkIcon className="h-6 w-6" />
                  </button>
                </div>

                {/* Loading State */}
                {isLoading && (
                  <div className="mb-4 p-4 text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-olive-600 mx-auto mb-2"></div>
                    <p className="text-sm text-gray-600">Loading appointment data...</p>
                  </div>
                )}

                {/* Error State */}
                {loadingError && (
                  <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-sm text-red-800">{loadingError}</p>
                  </div>
                )}

                {/* Appointment Time Display */}
                {!isLoading && selectedSlot && selectedService && (
                  <div className="mb-4 p-3 bg-olive-50 border border-olive-200 rounded-lg">
                    <div className="flex items-center space-x-2 text-sm text-olive-800">
                      <CalendarIcon className="h-4 w-4" />
                      <span>
                        {formatDateTime(selectedSlot.start)}
                        {calculatedEndTime && ` - ${formatDateTime(calculatedEndTime)}`}
                      </span>
                    </div>
                    <div className="flex items-center space-x-2 text-sm text-olive-600 mt-1">
                      <ClockIcon className="h-4 w-4" />
                      <span>{selectedService.duration_minutes || selectedService.duration || 30} minutes</span>
                      <CurrencyDollarIcon className="h-4 w-4 ml-2" />
                      <span>${selectedService.price || 0}</span>
                    </div>
                  </div>
                )}

                {!isLoading && (
                <form onSubmit={handleSubmit} className="space-y-4">
                  {/* Customer Information */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Customer Name *
                    </label>
                    <input
                      type="text"
                      name="customerName"
                      value={formData.customerName}
                      onChange={handleInputChange}
                      className={`w-full px-3 py-2 border rounded-md shadow-sm focus:ring-olive-500 focus:border-olive-500 ${
                        validationErrors.customerName ? 'border-red-500' : 'border-gray-300'
                      }`}
                      placeholder="Enter customer name"
                      required
                    />
                    {validationErrors.customerName && (
                      <p className="mt-1 text-sm text-red-600">{validationErrors.customerName}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Phone Number *
                    </label>
                    <input
                      type="tel"
                      name="customerPhone"
                      value={formData.customerPhone}
                      onChange={handleInputChange}
                      className={`w-full px-3 py-2 border rounded-md shadow-sm focus:ring-olive-500 focus:border-olive-500 ${
                        validationErrors.customerPhone ? 'border-red-500' : 'border-gray-300'
                      }`}
                      placeholder="(555) 123-4567"
                      required
                    />
                    {validationErrors.customerPhone && (
                      <p className="mt-1 text-sm text-red-600">{validationErrors.customerPhone}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Email (Optional)
                    </label>
                    <input
                      type="email"
                      name="customerEmail"
                      value={formData.customerEmail}
                      onChange={handleInputChange}
                      className={`w-full px-3 py-2 border rounded-md shadow-sm focus:ring-olive-500 focus:border-olive-500 ${
                        validationErrors.customerEmail ? 'border-red-500' : 'border-gray-300'
                      }`}
                      placeholder="customer@email.com"
                    />
                    {validationErrors.customerEmail && (
                      <p className="mt-1 text-sm text-red-600">{validationErrors.customerEmail}</p>
                    )}
                  </div>

                  {/* Service Selection */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Service
                    </label>
                    <select
                      name="service"
                      value={formData.service}
                      onChange={handleInputChange}
                      className={`w-full px-3 py-2 border rounded-md shadow-sm focus:ring-olive-500 focus:border-olive-500 ${
                        validationErrors.service ? 'border-red-500' : 'border-gray-300'
                      }`}
                    >
                      <option value="">Select a service</option>
                      {services.map(service => (
                        <option key={service.id} value={service.id}>
                          {service.name} ({service.duration_minutes || service.duration || 30} min) - ${service.price || 0}
                        </option>
                      ))}
                    </select>
                    {validationErrors.service && (
                      <p className="mt-1 text-sm text-red-600">{validationErrors.service}</p>
                    )}
                  </div>

                  {/* Barber Selection */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Barber *
                    </label>
                    <select
                      name="barberId"
                      value={formData.barberId}
                      onChange={handleInputChange}
                      className={`w-full px-3 py-2 border rounded-md shadow-sm focus:ring-olive-500 focus:border-olive-500 ${
                        validationErrors.barberId ? 'border-red-500' : 'border-gray-300'
                      }`}
                      required
                    >
                      <option value="">Select a barber</option>
                      {barbers.map(barber => (
                        <option key={barber.id} value={barber.id}>
                          {barber.title || barber.name}
                        </option>
                      ))}
                    </select>
                    {validationErrors.barberId && (
                      <p className="mt-1 text-sm text-red-600">{validationErrors.barberId}</p>
                    )}
                  </div>

                  {/* Status */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Status
                    </label>
                    <select
                      name="status"
                      value={formData.status}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-olive-500 focus:border-olive-500"
                    >
                      <option value="pending">Pending</option>
                      <option value="confirmed">Confirmed</option>
                      <option value="completed">Completed</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                  </div>

                  {/* Notes */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Notes (Optional)
                    </label>
                    <textarea
                      name="notes"
                      value={formData.notes}
                      onChange={handleInputChange}
                      rows={3}
                      maxLength={500}
                      className={`w-full px-3 py-2 border rounded-md shadow-sm focus:ring-olive-500 focus:border-olive-500 ${
                        validationErrors.notes ? 'border-red-500' : 'border-gray-300'
                      }`}
                      placeholder="Special requests, preferences, etc."
                    />
                    {validationErrors.notes && (
                      <p className="mt-1 text-sm text-red-600">{validationErrors.notes}</p>
                    )}
                    <p className="mt-1 text-sm text-gray-500">
                      {formData.notes?.length || 0}/500 characters
                    </p>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex space-x-3 pt-4">
                    <button
                      type="button"
                      onClick={onClose}
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-olive-500"
                    >
                      Cancel
                    </button>
                    
                    {/* Delete button for existing appointments */}
                    {existingAppointment && (
                      <button
                        type="button"
                        onClick={handleDelete}
                        disabled={isDeleting || isSubmitting || isLoading}
                        className="px-4 py-2 border border-red-300 rounded-md shadow-sm text-sm font-medium text-red-700 bg-white hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isDeleting ? (
                          <div className="flex items-center justify-center">
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-600 mr-2"></div>
                            Cancelling...
                          </div>
                        ) : (
                          'Cancel Appointment'
                        )}
                      </button>
                    )}
                    
                    <button
                      type="submit"
                      disabled={isSubmitting || isLoading}
                      className="flex-1 px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-olive-600 hover:bg-olive-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-olive-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isSubmitting ? (
                        <div className="flex items-center justify-center">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          {existingAppointment ? 'Updating...' : 'Creating...'}
                        </div>
                      ) : (
                        `${existingAppointment ? 'Update' : 'Create'} Appointment`
                      )}
                    </button>
                  </div>
                </form>
                )}
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  )
}