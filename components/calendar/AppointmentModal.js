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
  existingAppointment = null,
  barbershopId = null
}) {
  const [formData, setFormData] = useState({
    clientName: '',
    clientPhone: '',
    clientEmail: '',
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

  // Load services and barbers when modal opens or barbershop changes
  useEffect(() => {
    if (isOpen && barbershopId) {
      loadInitialData()
    }
  }, [isOpen, barbershopId])

  const loadInitialData = async () => {
    setIsLoading(true)
    setLoadingError(null)

    try {
      // Ensure we have a barbershop_id before fetching
      if (!barbershopId) {
        throw new Error('No barbershop configured')
      }

      // Load services and barbers in parallel using correct API endpoints
      const [servicesResponse, barbersResponse] = await Promise.all([
        fetch(`/api/services?barbershop_id=${barbershopId}`),
        fetch(`/api/staff?barbershop_id=${barbershopId}`)
      ])

      if (!servicesResponse.ok || !barbersResponse.ok) {
        throw new Error('Failed to load data')
      }

      const servicesData = await servicesResponse.json()
      const barbersData = await barbersResponse.json()

      setServices(servicesData.services || [])
      // The /api/staff endpoint returns 'staff' array, not 'barbers'
      setBarbers(barbersData.staff || [])
      
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

  // Reset form when modal closes (but keep services/barbers cached for performance)
  useEffect(() => {
    if (!isOpen) {
      setFormData({
        clientName: '',
        clientPhone: '',
        clientEmail: '',
        service: '',
        barberId: '',
        notes: '',
        status: 'pending'
      })
      setSelectedService(null)
      setLoadingError(null)
      setValidationErrors({})
      setIsDeleting(false)
    }
  }, [isOpen])

  // Initialize form for editing existing appointment
  useEffect(() => {
    if (isOpen && existingAppointment) {
      const appointment = existingAppointment.extendedProps
      setFormData({
        clientName: appointment.client_name || appointment.client?.full_name || appointment.customer_name || appointment.customer || '',
        clientPhone: appointment.client_phone || appointment.client?.phone || appointment.customer_phone || appointment.phone || '',
        clientEmail: appointment.client_email || appointment.client?.email || appointment.customer_email || appointment.email || '',
        service: appointment.serviceId || '',
        barberId: existingAppointment.getResources()[0]?.id || '',
        notes: appointment.notes || '',
        status: appointment.status || 'pending'
      })
    }
  }, [isOpen, existingAppointment])

  // Initialize form for new appointment from slot (only runs after services are loaded)
  useEffect(() => {
    if (isOpen && !existingAppointment && selectedSlot && services.length > 0) {
      setFormData(prev => ({
        ...prev,
        barberId: selectedSlot.resourceId || '',
        service: services[0].id
      }))
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
    if (!formData.clientName || formData.clientName.trim().length < 1) {
      errors.clientName = 'Client name is required'
    } else if (formData.clientName.length > 255) {
      errors.clientName = 'Client name must be less than 255 characters'
    }

    if (!formData.clientPhone || formData.clientPhone.trim().length < 1) {
      errors.clientPhone = 'Phone number is required'
    } else if (formData.clientPhone.length > 20) {
      errors.clientPhone = 'Phone number must be less than 20 characters'
    }

    // Email validation (optional but must be valid if provided)
    if (formData.clientEmail && formData.clientEmail.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(formData.clientEmail)) {
        errors.clientEmail = 'Please enter a valid email address'
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
        client_name: formData.clientName,
        client_phone: formData.clientPhone,
        client_email: formData.clientEmail || null,
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
          <div className="fixed inset-0 bg-black/25 dark:bg-black/60" />
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
              <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white dark:bg-gray-800 p-6 text-left align-middle shadow-xl transition-all border border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between mb-4">
                  <Dialog.Title as="h3" className="text-lg font-medium leading-6 text-gray-900 dark:text-gray-100">
                    {existingAppointment ? 'Edit Appointment' : 'New Appointment'}
                  </Dialog.Title>
                  <button
                    onClick={onClose}
                    className="rounded-md bg-white dark:bg-gray-700 text-gray-400 dark:text-gray-300 hover:text-gray-500 dark:hover:text-gray-200 focus:outline-none"
                  >
                    <XMarkIcon className="h-6 w-6" />
                  </button>
                </div>

                {/* Loading State */}
                {isLoading && (
                  <div className="mb-4 p-4 text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600 dark:border-brand-500 mx-auto mb-2"></div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Loading appointment data...</p>
                  </div>
                )}

                {/* Error State */}
                {loadingError && (
                  <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                    <p className="text-sm text-red-800 dark:text-red-300">{loadingError}</p>
                  </div>
                )}

                {/* Appointment Time Display */}
                {!isLoading && selectedSlot && selectedService && (
                  <div className="mb-4 p-3 bg-olive-50 dark:bg-olive-900/20 border border-olive-200 dark:border-olive-800 rounded-lg">
                    <div className="flex items-center space-x-2 text-sm text-olive-800 dark:text-olive-300">
                      <CalendarIcon className="h-4 w-4 text-brand-600 dark:text-brand-500" />
                      <span>
                        {formatDateTime(selectedSlot.start)}
                        {calculatedEndTime && ` - ${formatDateTime(calculatedEndTime)}`}
                      </span>
                    </div>
                    <div className="flex items-center space-x-2 text-sm text-olive-600 dark:text-olive-400 mt-1">
                      <ClockIcon className="h-4 w-4 text-brand-600 dark:text-brand-500" />
                      <span>{selectedService.duration_minutes || selectedService.duration || 30} minutes</span>
                      <CurrencyDollarIcon className="h-4 w-4 ml-2 text-brand-600 dark:text-brand-500" />
                      <span>${selectedService.price || 0}</span>
                    </div>
                  </div>
                )}

                {!isLoading && (
                <form onSubmit={handleSubmit} className="space-y-4">
                  {/* Client Information */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Client Name *
                    </label>
                    <input
                      type="text"
                      name="clientName"
                      value={formData.clientName}
                      onChange={handleInputChange}
                      className={`w-full px-3 py-2 border rounded-md shadow-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:ring-olive-500 focus:border-olive-500 ${
                        validationErrors.clientName ? 'border-red-500 dark:border-red-500' : 'border-gray-300 dark:border-gray-600'
                      }`}
                      placeholder="Enter client name"
                      required
                    />
                    {validationErrors.clientName && (
                      <p className="mt-1 text-sm text-red-600 dark:text-red-400">{validationErrors.clientName}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Phone Number *
                    </label>
                    <input
                      type="tel"
                      name="clientPhone"
                      value={formData.clientPhone}
                      onChange={handleInputChange}
                      className={`w-full px-3 py-2 border rounded-md shadow-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:ring-olive-500 focus:border-olive-500 ${
                        validationErrors.clientPhone ? 'border-red-500 dark:border-red-500' : 'border-gray-300 dark:border-gray-600'
                      }`}
                      placeholder="(555) 123-4567"
                      required
                    />
                    {validationErrors.clientPhone && (
                      <p className="mt-1 text-sm text-red-600 dark:text-red-400">{validationErrors.clientPhone}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Email (Optional)
                    </label>
                    <input
                      type="email"
                      name="clientEmail"
                      value={formData.clientEmail}
                      onChange={handleInputChange}
                      className={`w-full px-3 py-2 border rounded-md shadow-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:ring-olive-500 focus:border-olive-500 ${
                        validationErrors.clientEmail ? 'border-red-500 dark:border-red-500' : 'border-gray-300 dark:border-gray-600'
                      }`}
                      placeholder="client@email.com"
                    />
                    {validationErrors.clientEmail && (
                      <p className="mt-1 text-sm text-red-600 dark:text-red-400">{validationErrors.clientEmail}</p>
                    )}
                  </div>

                  {/* Service Selection */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Service
                    </label>
                    <select
                      name="service"
                      value={formData.service}
                      onChange={handleInputChange}
                      className={`w-full px-3 py-2 border rounded-md shadow-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-olive-500 focus:border-olive-500 ${
                        validationErrors.service ? 'border-red-500 dark:border-red-500' : 'border-gray-300 dark:border-gray-600'
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
                      <p className="mt-1 text-sm text-red-600 dark:text-red-400">{validationErrors.service}</p>
                    )}
                  </div>

                  {/* Barber Selection */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Barber *
                    </label>
                    <select
                      name="barberId"
                      value={formData.barberId}
                      onChange={handleInputChange}
                      className={`w-full px-3 py-2 border rounded-md shadow-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-olive-500 focus:border-olive-500 ${
                        validationErrors.barberId ? 'border-red-500 dark:border-red-500' : 'border-gray-300 dark:border-gray-600'
                      }`}
                      required
                    >
                      <option value="">Select a barber</option>
                      {barbers.map(barber => (
                        <option key={barber.id} value={barber.id}>
                          {barber.full_name || barber.name || barber.title}
                        </option>
                      ))}
                    </select>
                    {validationErrors.barberId && (
                      <p className="mt-1 text-sm text-red-600 dark:text-red-400">{validationErrors.barberId}</p>
                    )}
                  </div>

                  {/* Status */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Status
                    </label>
                    <select
                      name="status"
                      value={formData.status}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-olive-500 focus:border-olive-500"
                    >
                      <option value="pending">Pending</option>
                      <option value="confirmed">Confirmed</option>
                      <option value="completed">Completed</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                  </div>

                  {/* Notes */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Notes (Optional)
                    </label>
                    <textarea
                      name="notes"
                      value={formData.notes}
                      onChange={handleInputChange}
                      rows={3}
                      maxLength={500}
                      className={`w-full px-3 py-2 border rounded-md shadow-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:ring-olive-500 focus:border-olive-500 ${
                        validationErrors.notes ? 'border-red-500 dark:border-red-500' : 'border-gray-300 dark:border-gray-600'
                      }`}
                      placeholder="Special requests, preferences, etc."
                    />
                    {validationErrors.notes && (
                      <p className="mt-1 text-sm text-red-600 dark:text-red-400">{validationErrors.notes}</p>
                    )}
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                      {formData.notes?.length || 0}/500 characters
                    </p>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex space-x-3 pt-4">
                    <button
                      type="button"
                      onClick={onClose}
                      className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-gray-800 focus:ring-olive-500"
                    >
                      Cancel
                    </button>

                    {/* Delete button for existing appointments */}
                    {existingAppointment && (
                      <button
                        type="button"
                        onClick={handleDelete}
                        disabled={isDeleting || isSubmitting || isLoading}
                        className="px-4 py-2 border border-red-300 dark:border-red-700 rounded-md shadow-sm text-sm font-medium text-red-700 dark:text-red-400 bg-white dark:bg-gray-700 hover:bg-red-50 dark:hover:bg-red-900/20 focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-gray-800 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isDeleting ? (
                          <div className="flex items-center justify-center">
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-600 dark:border-red-400 mr-2"></div>
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
                      className="flex-1 px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-gradient-to-r from-olive-600 to-brand-600 hover:from-olive-700 hover:to-brand-700 dark:from-olive-600 dark:to-brand-600 dark:hover:from-olive-700 dark:hover:to-brand-700 focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-gray-800 focus:ring-brand-500 disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg transition-all"
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